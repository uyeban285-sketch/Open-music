import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RepeatMode = 'off' | 'one' | 'all';

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering';

export interface PlayerTrack {
  id: string;
  title: string;
  artists: string[];
  coverUrl?: string;
  durationMs: number;
  sourceConnectorId?: string;
}

interface PlayerStore {
  state: PlayerState;
  currentTrack: PlayerTrack | null;
  queue: PlayerTrack[];
  positionMs: number;
  repeat: RepeatMode;
  shuffle: boolean;
  volume: number;

  // Actions
  play: (track: PlayerTrack) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  seek: (positionMs: number) => void;
  setRepeat: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  setVolume: (v: number) => void;
  setQueue: (tracks: PlayerTrack[]) => void;
  addToQueue: (track: PlayerTrack) => void;
  removeFromQueue: (trackId: string) => void;
  setState: (state: PlayerState) => void;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      state: 'idle',
      currentTrack: null,
      queue: [],
      positionMs: 0,
      repeat: 'off',
      shuffle: false,
      volume: 1,

      play: (track) => set({ currentTrack: track, state: 'loading', positionMs: 0 }),

      pause: () => set({ state: 'paused' }),

      resume: () => {
        const { state } = get();
        if (state === 'paused') set({ state: 'playing' });
      },

      next: () => {
        const { queue, currentTrack, repeat } = get();
        if (!currentTrack) return;
        const idx = queue.findIndex((t) => t.id === currentTrack.id);
        if (idx === -1) return;
        if (repeat === 'one') {
          set({ positionMs: 0, state: 'loading' });
          return;
        }
        const nextIdx = idx + 1;
        if (nextIdx >= queue.length) {
          if (repeat === 'all') {
            set({ currentTrack: queue[0] ?? null, positionMs: 0, state: 'loading' });
          } else {
            set({ state: 'idle' });
          }
        } else {
          set({ currentTrack: queue[nextIdx] ?? null, positionMs: 0, state: 'loading' });
        }
      },

      prev: () => {
        const { queue, currentTrack, positionMs } = get();
        if (!currentTrack) return;
        if (positionMs > 3000) {
          set({ positionMs: 0 });
          return;
        }
        const idx = queue.findIndex((t) => t.id === currentTrack.id);
        if (idx > 0) {
          set({ currentTrack: queue[idx - 1] ?? null, positionMs: 0, state: 'loading' });
        }
      },

      seek: (positionMs) => set({ positionMs }),

      setRepeat: (repeat) => set({ repeat }),

      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

      setQueue: (queue) => set({ queue }),

      addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),

      removeFromQueue: (trackId) =>
        set((s) => ({ queue: s.queue.filter((t) => t.id !== trackId) })),

      setState: (state) => set({ state }),
    }),
    {
      name: 'open-music-player',
      partialize: (s) => ({
        currentTrack: s.currentTrack,
        queue: s.queue,
        positionMs: s.positionMs,
        repeat: s.repeat,
        shuffle: s.shuffle,
        volume: s.volume,
      }),
    },
  ),
);
