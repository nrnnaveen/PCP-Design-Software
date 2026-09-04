/**
 * FloZ EDA — Authentication & Account Service
 * Unified authentication abstraction supporting Supabase Cloud Auth,
 * local storage caching, and resilient offline/guest fallback.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
  createdAt: number;
  avatarUrl?: string;
}

const STORAGE_KEY = 'floz_auth_user_v1';

export class AuthService {
  private static currentUser: User | null = null;
  private static listeners: Array<(user: User) => void> = [];
  private static initialized: boolean = false;

  /**
   * Initializes the authentication provider and syncs Supabase session state.
   */
  public static async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // 1. If Supabase is active, listen for live auth changes
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const user = this.mapSupabaseUser(session.user);
          this.currentUser = user;
          this.persist(user);
          this.notify(user);
        }

        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            const user = this.mapSupabaseUser(session.user);
            this.currentUser = user;
            this.persist(user);
            this.notify(user);
          } else if (this.currentUser && !this.currentUser.isGuest) {
            this.loginAsGuest();
          }
        });
      } catch (err) {
        console.warn('Supabase auth initialization warning:', err);
      }
    }
  }

  /**
   * Retrieves active user session from memory or cached storage, defaulting to Guest.
   */
  public static getUser(): User {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.currentUser = JSON.parse(saved);
        return this.currentUser!;
      }
    } catch {}

    // Default to Guest user session
    const guestUser: User = {
      id: `guest_${Date.now()}`,
      email: 'guest@floz.local',
      name: 'Guest Engineer',
      isGuest: true,
      createdAt: Date.now(),
    };
    this.currentUser = guestUser;
    this.persist(guestUser);
    return guestUser;
  }

  public static isGuest(): boolean {
    return this.getUser().isGuest;
  }

  public static isAuthenticated(): boolean {
    return !this.getUser().isGuest;
  }

  public static isCloudEnabled(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Signs in user using Supabase or local fallback.
   */
  public static async login(email: string, password?: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please provide a valid email address.');
    }

    // 1. Live Supabase Authentication
    if (isSupabaseConfigured() && supabase) {
      if (!password) {
        throw new Error('Password is required for account login.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.user) {
        const authenticatedUser = this.mapSupabaseUser(data.user);
        this.currentUser = authenticatedUser;
        this.persist(authenticatedUser);
        this.notify(authenticatedUser);
        return authenticatedUser;
      }
    }

    // 2. Local Fallback Mode
    const localUser: User = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      isGuest: false,
      createdAt: Date.now(),
    };

    this.currentUser = localUser;
    this.persist(localUser);
    this.notify(localUser);
    return localUser;
  }

  /**
   * Registers a new account with Supabase or local fallback.
   */
  public static async signUp(email: string, password: string, name?: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // 1. Live Supabase Registration
    if (isSupabaseConfigured() && supabase) {
      const displayName = name?.trim() || cleanEmail.split('@')[0];
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: displayName,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.user) {
        const newUser = this.mapSupabaseUser(data.user, displayName);
        this.currentUser = newUser;
        this.persist(newUser);
        this.notify(newUser);
        return newUser;
      }
    }

    // 2. Local Fallback Mode
    const localUser: User = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      email: cleanEmail,
      name: name?.trim() || cleanEmail.split('@')[0],
      isGuest: false,
      createdAt: Date.now(),
    };

    this.currentUser = localUser;
    this.persist(localUser);
    this.notify(localUser);
    return localUser;
  }

  /**
   * Switches or resets to guest mode.
   */
  public static loginAsGuest(): User {
    const guestUser: User = {
      id: `guest_${Date.now()}`,
      email: 'guest@floz.local',
      name: 'Guest Engineer',
      isGuest: true,
      createdAt: Date.now(),
    };

    this.currentUser = guestUser;
    this.persist(guestUser);
    this.notify(guestUser);
    return guestUser;
  }

  /**
   * Signs out the user from Supabase and returns to Guest mode.
   */
  public static async logout(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Error during Supabase signout:', err);
      }
    }
    this.loginAsGuest();
  }

  public static subscribe(listener: (user: User) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static mapSupabaseUser(sbUser: any, fallbackName?: string): User {
    const metadata = sbUser.user_metadata || {};
    const name = metadata.name || fallbackName || sbUser.email?.split('@')[0] || 'FloZ Engineer';
    return {
      id: sbUser.id,
      email: sbUser.email || 'engineer@floz.dev',
      name,
      avatarUrl: metadata.avatar_url,
      isGuest: false,
      createdAt: sbUser.created_at ? new Date(sbUser.created_at).getTime() : Date.now(),
    };
  }

  private static persist(user: User): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {}
  }

  private static notify(user: User): void {
    this.listeners.forEach((l) => {
      try {
        l(user);
      } catch {}
    });
  }
}

// Auto-initialize background listener
AuthService.init().catch(() => {});
