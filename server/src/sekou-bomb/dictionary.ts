import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BombLanguage, BombValidationErrorCode, WordRepetitionPolicy } from '../../../shared/sekouBombTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DictionaryMetadata {
  language: BombLanguage;
  wordCount: number;
  canonicalCount: number;
  licensePath: string;
  licenseSummary: string;
  hasLicenseFile: boolean;
}

export interface WordValidationResult {
  valid: boolean;
  errorCode?: BombValidationErrorCode;
  normalizedKey?: string; // Uppercase ASCII canonical key (e.g. "TELEPHONE")
  canonicalWord?: string; // Authentic dictionary form (e.g. "téléphone")
  lettersInWord?: string[]; // Distinct uppercase A-Z letters present in the word
}

/**
 * Resolves a path inside the root `data/` folder across dev (tsx), test (vitest), and prod (server/dist).
 */
export function resolveDataPath(...segments: string[]): string {
  const candidates = [
    path.resolve(process.cwd(), 'data', ...segments),
    path.resolve(__dirname, '../../../data', ...segments),
    path.resolve(__dirname, '../../../../data', ...segments),
    path.resolve(__dirname, '../../../../../data', ...segments),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

/**
 * Expands ligatures and strips diacritics from a single character or string, returning uppercase A-Z.
 */
export function foldToAsciiUpper(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-']/g, '')
    .toUpperCase();
}

/**
 * Normalizes raw user input while preserving accents for strict diacritic verification.
 */
export function cleanRawInput(raw: string): string {
  return raw
    .trim()
    .normalize('NFC')
    .replace(/[’‘`]/g, "'")
    .replace(/[–—]/g, '-')
    .toLowerCase();
}

/**
 * Checks whether raw input has a valid lexical structure (no numbers, HTML, symbols, or malformed punctuation).
 */
export function isWellFormedWordInput(cleaned: string, language: BombLanguage): boolean {
  if (!cleaned || cleaned.length < 2 || cleaned.length > 45) {
    return false;
  }

  // Disallow leading/trailing hyphen or apostrophe, or consecutive hyphens/apostrophes
  if (/^[-']|[-']$|[-']{2,}/.test(cleaned)) {
    return false;
  }

  if (language === 'fr') {
    return /^[a-zàâäéèêëîïôöùûüÿçœæ'-]+$/i.test(cleaned);
  } else {
    return /^[a-z'-]+$/i.test(cleaned);
  }
}

/**
 * Verifies that every explicitly accented character in `userCleaned` matches the corresponding character
 * in `dictCandidate` (while allowing unaccented base letters in `userCleaned` to match accented letters in `dictCandidate`).
 */
function isDiacriticCompatible(userCleaned: string, dictCandidate: string): boolean {
  const u = userCleaned.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[-']/g, '');
  const d = dictCandidate.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[-']/g, '');

  if (u.length !== d.length) return false;

  for (let i = 0; i < u.length; i++) {
    const uChar = u[i];
    const dChar = d[i];

    if (uChar === dChar) continue;

    // Check if uChar is an unaccented ASCII letter (a-z)
    const isUnaccentedAscii = uChar >= 'a' && uChar <= 'z';
    if (!isUnaccentedAscii) {
      // User typed an explicit accent (e.g. ë, è, ö) that does NOT match the dictionary's character at this position!
      return false;
    }

    // uChar is unaccented ASCII; verify its base letter matches dChar's base letter
    const dBase = dChar.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (uChar !== dBase) {
      return false;
    }
  }

  return true;
}

class LanguageDictionary {
  public readonly language: BombLanguage;
  private foldedToCandidates: Map<string, string[]> = new Map();
  private exactWords: Set<string> = new Set();
  private licensePath: string;
  private licenseSummary: string = 'CC0 1.0 Universal (Public Domain)';

  constructor(language: BombLanguage) {
    this.language = language;
    const wordsPath = resolveDataPath('dictionaries', language, 'words.txt');
    this.licensePath = resolveDataPath('dictionaries', language, 'LICENSE.md');

    if (!fs.existsSync(wordsPath)) {
      throw new Error(`Fichier dictionnaire introuvable pour '${language}' : ${wordsPath}`);
    }

    const content = fs.readFileSync(wordsPath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const w = line.trim().normalize('NFC').toLowerCase();
      if (w.length < 2) continue;

      const folded = foldToAsciiUpper(w);
      if (folded.length < 2 || !/^[A-Z]+$/.test(folded)) continue;

      this.exactWords.add(w);
      const list = this.foldedToCandidates.get(folded);
      if (list) {
        if (!list.includes(w)) list.push(w);
      } else {
        this.foldedToCandidates.set(folded, [w]);
      }
    }
  }

  public getMetadata(): DictionaryMetadata {
    return {
      language: this.language,
      wordCount: this.exactWords.size,
      canonicalCount: this.foldedToCandidates.size,
      licensePath: this.licensePath,
      licenseSummary: this.licenseSummary,
      hasLicenseFile: fs.existsSync(this.licensePath),
    };
  }

  public hasFoldedKey(foldedKey: string): boolean {
    return this.foldedToCandidates.has(foldedKey);
  }

  public getAllFoldedKeys(): IterableIterator<string> {
    return this.foldedToCandidates.keys();
  }

  public validateSubmission(
    rawInput: string,
    requiredPrompt: string,
    usedWords: Set<string>,
    repetitionPolicy: WordRepetitionPolicy = 'forbid'
  ): WordValidationResult {
    if (typeof rawInput !== 'string' || rawInput.trim().length === 0) {
      return { valid: false, errorCode: 'empty_input' };
    }

    const cleaned = cleanRawInput(rawInput);
    if (!isWellFormedWordInput(cleaned, this.language)) {
      return { valid: false, errorCode: 'malformed_input' };
    }

    const foldedKey = foldToAsciiUpper(cleaned);
    const normalizedPrompt = foldToAsciiUpper(requiredPrompt);

    if (foldedKey.length < 2 || !/^[A-Z]+$/.test(foldedKey)) {
      return { valid: false, errorCode: 'malformed_input' };
    }

    // 1. Check that the word contains the required contiguous letter combination
    if (!foldedKey.includes(normalizedPrompt)) {
      return { valid: false, errorCode: 'missing_prompt' };
    }

    // 2. Check that the word exists in the active dictionary and satisfies diacritic compatibility
    const candidates = this.foldedToCandidates.get(foldedKey);
    if (!candidates || candidates.length === 0) {
      return { valid: false, errorCode: 'word_not_in_dictionary' };
    }

    // Find matching canonical form (exact match first, then diacritic-compatible match)
    let matchedCanonical: string | undefined = candidates.find((c) => c === cleaned);
    if (!matchedCanonical) {
      matchedCanonical = candidates.find((c) => isDiacriticCompatible(cleaned, c));
    }

    if (!matchedCanonical) {
      return { valid: false, errorCode: 'word_not_in_dictionary' };
    }

    // 3. Check repetition rule
    if (repetitionPolicy === 'forbid' && usedWords.has(foldedKey)) {
      return { valid: false, errorCode: 'already_used' };
    }

    const distinctLetters = Array.from(new Set(foldedKey.split('')));

    return {
      valid: true,
      normalizedKey: foldedKey,
      canonicalWord: matchedCanonical,
      lettersInWord: distinctLetters,
    };
  }
}

const dictionaryCache: Partial<Record<BombLanguage, LanguageDictionary>> = {};

export function getDictionary(language: BombLanguage): LanguageDictionary {
  if (!dictionaryCache[language]) {
    dictionaryCache[language] = new LanguageDictionary(language);
  }
  return dictionaryCache[language]!;
}
