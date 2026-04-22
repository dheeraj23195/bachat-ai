// Temporary stub to prevent native module crashes if expo-av is not compiled into the dev client
export type SoundType = 'success' | 'notification' | 'interaction';

class SoundManager {
  async play(type: SoundType) {
    // Sound is temporarily disabled to resolve UI freezing / bridge crashes
    console.log(`[SoundManager] Suppressed sound output for: ${type}`);
  }
}

export const soundManager = new SoundManager();
