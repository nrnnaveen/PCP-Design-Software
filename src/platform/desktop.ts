/**
 * FloZ EDA - Desktop Platform Implementation
 * Interfaces with Electron main process via contextBridge (window.flozBridge).
 */

import { ApexProject } from '../core/types';
import { PlatformAPI, PlatformInfo, FloZProjectFile, FileFilterOption } from './types';
import { WebPlatform } from './web';

export class DesktopPlatform implements PlatformAPI {
  private fallback = new WebPlatform();

  public isDesktop(): boolean {
    return typeof window !== 'undefined' && !!window.flozBridge;
  }

  public getPlatformInfo(): PlatformInfo {
    if (this.isDesktop() && window.flozBridge) {
      return window.flozBridge.getPlatformInfo();
    }
    return this.fallback.getPlatformInfo();
  }

  public async openProject(): Promise<FloZProjectFile | null> {
    if (!this.isDesktop() || !window.flozBridge) {
      return this.fallback.openProject();
    }

    const res = await window.flozBridge.openProjectDialog();
    if (!res.success || !res.content) return null;

    try {
      const parsed = JSON.parse(res.content);
      const project: ApexProject = parsed.project || parsed;

      return {
        filePath: res.filePath,
        fileName: res.fileName || 'Project.floz',
        project,
      };
    } catch (err) {
      console.error('Failed to parse FloZ desktop project JSON:', err);
      return null;
    }
  }

  public async saveProject(
    project: ApexProject,
    filePath?: string
  ): Promise<{ success: boolean; filePath?: string }> {
    if (!this.isDesktop() || !window.flozBridge) {
      return this.fallback.saveProject(project, filePath);
    }

    const content = JSON.stringify(project, null, 2);
    return window.flozBridge.saveProjectDialog(content, filePath);
  }

  public async saveProjectAs(
    project: ApexProject
  ): Promise<{ success: boolean; filePath?: string }> {
    if (!this.isDesktop() || !window.flozBridge) {
      return this.fallback.saveProjectAs(project);
    }

    const content = JSON.stringify(project, null, 2);
    const projectName = project.metadata?.name || 'Project';
    const defaultName = `${projectName.replace(/\s+/g, '_')}.floz`;
    return window.flozBridge.saveProjectAsDialog(content, defaultName);
  }

  public async exportFile(
    data: string | Uint8Array | Blob,
    defaultName: string,
    filters?: FileFilterOption[]
  ): Promise<boolean> {
    if (!this.isDesktop() || !window.flozBridge) {
      return this.fallback.exportFile(data, defaultName, filters);
    }

    let exportData: string | Uint8Array;
    if (data instanceof Blob) {
      exportData = new Uint8Array(await data.arrayBuffer());
    } else {
      exportData = data;
    }

    const res = await window.flozBridge.exportFileDialog(exportData, defaultName, filters);
    return res.success;
  }

  public async getRecentProjects(): Promise<string[]> {
    if (!this.isDesktop() || !window.flozBridge) {
      return this.fallback.getRecentProjects();
    }
    return window.flozBridge.getRecentProjects();
  }

  public setWindowModified(modified: boolean): void {
    if (this.isDesktop() && window.flozBridge) {
      window.flozBridge.setWindowModified(modified);
    }
  }

  public onMenuAction(callback: (action: string) => void): () => void {
    if (this.isDesktop() && window.flozBridge) {
      return window.flozBridge.onMenuCommand(callback);
    }
    return this.fallback.onMenuAction(callback);
  }

  public showNotification(title: string, body: string): void {
    if (this.isDesktop() && window.flozBridge) {
      window.flozBridge.showNotification(title, body);
    } else {
      this.fallback.showNotification(title, body);
    }
  }
}
