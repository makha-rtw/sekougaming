import { RoleId } from '../types/game';

// Voice TTS narration manager for Sekou-Gaming Loup-Garou
class NarrationAudio {
  private currentAudio: HTMLAudioElement | null = null;
  public enabled: boolean = true;
  private queue: string[] = [];
  private isPlayingQueue: boolean = false;
  private onStateChangeListeners: Set<(isPlaying: boolean, currentTrack: string | null) => void> = new Set();
  public currentTrack: string | null = null;

  private audioBlobs: Map<string, string> = new Map();

  // Register preloaded Blob URL for instant zero-latency playback
  registerAudioBlob(src: string, blobUrl: string) {
    this.audioBlobs.set(src, blobUrl);
  }

  getPlayableSrc(src: string): string {
    return this.audioBlobs.get(src) || src;
  }

  // Subscribe to playback changes (for UI play/pause indicators)
  subscribe(listener: (isPlaying: boolean, currentTrack: string | null) => void) {
    this.onStateChangeListeners.add(listener);
    return () => this.onStateChangeListeners.delete(listener);
  }

  private notify() {
    const playing = this.isPlaying();
    this.onStateChangeListeners.forEach(listener => listener(playing, this.currentTrack));
  }

  // Play a single audio file with optional completion callback
  play(src: string, onEnded?: () => void): HTMLAudioElement | null {
    if (!this.enabled || typeof window === 'undefined') {
      onEnded?.();
      return null;
    }

    this.stop();

    try {
      const resolvedSrc = this.getPlayableSrc(src);
      const audio = new Audio(resolvedSrc);
      this.currentAudio = audio;
      this.currentTrack = src;
      this.notify();

      audio.addEventListener('ended', () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          this.currentTrack = null;
          this.notify();
        }
        onEnded?.();
      }, { once: true });

      audio.addEventListener('error', () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          this.currentTrack = null;
          this.notify();
        }
        onEnded?.();
      }, { once: true });

      audio.play().catch(() => {
        // Autoplay may be restricted before first user interaction
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          this.currentTrack = null;
          this.notify();
        }
        onEnded?.();
      });

      return audio;
    } catch {
      onEnded?.();
      return null;
    }
  }

  // Play a chained sequence of audio files (e.g. dawn wake up -> discovery -> death count)
  playSequence(tracks: string[], onAllEnded?: () => void) {
    if (!this.enabled || tracks.length === 0) {
      onAllEnded?.();
      return;
    }

    this.stop();
    this.queue = [...tracks];
    this.isPlayingQueue = true;

    const playNext = () => {
      if (!this.isPlayingQueue || this.queue.length === 0) {
        this.isPlayingQueue = false;
        this.currentTrack = null;
        this.notify();
        onAllEnded?.();
        return;
      }

      const nextSrc = this.queue.shift()!;
      this.play(nextSrc, () => {
        if (this.isPlayingQueue) {
          playNext();
        }
      });
    };

    playNext();
  }

  stop() {
    this.isPlayingQueue = false;
    this.queue = [];
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // Ignore audio pause errors
      }
      this.currentAudio = null;
    }
    this.currentTrack = null;
    this.notify();
  }

  isPlaying(): boolean {
    return !!this.currentAudio && !this.currentAudio.paused;
  }

  // ---------------- Specific Narration Methods ----------------

  // 1. Village falls asleep
  playVillageSleeps(onEnded?: () => void) {
    return this.play('/audio_tts/le_village_sendort/sendort.mp3', onEnded);
  }

  // 2. Role wake up calls during night
  getRoleWakeUpSrc(roleId: RoleId): string | null {
    switch (roleId) {
      case 'voleur':
        return '/audio_tts/voleur/reveil_du_voleur.mp3';
      case 'cupidon':
        return '/audio_tts/cupidon/reveil.mp3';
      case 'voyante':
        return '/audio_tts/voyante/reveil.mp3';
      case 'salvateur':
        return '/audio_tts/salvateur/reveil.mp3';
      case 'loup_garou':
        return '/audio_tts/loup_garou/reveil.mp3';
      case 'grand_mechant_loup':
        return '/audio_tts/grand_mechant_loup/reveil.mp3';
      case 'loup_blanc':
        return '/audio_tts/loup_blanc/reveil.mp3';
      case 'pyromane':
        return '/audio_tts/pyromane/reveil.mp3';
      case 'sorciere':
        return '/audio_tts/sorciere/reveil.mp3';
      case 'renard':
        return '/audio_tts/renard/reveil.mp3';
      default:
        return null;
    }
  }

  playRoleWakeUp(roleId: RoleId, onEnded?: () => void) {
    const src = this.getRoleWakeUpSrc(roleId);
    if (!src) {
      onEnded?.();
      return null;
    }
    return this.play(src, onEnded);
  }

  // 3. Renard results
  playRenardResult(hasWolf: boolean, onEnded?: () => void) {
    const src = hasWolf
      ? '/audio_tts/renard/le_renard_conserve_ses_pouvoirs.mp3'
      : '/audio_tts/renard/le_renard_perd_ses_pouvoirs.mp3';
    return this.play(src, onEnded);
  }

  // 4. Village wakes up + macabre discovery + death count sequence
  playVillageWakeUpSequence(deathsCount: number, onEnded?: () => void) {
    const sequence: string[] = ['/audio_tts/le_village_se_reveille/reveil.mp3'];

    if (deathsCount === 0) {
      sequence.push('/audio_tts/bilan_avant_conseil/nombre_de_morts/aucun_mort.mp3');
    } else {
      sequence.push('/audio_tts/bilan_avant_conseil/decouverte_macabre.mp3');

      switch (deathsCount) {
        case 1:
          sequence.push('/audio_tts/bilan_avant_conseil/nombre_de_morts/un_mort.mp3');
          break;
        case 2:
          sequence.push('/audio_tts/bilan_avant_conseil/nombre_de_morts/deux_mort.mp3');
          break;
        case 3:
          sequence.push('/audio_tts/bilan_avant_conseil/nombre_de_morts/trois_mort.mp3');
          break;
        case 4:
          sequence.push('/audio_tts/bilan_avant_conseil/nombre_de_morts/quatre_mort.mp3');
          break;
        case 5:
          sequence.push('/audio_tts/bilan_avant_conseil/nombre_de_morts/cinq_mort.mp3');
          break;
        default:
          sequence.push('/audio_tts/bilan_avant_conseil/nombre_de_morts/six_mort.mp3');
          break;
      }
    }

    this.playSequence(sequence, onEnded);
  }

  // 5. Village council / debate start
  playCouncilDebateStart(onEnded?: () => void) {
    return this.play('/audio_tts/debut_conseil/le_conseil_debute.mp3', onEnded);
  }
}

export const narration = new NarrationAudio();
