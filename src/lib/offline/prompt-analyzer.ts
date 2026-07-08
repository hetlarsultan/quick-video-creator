/**
 * Offline prompt analyzer — parses Arabic/English text to extract
 * characters, environments, actions, and scene storyboard WITHOUT internet.
 */

import type { ActionType, CameraMove } from '../animation/types';

export interface OfflineCharacter {
  name: string;
  voiceType: 'male' | 'female' | 'child' | 'elder';
}

export interface OfflineScene {
  description: string;
  action: ActionType;
  camera: CameraMove;
  intensity: number;
  characterDirection: 'left' | 'right' | 'center';
}

export interface OfflineAnalysis {
  character: string;
  environment: string;
  scenes: OfflineScene[];
  narrationText: string;
  characters: OfflineCharacter[];
}

// ---- keyword dictionaries ----

const FEMALE_NAMES = ['مريم', 'فاطمة', 'نورة', 'أحلام', 'سارة', 'ليلى', 'هند', 'أمل', 'دانا', 'ريم', 'لمى', 'جنى', 'نوف', 'منى', 'عبير'];
const MALE_NAMES = ['حسام', 'نادر', 'أحمد', 'محمد', 'خالد', 'عمر', 'علي', 'سعد', 'فهد', 'يوسف', 'سالم', 'راشد', 'ماجد', 'طارق', 'بدر'];
const CHILD_KEYWORDS = ['طفل', 'طفلة', 'ولد', 'بنت صغيرة', 'ولد صغير', 'أطفال', 'صغير', 'صغيرة'];
const ELDER_KEYWORDS = ['جد', 'جدة', 'عجوز', 'كبير بالسن', 'مسن'];

const ACTION_KEYWORDS: Record<string, ActionType> = {
  'تهاجم': 'fighting', 'يهاجم': 'fighting', 'هجوم': 'fighting', 'ضرب': 'fighting',
  'يهرب': 'running', 'تهرب': 'running', 'هرب': 'running', 'يركض': 'running', 'تركض': 'running',
  'تطارد': 'chasing', 'يطارد': 'chasing', 'مطاردة': 'chasing', 'يلاحق': 'chasing',
  'تمشي': 'walking', 'يمشي': 'walking', 'مشي': 'walking', 'يذهب': 'walking', 'تذهب': 'walking',
  'تقول': 'talking', 'يقول': 'talking', 'كلام': 'talking', 'حوار': 'talking', 'يتكلم': 'talking', 'تتكلم': 'talking',
  'تعصب': 'emotional', 'يعصب': 'emotional', 'غضب': 'emotional', 'يبكي': 'emotional', 'تبكي': 'emotional', 'حزن': 'emotional',
  'تلعب': 'idle', 'يلعب': 'idle', 'لعب': 'idle',
  'يجلس': 'idle', 'تجلس': 'idle',
  'يرقص': 'dancing', 'ترقص': 'dancing', 'رقص': 'dancing', 'رقصة': 'dancing', 'رقصه': 'dancing',
  'يغني': 'dancing', 'تغني': 'dancing', 'أغنية': 'dancing', 'اغنية': 'dancing', 'اغنيه': 'dancing', 'موسيقى': 'dancing',
  'dance': 'dancing', 'dancing': 'dancing', 'song': 'dancing', 'music': 'dancing',
};

const ENVIRONMENT_KEYWORDS: Record<string, string> = {
  'حديقة': 'animated-nature', 'غابة': 'animated-nature', 'طبيعة': 'animated-nature', 'شجر': 'animated-nature', 'ورد': 'animated-nature',
  'مدينة': 'night-city', 'شارع': 'night-city', 'بيت': 'indoor', 'منزل': 'indoor', 'غرفة': 'indoor', 'مطبخ': 'indoor',
  'فضاء': 'space', 'كوكب': 'space', 'نجوم': 'space',
  'بحر': 'underwater', 'ماء': 'underwater', 'محيط': 'underwater',
  'صحراء': 'desert', 'رمل': 'desert',
  'مدرسة': 'school', 'فصل': 'school',
  'حديقة عامة': 'park', 'ملعب': 'park',
  'غروب': 'sunset', 'شروق': 'sunset', 'مغرب': 'sunset',
  'شاطئ': 'beach', 'ساحل': 'beach', 'رمال البحر': 'beach',
  'جبل': 'mountain', 'جبال': 'mountain', 'قمة': 'mountain',
  'ثلج': 'snow', 'ثلوج': 'snow', 'شتاء': 'snow',
  'مطر': 'rain', 'أمطار': 'rain', 'عاصفة': 'rain',
};

const CHARACTER_KEYWORDS: Record<string, string> = {
  'كرتون': 'cartoon', 'كرتوني': 'cartoon', 'أنمي': 'cartoon',
  'حقيقي': 'realistic', 'واقعي': 'realistic',
  'خيالي': 'fantasy', 'سحر': 'fantasy', 'ساحر': 'fantasy',
  'قطة': 'cartoon', 'كلب': 'cartoon', 'حيوان': 'cartoon', 'أرنب': 'cartoon',
};

function extractCharacters(prompt: string): OfflineCharacter[] {
  const chars: OfflineCharacter[] = [];
  const words = prompt.split(/[\s,،.!؟\-]+/);

  for (const name of FEMALE_NAMES) {
    if (prompt.includes(name)) chars.push({ name, voiceType: 'female' });
  }
  for (const name of MALE_NAMES) {
    if (prompt.includes(name)) chars.push({ name, voiceType: 'male' });
  }
  for (const kw of CHILD_KEYWORDS) {
    if (prompt.includes(kw) && !chars.some(c => c.name === kw)) {
      chars.push({ name: kw, voiceType: 'child' });
    }
  }
  for (const kw of ELDER_KEYWORDS) {
    if (prompt.includes(kw) && !chars.some(c => c.name === kw)) {
      chars.push({ name: kw, voiceType: 'elder' });
    }
  }

  if (chars.length === 0) {
    chars.push({ name: 'الراوي', voiceType: 'male' });
  }
  return chars;
}

function detectEnvironment(prompt: string): string {
  for (const [kw, env] of Object.entries(ENVIRONMENT_KEYWORDS)) {
    if (prompt.includes(kw)) return env;
  }
  return 'animated-nature';
}

function detectCharacterType(prompt: string): string {
  for (const [kw, type] of Object.entries(CHARACTER_KEYWORDS)) {
    if (prompt.includes(kw)) return type;
  }
  return 'cartoon';
}

function extractActions(prompt: string): ActionType[] {
  const actions: ActionType[] = [];
  for (const [kw, action] of Object.entries(ACTION_KEYWORDS)) {
    if (prompt.includes(kw) && !actions.includes(action)) {
      actions.push(action);
    }
  }
  return actions.length > 0 ? actions : ['idle', 'talking'];
}

function buildScenes(prompt: string, actions: ActionType[], count: number): OfflineScene[] {
  const cameras: CameraMove[] = ['zoom-in', 'pan-right', 'dolly', 'shake', 'zoom-out'];
  const scenes: OfflineScene[] = [];
  
  // Split prompt by dashes or commas for scene segments
  const segments = prompt.split(/[-–—،,]/).map(s => s.trim()).filter(s => s.length > 2);

  for (let i = 0; i < count; i++) {
    const segDesc = segments[i] || segments[segments.length - 1] || prompt;
    const action = actions[Math.min(i, actions.length - 1)] || 'idle';
    const intensityMap: Record<ActionType, number> = {
      idle: 0.3, talking: 0.4, walking: 0.5, emotional: 0.6,
      dramatic: 0.7, running: 0.8, chasing: 0.85, fighting: 0.95, dancing: 0.85,
    };
    
    const progress = i / Math.max(1, count - 1); // 0→1
    let camera = cameras[i % cameras.length];
    if (action === 'fighting') camera = 'shake';
    if (action === 'chasing' || action === 'running') camera = 'pan-right';
    if (action === 'dancing') camera = i % 2 === 0 ? 'beat-pulse' : 'shake';
    if (i === 0) camera = 'zoom-in';
    if (i === count - 1) camera = 'zoom-out';

    scenes.push({
      description: segDesc,
      action,
      camera,
      intensity: intensityMap[action] ?? 0.5,
      characterDirection: i % 2 === 0 ? 'right' : 'left',
    });
  }

  return scenes;
}

/**
 * Analyze prompt locally without any network calls.
 */
export function analyzePromptOffline(prompt: string, sceneCount = 3): OfflineAnalysis {
  const characters = extractCharacters(prompt);
  const environment = detectEnvironment(prompt);
  const characterType = detectCharacterType(prompt);
  const actions = extractActions(prompt);
  const scenes = buildScenes(prompt, actions, sceneCount);

  // Build narration from prompt
  const narrationText = prompt.replace(/[-–—]/g, '،');

  return {
    character: characterType,
    environment,
    scenes,
    narrationText,
    characters,
  };
}
