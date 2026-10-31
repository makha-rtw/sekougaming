import { describe, it, expect } from 'vitest';
import http from 'node:http';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { getDictionary } from '../src/sekou-bomb/dictionary.js';
import { getPromptGenerator } from '../src/sekou-bomb/promptGenerator.js';
import { SekouBombRoom } from '../src/sekou-bomb/bombRoom.js';
import { SekouBombManager } from '../src/sekou-bomb/bombManager.js';
import { setupSekouBombSockets } from '../src/sekou-bomb/bombSockets.js';

describe('SEKOU BOMB — Tests Automatisés Complets (Section 13)', () => {
  // =========================================================================
  // 1. BIBLIOTHÈQUES LEXICALES & GÉNÉRATION DES COMBINAISONS
  // =========================================================================
  describe('1. Bibliothèques lexicales & Générateur de combinaisons', () => {
    it('charge les dictionnaires complets FR et EN (non-démo) avec licences CC0 documentées', () => {
      const frDict = getDictionary('fr');
      const enDict = getDictionary('en');

      const frMeta = frDict.getMetadata();
      const enMeta = enDict.getMetadata();

      // Vérifie l'absence de dictionnaire de démonstration : > 300 000 mots FR et > 250 000 mots EN
      expect(frMeta.wordCount).toBeGreaterThan(300000);
      expect(enMeta.wordCount).toBeGreaterThan(250000);

      // Vérifie la présence et la documentation de la licence CC0
      expect(frMeta.hasLicenseFile).toBe(true);
      expect(enMeta.hasLicenseFile).toBe(true);
      expect(frMeta.licenseSummary).toContain('CC0');
      expect(enMeta.licenseSummary).toContain('CC0');
    });

    it('génère des combinaisons pertinentes en FR et EN selon la difficulté sans doublons', () => {
      const frGen = getPromptGenerator('fr');
      const enGen = getPromptGenerator('en');

      expect(frGen.getTotalCount()).toBeGreaterThan(1500);
      expect(enGen.getTotalCount()).toBeGreaterThan(1500);

      const usedFr = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const picked = frGen.pickNextPrompt('easy', usedFr);
        expect(picked.prompt.length).toBeGreaterThanOrEqual(2);
        expect(picked.prompt.length).toBeLessThanOrEqual(4);
        expect(picked.matchCount).toBeGreaterThanOrEqual(750);
      }
      expect(usedFr.size).toBe(30);

      const usedEn = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const picked = enGen.pickNextPrompt('hard', usedEn);
        expect(picked.prompt.length).toBeGreaterThanOrEqual(2);
        expect(picked.matchCount).toBeGreaterThanOrEqual(150);
      }
      expect(usedEn.size).toBe(30);
    });
  });

  // =========================================================================
  // 2. VALIDATION LEXICALE
  // =========================================================================
  describe('2. Validation lexicale déterministe (FR & EN)', () => {
    const frDict = getDictionary('fr');
    const enDict = getDictionary('en');

    it('accepte un mot français valide et un mot anglais valide', () => {
      const used = new Set<string>();
      const resFr = frDict.validateSubmission('tremplin', 'TRE', used);
      expect(resFr.valid).toBe(true);
      expect(resFr.normalizedKey).toBe('TREMPLIN');

      const resEn = enDict.validateSubmission('mountain', 'AIN', used);
      expect(resEn.valid).toBe(true);
      expect(resEn.normalizedKey).toBe('MOUNTAIN');
    });

    it('rejette un mot inexistant dans le dictionnaire', () => {
      const used = new Set<string>();
      const res = frDict.validateSubmission('tresdfghjkl', 'TRE', used);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('word_not_in_dictionary');
    });

    it('rejette un mot ne contenant pas la combinaison demandée', () => {
      const used = new Set<string>();
      const res = frDict.validateSubmission('maison', 'TRE', used);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('missing_prompt');
    });

    it('accepte un mot contenant la combinaison au début, au milieu ou à la fin', () => {
      const used = new Set<string>();
      // Début : TREMPLIN
      expect(frDict.validateSubmission('tremplin', 'TRE', used).valid).toBe(true);
      // Milieu : ENTRETENIR
      expect(frDict.validateSubmission('entretenir', 'TRE', used).valid).toBe(true);
      // Fin : QUATRE
      expect(frDict.validateSubmission('quatre', 'TRE', used).valid).toBe(true);
    });

    it('gère correctement les majuscules, minuscules et espaces superflus', () => {
      const used = new Set<string>();
      const res = frDict.validateSubmission('   TrEmPlIn  ', 'TRE', used);
      expect(res.valid).toBe(true);
      expect(res.normalizedKey).toBe('TREMPLIN');
    });

    it('gère les accents français : accepte accents exacts et saisie clavier sans accent, mais rejette les faux accents', () => {
      const used = new Set<string>();

      // Avec accents exacts
      const exactAccent = frDict.validateSubmission('téléphone', 'PHO', used);
      expect(exactAccent.valid).toBe(true);
      expect(exactAccent.canonicalWord).toBe('téléphone');

      // Sans accent (clavier mobile rapide)
      const unaccented = frDict.validateSubmission('telephone', 'PHO', used);
      expect(unaccented.valid).toBe(true);
      expect(unaccented.canonicalWord).toBe('téléphone');

      // Faux accents inventés -> rejeté !
      const wrongAccent = frDict.validateSubmission('tëléphöne', 'PHO', used);
      expect(wrongAccent.valid).toBe(false);
      expect(wrongAccent.errorCode).toBe('word_not_in_dictionary');
    });

    it('rejette un mot déjà utilisé lorsque la répétition est interdite', () => {
      const used = new Set<string>(['TREMPLIN']);
      const resForbid = frDict.validateSubmission('tremplin', 'TRE', used, 'forbid');
      expect(resForbid.valid).toBe(false);
      expect(resForbid.errorCode).toBe('already_used');

      const resAllow = frDict.validateSubmission('tremplin', 'TRE', used, 'allow');
      expect(resAllow.valid).toBe(true);
    });

    it('rejette les entrées vides et les entrées mal formées', () => {
      const used = new Set<string>();
      expect(frDict.validateSubmission('', 'TRE', used).errorCode).toBe('empty_input');
      expect(frDict.validateSubmission('   ', 'TRE', used).errorCode).toBe('empty_input');
      expect(frDict.validateSubmission('tre123', 'TRE', used).errorCode).toBe('malformed_input');
      expect(frDict.validateSubmission('<script>tre</script>', 'TRE', used).errorCode).toBe(
        'malformed_input'
      );
      expect(frDict.validateSubmission('--tremplin', 'TRE', used).errorCode).toBe(
        'malformed_input'
      );
    });
  });

  // =========================================================================
  // 3. GESTION DU TEMPS, DES VIES ET DU BONUS ALPHABET
  // =========================================================================
  describe('3. Gestion du temps, des vies, éliminations et Bonus Alphabet', () => {
    it('valide un mot avant expiration, passe au joueur suivant, et gère l’expiration du temps', () => {
      const room = new SekouBombRoom('TEST01', () => {}, { language: 'fr', initialLives: 2 }, { countdownDurationMs: 0 });
      const p1 = room.addPlayer('Alice', 'sock_1').player!;
      const p2 = room.addPlayer('Bob', 'sock_2').player!;

      room.startGame(p1.id);
      expect(room.status).toBe('PLAYING');
      expect(room.activePlayerId).toBe(p1.id);

      // Force a known prompt for deterministic test
      room.currentPrompt = 'TRE';

      // Alice submits valid word before deadline
      const sub1 = room.submitWord(p1.id, 'tremplin');
      expect(sub1.valid).toBe(true);
      expect(room.activePlayerId).toBe(p2.id);

      // Simulate expired deadline on Bob's turn
      room.currentPrompt = 'TRE';
      room.turnDeadlineServerMs = Date.now() - 50;
      const subExpired = room.submitWord(p2.id, 'quatre');
      expect(subExpired.valid).toBe(false);
      expect(subExpired.errorCode).toBe('time_expired');
      // Bob lost 1 life (from 2 to 1) and turn passed back to Alice
      expect(p2.lives).toBe(1);
      expect(room.activePlayerId).toBe(p1.id);

      room.clearAllTimers();
    });

    it('élimine un joueur à 0 vie, l’empêche de rejouer et déclare le dernier survivant vainqueur', () => {
      const room = new SekouBombRoom('TEST02', () => {}, { language: 'fr', initialLives: 1 }, { countdownDurationMs: 0 });
      const p1 = room.addPlayer('Alice', 'sock_1').player!;
      const p2 = room.addPlayer('Bob', 'sock_2').player!;
      const p3 = room.addPlayer('Charlie', 'sock_3').player!;

      room.startGame(p1.id);
      expect(room.activePlayerId).toBe(p1.id);

      // Timeout on Alice -> 0 lives -> eliminated!
      room.handleTurnTimeout();
      expect(p1.lives).toBe(0);
      expect(p1.isEliminated).toBe(true);
      expect(room.activePlayerId).toBe(p2.id);

      // Eliminated player Alice tries to submit a word -> rejected
      room.currentPrompt = 'TRE';
      const elimAttempt = room.submitWord(p1.id, 'tremplin');
      expect(elimAttempt.valid).toBe(false);
      expect(elimAttempt.errorCode).toBe('not_your_turn');

      // Timeout on Bob -> 0 lives -> eliminated -> Charlie wins!
      room.handleTurnTimeout();
      expect(p2.isEliminated).toBe(true);
      expect(room.status).toBe('GAME_OVER');
      expect(room.winnerId).toBe(p3.id);
      expect(room.winnerName).toBe('Charlie');

      room.clearAllTimers();
    });

    it('attribue +1 vie bonus lorsque l’alphabet bonus est complété, sans dépasser maxLives', () => {
      const room = new SekouBombRoom(
        'TEST03',
        () => {},
        {
          language: 'fr',
          initialLives: 2,
          maxLives: 3,
          bonusAlphabetEnabled: true,
          bonusAlphabetLetters: 'TRE', // Custom 3-letter bonus target for test
        },
        { countdownDurationMs: 0 }
      );
      const p1 = room.addPlayer('Alice', 'sock_1').player!;
      const p2 = room.addPlayer('Bob', 'sock_2').player!;

      room.startGame(p1.id);
      room.currentPrompt = 'TRE';

      // Alice plays 'TREMPLIN' which contains T, R, E -> completes 'TRE' bonus alphabet!
      const res1 = room.submitWord(p1.id, 'tremplin');
      expect(res1.valid).toBe(true);
      expect(res1.bonusLifeEarned).toBe(true);
      expect(p1.lives).toBe(3); // Gained +1 life (from 2 to 3)
      expect(p1.bonusLivesEarned).toBe(1);
      expect(p1.bonusLettersUsed).toEqual([]); // Reset after earning bonus

      // Bob plays a word to pass turn back to Alice
      room.currentPrompt = 'TRE';
      room.submitWord(p2.id, 'quatre');

      // Alice is now at maxLives (3/3). Completing 'TRE' again resets letters but does not exceed maxLives (3)
      room.currentPrompt = 'TRE';
      const res2 = room.submitWord(p1.id, 'entretenir');
      expect(res2.valid).toBe(true);
      expect(p1.lives).toBe(3);

      room.clearAllTimers();
    });
  });

  // =========================================================================
  // 4. MULTIJOUEUR SOCKET.IO TEMPS RÉEL (SALONS, CAPACITÉ, RECONNEXION, HÔTE, REJOUER)
  // =========================================================================
  describe('4. Multijoueur temps réel via Socket.IO', () => {
    it('gère création, code invalide, salon complet, reconnexion, départ de l’hôte, fin de partie et rejouer', async () => {
      const httpServer = http.createServer();
      const io = new Server(httpServer);
      const manager: SekouBombManager = setupSekouBombSockets(io);

      await new Promise<void>((resolve) => httpServer.listen(0, resolve));
      const port = (httpServer.address() as any).port;
      const url = `http://localhost:${port}`;

      const c1: ClientSocket = Client(url);
      const c2: ClientSocket = Client(url);
      const c3: ClientSocket = Client(url);

      try {
        await Promise.all([
          new Promise<void>((r) => c1.on('connect', () => r())),
          new Promise<void>((r) => c2.on('connect', () => r())),
          new Promise<void>((r) => c3.on('connect', () => r())),
        ]);

        // 1. Create room with maxPlayers: 2 and initialLives: 1
        const createRes: any = await new Promise((r) =>
          c1.emit(
            'bomb_create_room',
            {
              playerName: 'SekouHost',
              settings: { language: 'en', maxPlayers: 2, initialLives: 1 },
            },
            r
          )
        );
        expect(createRes.success).toBe(true);
        expect(createRes.roomCode).toHaveLength(6);
        const roomCode = createRes.roomCode;

        // 2. Invalid room code rejected
        const badJoinRes: any = await new Promise((r) =>
          c2.emit('bomb_join_room', { roomCode: 'ZZZZZZ', playerName: 'Guest2' }, r)
        );
        expect(badJoinRes.success).toBe(false);
        expect(badJoinRes.errorCode).toBe('room_not_found');

        // 3. Valid join by Player 2
        const joinRes2: any = await new Promise((r) =>
          c2.emit('bomb_join_room', { roomCode, playerName: 'Guest2' }, r)
        );
        expect(joinRes2.success).toBe(true);

        // 4. Full room rejected for Player 3 (maxPlayers = 2)
        const fullJoinRes: any = await new Promise((r) =>
          c3.emit('bomb_join_room', { roomCode, playerName: 'Guest3' }, r)
        );
        expect(fullJoinRes.success).toBe(false);
        expect(fullJoinRes.errorCode).toBe('room_full');

        // 5. Reconnection with sessionToken
        const reconnRes: any = await new Promise((r) =>
          c2.emit(
            'bomb_reconnect',
            { roomCode, sessionToken: joinRes2.sessionToken },
            r
          )
        );
        expect(reconnRes.success).toBe(true);
        expect(reconnRes.playerId).toBe(joinRes2.playerId);

        // 6. Start game & fast-forward countdown
        const room = manager.getRoom(roomCode)!;
        (room as any).countdownDurationMs = 0;

        const startRes: any = await new Promise((r) => c1.emit('bomb_start_game', r));
        expect(startRes.success).toBe(true);
        expect(room.status).toBe('PLAYING');

        // Force English prompt 'ING'
        room.currentPrompt = 'ING';
        const wordRes: any = await new Promise((r) =>
          c1.emit('bomb_submit_word', { word: 'playing' }, r)
        );
        expect(wordRes.valid).toBe(true);
        expect(room.activePlayerId).toBe(joinRes2.playerId);

        // Timeout on Player 2 -> Game Over (SekouHost wins)
        room.handleTurnTimeout();
        expect(room.status).toBe('GAME_OVER');
        expect(room.winnerId).toBe(createRes.playerId);

        // 7. Replay ("Rejouer") resets all state cleanly
        const replayRes: any = await new Promise((r) => c1.emit('bomb_start_game', r));
        expect(replayRes.success).toBe(true);
        expect(room.status).toBe('PLAYING');
        expect(room.usedWords.size).toBe(0);
        expect(room.totalWordsPlayed).toBe(0);
        expect(room.players.get(joinRes2.playerId)?.lives).toBe(1);
        expect(room.players.get(joinRes2.playerId)?.isEliminated).toBe(false);

        // 8. Host departure transfers host role cleanly to Guest2
        await new Promise((r) => c1.emit('bomb_leave_room', r));
        expect(room.players.get(joinRes2.playerId)?.isHost).toBe(true);

        // 9. Disconnect in LOBBY removes player immediately
        room.status = 'LOBBY';
        room.settings.maxPlayers = 8;
        const p2SocketId = room.players.get(joinRes2.playerId)?.socketId;
        if (p2SocketId) {
          room.handleDisconnect(p2SocketId);
          expect(room.players.has(joinRes2.playerId)).toBe(false);
        }

        // 10. Host kicking a player in LOBBY
        const addP3 = room.addPlayer('TestKick', 'sock_p3');
        expect(addP3.success).toBe(true);
        const p3Id = addP3.player!.id;
        const addHost = room.addPlayer('NewHost', 'sock_host');
        expect(addHost.success).toBe(true);
        addHost.player!.isHost = true;
        expect(room.players.has(p3Id)).toBe(true);

        const kickRes = room.kickPlayer(addHost.player!.id, p3Id);
        expect(kickRes.success).toBe(true);
        expect(room.players.has(p3Id)).toBe(false);

        room.clearAllTimers();
      } finally {
        c1.disconnect();
        c2.disconnect();
        c3.disconnect();
        io.close();
        httpServer.close();
      }
    });
  });
});
