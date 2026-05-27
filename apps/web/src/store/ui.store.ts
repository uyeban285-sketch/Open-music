import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';
export type DensityMode = 'compact' | 'expanded';
export type EqualizerMode = 'bar' | 'circular' | 'liquid' | 'off';

interface UiStore {
  theme: Theme;
  density: DensityMode;
  equalizerMode: EqualizerMode;
  equalizerIntensity: number;
  dynamicPaletteEnabled: boolean;
  aaaContrast: boolean;

  setTheme: (theme: Theme) => void;
  setDensity: (density: DensityMode) => void;
  setEqualizerMode: (mode: EqualizerMode) => void;
  setEqualizerIntensity: (v: number) => void;
  setDynamicPaletteEnabled: (v: boolean) => void;
  setAaaContrast: (v: boolean) => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      density: 'expanded',
      equalizerMode: 'bar',
      equalizerIntensity: 70,
      dynamicPaletteEnabled: true,
      aaaContrast: false,

      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setEqualizerMode: (equalizerMode) => set({ equalizerMode }),
      setEqualizerIntensity: (equalizerIntensity) =>
        set({ equalizerIntensity: Math.max(0, Math.min(100, equalizerIntensity)) }),
      setDynamicPaletteEnabled: (dynamicPaletteEnabled) => set({ dynamicPaletteEnabled }),
      setAaaContrast: (aaaContrast) => set({ aaaContrast }),
    }),
    { name: 'open-music-ui' },
  ),
);
