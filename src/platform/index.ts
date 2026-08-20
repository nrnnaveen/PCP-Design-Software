/**
 * FloZ EDA - Unified Platform Accessor
 * Automatically detects Web or Desktop (Electron) environment and provides unified PlatformAPI.
 */

import { PlatformAPI } from './types';
import { DesktopPlatform } from './desktop';
import { WebPlatform } from './web';

export * from './types';
export { WebPlatform } from './web';
export { DesktopPlatform } from './desktop';

function createPlatform(): PlatformAPI {
  if (typeof window !== 'undefined' && (window as any).flozBridge) {
    return new DesktopPlatform();
  }
  return new WebPlatform();
}

export const platform: PlatformAPI = createPlatform();
