/**
 * Offline voice engine with character-specific voice selection.
 * Uses Web Speech API — works completely without internet.
 * 
 * Maps character names to voice types:
 *   مريم → female (بنت)
 *   نادر/حسام → male (شاب)
 *   أحلام → female (امرأة)
 *   طفل → child
 */

export type VoiceGender = 'male' | 'female' | 'child' | 'elder';

export interface CharacterVoice {
  name: string;
  voiceType: VoiceGender;
  pitch: number;
  rate: number;
}

// Predefined voice profiles
const VOICE_PROFILES: Record<VoiceGender, { pitch: number; rate: number }> = {
  female: { pitch: 1.3, rate: 0.95 },
  male: { pitch: 0.8, rate: 0.9 },
  child: { pitch: 1.8, rate: 1.1 },
  elder: { pitch: 0.6, rate: 0.75 },
};

function getAvailableVoices(): SpeechSynthesisVoice[] {
  return speechSynthesis.getVoices();
}

function findBestVoice(voiceType: VoiceGender): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  const arabicVoices = voices.filter(v => v.lang.startsWith('ar'));
  
  if (arabicVoices.length === 0) {
    // Fallback to any available voice
    return voices[0] || null;
  }

  // Try to match gender-appropriate voice by name heuristics
  if (voiceType === 'female' || voiceType === 'child') {
    const femaleVoice = arabicVoices.find(v => 
      /female|maryam|fatima|zahra|hala|laila/i.test(v.name)
    );
    if (femaleVoice) return femaleVoice;
  }

  if (voiceType === 'male' || voiceType === 'elder') {
    const maleVoice = arabicVoices.find(v =>
      /male|ahmad|majed|tarik|hamza/i.test(v.name)
    );
    if (maleVoice) return maleVoice;
  }

  return arabicVoices[0];
}

async function ensureVoicesLoaded(): Promise<void> {
  if (speechSynthesis.getVoices().length > 0) return;
  return new Promise<void>((resolve) => {
    speechSynthesis.onvoiceschanged = () => resolve();
    setTimeout(resolve, 2000);
  });
}

/**
 * Speak a line with character-specific voice settings.
 */
export async function speakAsCharacter(
  text: string,
  voiceType: VoiceGender = 'male',
  onEnd?: () => void
): Promise<SpeechSynthesisUtterance | null> {
  if (!('speechSynthesis' in window)) return null;

  await ensureVoicesLoaded();
  speechSynthesis.cancel();

  const profile = VOICE_PROFILES[voiceType];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.pitch = profile.pitch;
  utterance.rate = profile.rate;

  const voice = findBestVoice(voiceType);
  if (voice) utterance.voice = voice;

  if (onEnd) utterance.onend = onEnd;
  speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Generate a narration audio blob with multiple character voices.
 * Splits text by character dialogue markers and applies appropriate voices.
 */
export async function generateCharacterAudioBlob(
  narrationText: string,
  characters: CharacterVoice[]
): Promise<Blob | null> {
  if (!('speechSynthesis' in window)) return null;

  await ensureVoicesLoaded();

  // Create audio context for recording
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();

  // Silent carrier to keep recorder alive
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(dest);
  osc.start();

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  const recorder = new MediaRecorder(dest.stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<Blob | null>((resolve) => {
    recorder.onstop = () => {
      osc.stop();
      audioCtx.close();
      resolve(chunks.length > 0 ? new Blob(chunks, { type: 'audio/webm' }) : null);
    };

    recorder.start();

    // Split narration into segments and speak sequentially
    const segments = splitNarration(narrationText, characters);
    let currentIdx = 0;

    function speakNext() {
      if (currentIdx >= segments.length) {
        setTimeout(() => recorder.stop(), 500);
        return;
      }

      const seg = segments[currentIdx];
      const profile = VOICE_PROFILES[seg.voiceType];
      
      const utterance = new SpeechSynthesisUtterance(seg.text);
      utterance.lang = 'ar-SA';
      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;

      const voice = findBestVoice(seg.voiceType);
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        currentIdx++;
        setTimeout(speakNext, 200); // Small pause between segments
      };
      utterance.onerror = () => {
        currentIdx++;
        speakNext();
      };

      speechSynthesis.speak(utterance);
    }

    speakNext();

    // Safety timeout
    setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, 120_000);
  });
}

interface NarrationSegment {
  text: string;
  voiceType: VoiceGender;
  characterName: string;
}

/**
 * Split narration text into character-attributed segments.
 * Detects patterns like "مريم تقول..." or character name mentions.
 */
function splitNarration(
  text: string,
  characters: CharacterVoice[]
): NarrationSegment[] {
  if (characters.length === 0) {
    return [{ text, voiceType: 'male', characterName: 'الراوي' }];
  }

  // Split by dashes, periods, or exclamation marks
  const rawSegments = text.split(/[.!؟\-–—]/).map(s => s.trim()).filter(s => s.length > 1);

  if (rawSegments.length === 0) {
    return [{ text, voiceType: characters[0]?.voiceType || 'male', characterName: characters[0]?.name || 'الراوي' }];
  }

  return rawSegments.map(seg => {
    // Find which character this segment belongs to
    const matchedChar = characters.find(c => seg.includes(c.name));
    
    if (matchedChar) {
      return {
        text: seg,
        voiceType: matchedChar.voiceType,
        characterName: matchedChar.name,
      };
    }

    // Default to narrator
    return {
      text: seg,
      voiceType: 'male' as VoiceGender,
      characterName: 'الراوي',
    };
  });
}

/**
 * Get available voice types for the UI.
 */
export function getVoiceOptions(): { label: string; value: VoiceGender; emoji: string }[] {
  return [
    { label: 'صوت رجل', value: 'male', emoji: '👨' },
    { label: 'صوت امرأة', value: 'female', emoji: '👩' },
    { label: 'صوت طفل', value: 'child', emoji: '👶' },
    { label: 'صوت كبير بالسن', value: 'elder', emoji: '👴' },
  ];
}
