/**
 * FloZ EDA - Platform Abstraction Layer Types
 * Unified interface for Web Browser and Desktop (Electron Windows / Linux) environments.
 */

import { ApexProject } from '../core/types';

export interface PlatformInfo {
  isElectron: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isMacOS: boolean;
  isWeb: boolean;
  platformName: 'web' | 'win32' | 'linux' | 'darwin';
  appVersion: string;
}

export interface FloZProjectFile {
  filePath?: string;
  fileName: string;
  project: ApexProject;
  lastModified?: number;
}

export interface FileFilterOption {
  name: string;
  extensions: string[];
}

export interface PlatformAPI {
  /**
   * Returns whether the application is running inside a native desktop container (Electron)
   */
  isDesktop(): boolean;

  /**
   * Returns current operating system and platform runtime information
   */
  getPlatformInfo(): PlatformInfo;

  /**
   * Opens a native Open File dialog to load a .floz / .json project file
   */
  openProject(): Promise<FloZProjectFile | null>;

  /**
   * Saves project data to the existing file path (or opens Save As dialog if new)
   */
  saveProject(project: ApexProject, filePath?: string): Promise<{ success: boolean; filePath?: string }>;

  /**
   * Opens a native Save File dialog to save a new .floz project
   */
  saveProjectAs(project: ApexProject): Promise<{ success: boolean; filePath?: string }>;

  /**
   * Exports arbitrary file content (e.g. Gerbers, Excellon, BOM, SVG, Netlist)
   */
  exportFile(
    data: string | Uint8Array | Blob,
    defaultName: string,
    filters?: FileFilterOption[]
  ): Promise<boolean>;

  /**
   * Retrieves list of recently opened project file paths
   */
  getRecentProjects(): Promise<string[]>;

  /**
   * Informs window of unsaved modifications for window close confirmation
   */
  setWindowModified(modified: boolean): void;

  /**
   * Subscribes to native application menu accelerators and commands
   */
  onMenuAction(callback: (action: string) => void): () => void;

  /**
   * Shows an OS-native or in-app notification
   */
  showNotification(title: string, body: string): void;
}

export interface FloZBridge {
  getPlatformInfo: () => PlatformInfo;
  openProjectDialog: () => Promise<{ success: boolean; filePath?: string; fileName?: string; content?: string; error?: string }>;
  saveProjectDialog: (content: string, filePath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  saveProjectAsDialog: (content: string, defaultName?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  exportFileDialog: (data: string | Uint8Array, defaultName: string, filters?: FileFilterOption[]) => Promise<{ success: boolean; error?: string }>;
  getRecentProjects: () => Promise<string[]>;
  onMenuCommand: (callback: (action: string) => void) => () => void;
  showNotification: (title: string, body: string) => void;
  setWindowModified: (modified: boolean) => void;
}

declare global {
  interface Window {
    flozBridge?: FloZBridge;
  }
}
