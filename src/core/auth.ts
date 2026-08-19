/**
 * FloZ EDA - Authentication & Guest Account Service
 * Clean authentication abstraction supporting Guest Mode, Local Accounts,
 * and future Cloud Sync integrations without storing plain-text passwords in localStorage.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'floz_auth_user_v1';

export class AuthService {
  private static currentUser: User | null = null;
  private static listeners: Array<(user: User) => void> = [];

  /**
   * Initializes user session from storage or defaults to Guest.
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

  /**
   * Authenticates user with credentials.
   */
  public static async login(email: string, password?: string): Promise<User> {
    if (!email || !email.includes('@')) {
      throw new Error('Please provide a valid email address.');
    }

    // Clean authentication simulation (ready for backend REST / Firebase hookup)
    const authenticatedUser: User = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      email: email.trim().toLowerCase(),
      name: email.split('@')[0],
      isGuest: false,
      createdAt: Date.now(),
    };

    this.currentUser = authenticatedUser;
    this.persist(authenticatedUser);
    this.notify(authenticatedUser);
    return authenticatedUser;
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
   * Logs out user and returns to Guest mode.
   */
  public static logout(): void {
    this.loginAsGuest();
  }

  public static subscribe(listener: (user: User) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
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
