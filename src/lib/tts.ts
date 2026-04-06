/**
 * Text-to-Speech using Web Speech API.
 * Supports Arabic narration and audio blob generation for video merging.
 */

export function isTTSSupported(): boolean {
  return 'speechSynthesis' in window;
}

export function getArabicVoices(): SpeechSynthesisVoice[] {
  const voices = speechSynthesis.getVoices();
  return voices.filter(v => v.lang.startsWith('ar'));
}

export function speakText(text: string, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (!isTTSSupported()) return null;
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.rate = 0.9;
  utterance.pitch = 1;

  const arabicVoices = getArabicVoices();
  if (arabicVoices.length > 0) {
    utterance.voice = arabicVoices[0];
  }

  if (onEnd) utterance.onend = onEnd;
  speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Generate speech audio as a Blob for merging into video.
 * Uses MediaRecorder to capture system audio output.
 */
export async function generateSpeechBlob(text: string): Promise<Blob | null> {
  if (!isTTSSupported()) return null;

  // Ensure voices are loaded
  await new Promise<void>((resolve) => {
    if (speechSynthesis.getVoices().length > 0) {
      resolve();
    } else {
      speechSynthesis.onvoiceschanged = () => resolve();
      setTimeout(resolve, 2000);
    }
  });

  return new Promise<Blob | null>((resolve) => {
    try {
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      
      // Create an oscillator as a carrier signal (silent) to keep recorder active
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0; // silent
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

      recorder.onstop = () => {
        osc.stop();
        audioCtx.close();
        if (chunks.length > 0) {
          resolve(new Blob(chunks, { type: 'audio/webm' }));
        } else {
          resolve(null);
        }
      };

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.9;

      const arabicVoices = getArabicVoices();
      if (arabicVoices.length > 0) {
        utterance.voice = arabicVoices[0];
      }

      recorder.start();
      utterance.onend = () => {
        setTimeout(() => recorder.stop(), 300);
      };
      utterance.onerror = () => {
        recorder.stop();
      };

      speechSynthesis.speak(utterance);

      // Safety timeout
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 60_000);
    } catch {
      resolve(null);
    }
  });
}
