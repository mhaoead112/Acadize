import { useState, useEffect, useRef } from 'react';

export interface UseDevToolsDetectionReturn {
  isDevToolsOpen: boolean;
  detectionMethod: 'resize' | 'none';
}

/**
 * Lightweight DevTools detection based on viewport/outer window deltas.
 * This avoids timing/profiling loops that can add main-thread overhead.
 */
export function useDevToolsDetection(
  onDevToolsOpen: () => void,
  checkInterval: number = 5000,
  enabled: boolean = true
): UseDevToolsDetectionReturn {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [detectionMethod, setDetectionMethod] = useState<'resize' | 'none'>('none');
  const lastStateRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsDevToolsOpen(false);
      setDetectionMethod('none');
      return;
    }

    const checkWithResize = (): boolean => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      return widthThreshold || heightThreshold;
    };

    const detectDevTools = () => {
      const detected = checkWithResize();
      setIsDevToolsOpen(detected);
      setDetectionMethod(detected ? 'resize' : 'none');

      if (detected && !lastStateRef.current) {
        onDevToolsOpen();
      }

      lastStateRef.current = detected;
    };

    detectDevTools();
    checkIntervalRef.current = setInterval(detectDevTools, checkInterval);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [onDevToolsOpen, checkInterval, enabled]);

  return {
    isDevToolsOpen,
    detectionMethod,
  };
}

export default useDevToolsDetection;
