/**
 * FloZ ECA — Centralized Theme Management System
 * Supports FloZ Dark (default) and FloZ Light themes.
 */

export type AppThemeId = 'dark' | 'light';

export interface ThemeDefinition {
  id: AppThemeId;
  name: string;
  mode: 'dark' | 'light';
  description: string;
  previewColor: string;
  badgeBg: string;
}

export const AVAILABLE_THEMES: ThemeDefinition[] = [
  {
    id: 'dark',
    name: 'FloZ Dark',
    mode: 'dark',
    description: 'FloZ ECA professional dark palette with crisp contrast',
    previewColor: '#1e1e1e',
    badgeBg: 'bg-zinc-800 text-zinc-200 border-zinc-700',
  },
  {
    id: 'light',
    name: 'FloZ Light',
    mode: 'light',
    description: 'FloZ ECA professional light palette with high-contrast typography and subtle elevation',
    previewColor: '#f3f3f3',
    badgeBg: 'bg-zinc-100 text-zinc-800 border-zinc-300',
  },
];

const STORAGE_KEYS = ['floz-theme', 'floz-eda-theme'];

export class ThemeManager {
  private static currentTheme: AppThemeId = 'dark';
  private static listeners: Set<(theme: AppThemeId) => void> = new Set();

  public static getInitialTheme(): AppThemeId {
    try {
      const storage = typeof localStorage !== 'undefined' ? localStorage : typeof window !== 'undefined' ? window.localStorage : undefined;
      if (storage) {
        for (const key of STORAGE_KEYS) {
          const saved = storage.getItem(key) as AppThemeId;
          if (saved && AVAILABLE_THEMES.some((t) => t.id === saved)) {
            this.currentTheme = saved;
            return saved;
          }
        }
      }
    } catch {
      // Fallback
    }
    this.currentTheme = 'dark';
    return 'dark';
  }

  public static getTheme(): AppThemeId {
    return this.currentTheme;
  }

  public static getThemeDefinition(id: AppThemeId): ThemeDefinition {
    return AVAILABLE_THEMES.find((t) => t.id === id) || AVAILABLE_THEMES[0];
  }

  public static applyTheme(themeId: AppThemeId): void {
    this.currentTheme = themeId;
    const themeDef = this.getThemeDefinition(themeId);

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', themeId);

      // Clean old classes
      AVAILABLE_THEMES.forEach((t) => {
        root.classList.remove(t.id);
      });
      root.classList.remove('dark', 'light');

      // Set active classes
      root.classList.add(themeId);
      root.classList.add(themeDef.mode);
    }

    try {
      const storage = typeof localStorage !== 'undefined' ? localStorage : typeof window !== 'undefined' ? window.localStorage : undefined;
      if (storage) {
        STORAGE_KEYS.forEach((key) => {
          storage.setItem(key, themeId);
        });
      }
    } catch {
      // Ignored
    }

    this.notifyListeners(themeId);
  }

  public static subscribe(listener: (theme: AppThemeId) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(theme: AppThemeId): void {
    this.listeners.forEach((fn) => {
      try {
        fn(theme);
      } catch (err) {
        console.error('Error in theme listener:', err);
      }
    });
  }
}

export interface CanvasColorTokens {
  canvasBg: string;
  gridColor: string;
  gridMajorColor: string;
  textColor: string;
  textMutedColor: string;
  borderColor: string;
  selectionBg: string;
  selectionBorder: string;
  wireColor: string;
  wireHighlightColor: string;
  busColor: string;
  noConnectColor: string;
  junctionColor: string;
  labelColor: string;
  powerColor: string;
  drcColor: string;
  ercColor: string;
  isLight: boolean;
}

export function getCanvasColors(themeId?: string): CanvasColorTokens {
  const current = themeId || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : 'dark') || 'dark';
  if (current === 'light') {
    return {
      canvasBg: '#ffffff',
      gridColor: '#e5e5e5',
      gridMajorColor: '#d6d6d6',
      textColor: '#242424',
      textMutedColor: '#616161',
      borderColor: '#d6d6d6',
      selectionBg: 'rgba(15, 108, 189, 0.15)',
      selectionBorder: '#0f6cbd',
      wireColor: '#0f6cbd',
      wireHighlightColor: '#c77700',
      busColor: '#0c3b5e',
      noConnectColor: '#c42b1c',
      junctionColor: '#0f6cbd',
      labelColor: '#0f6cbd',
      powerColor: '#c77700',
      drcColor: '#c42b1c',
      ercColor: '#c77700',
      isLight: true,
    };
  }

  // Dark (Default)
  return {
    canvasBg: '#1e1e1e',
    gridColor: '#2d2d30',
    gridMajorColor: '#3e3e42',
    textColor: '#f3f3f3',
    textMutedColor: '#cccccc',
    borderColor: '#3f3f46',
    selectionBg: 'rgba(76, 194, 255, 0.25)',
    selectionBorder: '#4cc2ff',
    wireColor: '#4cc2ff',
    wireHighlightColor: '#f5c242',
    busColor: '#75cfff',
    noConnectColor: '#ff6b6b',
    junctionColor: '#4cc2ff',
    labelColor: '#a5e3ff',
    powerColor: '#f5c242',
    drcColor: '#ff6b6b',
    ercColor: '#f5c242',
    isLight: false,
  };
}
