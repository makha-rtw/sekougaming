import { describe, it, expect, beforeEach } from 'vitest';
import { UnoGame, generateDeck } from '../src/engine/unoEngine.js';
import { RoomManager, Room } from '../src/rooms/roomManager.js';
import { Card } from '../../shared/types.js';

describe('Sekou-Gaming — Sekouno Test Suite', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  // 1. Création d’une salle et code unique
  it('crée une salle avec un code alphanumérique unique', () => {
    const room1 = roomManager.createRoom();
    const room2 = roomManager.createRoom();
    expect(room1.code).toBeDefined();
    expect(room1.code.length).toBe(6);
    expect(room1.code).not.toBe(room2.code);
  });

  // 2. Refus d’un 16e joueur
  it('refuse d’ajouter un 16e joueur dans une salle', () => {
    const room = roomManager.createRoom();
    for (let i = 1; i <= 15; i++) {
      const res = room.addPlayer(`Joueur ${i}`, `sock_${i}`);
      expect(res.success).toBe(true);
    }
    expect(room.players.size).toBe(15);

    // 16th player
    const res16 = room.addPlayer('Joueur 16', 'sock_16');
    expect(res16.success).toBe(false);
    expect(res16.error).toContain('La salle est pleine');
  });

  // 3. Démarrage avec un nombre insuffisant de joueurs
  it('refuse de démarrer avec moins de 2 joueurs', () => {
    const room = roomManager.createRoom();
    const p1 = room.addPlayer('Sekou', 'sock_1').player!;
    const startRes = room.startGame(p1.id);
    expect(startRes.success).toBe(false);
    expect(startRes.error).toContain('au moins 2 joueurs');
  });

  // 4. Distribution de 7 cartes à chaque joueur (test 2 joueurs et 15 joueurs)
  it('distribue exactement 7 cartes à chaque joueur au départ pour 2 et 15 joueurs', () => {
    // Test 2 players
    const game2 = new UnoGame('ROOM2', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game2.startGame();
    expect(game2.players[0].hand.length).toBe(7);
    expect(game2.players[1].hand.length).toBe(7);
    expect(game2.discardPile.length).toBe(1);

    // Test 15 players
    const players15 = Array.from({ length: 15 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      sessionToken: `s${i + 1}`,
      isHost: i === 0,
    }));
    const game15 = new UnoGame('ROOM15', players15);
    const startRes15 = game15.startGame();
    expect(startRes15.success).toBe(true);
    for (const p of game15.players) {
      expect(p.hand.length).toBe(7);
    }
    // Verify scaled deck size for 15 players (3 decks = 324 cards - 105 dealt - 1 discard = 218 in drawPile)
    expect(game15.drawPile.length).toBeGreaterThan(100);
  });

  // 5. Interdiction de consulter la main d’un autre joueur
  it('garantit la confidentialité des cartes des autres joueurs', () => {
    const room = roomManager.createRoom();
    const p1 = room.addPlayer('Alice', 'sock_1').player!;
    const p2 = room.addPlayer('Bob', 'sock_2').player!;
    room.startGame(p1.id);

    const clientStateP1 = room.getClientState(p1.id)!;
    const clientStateP2 = room.getClientState(p2.id)!;

    // Public state contains cardCount only, no hand
    expect(clientStateP1.public.players[1].cardCount).toBe(7);
    // @ts-expect-error
    expect(clientStateP1.public.players[1].hand).toBeUndefined();

    // P1 sees own hand, not P2's hand
    expect(clientStateP1.myHand.length).toBe(7);
    expect(clientStateP1.myHand).not.toEqual(clientStateP2.myHand);
  });

  // 6. Refus d’une carte illégale
  it('rejette une carte qui ne correspond ni à la couleur ni à la valeur', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();

    // Force top discard to Red 5
    game.discardPile = [{ id: 'top', color: 'red', value: '5' }];
    game.currentColor = 'red';

    // Current player hand has Blue 7 (illegal)
    const illegalCard: Card = { id: 'illegal_blue_7', color: 'blue', value: '7' };
    game.players[0].hand = [illegalCard];

    const res = game.playCard('p1', 'illegal_blue_7');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Coup non autorisé');
  });

  // 7. Passage au joueur suivant et inversion du sens
  it('gère correctement l’ordre des tours et l’inversion de sens', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
      { id: 'p3', name: 'Charlie', sessionToken: 's3', isHost: false },
    ]);
    game.startGame();
    expect(game.getCurrentPlayer().id).toBe('p1');

    // Normal play passes to p2
    game.discardPile = [{ id: 'top', color: 'red', value: '2' }];
    game.currentColor = 'red';
    game.players[0].hand = [
      { id: 'c1', color: 'red', value: '3' },
      { id: 'c2', color: 'green', value: '3' },
    ];
    game.playCard('p1', 'c1');
    expect(game.getCurrentPlayer().id).toBe('p2');

    // p2 plays Reverse card
    game.players[1].hand = [
      { id: 'rev', color: 'red', value: 'reverse' },
      { id: 'dummy', color: 'yellow', value: '1' },
    ];
    game.playCard('p2', 'rev');
    expect(game.direction).toBe(-1);
    // After p2 with direction -1, it goes back to p1!
    expect(game.getCurrentPlayer().id).toBe('p1');
  });

  // 8. Effet de Passe ton tour
  it('saute le tour du joueur suivant avec Passe ton tour', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
      { id: 'p3', name: 'Charlie', sessionToken: 's3', isHost: false },
    ]);
    game.startGame();
    game.discardPile = [{ id: 'top', color: 'green', value: '4' }];
    game.currentColor = 'green';

    game.players[0].hand = [
      { id: 'skip1', color: 'green', value: 'skip' },
      { id: 'dummy', color: 'blue', value: '1' },
    ];

    game.playCard('p1', 'skip1');
    // p2 should be skipped, so current turn goes directly to p3
    expect(game.getCurrentPlayer().id).toBe('p3');
  });

  // 9. Effet de +2
  it('initie une pénalité de +2 pour le joueur suivant', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    game.discardPile = [{ id: 'top', color: 'blue', value: '1' }];
    game.currentColor = 'blue';

    game.players[0].hand = [
      { id: 'd2', color: 'blue', value: 'draw2' },
      { id: 'd_other', color: 'red', value: '1' },
    ];

    game.playCard('p1', 'd2');
    expect(game.penaltyStack).toEqual({
      cardType: 'draw2',
      totalCards: 2,
      targetPlayerId: 'p2',
    });
    expect(game.getCurrentPlayer().id).toBe('p2');
  });

  // 10. Empilement +2 sur +2 (Règle B)
  it('autorise l’empilement de +2 sur +2 avec accumulation', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
      { id: 'p3', name: 'Charlie', sessionToken: 's3', isHost: false },
    ]);
    game.startGame();
    game.discardPile = [{ id: 'top', color: 'blue', value: '1' }];
    game.currentColor = 'blue';

    game.players[0].hand = [
      { id: 'd2_p1', color: 'blue', value: 'draw2' },
      { id: 'extra1', color: 'red', value: '1' },
    ];
    game.players[1].hand = [
      { id: 'd2_p2', color: 'red', value: 'draw2' },
      { id: 'extra2', color: 'red', value: '2' },
    ];

    game.playCard('p1', 'd2_p1');
    expect(game.penaltyStack?.totalCards).toBe(2);

    // p2 stacks another draw2
    const res = game.playCard('p2', 'd2_p2');
    expect(res.success).toBe(true);
    expect(game.penaltyStack?.totalCards).toBe(4);
    expect(game.penaltyStack?.targetPlayerId).toBe('p3');
  });

  // 11. Empilement +4 sur +2 (Règle B)
  it('autorise l’empilement d’un +4 sur un +2 avec accumulation (+6)', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
      { id: 'p3', name: 'Charlie', sessionToken: 's3', isHost: false },
    ]);
    game.startGame();
    game.discardPile = [{ id: 'top', color: 'yellow', value: '1' }];
    game.currentColor = 'yellow';

    game.players[0].hand = [
      { id: 'd2_p1', color: 'yellow', value: 'draw2' },
      { id: 'extra1', color: 'red', value: '1' },
    ];
    game.players[1].hand = [
      { id: 'w4_p2', color: 'black', value: 'wild4' },
      { id: 'extra2', color: 'red', value: '2' },
    ];

    game.playCard('p1', 'd2_p1');
    expect(game.penaltyStack?.totalCards).toBe(2);

    // p2 stacks wild4 with chosenColor 'green'
    const res = game.playCard('p2', 'w4_p2', 'green');
    expect(res.success).toBe(true);
    expect(game.penaltyStack?.cardType).toBe('wild4');
    expect(game.penaltyStack?.totalCards).toBe(6);
    expect(game.penaltyStack?.targetPlayerId).toBe('p3');
    expect(game.currentColor).toBe('green');
  });

  // 12. Refus de +2 sur +4 (Règle B)
  it('refuse formellement d’empiler un +2 sur un +4', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    game.discardPile = [{ id: 'top', color: 'yellow', value: '1' }];
    game.currentColor = 'yellow';

    game.players[0].hand = [
      { id: 'w4_p1', color: 'black', value: 'wild4' },
      { id: 'extra1', color: 'red', value: '1' },
    ];
    game.players[1].hand = [
      { id: 'd2_p2', color: 'green', value: 'draw2' },
      { id: 'extra2', color: 'red', value: '2' },
    ];

    game.playCard('p1', 'w4_p1', 'green');
    expect(game.penaltyStack?.cardType).toBe('wild4');

    // Bob tries to stack +2 on +4
    const res = game.playCard('p2', 'd2_p2');
    expect(res.success).toBe(false);
    expect(res.error).toContain('aucun empilement possible');
  });

  // 13. Refus de +4 sur +4 (Règle B : progression strictement croissante)
  it('refuse formellement d’empiler un +4 sur un +4 (pas de +4 sur +4)', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    game.discardPile = [{ id: 'top', color: 'yellow', value: '1' }];
    game.currentColor = 'yellow';

    game.players[0].hand = [
      { id: 'w4_p1', color: 'black', value: 'wild4' },
      { id: 'extra1', color: 'red', value: '1' },
    ];
    game.players[1].hand = [
      { id: 'w4_p2', color: 'black', value: 'wild4' },
      { id: 'extra2', color: 'red', value: '2' },
    ];

    game.playCard('p1', 'w4_p1', 'green');
    // Bob tries to stack +4 on +4
    const res = game.playCard('p2', 'w4_p2', 'blue');
    expect(res.success).toBe(false);
    expect(res.error).toContain('aucun empilement possible');
  });

  // 14. Obligation de piocher lorsque la pénalité n’est pas empilée
  it('oblige le joueur à piocher la totalité des cartes pénalités et lui fait passer son tour', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    game.discardPile = [{ id: 'top', color: 'blue', value: '1' }];
    game.currentColor = 'blue';

    game.players[0].hand = [
      { id: 'd2_p1', color: 'blue', value: 'draw2' },
      { id: 'extra1', color: 'red', value: '1' },
    ];
    game.playCard('p1', 'd2_p1');

    const bobInitialHandCount = game.players[1].hand.length;
    // Bob cannot stack, he draws
    const drawRes = game.drawCard('p2');
    expect(drawRes.success).toBe(true);
    expect(drawRes.drawnCards.length).toBe(2);
    expect(game.players[1].hand.length).toBe(bobInitialHandCount + 2);
    expect(game.penaltyStack).toBeNull();
    // Turn must have passed back to Alice (p1)
    expect(game.getCurrentPlayer().id).toBe('p1');
  });

  // 15. Interdiction de gagner en posant Changement de couleur comme dernière carte (Règle A)
  it('interdit formellement de gagner avec un Changement de couleur (carte noire) comme dernière carte', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    game.discardPile = [{ id: 'top', color: 'red', value: '9' }];
    game.currentColor = 'red';

    // Alice has only 1 card left: black wild
    game.players[0].hand = [{ id: 'last_wild', color: 'black', value: 'wild' }];

    const res = game.playCard('p1', 'last_wild', 'blue');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Règle Sekouno A');
    expect(res.error).toContain('Impossible de gagner en posant une carte noire');
    expect(game.players[0].hand.length).toBe(1);
    expect(game.status).toBe('in_game');
  });

  // 16. Interdiction de gagner en posant +4 comme dernière carte (Règle A)
  it('interdit formellement de gagner avec un +4 (carte noire) comme dernière carte', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    game.discardPile = [{ id: 'top', color: 'red', value: '9' }];
    game.currentColor = 'red';

    // Alice has only 1 card left: black wild4
    game.players[0].hand = [{ id: 'last_wild4', color: 'black', value: 'wild4' }];

    const res = game.playCard('p1', 'last_wild4', 'green');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Règle Sekouno A');
    expect(res.error).toContain('Impossible de gagner en posant une carte noire');
    expect(game.players[0].hand.length).toBe(1);
    expect(game.status).toBe('in_game');
  });

  // 17. Possibilité de jouer une carte noire si le joueur conserve une autre carte
  it('autorise de jouer une carte noire si le joueur a au moins 2 cartes', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    game.discardPile = [{ id: 'top', color: 'red', value: '9' }];
    game.currentColor = 'red';

    // Alice has 2 cards: black wild and another card
    game.players[0].hand = [
      { id: 'wild_card', color: 'black', value: 'wild' },
      { id: 'remaining_card', color: 'yellow', value: '3' },
    ];

    const res = game.playCard('p1', 'wild_card', 'yellow');
    expect(res.success).toBe(true);
    expect(game.players[0].hand.length).toBe(1);
    expect(game.currentColor).toBe('yellow');
  });

  // 18. Reconstitution de la pioche quand elle est vide
  it('reconstitue la pioche à partir de la défausse quand la pioche s’épuise', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();

    // Empties draw pile and fills discard pile
    game.drawPile = [];
    const topCard: Card = { id: 'top_active', color: 'red', value: '5' };
    const oldDiscardCards: Card[] = [
      { id: 'd1', color: 'blue', value: '2' },
      { id: 'd2', color: 'green', value: '7' },
      { id: 'd3', color: 'yellow', value: '9' },
      topCard,
    ];
    game.discardPile = [...oldDiscardCards];

    // Ensure draw pile
    game.ensureDrawPile(1);
    expect(game.drawPile.length).toBe(3);
    expect(game.discardPile.length).toBe(1);
    expect(game.discardPile[0]).toEqual(topCard);
  });

  // 19. Fin de partie et synchronisation du gagnant
  it('déclare la victoire et passe en game_over lorsque la dernière carte légale est posée', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    game.discardPile = [{ id: 'top', color: 'blue', value: '4' }];
    game.currentColor = 'blue';

    // Alice plays her winning card (legal non-black card)
    game.players[0].hand = [{ id: 'win_card', color: 'blue', value: '8' }];

    const res = game.playCard('p1', 'win_card');
    expect(res.success).toBe(true);
    expect(game.status).toBe('game_over');
    expect(game.winner?.name).toBe('Alice');
    expect(game.winner?.id).toBe('p1');
  });

  // 20. Déconnexion et reconnexion d’un joueur
  it('gère la déconnexion et la reconnexion avec sessionToken', () => {
    const room = roomManager.createRoom();
    const p1 = room.addPlayer('Alice', 'sock_alice_1').player!;
    const p2 = room.addPlayer('Bob', 'sock_bob_1').player!;

    // Bob disconnects
    const disconnectedPlayer = room.handleDisconnect('sock_bob_1');
    expect(disconnectedPlayer?.isConnected).toBe(false);
    expect(room.players.get(p2.id)?.isConnected).toBe(false);

    // Bob reconnects with his sessionToken and a new socket ID
    const reconnectRes = room.reconnectPlayer(p2.sessionToken, 'sock_bob_2');
    expect(reconnectRes.success).toBe(true);
    expect(reconnectRes.player?.isConnected).toBe(true);
    expect(reconnectRes.player?.socketId).toBe('sock_bob_2');
  });

  // 21. Tentatives de triche côté client et actions hors tour
  it('bloque les actions hors tour et les cartes non possédées', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();

    // Turn is p1, p2 tries to play
    const illegalTurnRes = game.playCard('p2', game.players[1].hand[0].id);
    expect(illegalTurnRes.success).toBe(false);
    expect(illegalTurnRes.error).toContain('Ce n\'est pas votre tour');

    // p1 tries to play a card that does not exist in their hand
    const fakeCardRes = game.playCard('p1', 'fake_card_id_999');
    expect(fakeCardRes.success).toBe(false);
    expect(fakeCardRes.error).toContain('Carte introuvable dans votre main');

    // p2 tries to draw when it is p1 turn
    const illegalDrawRes = game.drawCard('p2');
    expect(illegalDrawRes.success).toBe(false);
    expect(illegalDrawRes.error).toContain('Ce n\'est pas votre tour');
  });

  // 22. L'hôte peut infliger une pénalité (+2 cartes) à un joueur
  it('permet uniquement à l’hôte d’infliger une pénalité de cartes à un joueur', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    const initialBobHand = game.players[1].hand.length;

    // Bob tries to give penalty (must fail)
    const bobRes = game.hostGivePenalty('p2', 'p1', 2);
    expect(bobRes.success).toBe(false);
    expect(bobRes.error).toContain("Seul l'hôte");

    // Alice (Host) gives +2 penalty to Bob
    const aliceRes = game.hostGivePenalty('p1', 'p2', 2);
    expect(aliceRes.success).toBe(true);
    expect(game.players[1].hand.length).toBe(initialBobHand + 2);
    expect(game.lastActionMessage).toContain('Bob reçoit +2 cartes');
  });

  // 23. Fermeture et suppression du salon par l’hôte
  it('permet la suppression propre du salon par l’hôte', () => {
    const room = roomManager.createRoom();
    const p1 = room.addPlayer('Alice', 'sock_1').player!;
    expect(roomManager.getRoom(room.code)).toBeDefined();

    // Remove room
    const removed = roomManager.removeRoom(room.code);
    expect(removed).toBe(true);
    expect(roomManager.getRoom(room.code)).toBeUndefined();
  });

  // 24. Règle spéciale de pioche : carte jouable piochée -> possibilité de la jouer ou de passer son tour
  it('laisse le tour actif lorsqu’un joueur pioche une carte jouable et lui permet de passer son tour', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    game.currentColor = 'red';
    game.discardPile = [{ id: 'd1', color: 'red', value: '5' }];

    // Prepare draw pile with a playable card on top
    game.drawPile = [{ id: 'drawn_playable', color: 'red', value: '9' }];

    // Alice draws
    const drawRes = game.drawCard('p1');
    expect(drawRes.success).toBe(true);
    expect(drawRes.canPlayDrawnCard).toBe(true);
    expect(game.drawnPlayableCard).toEqual({ playerId: 'p1', cardId: 'drawn_playable' });
    // Turn does NOT advance yet! It is still Alice's turn
    expect(game.getCurrentPlayer().id).toBe('p1');

    // Alice passes her turn
    const passRes = game.passTurn('p1');
    expect(passRes.success).toBe(true);
    expect(game.drawnPlayableCard).toBeNull();
    // Turn has now advanced to Bob
    expect(game.getCurrentPlayer().id).toBe('p2');
  });

  // 25. Règle spéciale de pioche : carte non jouable piochée -> passe le tour automatiquement
  it('passe automatiquement le tour lorsque la carte piochée n’est pas jouable', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    game.currentColor = 'red';
    game.discardPile = [{ id: 'd1', color: 'red', value: '5' }];

    // Prepare draw pile with an unplayable card on top (blue 9)
    game.drawPile = [{ id: 'drawn_unplayable', color: 'blue', value: '9' }];

    // Alice draws
    const drawRes = game.drawCard('p1');
    expect(drawRes.success).toBe(true);
    expect(drawRes.canPlayDrawnCard).toBe(false);
    expect(game.drawnPlayableCard).toBeNull();
    // Turn automatically advanced to Bob
    expect(game.getCurrentPlayer().id).toBe('p2');
  });

  // 26. Règle spéciale de pioche : jouer la carte immédiatement après l'avoir piochée
  it('permet de poser immédiatement la carte jouable piochée', () => {
    const game = new UnoGame('ROOM', [
      { id: 'p1', name: 'Alice', sessionToken: 's1', isHost: true },
      { id: 'p2', name: 'Bob', sessionToken: 's2', isHost: false },
    ]);
    game.startGame();
    game.currentColor = 'blue';
    game.discardPile = [{ id: 'd1', color: 'blue', value: '3' }];

    // Prepare draw pile with a playable card
    game.drawPile = [{ id: 'playable_card', color: 'blue', value: '7' }];

    // Alice draws
    const drawRes = game.drawCard('p1');
    expect(drawRes.canPlayDrawnCard).toBe(true);
    expect(game.getCurrentPlayer().id).toBe('p1');

    // Alice plays the drawn card
    const playRes = game.playCard('p1', 'playable_card');
    expect(playRes.success).toBe(true);
    expect(game.drawnPlayableCard).toBeNull();
    expect(game.getTopDiscard().id).toBe('playable_card');
    // Turn advanced to Bob
    expect(game.getCurrentPlayer().id).toBe('p2');
  });

  // 27. Confidentialité stricte lors de la pioche d'une carte jouable
  it('ne divulgue jamais la carte jouable piochée aux adversaires ni dans lastActionMessage ni dans drawnCardPlayableId', () => {
    const room = roomManager.createRoom();
    const alice = room.addPlayer('Alice', 'sock_alice').player!;
    const bob = room.addPlayer('Bob', 'sock_bob').player!;
    room.startGame(alice.id);

    const game = room.game!;
    game.currentColor = 'red';
    game.discardPile = [{ id: 'd_top', color: 'red', value: '5' }];
    // Card ID follows real deck convention containing color & value
    game.drawPile = [{ id: 'c_1_black_wild4_1', color: 'black', value: 'wild4' }];

    const drawRes = game.drawCard(alice.id);
    expect(drawRes.success).toBe(true);
    expect(drawRes.canPlayDrawnCard).toBe(true);

    // Public message must NEVER mention the card name, color, or value
    expect(game.lastActionMessage).toBe('Alice a pioché une carte.');
    expect(game.lastActionMessage).not.toContain('+4');
    expect(game.lastActionMessage).not.toContain('Joker');
    expect(game.lastActionMessage).not.toContain('jouable');

    // Alice receives her own drawnCardPlayableId and canPassTurn
    const aliceState = room.getClientState(alice.id)!;
    expect(aliceState.canPassTurn).toBe(true);
    expect(aliceState.public.drawnCardPlayableId).toBe('c_1_black_wild4_1');

    // Bob MUST NOT receive Alice's drawnCardPlayableId
    const bobState = room.getClientState(bob.id)!;
    expect(bobState.canPassTurn).toBe(false);
    expect(bobState.public.drawnCardPlayableId).toBeNull();
  });
});

