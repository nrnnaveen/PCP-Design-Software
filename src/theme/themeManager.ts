/**
 * FloZ EDA - Professional Centralized Theme Management System
 * Supports Dark (Default), Light (Day), Midnight, Slate, and High Contrast.
 */

export type AppThemeId = 'dark' | 'light' | 'midnight' | 'slate' | 'high-contrast';

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
    name: 'Dark (Default)',
    mode: 'dark',
    description: 'Neutral engineering dark palette with high readability',
    previewColor: '#181d24',
    badgeBg: 'bg-slate-800 text-slate-200 border-slate-700',
  },
  {
    id: 'light',
    name: 'Light (Day)',
    mode: 'light',
    description: 'Clean high-contrast daytime engineering UI',
    previewColor: '#ffffff',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    description: 'Deep blue-gray professional CAD palette',
    previewColor: '#111827',
    badgeBg: 'bg-indigo-950 text-indigo-300 border-indigo-800',
  },
  {
    id: 'slate',
    name: 'Slate',
    mode: 'dark',
    description: 'Cool gray industrial workspace palette',
    previewColor: '#273549',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-600',
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    mode: 'dark',
    description: 'Maximum contrast monochrome engineering UI',
    previewColor: '#000000',
    badgeBg: 'bg-black text-white border-zinc-500',
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
      // Ignored
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

      // Remove all theme classes first
      AVAILABLE_THEMES.forEach((t) => {
        root.classList.remove(t.id);
      });
      root.classList.remove('dark', 'light');

      // Add active classes
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

export function getCanvasColors(themeId?: string): { canvasBg: string; gridColor: string; textColor: string; isLight: boolean } {
  const current = themeId || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : 'dark') || 'dark';
  switch (current) {
    case 'light':
      return { canvasBg: '#ffffff', gridColor: '#cbd5e1', textColor: '#0f172a', isLight: true };
    case 'midnight':
      return { canvasBg: '#0b0f19', gridColor: '#1e293b', textColor: '#f1f5f9', isLight: false };
    case 'slate':
      return { canvasBg: '#1e293b', gridColor: '#334155', textColor: '#f8fafc', isLight: false };
    case 'high-contrast':
      return { canvasBg: '#000000', gridColor: '#444444', textColor: '#ffffff', isLight: false };
    case 'dark':
    default:
      return { canvasBg: '#111418', gridColor: '#242c38', textColor: '#e2e8f0', isLight: false };
  }
}
