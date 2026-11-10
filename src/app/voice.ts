// Voice search with the Web Speech API (Chrome on Android, Safari).
// TypeScript's DOM types don't include it yet, so we describe the small part we use.
import { toast } from './dom.ts';

interface RecognitionResultEvent { results: ArrayLike<ArrayLike<{ transcript: string }>> }
interface RecognitionErrorEvent { error: string }
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: RecognitionResultEvent) => void) | null;
  onerror: ((ev: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
}
type RecognitionCtor = new () => Recognition;

const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
export const Recognition: RecognitionCtor | undefined = w.SpeechRecognition ?? w.webkitSpeechRecognition;

/** Listen once in Hindi and hand back what was heard (Devanagari, which search handles). */
export function listen(button: HTMLElement, input: HTMLInputElement, onText: (text: string) => void): void {
  if (!Recognition) return;
  const rec = new Recognition();
  rec.lang = 'hi-IN';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  const placeholder = input.placeholder;
  button.classList.add('listening');
  input.placeholder = 'Listening… say a word';
  rec.onresult = (ev) => {
    const text = ev.results[0]?.[0]?.transcript.trim();
    if (text) onText(text);
  };
  rec.onerror = (ev) => { if (ev.error === 'not-allowed') toast('Allow the microphone to search by voice'); };
  rec.onend = () => { button.classList.remove('listening'); input.placeholder = placeholder; };
  try { rec.start(); } catch { rec.onend?.(); }
}
