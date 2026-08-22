/**
 * FloZ EDA - Unified Platform & Desktop Packaging Test Suite
 * Validates Web and Desktop platform abstraction, project serialization (.floz format),
 * Electron build bundles, and electron-builder multi-target configurations.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { WebPlatform } from '../platform/web';
import { DesktopPlatform } from '../platform/desktop';
import { createDemoProject } from '../examples/demoProject';
import { ApexProject } from '../core/types';

describe('Unified Web & Desktop Platform Packaging Suite', () => {
  // -----------------------------------------------------------------
  // 1. Web Platform Implementation
  // -----------------------------------------------------------------
  describe('1. Web Platform Capabilities', () => {
    it('detects Web environment and reports correct platform info', () => {
      const webPlatform = new WebPlatform();
      expect(webPlatform.isDesktop()).toBe(false);

      const info = webPlatform.getPlatformInfo();
      expect(info.isWeb).toBe(true);
      expect(info.isElectron).toBe(false);
      expect(info.platformName).toBe('web');
      expect(info.appVersion).toBe('1.0.0');
    });

    it('initializes recent projects from storage', async () => {
      const webPlatform = new WebPlatform();
      const recents = await webPlatform.getRecentProjects();
      expect(Array.isArray(recents)).toBe(true);
    });
  });

  // -----------------------------------------------------------------
  // 2. Desktop Platform & Bridge
  // -----------------------------------------------------------------
  describe('2. Desktop Platform & Bridge', () => {
    it('initializes DesktopPlatform with graceful fallback to Web in non-Electron context', () => {
      const desktopPlatform = new DesktopPlatform();
      expect(desktopPlatform.isDesktop()).toBe(false);

      const info = desktopPlatform.getPlatformInfo();
      expect(info.isWeb).toBe(true);
    });
  });

  // -----------------------------------------------------------------
  // 3. Project File Serialization (.floz format)
  // -----------------------------------------------------------------
  describe('3. Native .floz Project File Persistence', () => {
    it('preserves complete PCBData and ApexProject hierarchy across JSON serialization', () => {
      const demo = createDemoProject();

      const serialized = JSON.stringify(demo, null, 2);
      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(100);

      const parsed: ApexProject = JSON.parse(serialized);
      expect(parsed.metadata.id).toBe(demo.metadata.id);
      expect(parsed.metadata.name).toBe(demo.metadata.name);
      expect(parsed.pcb.footprints.length).toBe(demo.pcb.footprints.length);
      expect(parsed.pcb.tracks.length).toBe(demo.pcb.tracks.length);
      expect(parsed.pcb.vias.length).toBe(demo.pcb.vias.length);
      expect(parsed.designRules.defaultNetClass.trackWidth).toBe(
        demo.designRules.defaultNetClass.trackWidth
      );
    });
  });

  // -----------------------------------------------------------------
  // 4. Electron Packaging & Configuration Verification
  // -----------------------------------------------------------------
  describe('4. Electron Bundling & electron-builder Configuration', () => {
    it('bundles electron main and preload scripts into dist-electron/', () => {
      const mainPath = path.resolve('dist-electron/main.cjs');
      const preloadPath = path.resolve('dist-electron/preload.cjs');

      expect(fs.existsSync(mainPath)).toBe(true);
      expect(fs.existsSync(preloadPath)).toBe(true);

      const mainContent = fs.readFileSync(mainPath, 'utf-8');
      expect(mainContent).toContain('createWindow');
      expect(mainContent).toContain('buildApplicationMenu');

      const preloadContent = fs.readFileSync(preloadPath, 'utf-8');
      expect(preloadContent).toContain('contextBridge');
      expect(preloadContent).toContain('flozBridge');
    });

    it('defines multi-target packaging configuration in electron-builder.json', () => {
      const builderConfigPath = path.resolve('electron-builder.json');
      expect(fs.existsSync(builderConfigPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));
      expect(config.appId).toBe('com.floz.pcbeditor');
      expect(config.productName).toBe('FloZ AI PCB Editor');

      // Windows targets
      expect(config.win).toBeDefined();
      expect(config.win.target.some((t: any) => t.target === 'zip' || t.target === 'nsis')).toBe(true);
      expect(config.win.target.some((t: any) => t.target === 'portable')).toBe(true);

      // Linux targets
      expect(config.linux).toBeDefined();
      expect(config.linux.target.some((t: any) => t.target === 'AppImage')).toBe(true);

      // File association for .floz
      expect(config.win.fileAssociations[0].ext).toBe('floz');
      expect(config.linux.fileAssociations[0].ext).toBe('floz');
    });
  });
});
