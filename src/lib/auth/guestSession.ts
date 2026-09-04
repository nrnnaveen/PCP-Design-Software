/**
 * FloZ ECA — Isolated Guest Session Utility
 * Manages client-local temporary sessions without altering authenticated user tokens or backend routes.
 */

import { AuthService, User } from '../../core/auth';

const GUEST_NOTICE_SEEN_KEY = 'floz_guest_notice_acknowledged';

export class GuestSessionManager {
  /**
   * Returns true if the current active session is a guest session.
   */
  public static isGuestSession(): boolean {
    return AuthService.isGuest();
  }

  /**
   * Returns the current user object.
   */
  public static getCurrentSession(): User {
    return AuthService.getUser();
  }

  /**
   * Initiates a fresh, isolated local guest session.
   */
  public static startGuestSession(): User {
    return AuthService.loginAsGuest();
  }

  /**
   * Checks whether the unobtrusive guest storage notification has been acknowledged.
   */
  public static hasAcknowledgedNotice(): boolean {
    try {
      return localStorage.getItem(GUEST_NOTICE_SEEN_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Acknowledges the guest storage notice for this browser.
   */
  public static acknowledgeNotice(): void {
    try {
      localStorage.setItem(GUEST_NOTICE_SEEN_KEY, 'true');
    } catch {}
  }

  /**
   * Explanatory text for guest mode limitations.
   */
  public static getGuestDisclaimer(): string {
    return 'Guest session: Design files and stackups are saved locally in your browser cache. Create an account or sign in to sync designs across devices.';
  }
}
