import {
  Card,
  CardColor,
  CardValue,
  PlayableColor,
  PenaltyStack,
  GameStatePublic,
  PlayerPrivate,
  PlayerPublic,
} from '../../../shared/types.js';

export function generateDeck(numPlayers: number): Card[] {
  // Determine number of decks: 1 deck for <=5, 2 decks for 6-10, 3 decks for 11-15
  let deckCount = 1;
  if (numPlayers > 10) {
    deckCount = 3;
  } else if (numPlayers > 5) {
    deckCount = 2;
  }

  const colors: PlayableColor[] = ['red', 'blue', 'green', 'yellow'];
  const numbers: CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const actions: CardValue[] = ['skip', 'reverse', 'draw2'];

  const cards: Card[] = [];

  for (let d = 1; d <= deckCount; d++) {
    for (const color of colors) {
      // One 0 per color
      cards.push({ id: `c_${d}_${color}_0_0`, color, value: '0' });

      // Two 1-9 per color
      for (const num of numbers.slice(1)) {
        cards.push({ id: `c_${d}_${color}_${num}_1`, color, value: num });
        cards.push({ id: `c_${d}_${color}_${num}_2`, color, value: num });
      }

      // Two of each action per color
      for (const action of actions) {
        cards.push({ id: `c_${d}_${color}_${action}_1`, color, value: action });
        cards.push({ id: `c_${d}_${color}_${action}_2`, color, value: action });
      }
    }

    // Four Wild and Four Wild Draw4 per deck
    for (let i = 1; i <= 4; i++) {
      cards.push({ id: `c_${d}_black_wild_${i}`, color: 'black', value: 'wild' });
      cards.push({ id: `c_${d}_black_wild4_${i}`, color: 'black', value: 'wild4' });
    }
  }

  return shuffle(cards);
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class UnoGame {
  public roomCode: string;
  public players: PlayerPrivate[];
  public drawPile: Card[];
  public discardPile: Card[];
  public currentTurnIndex: number;
  public direction: 1 | -1;
  public currentColor: PlayableColor;
  public penaltyStack: PenaltyStack | null;
  public status: 'waiting' | 'in_game' | 'game_over';
  public winner: PlayerPublic | null;
  public lastActionMessage: string | null;
  public unoNotice: { playerId: string; playerName: string; timestamp: number } | null;
  public drawnPlayableCard: { playerId: string; cardId: string } | null = null;

  constructor(roomCode: string, players: { id: string; name: string; sessionToken: string; isHost: boolean }[]) {
    this.roomCode = roomCode;
    this.status = 'waiting';
    this.direction = 1;
    this.drawPile = [];
    this.discardPile = [];
    this.currentTurnIndex = 0;
    this.currentColor = 'red';
    this.penaltyStack = null;
    this.winner = null;
    this.lastActionMessage = null;
    this.unoNotice = null;
    this.drawnPlayableCard = null;

    this.players = players.map(p => ({
      id: p.id,
      name: p.name,
      sessionToken: p.sessionToken,
      isHost: p.isHost,
      isConnected: true,
      cardCount: 0,
      hand: [],
      hasCalledUno: false,
    }));
  }

  public startGame(): { success: boolean; error?: string } {
    if (this.players.length < 2) {
      return { success: false, error: 'Il faut au moins 2 joueurs pour démarrer la partie.' };
    }
    if (this.players.length > 15) {
      return { success: false, error: 'Maximum 15 joueurs autorisés.' };
    }

    // Generate and shuffle deck
    this.drawPile = generateDeck(this.players.length);
    this.discardPile = [];

    // Deal 7 cards to each player
    for (const player of this.players) {
      player.hand = this.drawPile.splice(0, 7);
      player.cardCount = player.hand.length;
      player.hasCalledUno = false;
    }

    // Find a non-black initial card to avoid starting with complex penalty state
    let initialCardIndex = this.drawPile.findIndex(c => c.color !== 'black' && c.value !== 'skip' && c.value !== 'reverse' && c.value !== 'draw2');
    if (initialCardIndex === -1) {
      // Fallback: any non-black card
      initialCardIndex = this.drawPile.findIndex(c => c.color !== 'black');
    }
    if (initialCardIndex === -1) {
      initialCardIndex = 0;
    }

    const [startCard] = this.drawPile.splice(initialCardIndex, 1);
    this.discardPile.push(startCard);
    this.currentColor = (startCard.color === 'black' ? 'red' : startCard.color) as PlayableColor;

    this.status = 'in_game';
    this.currentTurnIndex = 0;
    this.direction = 1;
    this.penaltyStack = null;
    this.winner = null;
    this.lastActionMessage = `La partie commence ! Première carte : ${this.getCardName(startCard)}.`;

    return { success: true };
  }

  public getCurrentPlayer(): PlayerPrivate {
    return this.players[this.currentTurnIndex];
  }

  public getTopDiscard(): Card {
    return this.discardPile[this.discardPile.length - 1];
  }

  public advanceTurn(steps: number = 1): void {
    const total = this.players.length;
    let nextIndex = (this.currentTurnIndex + (this.direction * steps)) % total;
    while (nextIndex < 0) {
      nextIndex += total;
    }
    this.currentTurnIndex = nextIndex;
  }

  /**
   * Reshuffles discard pile into draw pile if draw pile is low.
   * Keeps the top discard card visible.
   */
  public ensureDrawPile(neededCards: number = 1): void {
    if (this.drawPile.length >= neededCards) return;

    if (this.discardPile.length <= 1) {
      // Can't reshuffle if only top card exists, nothing to do
      return;
    }

    const topCard = this.discardPile.pop()!;
    const cardsToShuffle = this.discardPile;
    this.discardPile = [topCard];
    this.drawPile = [...this.drawPile, ...shuffle(cardsToShuffle)];
  }

  /**
   * Validate if a player can play a specific card according to UNO rules,
   * Rule A (cannot win with black card), and Rule B (+2/+4 stacking rules).
   */
  public canPlayCard(
    playerId: string,
    cardId: string,
    chosenColor?: PlayableColor
  ): { valid: boolean; error?: string } {
    if (this.status !== 'in_game') {
      return { valid: false, error: 'La partie n\'est pas en cours.' };
    }

    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { valid: false, error: 'Ce n\'est pas votre tour de jouer !' };
    }

    const card = currentPlayer.hand.find(c => c.id === cardId);
    if (!card) {
      return { valid: false, error: 'Carte introuvable dans votre main.' };
    }

    // ==========================================
    // RÈGLE PERSONNALISÉE A : Interdiction de finir avec une carte noire
    // ==========================================
    if (currentPlayer.hand.length === 1 && card.color === 'black') {
      return {
        valid: false,
        error: 'Règle Sekouno A : Impossible de gagner en posant une carte noire comme dernière carte ! Vous devez piocher une carte à la place.',
      };
    }

    // If black card, chosenColor is mandatory
    if (card.color === 'black' && !chosenColor) {
      return { valid: false, error: 'Vous devez choisir une nouvelle couleur pour cette carte.' };
    }

    // ==========================================
    // RÈGLE PERSONNALISÉE B : Empilement des pénalités (+2 et +4)
    // ==========================================
    if (this.penaltyStack) {
      const lastPenaltyType = this.penaltyStack.cardType;

      if (lastPenaltyType === 'draw2') {
        // On +2, can stack +2 or +4
        if (card.value !== 'draw2' && card.value !== 'wild4') {
          return {
            valid: false,
            error: 'Pénalité en cours : vous ne pouvez répondre qu\'avec un +2 ou un +4, ou piocher les pénalités.',
          };
        }
      } else if (lastPenaltyType === 'wild4') {
        // On +4, cannot stack +2.
        // Also rule states: "Ne pas autoriser un nouvel empilement de +4 sur +4, car cela ne respecte pas la progression strictement croissante."
        return {
          valid: false,
          error: 'Pénalité +4 en cours : aucun empilement possible (pas de +2 sur +4 ni de +4 sur +4). Vous devez piocher les cartes accumulées.',
        };
      }

      return { valid: true };
    }

    // ==========================================
    // Normal play validation
    // ==========================================
    const topCard = this.getTopDiscard();

    // Wild cards are playable anytime if no active penaltyStack (and Rule A passed)
    if (card.color === 'black') {
      return { valid: true };
    }

    // Color match with currentColor
    if (card.color === this.currentColor) {
      return { valid: true };
    }

    // Value/Symbol match with top discard
    if (card.value === topCard.value) {
      return { valid: true };
    }

    return {
      valid: false,
      error: `Coup non autorisé : la carte doit correspondre à la couleur active (${this.getFrenchColor(this.currentColor)}) ou à la valeur (${topCard.value}).`,
    };
  }

  /**
   * Helper to determine if a card can be legally played on the current discard / active color.
   */
  public isCardPlayableNormally(card: Card, handLength: number): boolean {
    if (handLength === 1 && card.color === 'black') {
      return false;
    }
    if (card.color === 'black') {
      return true;
    }
    if (card.color === this.currentColor) {
      return true;
    }
    const topCard = this.getTopDiscard();
    if (topCard && card.value === topCard.value) {
      return true;
    }
    return false;
  }

  /**
   * Execute playing a card.
   */
  public playCard(
    playerId: string,
    cardId: string,
    chosenColor?: PlayableColor
  ): { success: boolean; error?: string } {
    const check = this.canPlayCard(playerId, cardId, chosenColor);
    if (!check.valid) {
      return { success: false, error: check.error };
    }

    // Reset any pending drawn card state on playing
    this.drawnPlayableCard = null;

    const player = this.getCurrentPlayer();
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    const [playedCard] = player.hand.splice(cardIndex, 1);
    player.cardCount = player.hand.length;

    // Discard card
    this.discardPile.push(playedCard);

    // Apply color
    if (playedCard.color === 'black') {
      this.currentColor = chosenColor!;
    } else {
      this.currentColor = playedCard.color as PlayableColor;
    }

    const cardName = this.getCardName(playedCard);

    // Check Win
    if (player.hand.length === 0) {
      this.status = 'game_over';
      this.winner = {
        id: player.id,
        name: player.name,
        cardCount: 0,
        isConnected: player.isConnected,
        isHost: player.isHost,
        hasCalledUno: true,
      };
      this.lastActionMessage = `🏆 ${player.name} a posé sa dernière carte (${cardName}) et gagne la partie !`;
      return { success: true };
    }

    // Check UNO status
    if (player.hand.length === 1) {
      if (!player.hasCalledUno) {
        // Player has 1 card but hasn't called UNO yet
        // In Sekouno, notice is logged; players have an opportunity to challenge if not called.
        this.lastActionMessage = `${player.name} pose ${cardName} et n'a plus qu'une seule carte !`;
      } else {
        this.lastActionMessage = `${player.name} pose ${cardName} et crie UNO ! 🔥`;
      }
    } else {
      // Reset uno status if having more than 1 card
      player.hasCalledUno = false;
      this.lastActionMessage = `${player.name} a joué ${cardName}.`;
    }

    // Apply card special actions
    if (playedCard.value === 'draw2') {
      const added = 2;
      const currentTotal = this.penaltyStack ? this.penaltyStack.totalCards + added : added;
      this.advanceTurn(1);
      const targetPlayer = this.getCurrentPlayer();
      this.penaltyStack = {
        cardType: 'draw2',
        totalCards: currentTotal,
        targetPlayerId: targetPlayer.id,
      };
      this.lastActionMessage = `${player.name} a joué ${cardName} ! Pénalité cumulée : +${currentTotal} pour ${targetPlayer.name}.`;
    } else if (playedCard.value === 'wild4') {
      const added = 4;
      const currentTotal = this.penaltyStack ? this.penaltyStack.totalCards + added : added;
      this.advanceTurn(1);
      const targetPlayer = this.getCurrentPlayer();
      this.penaltyStack = {
        cardType: 'wild4',
        totalCards: currentTotal,
        targetPlayerId: targetPlayer.id,
      };
      this.lastActionMessage = `${player.name} a joué ${cardName} (Nouvelle couleur : ${this.getFrenchColor(this.currentColor)}) ! Pénalité cumulée : +${currentTotal} pour ${targetPlayer.name}.`;
    } else if (playedCard.value === 'skip') {
      this.advanceTurn(1);
      const skippedPlayer = this.getCurrentPlayer();
      this.advanceTurn(1);
      this.lastActionMessage = `${player.name} a joué Passe ton tour ! Le tour de ${skippedPlayer.name} est sauté.`;
    } else if (playedCard.value === 'reverse') {
      if (this.players.length === 2) {
        // In 2 player UNO, reverse behaves like a skip
        this.advanceTurn(1);
        const skipped = this.getCurrentPlayer();
        this.advanceTurn(1);
        this.lastActionMessage = `${player.name} a joué Inversion ! ${skipped.name} passe son tour.`;
      } else {
        this.direction = (this.direction * -1) as 1 | -1;
        this.advanceTurn(1);
        this.lastActionMessage = `${player.name} a inversé le sens du jeu !`;
      }
    } else {
      // Normal number or regular wild
      this.advanceTurn(1);
      if (playedCard.color === 'black') {
        this.lastActionMessage = `${player.name} a choisi la couleur ${this.getFrenchColor(this.currentColor)}.`;
      }
    }

    return { success: true };
  }

  /**
   * Player draws card(s).
   * If there is an active penaltyStack, player takes all stacked penalty cards and loses their turn.
   * If normal turn, player draws 1 card.
   * If the drawn card is playable, player has the opportunity to play it or pass.
   * Otherwise, the turn passes automatically to the next player.
   */
  public drawCard(playerId: string): { success: boolean; drawnCards: Card[]; canPlayDrawnCard?: boolean; error?: string } {
    if (this.status !== 'in_game') {
      return { success: false, drawnCards: [], error: 'La partie n\'est pas en cours.' };
    }

    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { success: false, drawnCards: [], error: 'Ce n\'est pas votre tour de piocher !' };
    }

    // If player already drew a playable card and has pending option to play or pass, prevent drawing again
    if (this.drawnPlayableCard && this.drawnPlayableCard.playerId === playerId) {
      return {
        success: false,
        drawnCards: [],
        error: 'Vous avez déjà pioché une carte jouable : posez-la ou cliquez sur Passer le tour !',
      };
    }

    const drawnCards: Card[] = [];

    if (this.penaltyStack) {
      const penaltyCount = this.penaltyStack.totalCards;
      this.ensureDrawPile(penaltyCount);

      const actualDrawCount = Math.min(penaltyCount, this.drawPile.length);
      for (let i = 0; i < actualDrawCount; i++) {
        if (this.drawPile.length > 0) {
          drawnCards.push(this.drawPile.pop()!);
        }
      }

      currentPlayer.hand.push(...drawnCards);
      currentPlayer.cardCount = currentPlayer.hand.length;
      currentPlayer.hasCalledUno = false;

      this.lastActionMessage = `${currentPlayer.name} ne peut pas surenchérir et encaisse la pénalité de +${penaltyCount} cartes !`;
      this.penaltyStack = null;
      this.drawnPlayableCard = null;

      // Turn passes to the next player
      this.advanceTurn(1);
      return { success: true, drawnCards, canPlayDrawnCard: false };
    }

    // Normal draw: draw 1 card
    this.ensureDrawPile(1);
    if (this.drawPile.length > 0) {
      const card = this.drawPile.pop()!;
      drawnCards.push(card);
      currentPlayer.hand.push(card);
      currentPlayer.cardCount = currentPlayer.hand.length;

      // Drawing a card resets UNO call if player had 1 card before
      if (currentPlayer.hand.length > 1) {
        currentPlayer.hasCalledUno = false;
      }

      // Check if newly drawn card is playable
      const isPlayable = this.isCardPlayableNormally(card, currentPlayer.hand.length);
      if (isPlayable) {
        // Player has the right to play it before the next player's turn, or pass
        this.drawnPlayableCard = { playerId: currentPlayer.id, cardId: card.id };
        this.lastActionMessage = `${currentPlayer.name} a pioché ${this.getCardName(card)} (jouable) ! Il peut la poser ou passer son tour.`;
        return { success: true, drawnCards, canPlayDrawnCard: true };
      }
    }

    // Not playable: turn passes to next player automatically
    this.drawnPlayableCard = null;
    this.lastActionMessage = `${currentPlayer.name} a pioché une carte.`;
    this.advanceTurn(1);

    return { success: true, drawnCards, canPlayDrawnCard: false };
  }

  /**
   * Pass turn: Allowed ONLY when the player drew a playable card and chooses not to play it.
   */
  public passTurn(playerId: string): { success: boolean; error?: string } {
    if (this.status !== 'in_game') {
      return { success: false, error: 'La partie n\'est pas en cours.' };
    }

    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Ce n\'est pas votre tour de jouer !' };
    }

    if (!this.drawnPlayableCard || this.drawnPlayableCard.playerId !== playerId) {
      return {
        success: false,
        error: 'Vous ne pouvez passer votre tour que si vous venez de piocher une carte jouable !',
      };
    }

    this.drawnPlayableCard = null;
    this.lastActionMessage = `${currentPlayer.name} a pioché et passe son tour.`;
    this.advanceTurn(1);

    return { success: true };
  }

  /**
   * UNO Call by the player.
   */
  public callUno(playerId: string): { success: boolean; error?: string } {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Joueur introuvable.' };

    if (player.hand.length > 2) {
      return { success: false, error: 'Vous ne pouvez déclarer UNO que lorsqu\'il vous reste 1 ou 2 cartes !' };
    }

    player.hasCalledUno = true;
    this.unoNotice = {
      playerId: player.id,
      playerName: player.name,
      timestamp: Date.now(),
    };
    this.lastActionMessage = `🔥 ${player.name} a déclaré UNO !`;
    return { success: true };
  }

  /**
   * Contre-UNO: If another player has exactly 1 card and failed to call UNO,
   * any opponent can catch them and give them 2 penalty cards.
   */
  public catchUno(callerId: string, targetPlayerId: string): { success: boolean; error?: string } {
    const target = this.players.find(p => p.id === targetPlayerId);
    const caller = this.players.find(p => p.id === callerId);

    if (!target || !caller) {
      return { success: false, error: 'Joueur introuvable.' };
    }

    if (target.hand.length !== 1) {
      return { success: false, error: `${target.name} n'a pas exactement 1 carte.` };
    }

    if (target.hasCalledUno) {
      return { success: false, error: `${target.name} a déjà déclaré UNO !` };
    }

    // Apply 2 penalty cards
    this.ensureDrawPile(2);
    const penalty: Card[] = [];
    for (let i = 0; i < 2; i++) {
      if (this.drawPile.length > 0) {
        penalty.push(this.drawPile.pop()!);
      }
    }
    target.hand.push(...penalty);
    target.cardCount = target.hand.length;
    target.hasCalledUno = false;

    this.lastActionMessage = `⚡ CONTRE-UNO ! ${caller.name} a pris ${target.name} en flagrant délit (+2 cartes de pénalité) !`;
    return { success: true };
  }

  /**
   * Host Penalty: The creator of the room can give a penalty (e.g. +2 cards for forgetting UNO, or custom fault)
   * to any player at any time.
   */
  public hostGivePenalty(hostId: string, targetPlayerId: string, count: number = 2): { success: boolean; error?: string } {
    const host = this.players.find(p => p.id === hostId);
    if (!host || !host.isHost) {
      return { success: false, error: "Seul l'hôte du salon peut infliger une pénalité." };
    }

    const target = this.players.find(p => p.id === targetPlayerId);
    if (!target) {
      return { success: false, error: 'Joueur introuvable.' };
    }

    const safeCount = Math.max(1, Math.min(count, 10));
    this.ensureDrawPile(safeCount);

    const penalizedCards: Card[] = [];
    for (let i = 0; i < safeCount; i++) {
      if (this.drawPile.length > 0) {
        penalizedCards.push(this.drawPile.pop()!);
      }
    }

    target.hand.push(...penalizedCards);
    target.cardCount = target.hand.length;
    target.hasCalledUno = false;

    this.lastActionMessage = `⚠️ Pénalité de l'Hôte : ${target.name} reçoit +${safeCount} cartes !`;
    return { success: true };
  }

  /**
   * Get public game state for broadcasting.
   * Strips all private card hands and session tokens.
   */
  public getPublicState(hostId: string): GameStatePublic {
    return {
      roomCode: this.roomCode,
      status: this.status,
      hostId,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        cardCount: p.cardCount,
        isConnected: p.isConnected,
        isHost: p.isHost,
        hasCalledUno: p.hasCalledUno,
      })),
      currentTurnPlayerId: this.status === 'in_game' ? this.getCurrentPlayer().id : null,
      direction: this.direction,
      topDiscard: this.getTopDiscard() || null,
      currentColor: this.currentColor,
      drawPileCount: this.drawPile.length,
      discardPileCount: this.discardPile.length,
      penaltyStack: this.penaltyStack,
      winner: this.winner,
      lastActionMessage: this.lastActionMessage,
      unoNotice: this.unoNotice,
      drawnCardPlayableId: this.drawnPlayableCard ? this.drawnPlayableCard.cardId : null,
    };
  }

  private getCardName(card: Card): string {
    if (card.color === 'black') {
      return card.value === 'wild' ? 'Changement de couleur' : '+4 Super Joker';
    }
    const color = this.getFrenchColor(card.color as PlayableColor);
    if (card.value === 'draw2') return `+2 ${color}`;
    if (card.value === 'skip') return `Passe ton tour ${color}`;
    if (card.value === 'reverse') return `Inversion ${color}`;
    return `${card.value} ${color}`;
  }

  private getFrenchColor(c: PlayableColor): string {
    switch (c) {
      case 'red': return 'Rouge';
      case 'blue': return 'Bleu';
      case 'green': return 'Vert';
      case 'yellow': return 'Jaune';
    }
  }
}
