/**
 * Text-to-Speech using Web Speech API.
 * Supports Arabic narration for video overlay.
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

  // Cancel any current speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.rate = 0.9;
  utterance.pitch = 1;

  // Pick Arabic voice if available
  const arabicVoices = getArabicVoices();
  if (arabicVoices.length > 0) {
    utterance.voice = arabicVoices[0];
  }

  if (onEnd) utterance.onend = onEnd;

  speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Generate speech audio as a Blob via AudioContext + MediaRecorder.
 * Falls back to just playing via speechSynthesis if audio capture isn't supported.
 */
export async function generateSpeechBlob(text: string): Promise<Blob | null> {
  if (!isTTSSupported()) return null;

  return new Promise<Blob | null>((resolve) => {
    // Try using AudioContext + destination capture
    try {
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      const recorder = new MediaRecorder(dest.stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
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
        setTimeout(() => recorder.stop(), 200);
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
