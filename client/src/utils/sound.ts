/**
 * Sekou-Gaming — Sekouno Immersive Audio & Haptics Engine
 * Combines pooled MP3 samples (/sounds/piocher_carte.mp3, /sounds/poser_carte.mp3)
 * with multi-layered Web Audio API acoustic synthesis and mobile haptic feedback.
 */

import { Card, PlayableColor } from '../../../shared/types.js';

class SoundEngine {
  private isMuted: boolean = false;
  private ctx: AudioContext | null = null;
  private drawAudioPool: HTMLAudioElement[] = [];
  private playAudioPool: HTMLAudioElement[] = [];
  private poolIndexDraw: number = 0;
  private poolIndexPlay: number = 0;
  private lastHoverTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedMute = window.localStorage.getItem('sekouno_muted');
        if (savedMute === '1') this.isMuted = true;
      } catch {
        // ignore storage errors
      }

      for (let i = 0; i < 8; i++) {
        const draw = new Audio('/sounds/piocher_carte.mp3');
        draw.preload = 'auto';
        this.drawAudioPool.push(draw);

        const play = new Audio('/sounds/poser_carte.mp3');
        play.preload = 'auto';
        this.playAudioPool.push(play);
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private vibrate(pattern: number | number[]) {
    if (this.isMuted) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore on unsupported devices
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      window.localStorage.setItem('sekouno_muted', muted ? '1' : '0');
    } catch {
      // ignore
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    if (!this.isMuted) {
      this.buttonClick();
    }
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Subtle crisp card paper tick on hover/focus
   */
  public cardHover() {
    if (this.isMuted) return;
    const nowMs = performance.now();
    if (nowMs - this.lastHoverTime < 55) return;
    this.lastHoverTime = nowMs;

    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.018);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  }

  /**
   * Crisp tactile UI click
   */
  public buttonClick() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Sound when a card is placed on the table, enhanced with special card layers
   */
  public playCard(card?: Card) {
    if (this.isMuted) return;
    this.vibrate(18);

    if (this.playAudioPool.length > 0) {
      const audio = this.playAudioPool[this.poolIndexPlay % this.playAudioPool.length];
      this.poolIndexPlay++;
      audio.currentTime = 0;
      audio.playbackRate = 0.96 + Math.random() * 0.08;
      audio.play().catch(() => {
        this.playCardSynthetic();
      });
    } else {
      this.playCardSynthetic();
    }

    if (!card) return;

    // Layer special card signature sound
    if (card.value === 'skip') {
      this.playSkipSound();
    } else if (card.value === 'reverse') {
      this.playReverseSound();
    } else if (card.value === 'draw2' || card.value === 'wild4') {
      this.playAttackSting(card.value === 'wild4');
    } else if (card.value === 'wild') {
      this.playWildShimmer();
    }
  }

  /**
   * Sound when a card is drawn from the deck
   */
  public drawCard(stepIndex = 0) {
    if (this.isMuted) return;
    this.vibrate(12);

    if (this.drawAudioPool.length > 0) {
      const audio = this.drawAudioPool[this.poolIndexDraw % this.drawAudioPool.length];
      this.poolIndexDraw++;
      audio.currentTime = 0;
      audio.playbackRate = Math.min(1.35, 0.95 + stepIndex * 0.05);
      audio.play().catch(() => {
        this.drawCardSynthetic();
      });
      return;
    }
    this.drawCardSynthetic();
  }

  /**
   * Distinct chord tone when selecting a suit color in the Color Picker
   */
  public colorSelect(color: PlayableColor) {
    if (this.isMuted) return;
    this.vibrate(15);
    const ctx = this.getContext();
    if (!ctx) return;

    const rootMap: Record<PlayableColor, number[]> = {
      red: [440, 554.37, 659.25],     // A major
      blue: [392, 493.88, 587.33],    // G major
      green: [523.25, 659.25, 783.99],// C major
      yellow: [587.33, 739.99, 880],  // D major
    };

    const freqs = rootMap[color] || [440, 554.37, 659.25];
    const now = ctx.currentTime;

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.03);

      gain.gain.setValueAtTime(0.001, now + i * 0.03);
      gain.gain.linearRampToValueAtTime(0.14, now + i * 0.03 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + 0.26);
    });
  }

  /**
   * Warm 3-note chime when it becomes your turn
   */
  public myTurn() {
    if (this.isMuted) return;
    this.vibrate([30, 40, 30]);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 987.77]; // C5 - E5 - B5 (lounge vibraphone)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.085);

      gain.gain.setValueAtTime(0.001, now + idx * 0.085);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.085 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.085 + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.085);
      osc.stop(now + idx * 0.085 + 0.4);
    });
  }

  /**
   * Heavy impact when receiving a penalty (+2 / +4 / host penalty)
   */
  public penalty() {
    if (this.isMuted) return;
    this.vibrate([60, 40, 90]);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [311.13, 233.08, 155.56].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + i * 0.07 + 0.22);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now);

      gain.gain.setValueAtTime(0.18, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.26);
    });
  }

  /**
   * Triumphant fanfare when calling UNO / SEKO!
   */
  public uno() {
    if (this.isMuted) return;
    this.vibrate([40, 30, 70]);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66]; // D5 - F#5 - A5 - D6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);

      gain.gain.setValueAtTime(0.001, now + i * 0.055);
      gain.gain.linearRampToValueAtTime(0.22, now + i * 0.055 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + (i === 3 ? 0.42 : 0.2));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + (i === 3 ? 0.45 : 0.22));
    });
  }

  /**
   * Alert whistle when catching an opponent who forgot to call UNO
   */
  public catchUno() {
    if (this.isMuted) return;
    this.vibrate([50, 30, 50, 30, 80]);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [880, 1318.5, 987.77].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.075);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);

      gain.gain.setValueAtTime(0.14, now + i * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.075 + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.075);
      osc.stop(now + i * 0.075 + 0.15);
    });
  }

  /**
   * Celebratory chord sequence when winning the game
   */
  public victory() {
    if (this.isMuted) return;
    this.vibrate([50, 40, 50, 40, 120]);
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.58);
    });
  }

  private playSkipSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [420, 290].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      osc.frequency.exponentialRampToValueAtTime(110, now + i * 0.065 + 0.06);
      gain.gain.setValueAtTime(0.18, now + i * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.07);
    });
  }

  private playReverseSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.11);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.22);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  private playAttackSting(isWild4: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = isWild4 ? [196, 233.08, 293.66] : [220, 261.63];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.045);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);

      gain.gain.setValueAtTime(0.14, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.24);
    });
  }

  private playWildShimmer() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 739.99, 880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.035);
      gain.gain.setValueAtTime(0.1, now + i * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.035 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.035);
      osc.stop(now + i * 0.035 + 0.2);
    });
  }

  private playCardSynthetic() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.075);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  private drawCardSynthetic() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }
}

export const sounds = new SoundEngine();
