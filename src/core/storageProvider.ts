/**
 * FloZ ECA - Unified Storage Provider Abstraction
 * Handles persistent project storage, native file/folder dialogs, and filesystem access across Web & Desktop (Tauri).
 */

import { ApexProject } from './types';
import { ProjectSerializer } from './serialization';

export interface IStorageProvider {
  isDesktop(): boolean;
  openProjectFile(): Promise<ApexProject | null>;
  saveProjectFile(project: ApexProject, defaultFilename?: string): Promise<boolean>;
  openLibraryFolder(): Promise<File[] | null>;
  openLibraryFiles(): Promise<File[] | null>;
}

/**
 * Standard Web Browser Storage Provider
 */
export class WebStorageProvider implements IStorageProvider {
  public isDesktop(): boolean {
    return false;
  }

  public async openProjectFile(): Promise<ApexProject | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.apexprj,.flozprj';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        try {
          const text = await file.text();
          const project = ProjectSerializer.deserialize(text);
          resolve(project);
        } catch (err: any) {
          alert(`Failed to open project: ${err.message}`);
          resolve(null);
        }
      };
      input.click();
    });
  }

  public async saveProjectFile(project: ApexProject, defaultFilename?: string): Promise<boolean> {
    try {
      ProjectSerializer.exportToFile(project, defaultFilename);
      return true;
    } catch (err) {
      console.error('Failed to export project:', err);
      return false;
    }
  }

  public async openLibraryFolder(): Promise<File[] | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      // @ts-ignore
      input.webkitdirectory = true;
      // @ts-ignore
      input.directory = true;
      input.multiple = true;
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        resolve(files ? Array.from(files) : null);
      };
      input.click();
    });
  }

  public async openLibraryFiles(): Promise<File[] | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.kicad_sym,.kicad_mod,.step,.stp,.glb';
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        resolve(files ? Array.from(files) : null);
      };
      input.click();
    });
  }
}

/**
 * Desktop Tauri Storage Provider
 */
export class DesktopStorageProvider implements IStorageProvider {
  public isDesktop(): boolean {
    return typeof (window as any).__TAURI__ !== 'undefined';
  }

  public async openProjectFile(): Promise<ApexProject | null> {
    // If running in Tauri, use native dialogs
    if (this.isDesktop()) {
      try {
        const { open } = (window as any).__TAURI__.dialog;
        const { readTextFile } = (window as any).__TAURI__.fs;
        const selected = await open({
          multiple: false,
          filters: [{ name: 'FloZ Project', extensions: ['flozprj', 'apexprj', 'json'] }],
        });
        if (typeof selected === 'string') {
          const contents = await readTextFile(selected);
          return ProjectSerializer.deserialize(contents);
        }
      } catch (err) {
        console.warn('Tauri open dialog failed, falling back to web:', err);
      }
    }
    return new WebStorageProvider().openProjectFile();
  }

  public async saveProjectFile(project: ApexProject, defaultFilename?: string): Promise<boolean> {
    if (this.isDesktop()) {
      try {
        const { save } = (window as any).__TAURI__.dialog;
        const { writeTextFile } = (window as any).__TAURI__.fs;
        const fname = defaultFilename || `${project.metadata.name.replace(/\s+/g, '_').toLowerCase()}.flozprj`;
        const filePath = await save({
          defaultPath: fname,
          filters: [{ name: 'FloZ Project', extensions: ['flozprj'] }],
        });
        if (filePath) {
          const jsonStr = ProjectSerializer.serialize(project);
          await writeTextFile(filePath, jsonStr);
          return true;
        }
        return false;
      } catch (err) {
        console.warn('Tauri save dialog failed, falling back to web:', err);
      }
    }
    return new WebStorageProvider().saveProjectFile(project, defaultFilename);
  }

  public async openLibraryFolder(): Promise<File[] | null> {
    return new WebStorageProvider().openLibraryFolder();
  }

  public async openLibraryFiles(): Promise<File[] | null> {
    return new WebStorageProvider().openLibraryFiles();
  }
}

export const storageProvider: IStorageProvider = new DesktopStorageProvider();
