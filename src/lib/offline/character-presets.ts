/**
 * Character presets: preloaded character types (young man, girl, elder, man,
 * woman) that bundle a visual character kind + a matching offline voice type.
 * Selection is persisted to localStorage so it survives reloads.
 */
import type { VoiceGender } from './voice-engine';

export type CharacterPresetId =
  | 'young-man'
  | 'girl'
  | 'elder'
  | 'man'
  | 'woman';

export interface CharacterPreset {
  id: CharacterPresetId;
  label: string;
  emoji: string;
  /** Maps to the visual character kind used by the scene renderer. */
  character: 'realistic' | 'cartoon' | 'fantasy';
  /** Maps to the offline voice engine voice profile. */
  voice: VoiceGender;
  /** Extra hint appended to the prompt when the preset is active. */
  promptHint: string;
  /** Fine-tune the base voice pitch (added on top of profile). */
  pitchAdjust: number;
  rateAdjust: number;
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  { id: 'young-man', label: 'شاب',   emoji: '🧑', character: 'realistic', voice: 'male',   promptHint: 'شاب في العشرينات', pitchAdjust: 0.1,  rateAdjust: 0.05 },
  { id: 'girl',      label: 'بنت',   emoji: '👧', character: 'cartoon',   voice: 'female', promptHint: 'فتاة صغيرة',      pitchAdjust: 0.2,  rateAdjust: 0.1  },
  { id: 'elder',     label: 'عجوز',  emoji: '👴', character: 'realistic', voice: 'elder',  promptHint: 'رجل كبير في السن', pitchAdjust: -0.15, rateAdjust: -0.1 },
  { id: 'man',       label: 'رجل',   emoji: '👨', character: 'realistic', voice: 'male',   promptHint: 'رجل بالغ',        pitchAdjust: 0,    rateAdjust: 0    },
  { id: 'woman',     label: 'امرأة', emoji: '👩', character: 'realistic', voice: 'female', promptHint: 'امرأة بالغة',     pitchAdjust: 0.05, rateAdjust: 0    },
];

const STORAGE_KEY = 'agon_character_preset';

export function getSavedCharacterPreset(): CharacterPresetId | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && CHARACTER_PRESETS.some(p => p.id === v)) return v as CharacterPresetId;
  } catch {}
  return null;
}

export function saveCharacterPreset(id: CharacterPresetId | null): void {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function getPresetById(id: CharacterPresetId): CharacterPreset | undefined {
  return CHARACTER_PRESETS.find(p => p.id === id);
}