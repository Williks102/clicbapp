import { useCallback, useRef } from 'react';

export type ScannerSoundType = 'success' | 'error';

/**
 * Hook pour gérer les feedbacks sonores du scanner
 */
export function useScannerSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialiser l'AudioContext (lazy initialization)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  /**
   * Joue un son de succès (deux bips courts aigus)
   */
  const playSuccess = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Premier bip
      const oscillator1 = ctx.createOscillator();
      const gainNode1 = ctx.createGain();

      oscillator1.connect(gainNode1);
      gainNode1.connect(ctx.destination);

      oscillator1.frequency.value = 800; // Fréquence aiguë
      oscillator1.type = 'sine';

      gainNode1.gain.setValueAtTime(0.3, now);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      oscillator1.start(now);
      oscillator1.stop(now + 0.1);

      // Deuxième bip légèrement plus haut
      const oscillator2 = ctx.createOscillator();
      const gainNode2 = ctx.createGain();

      oscillator2.connect(gainNode2);
      gainNode2.connect(ctx.destination);

      oscillator2.frequency.value = 1000; // Encore plus aigu
      oscillator2.type = 'sine';

      gainNode2.gain.setValueAtTime(0.3, now + 0.15);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      oscillator2.start(now + 0.15);
      oscillator2.stop(now + 0.25);

      console.log('[SCANNER SOUND] ✅ Playing success sound');
    } catch (error) {
      console.error('[SCANNER SOUND] Error playing success sound:', error);
    }
  }, [getAudioContext]);

  /**
   * Joue un son d'erreur (un bip long grave)
   */
  const playError = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 200; // Fréquence grave
      oscillator.type = 'sawtooth'; // Son plus brut pour l'erreur

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      oscillator.start(now);
      oscillator.stop(now + 0.4);

      console.log('[SCANNER SOUND] ❌ Playing error sound');
    } catch (error) {
      console.error('[SCANNER SOUND] Error playing error sound:', error);
    }
  }, [getAudioContext]);

  /**
   * Joue un son selon le type
   */
  const playSound = useCallback((type: ScannerSoundType) => {
    if (type === 'success') {
      playSuccess();
    } else {
      playError();
    }
  }, [playSuccess, playError]);

  return {
    playSound,
    playSuccess,
    playError,
  };
}
