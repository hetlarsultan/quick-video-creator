/**
 * Arabic dialects support. Maps each dialect to a BCP-47 lang code and
 * voice profile tweaks (pitch/rate) to approximate the dialect's rhythm
 * when the OS doesn't provide a native voice for it.
 */

export type ArabicDialect =
  | 'msa'      // الفصحى
  | 'gulf'     // الخليجية
  | 'egyptian' // المصرية
  | 'levantine'// الشامية
  | 'syrian'   // السورية
  | 'maghrebi' // المغاربية
  | 'iraqi'    // العراقية
  | 'yemeni'   // اليمنية
  | 'sudanese';// السودانية

export interface DialectProfile {
  id: ArabicDialect;
  label: string;
  emoji: string;
  lang: string;          // BCP-47
  pitchAdjust: number;   // multiplier offset
  rateAdjust: number;    // multiplier offset
  voiceHints: RegExp;    // regex to match preferred voice names
}

export const DIALECT_PROFILES: DialectProfile[] = [
  { id: 'msa',       label: 'الفصحى',     emoji: '📖', lang: 'ar-SA', pitchAdjust: 0,    rateAdjust: 0,    voiceHints: /saudi|arabic|naayf|maged|tarik|laila|maryam/i },
  { id: 'gulf',      label: 'الخليجية',   emoji: '🐪', lang: 'ar-SA', pitchAdjust: 0.05, rateAdjust: 0.05, voiceHints: /gulf|saudi|kuwait|emirat|qatar/i },
  { id: 'egyptian',  label: 'المصرية',    emoji: '🇪🇬', lang: 'ar-EG', pitchAdjust: 0.1,  rateAdjust: 0.1,  voiceHints: /egypt|cairo|salma|hoda|maged/i },
  { id: 'levantine', label: 'الشامية',    emoji: '🇱🇧', lang: 'ar-LB', pitchAdjust: 0.05, rateAdjust: 0.0,  voiceHints: /lebanon|levant|hala|beirut|palest|jordan/i },
  { id: 'syrian',    label: 'السورية',    emoji: '🇸🇾', lang: 'ar-SY', pitchAdjust: 0.03, rateAdjust: -0.02, voiceHints: /syria|damascus|aleppo|shami/i },
  { id: 'maghrebi',  label: 'المغاربية',  emoji: '🌅', lang: 'ar-MA', pitchAdjust: -0.05, rateAdjust: -0.05, voiceHints: /morocc|tunisia|algeri|maghreb/i },
  { id: 'iraqi',     label: 'العراقية',   emoji: '🌴', lang: 'ar-IQ', pitchAdjust: -0.05, rateAdjust: -0.05, voiceHints: /iraq|baghdad/i },
  { id: 'yemeni',    label: 'اليمنية',    emoji: '⛰️', lang: 'ar-YE', pitchAdjust: -0.1, rateAdjust: -0.1, voiceHints: /yemen|sanaa/i },
  { id: 'sudanese',  label: 'السودانية',  emoji: '🏜️', lang: 'ar-SD', pitchAdjust: 0,    rateAdjust: -0.05, voiceHints: /sudan|khartoum/i },
];

export function getDialectProfile(id: ArabicDialect): DialectProfile {
  return DIALECT_PROFILES.find(d => d.id === id) ?? DIALECT_PROFILES[0];
}
