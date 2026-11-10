import type { Entry } from '../lib/types.ts';
import { toast } from './dom.ts';

/** Share an image card of the word (WhatsApp / Instagram size), or fall back to a link. */
export async function shareWord(e: Entry): Promise<void> {
  const url = location.href;
  const text = `${e.headword} (${e.transliteration}): ${e.meanings.join('; ')}`;
  try {
    const { makeCard } = await import('./card.ts'); // loaded only when someone shares
    const blob = await makeCard(e, location.origin + location.pathname);
    const file = new File([blob], `${e.romanised[0] ?? e.id}-shabdkosh.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: e.headword, text: `${text}\n${url}` });
      return;
    }
    if ('share' in navigator) { await navigator.share({ title: e.headword, text, url }); return; }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: file.name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Word card downloaded');
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return; // the user closed the share sheet
    try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Link copied'); } catch { toast('Could not share'); }
  }
}
