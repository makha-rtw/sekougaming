/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ROLE_CUSTOM_ICONS } from '../assets/roleCustomIcons';
import { narration } from './narrationAudio';

export interface AssetItem {
  id: string;
  type: 'image' | 'audio';
  name: string;
  src: string;
  size: number;
  critical: boolean;
}

export type LoadingStage = 'init' | 'images' | 'audio' | 'verifying' | 'ready' | 'error';

export interface PreloadProgress {
  stage: LoadingStage;
  currentLabel: string;
  currentSubLabel: string;
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  loadedImagesCount: number;
  totalImagesCount: number;
  loadedAudioCount: number;
  totalAudioCount: number;
  failedItems: { item: AssetItem; error: string }[];
  isComplete: boolean;
}

// 1. Definition of the 13 role PNG icons
export const PRELOAD_IMAGE_ASSETS: AssetItem[] = [
  { id: 'ange', type: 'image', name: 'Ange', src: ROLE_CUSTOM_ICONS['ange'] || '', size: 949297, critical: true },
  { id: 'chasseur', type: 'image', name: 'Chasseur', src: ROLE_CUSTOM_ICONS['chasseur'] || '', size: 933906, critical: true },
  { id: 'cupidon', type: 'image', name: 'Cupidon', src: ROLE_CUSTOM_ICONS['cupidon'] || '', size: 945143, critical: true },
  { id: 'grand_mechant_loup', type: 'image', name: 'Grand Méchant Loup', src: ROLE_CUSTOM_ICONS['grand_mechant_loup'] || '', size: 1499048, critical: true },
  { id: 'loup_garou', type: 'image', name: 'Loup-Garou', src: ROLE_CUSTOM_ICONS['loup_garou'] || '', size: 1284640, critical: true },
  { id: 'petite_fille', type: 'image', name: 'Petite Fille', src: ROLE_CUSTOM_ICONS['petite_fille'] || '', size: 1384595, critical: true },
  { id: 'pyromane', type: 'image', name: 'Pyromane', src: ROLE_CUSTOM_ICONS['pyromane'] || '', size: 933977, critical: true },
  { id: 'renard', type: 'image', name: 'Renard', src: ROLE_CUSTOM_ICONS['renard'] || '', size: 961301, critical: true },
  { id: 'salvateur', type: 'image', name: 'Salvateur', src: ROLE_CUSTOM_ICONS['salvateur'] || '', size: 852547, critical: true },
  { id: 'villageois', type: 'image', name: 'Simple Villageois', src: ROLE_CUSTOM_ICONS['villageois'] || '', size: 826980, critical: true },
  { id: 'sorciere', type: 'image', name: 'Sorcière', src: ROLE_CUSTOM_ICONS['sorciere'] || '', size: 1214279, critical: true },
  { id: 'voleur', type: 'image', name: 'Voleur', src: ROLE_CUSTOM_ICONS['voleur'] || '', size: 895218, critical: true },
  { id: 'voyante', type: 'image', name: 'Voyante', src: ROLE_CUSTOM_ICONS['voyante'] || '', size: 1075383, critical: true },
];

// 2. Definition of the 23 voice narration audio files
export const PRELOAD_AUDIO_ASSETS: AssetItem[] = [
  { id: 'sendort', type: 'audio', name: 'Le village s\'endort', src: '/audio_tts/le_village_sendort/sendort.mp3', size: 44522, critical: true },
  { id: 'voleur', type: 'audio', name: 'Réveil du Voleur', src: '/audio_tts/voleur/reveil_du_voleur.mp3', size: 108470, critical: true },
  { id: 'cupidon', type: 'audio', name: 'Réveil de Cupidon', src: '/audio_tts/cupidon/reveil.mp3', size: 103454, critical: true },
  { id: 'voyante', type: 'audio', name: 'Réveil de la Voyante', src: '/audio_tts/voyante/reveil.mp3', size: 132711, critical: true },
  { id: 'salvateur', type: 'audio', name: 'Réveil du Salvateur', src: '/audio_tts/salvateur/reveil.mp3', size: 140234, critical: true },
  { id: 'loup_garou', type: 'audio', name: 'Réveil des Loups-Garous', src: '/audio_tts/loup_garou/reveil.mp3', size: 109723, critical: true },
  { id: 'grand_mechant_loup', type: 'audio', name: 'Réveil du Grand Méchant Loup', src: '/audio_tts/grand_mechant_loup/reveil.mp3', size: 84228, critical: true },
  { id: 'loup_blanc', type: 'audio', name: 'Réveil du Loup Blanc', src: '/audio_tts/loup_blanc/reveil.mp3', size: 107216, critical: true },
  { id: 'pyromane', type: 'audio', name: 'Réveil du Pyromane', src: '/audio_tts/pyromane/reveil.mp3', size: 141906, critical: true },
  { id: 'sorciere', type: 'audio', name: 'Réveil de la Sorcière', src: '/audio_tts/sorciere/reveil.mp3', size: 145668, critical: true },
  { id: 'renard', type: 'audio', name: 'Réveil du Renard', src: '/audio_tts/renard/reveil.mp3', size: 95513, critical: true },
  { id: 'renard_conserve', type: 'audio', name: 'Sentence Renard : Pouvoir conservé', src: '/audio_tts/renard/le_renard_conserve_ses_pouvoirs.mp3', size: 52045, critical: true },
  { id: 'renard_perd', type: 'audio', name: 'Sentence Renard : Pouvoir perdu', src: '/audio_tts/renard/le_renard_perd_ses_pouvoirs.mp3', size: 50791, critical: true },
  { id: 'reveil_village', type: 'audio', name: 'Le village se réveille', src: '/audio_tts/le_village_se_reveille/reveil.mp3', size: 174925, critical: true },
  { id: 'aucun_mort', type: 'audio', name: 'Bilan : Aucun mort', src: '/audio_tts/bilan_avant_conseil/nombre_de_morts/aucun_mort.mp3', size: 48283, critical: true },
  { id: 'decouverte_macabre', type: 'audio', name: 'Découverte macabre', src: '/audio_tts/bilan_avant_conseil/decouverte_macabre.mp3', size: 39506, critical: true },
  { id: 'un_mort', type: 'audio', name: 'Bilan : 1 mort', src: '/audio_tts/bilan_avant_conseil/nombre_de_morts/un_mort.mp3', size: 45776, critical: true },
  { id: 'deux_morts', type: 'audio', name: 'Bilan : 2 morts', src: '/audio_tts/bilan_avant_conseil/nombre_de_morts/deux_mort.mp3', size: 48283, critical: true },
  { id: 'trois_morts', type: 'audio', name: 'Bilan : 3 morts', src: '/audio_tts/bilan_avant_conseil/nombre_de_morts/trois_mort.mp3', size: 50791, critical: true },
  { id: 'quatre_morts', type: 'audio', name: 'Bilan : 4 morts', src: '/audio_tts/bilan_avant_conseil/nombre_de_morts/quatre_mort.mp3', size: 45776, critical: true },
  { id: 'cinq_morts', type: 'audio', name: 'Bilan : 5 morts', src: '/audio_tts/bilan_avant_conseil/nombre_de_morts/cinq_mort.mp3', size: 47030, critical: true },
  { id: 'six_morts', type: 'audio', name: 'Bilan : 6 morts', src: '/audio_tts/bilan_avant_conseil/nombre_de_morts/six_mort.mp3', size: 49537, critical: true },
  { id: 'conseil_debute', type: 'audio', name: 'Le conseil débute', src: '/audio_tts/debut_conseil/le_conseil_debute.mp3', size: 57061, critical: true },
];

// In-memory cache holding decoded images & audio blob URLs
const decodedImages = new Map<string, HTMLImageElement>();
const preloadedAudioBlobs = new Map<string, string>();

class AssetPreloader {
  private listeners = new Set<(progress: PreloadProgress) => void>();
  private isRunning = false;
  private isDone = false;

  public progress: PreloadProgress = {
    stage: 'init',
    currentLabel: 'Préparation du village…',
    currentSubLabel: 'Initialisation du grimoire',
    percent: 0,
    loadedBytes: 0,
    totalBytes: PRELOAD_IMAGE_ASSETS.reduce((s, a) => s + a.size, 0) + PRELOAD_AUDIO_ASSETS.reduce((s, a) => s + a.size, 0),
    loadedImagesCount: 0,
    totalImagesCount: PRELOAD_IMAGE_ASSETS.length,
    loadedAudioCount: 0,
    totalAudioCount: PRELOAD_AUDIO_ASSETS.length,
    failedItems: [],
    isComplete: false,
  };

  subscribe(listener: (progress: PreloadProgress) => void) {
    this.listeners.add(listener);
    listener(this.progress);
    return () => this.listeners.delete(listener);
  }

  private update(patch: Partial<PreloadProgress>) {
    this.progress = { ...this.progress, ...patch };
    this.listeners.forEach(l => l(this.progress));
  }

  isReady(): boolean {
    return this.isDone;
  }

  // Preload an image with decode confirmation & retries
  private async preloadImageItem(item: AssetItem): Promise<void> {
    if (decodedImages.has(item.src)) return;

    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        const img = new Image();
        img.src = item.src;

        if ('decode' in img) {
          await img.decode();
        } else {
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
          });
        }

        decodedImages.set(item.src, img);
        return;
      } catch (err) {
        if (attempts >= 3) {
          throw err;
        }
        await new Promise(r => setTimeout(r, 400 * attempts));
      }
    }
  }

  // Preload audio into Blob URL & register into narration engine
  private async preloadAudioItem(item: AssetItem): Promise<void> {
    if (preloadedAudioBlobs.has(item.src)) return;

    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        const res = await fetch(item.src);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const blob = await res.blob();
        if (blob.size === 0) {
          throw new Error('Fichier audio vide');
        }
        const blobUrl = URL.createObjectURL(blob);
        preloadedAudioBlobs.set(item.src, blobUrl);
        narration.registerAudioBlob(item.src, blobUrl);
        return;
      } catch (err) {
        if (attempts >= 3) {
          throw err;
        }
        await new Promise(r => setTimeout(r, 400 * attempts));
      }
    }
  }

  // Run queue with controlled concurrency (e.g. 3 concurrent downloads)
  private async runQueue<T>(items: T[], worker: (item: T) => Promise<void>, concurrency = 3): Promise<void> {
    const queue = [...items];
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          await worker(item);
        }
      }
    });
    await Promise.all(workers);
  }

  // Main start sequence
  async start(force = false): Promise<boolean> {
    if (this.isDone && !force) {
      return true;
    }
    if (this.isRunning) {
      return false;
    }

    this.isRunning = true;
    const totalBytes = this.progress.totalBytes;
    let loadedBytes = 0;
    let loadedImages = 0;
    let loadedAudios = 0;
    const failures: { item: AssetItem; error: string }[] = [];

    // Reset progress
    this.update({
      stage: 'init',
      currentLabel: 'Préparation du village…',
      currentSubLabel: 'Initialisation des parchemins',
      percent: 0,
      loadedBytes: 0,
      loadedImagesCount: 0,
      loadedAudioCount: 0,
      failedItems: [],
      isComplete: false,
    });

    // 1. Preload Images
    this.update({
      stage: 'images',
      currentLabel: 'Chargement des icônes…',
    });

    await this.runQueue(
      PRELOAD_IMAGE_ASSETS,
      async item => {
        this.update({
          currentSubLabel: `Icône : ${item.name}`,
        });

        try {
          await this.preloadImageItem(item);
          loadedBytes += item.size;
          loadedImages++;
        } catch (e) {
          failures.push({
            item,
            error: e instanceof Error ? e.message : 'Erreur de chargement',
          });
        }

        const pct = Math.min(99, Math.round((loadedBytes / totalBytes) * 100));
        this.update({
          percent: pct,
          loadedBytes,
          loadedImagesCount: loadedImages,
        });
      },
      3
    );

    // 2. Preload Audio
    this.update({
      stage: 'audio',
      currentLabel: 'Préparation des voix du village…',
    });

    await this.runQueue(
      PRELOAD_AUDIO_ASSETS,
      async item => {
        this.update({
          currentSubLabel: `Voix : ${item.name}`,
        });

        try {
          await this.preloadAudioItem(item);
          loadedBytes += item.size;
          loadedAudios++;
        } catch (e) {
          failures.push({
            item,
            error: e instanceof Error ? e.message : 'Erreur audio',
          });
        }

        const pct = Math.min(99, Math.round((loadedBytes / totalBytes) * 100));
        this.update({
          percent: pct,
          loadedBytes,
          loadedAudioCount: loadedAudios,
        });
      },
      3
    );

    // 3. Final Verification
    this.update({
      stage: 'verifying',
      currentLabel: 'Vérification des ressources…',
      currentSubLabel: 'Contrôle d\'intégrité des rôles et sentences',
      percent: 100,
    });

    // Short pause for perceptual confirmation & seamless reveal
    await new Promise(r => setTimeout(r, 350));

    // Check if critical items failed
    const criticalFailures = failures.filter(f => f.item.critical);
    if (criticalFailures.length > 0 && criticalFailures.length >= 3) {
      this.isRunning = false;
      this.update({
        stage: 'error',
        currentLabel: 'Erreur de connexion',
        currentSubLabel: `${failures.length} ressource(s) n'ont pas pu être chargées`,
        failedItems: failures,
      });
      return false;
    }

    // Success!
    this.isRunning = false;
    this.isDone = true;
    this.update({
      stage: 'ready',
      currentLabel: 'Le village s\'éveille…',
      currentSubLabel: 'Ressources prêtes !',
      percent: 100,
      isComplete: true,
      failedItems: failures,
    });

    return true;
  }
}

export const assetPreloader = new AssetPreloader();
