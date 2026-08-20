/**
 * FloZ EDA - Web Browser Platform Implementation
 * Uses Web File System APIs, Blob downloads, and localStorage for project persistence.
 */

import { ApexProject } from '../core/types';
import { PlatformAPI, PlatformInfo, FloZProjectFile, FileFilterOption } from './types';

const RECENT_PROJECTS_KEY = 'floz_recent_projects';

export class WebPlatform implements PlatformAPI {
  public isDesktop(): boolean {
    return false;
  }

  public getPlatformInfo(): PlatformInfo {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isWindows = /Windows/i.test(userAgent);
    const isLinux = /Linux/i.test(userAgent);
    const isMacOS = /Macintosh|Mac OS X/i.test(userAgent);

    return {
      isElectron: false,
      isWindows,
      isLinux,
      isMacOS,
      isWeb: true,
      platformName: 'web',
      appVersion: '1.0.0',
    };
  }

  public async openProject(): Promise<FloZProjectFile | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.floz,.json';

      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          const project: ApexProject = parsed.project || parsed;

          this.addRecentProject(file.name);

          resolve({
            fileName: file.name,
            project,
            lastModified: file.lastModified,
          });
        } catch (err) {
          console.error('Failed to parse FloZ project file:', err);
          resolve(null);
        }
      };

      input.click();
    });
  }

  public async saveProject(
    project: ApexProject,
    filePath?: string
  ): Promise<{ success: boolean; filePath?: string }> {
    return this.saveProjectAs(project);
  }

  public async saveProjectAs(
    project: ApexProject
  ): Promise<{ success: boolean; filePath?: string }> {
    try {
      const projectName = project.metadata?.name || 'Project';
      const fileName = `${projectName.replace(/\s+/g, '_')}.floz`;
      const dataStr = JSON.stringify(project, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.addRecentProject(fileName);

      return { success: true, filePath: fileName };
    } catch (err) {
      console.error('Failed to save project:', err);
      return { success: false };
    }
  }

  public async exportFile(
    data: string | Uint8Array | Blob,
    defaultName: string,
    filters?: FileFilterOption[]
  ): Promise<boolean> {
    try {
      let blob: Blob;
      if (data instanceof Blob) {
        blob = data;
      } else if (typeof data === 'string') {
        blob = new Blob([data], { type: 'text/plain' });
      } else {
        blob = new Blob([data], { type: 'application/octet-stream' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      console.error('Failed to export file:', err);
      return false;
    }
  }

  public async getRecentProjects(): Promise<string[]> {
    try {
      const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private addRecentProject(name: string) {
    try {
      const recents = (JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]') as string[])
        .filter((r) => r !== name);
      recents.unshift(name);
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recents.slice(0, 10)));
    } catch {}
  }

  public setWindowModified(modified: boolean): void {
    // In browser, beforeunload handles unsaved changes
  }

  public onMenuAction(callback: (action: string) => void): () => void {
    // Web keyboard listeners for standard EDA shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        callback(e.shiftKey ? 'save-as' : 'save');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        callback('open');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        callback('new');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }

  public showNotification(title: string, body: string): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }
}
