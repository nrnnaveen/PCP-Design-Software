/**
 * FloZ ECA — Microsoft Fluent Centralized Theme Management System
 * Supports VS Code Dark+ (Default), Microsoft 365 Light, Midnight, Slate, and High Contrast.
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
    name: 'Fluent Dark',
    mode: 'dark',
    description: 'Modern VS Code & Microsoft Fluent dark palette with crisp contrast',
    previewColor: '#1e1e1e',
    badgeBg: 'bg-zinc-800 text-zinc-200 border-zinc-700',
  },
  {
    id: 'light',
    name: 'Fluent Light',
    mode: 'light',
    description: 'Clean Microsoft 365 daytime UI with high-contrast typography and subtle elevation',
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
      gridColor: '#e4e4e7',
      gridMajorColor: '#d4d4d8',
      textColor: '#0f172a',
      textMutedColor: '#52525b',
      borderColor: '#d4d4d8',
      selectionBg: 'rgba(0, 120, 212, 0.12)',
      selectionBorder: '#0078d4',
      wireColor: '#0078d4',
      wireHighlightColor: '#ea580c',
      busColor: '#4f46e5',
      noConnectColor: '#dc2626',
      junctionColor: '#0078d4',
      labelColor: '#0284c7',
      powerColor: '#b45309',
      drcColor: '#dc2626',
      ercColor: '#d97706',
      isLight: true,
    };
  }

  // Dark (Default)
  return {
    canvasBg: '#1e1e1e',
    gridColor: '#2d2d30',
    gridMajorColor: '#3e3e42',
    textColor: '#cccccc',
    textMutedColor: '#858585',
    borderColor: '#3e3e42',
    selectionBg: 'rgba(0, 120, 212, 0.25)',
    selectionBorder: '#0078d4',
    wireColor: '#38bdf8',
    wireHighlightColor: '#fb923c',
    busColor: '#818cf8',
    noConnectColor: '#ef4444',
    junctionColor: '#38bdf8',
    labelColor: '#7dd3fc',
    powerColor: '#fbbf24',
    drcColor: '#ef4444',
    ercColor: '#f59e0b',
    isLight: false,
  };
}
