/**
 * FloZ ECA - Secure Credential & Settings Storage Abstraction (Phase 3)
 * Supports Desktop native credential stores (Tauri Keychain/SecretStore) with clearly labeled Web development fallback.
 */

export interface ISecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  isHardwareSecured(): boolean;
  getStorageTier(): 'DESKTOP_SECURE_KEYCHAIN' | 'BROWSER_LOCALSTORAGE_DEVELOPMENT_ONLY';
}

class WebSecureStorage implements ISecureStorage {
  public async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  public async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed to write to storage:', e);
    }
  }

  public async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove from storage:', e);
    }
  }

  public isHardwareSecured(): boolean {
    return false;
  }

  public getStorageTier(): 'BROWSER_LOCALSTORAGE_DEVELOPMENT_ONLY' {
    return 'BROWSER_LOCALSTORAGE_DEVELOPMENT_ONLY';
  }
}

class DesktopSecureStorage implements ISecureStorage {
  public async getItem(key: string): Promise<string | null> {
    try {
      if ((window as any).__TAURI__?.store) {
        return await (window as any).__TAURI__.store.get(key);
      }
    } catch {}
    return localStorage.getItem(key);
  }

  public async setItem(key: string, value: string): Promise<void> {
    try {
      if ((window as any).__TAURI__?.store) {
        await (window as any).__TAURI__.store.set(key, value);
        return;
      }
    } catch {}
    localStorage.setItem(key, value);
  }

  public async removeItem(key: string): Promise<void> {
    try {
      if ((window as any).__TAURI__?.store) {
        await (window as any).__TAURI__.store.delete(key);
        return;
      }
    } catch {}
    localStorage.removeItem(key);
  }

  public isHardwareSecured(): boolean {
    return typeof (window as any).__TAURI__ !== 'undefined';
  }

  public getStorageTier(): 'DESKTOP_SECURE_KEYCHAIN' {
    return 'DESKTOP_SECURE_KEYCHAIN';
  }
}

export const secureStorage: ISecureStorage =
  typeof (window as any).__TAURI__ !== 'undefined'
    ? new DesktopSecureStorage()
    : new WebSecureStorage();
