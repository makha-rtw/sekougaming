/**
 * Sekou-Gaming — Sekouno Sound Engine
 * Uses the custom sound files in /sounds with pooling for rapid overlapping playback,
 * plus Web Audio API synthesis for chimes and alerts.
 */

class SoundEngine {
  private isMuted: boolean = false;
  private ctx: AudioContext | null = null;
  private drawAudioPool: HTMLAudioElement[] = [];
  private playAudioPool: HTMLAudioElement[] = [];
  private poolIndexDraw: number = 0;
  private poolIndexPlay: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      // Pre-warm audio pool for zero-latency instant playback
      for (let i = 0; i < 6; i++) {
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
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Sound when a card is placed on the table (poser_carte.mp3).
   */
  public playCard() {
    if (this.isMuted) return;

    if (this.playAudioPool.length > 0) {
      const audio = this.playAudioPool[this.poolIndexPlay % this.playAudioPool.length];
      this.poolIndexPlay++;
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Fallback to synthetic slap if browser blocks audio element before user gesture
        this.playCardSynthetic();
      });
      return;
    }
    this.playCardSynthetic();
  }

  /**
   * Sound when a card is drawn (piocher_carte.mp3).
   * Supports rapid successive calls for +2, +4, +6 penalties.
   */
  public drawCard() {
    if (this.isMuted) return;

    if (this.drawAudioPool.length > 0) {
      const audio = this.drawAudioPool[this.poolIndexDraw % this.drawAudioPool.length];
      this.poolIndexDraw++;
      audio.currentTime = 0;
      audio.play().catch(() => {
        this.drawCardSynthetic();
      });
      return;
    }
    this.drawCardSynthetic();
  }

  /**
   * Notification chime when it's your turn to play.
   */
  public myTurn() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [587.33, 880]; // D5 then A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0, now + idx * 0.09);
      gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.28);
    });
  }

  /**
   * Alert tone when receiving a penalty (+2 / +4).
   */
  public penalty() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.22);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * Fanfare on UNO call.
   */
  public uno() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0.2, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }

  private playCardSynthetic() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.07);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  private drawCardSynthetic() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.08;
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
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.08);
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
