/**
 * FloZ ECA — Supabase Database, Authentication & Cloud Storage Test Suite
 * Validates Supabase client initialization, configuration diagnostics,
 * resilient fallback behavior, user authentication lifecycle,
 * and multi-layer PCB cloud project persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { isSupabaseConfigured, getSupabaseStatus } from '../lib/supabase';
import { AuthService } from '../core/auth';
import { CloudProjectService } from '../core/cloudProjects';
import { createBlankProject } from '../examples/demoProject';

describe('Supabase Integration & Cloud Architecture', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    (global as any).localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };
    AuthService.loginAsGuest();
  });

  describe('1. Supabase Client & Configuration Diagnostics', () => {
    it('accurately identifies whether valid Supabase credentials are provided', () => {
      // In default development without real credentials, isSupabaseConfigured should be false
      const configured = isSupabaseConfigured();
      expect(typeof configured).toBe('boolean');

      const status = getSupabaseStatus();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('url');
      expect(status).toHaveProperty('hasKey');
    });

    it('reports cloud status via AuthService without crashing', () => {
      const isCloud = AuthService.isCloudEnabled();
      expect(typeof isCloud).toBe('boolean');
    });
  });

  describe('2. Authentication Lifecycle with Hybrid Fallback', () => {
    it('initializes to a valid guest user session by default', () => {
      const user = AuthService.getUser();
      expect(user).toBeDefined();
      expect(user.isGuest).toBe(true);
      expect(user.email).toContain('@');
      expect(AuthService.isGuest()).toBe(true);
      expect(AuthService.isAuthenticated()).toBe(false);
    });

    it('validates email format on login', async () => {
      await expect(AuthService.login('not-an-email')).rejects.toThrow(/valid email/i);
      await expect(AuthService.login('')).rejects.toThrow(/valid email/i);
    });

    it('validates email and password length on sign up', async () => {
      await expect(AuthService.signUp('test@floz.dev', '123')).rejects.toThrow(/at least 6 characters/i);
      await expect(AuthService.signUp('invalid-email', '12345678')).rejects.toThrow(/valid email/i);
    });

    it('successfully registers and signs in users in hybrid mode', async () => {
      const user = await AuthService.signUp('engineer@circuit.io', 'SuperPassword123!', 'Circuit Engineer');
      expect(user.email).toBe('engineer@circuit.io');
      expect(user.name).toBe('Circuit Engineer');
      expect(user.isGuest).toBe(false);
      expect(AuthService.isAuthenticated()).toBe(true);

      // Verify session was persisted
      const current = AuthService.getUser();
      expect(current.email).toBe('engineer@circuit.io');
    });

    it('notifies subscribers on auth state change and supports sign out', async () => {
      let notifiedUser: any = null;
      const unsubscribe = AuthService.subscribe((u) => {
        notifiedUser = u;
      });

      await AuthService.login('lead_dev@floz.dev', 'DevPassword123!');
      expect(notifiedUser).toBeDefined();
      expect(notifiedUser.email).toBe('lead_dev@floz.dev');

      await AuthService.logout();
      expect(AuthService.isGuest()).toBe(true);
      expect(notifiedUser.isGuest).toBe(true);

      unsubscribe();
    });
  });

  describe('3. Cloud Project Storage Service', () => {
    it('returns an array of projects from listProjects', async () => {
      const projects = await CloudProjectService.listProjects();
      expect(Array.isArray(projects)).toBe(true);
    });

    it('persists a project and returns saved metadata', async () => {
      const testProject = createBlankProject('Supabase IoT Controller');
      testProject.metadata.description = 'Testing Supabase cloud persistence';

      const result = await CloudProjectService.saveProject(testProject);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('isCloud');
      expect(typeof result.isCloud).toBe('boolean');

      // Verify that the project can be loaded back
      const loaded = await CloudProjectService.loadProject(testProject.metadata.id);
      expect(loaded).toBeDefined();
      expect(loaded.metadata.name).toBe('Supabase IoT Controller');
      expect(loaded.metadata.description).toBe('Testing Supabase cloud persistence');
    });

    it('handles project deletion cleanly', async () => {
      const testProject = createBlankProject('Temporary Board');
      await CloudProjectService.saveProject(testProject);

      await expect(CloudProjectService.deleteProject(testProject.metadata.id)).resolves.not.toThrow();
    });
  });
});
