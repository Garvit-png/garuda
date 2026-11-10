// Device storage for recent, saved and the text-size choice.
// Every access is wrapped: private mode or blocked storage must never break the app.

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

const RECENT = 'garuda.recent';
const SAVED = 'garuda.saved';
const LARGE = 'garuda.large';

export const recent = {
  list: (): number[] => read<number[]>(RECENT, []),
  push(id: number): void { write(RECENT, [id, ...recent.list().filter((x) => x !== id)].slice(0, 10)); },
  clear(): void { write(RECENT, []); },
};

const listeners = new Set<() => void>();
export const saved = {
  list: (): number[] => read<number[]>(SAVED, []),
  has: (id: number): boolean => saved.list().includes(id),
  /** @returns true if the word is now saved */
  toggle(id: number): boolean {
    const list = saved.list();
    const now = !list.includes(id);
    write(SAVED, now ? [id, ...list] : list.filter((x) => x !== id));
    listeners.forEach((fn) => fn());
    return now;
  },
  onChange(fn: () => void): void { listeners.add(fn); },
};

export const largeText = {
  get: (): boolean => read<boolean>(LARGE, false) === true,
  set(on: boolean): void { write(LARGE, on); },
};
