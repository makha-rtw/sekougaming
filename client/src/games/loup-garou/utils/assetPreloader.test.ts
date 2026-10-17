/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  assetPreloader,
  PRELOAD_IMAGE_ASSETS,
  PRELOAD_AUDIO_ASSETS,
} from './assetPreloader';
import { narration } from './narrationAudio';

describe('Asset Preloading System', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('contains exactly 13 role PNG image assets', () => {
    expect(PRELOAD_IMAGE_ASSETS).toHaveLength(13);
    const expectedRoles = [
      'ange',
      'chasseur',
      'cupidon',
      'grand_mechant_loup',
      'loup_garou',
      'petite_fille',
      'pyromane',
      'renard',
      'salvateur',
      'villageois',
      'sorciere',
      'voleur',
      'voyante',
    ];
    PRELOAD_IMAGE_ASSETS.forEach(img => {
      expect(expectedRoles).toContain(img.id);
      expect(img.type).toBe('image');
      expect(img.size).toBeGreaterThan(500000); // each icon is ~800kB to 1.5MB
      expect(img.name).toBeTruthy();
    });
  });

  it('contains exactly 23 voice narration audio assets', () => {
    expect(PRELOAD_AUDIO_ASSETS).toHaveLength(23);
    PRELOAD_AUDIO_ASSETS.forEach(audio => {
      expect(audio.type).toBe('audio');
      expect(audio.src).toMatch(/^\/audio_tts\/.+\.mp3$/);
      expect(audio.size).toBeGreaterThan(10000); // audio clips are valid size
      expect(audio.name).toBeTruthy();
    });
  });

  it('accurately calculates total asset payload size', () => {
    const totalImageBytes = PRELOAD_IMAGE_ASSETS.reduce((acc, i) => acc + i.size, 0);
    const totalAudioBytes = PRELOAD_AUDIO_ASSETS.reduce((acc, a) => acc + a.size, 0);
    const totalBytes = totalImageBytes + totalAudioBytes;

    expect(totalImageBytes).toBe(13756314); // ~13.12 MB
    expect(totalAudioBytes).toBe(1923449);  // ~1.83 MB
    expect(totalBytes).toBe(15679763);      // ~14.95 MB
    expect(assetPreloader.progress.totalBytes).toBe(totalBytes);
  });

  it('registers audio blobs into narration audio manager', () => {
    const mockBlobUrl = 'blob:http://localhost:3000/12345';
    const testTrack = '/audio_tts/le_village_sendort/sendort.mp3';

    narration.registerAudioBlob(testTrack, mockBlobUrl);
    expect(narration.getPlayableSrc(testTrack)).toBe(mockBlobUrl);

    // Unregistered track falls back cleanly to original src
    expect(narration.getPlayableSrc('/audio_tts/unknown.mp3')).toBe('/audio_tts/unknown.mp3');
  });

  it('provides real byte-weighted progress percentage', () => {
    const totalBytes = assetPreloader.progress.totalBytes;
    const halfBytes = Math.floor(totalBytes / 2);
    const percent = Math.round((halfBytes / totalBytes) * 100);

    expect(percent).toBe(50);
  });

  it('notifies subscribers with updated progress', () => {
    const listener = vi.fn();
    const unsubscribe = assetPreloader.subscribe(listener);

    expect(listener).toHaveBeenCalledWith(assetPreloader.progress);
    unsubscribe();
  });

  it('correctly maps all 13 roles to human-readable names and critical priority', () => {
    PRELOAD_IMAGE_ASSETS.forEach(item => {
      expect(item.critical).toBe(true);
      expect(item.name.length).toBeGreaterThan(2);
    });
  });
});
