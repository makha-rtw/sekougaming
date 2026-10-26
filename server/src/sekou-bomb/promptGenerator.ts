import fs from 'node:fs';
import { BombDifficulty, BombLanguage } from '../../../shared/sekouBombTypes.js';
import { resolveDataPath } from './dictionary.js';

export interface PromptRecord {
  prompt: string;
  length: number;
  matchCount: number;
  difficulty: BombDifficulty;
}

interface PromptDatasetFile {
  language: BombLanguage;
  totalDictionaryWords: number;
  generatedAt: string;
  license: string;
  counts: {
    easy: number;
    normal: number;
    hard: number;
    total: number;
  };
  prompts: PromptRecord[];
}

export class PromptGenerator {
  public readonly language: BombLanguage;
  private allPrompts: PromptRecord[] = [];
  private byDifficulty: Record<BombDifficulty, PromptRecord[]> = {
    easy: [],
    normal: [],
    hard: [],
  };
  private promptLookup: Map<string, PromptRecord> = new Map();

  constructor(language: BombLanguage) {
    this.language = language;
    const filePath = resolveDataPath('prompts', language, 'prompts.json');

    if (!fs.existsSync(filePath)) {
      throw new Error(`Fichier de combinaisons introuvable pour '${language}' : ${filePath}`);
    }

    const parsed: PromptDatasetFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    this.allPrompts = parsed.prompts || [];

    for (const p of this.allPrompts) {
      this.byDifficulty[p.difficulty].push(p);
      this.promptLookup.set(p.prompt, p);
    }
  }

  public getTotalCount(): number {
    return this.allPrompts.length;
  }

  public getCountsByDifficulty(): { easy: number; normal: number; hard: number; total: number } {
    return {
      easy: this.byDifficulty.easy.length,
      normal: this.byDifficulty.normal.length,
      hard: this.byDifficulty.hard.length,
      total: this.allPrompts.length,
    };
  }

  public getPromptInfo(prompt: string): PromptRecord | undefined {
    return this.promptLookup.get(prompt.toUpperCase());
  }

  /**
   * Selects a varied, relevant letter combination based on the room's configured difficulty
   * and current round progression, while avoiding repetitions.
   */
  public pickNextPrompt(
    configuredDifficulty: BombDifficulty,
    usedPrompts: Set<string>,
    lastPrompt?: string,
    roundNumber: number = 1
  ): PromptRecord {
    // Determine target pool distribution based on configured difficulty
    let targetTier: BombDifficulty = configuredDifficulty;
    const roll = Math.random();

    if (configuredDifficulty === 'easy') {
      targetTier = roll < 0.85 ? 'easy' : 'normal';
    } else if (configuredDifficulty === 'normal') {
      // Slight progression over rounds while staying fair
      const hardChance = Math.min(0.3, 0.1 + roundNumber * 0.015);
      if (roll < 0.35) targetTier = 'easy';
      else if (roll < 1 - hardChance) targetTier = 'normal';
      else targetTier = 'hard';
    } else {
      // hard
      targetTier = roll < 0.72 ? 'hard' : 'normal';
    }

    let pool = this.byDifficulty[targetTier];
    if (!pool || pool.length === 0) {
      pool = this.allPrompts;
    }

    // Filter out already used prompts and prompts too similar to the immediate previous prompt
    let candidates = pool.filter((item) => {
      if (usedPrompts.has(item.prompt)) return false;
      if (lastPrompt && (item.prompt.includes(lastPrompt) || lastPrompt.includes(item.prompt))) {
        return false;
      }
      return true;
    });

    // Fallback if all prompts in tier were used
    if (candidates.length === 0) {
      candidates = this.allPrompts.filter((item) => !usedPrompts.has(item.prompt));
    }
    if (candidates.length === 0) {
      usedPrompts.clear();
      candidates = pool;
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    usedPrompts.add(chosen.prompt);
    return chosen;
  }
}

const promptGeneratorCache: Partial<Record<BombLanguage, PromptGenerator>> = {};

export function getPromptGenerator(language: BombLanguage): PromptGenerator {
  if (!promptGeneratorCache[language]) {
    promptGeneratorCache[language] = new PromptGenerator(language);
  }
  return promptGeneratorCache[language]!;
}
