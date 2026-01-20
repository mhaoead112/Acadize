import { useState, useEffect, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface UseDevToolsDetectionReturn {
  isDevToolsOpen: boolean;
  detectionMethod: 'timing' | 'debugger' | 'resize' | 'none';
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Custom hook to detect if DevTools are open
 * Uses multiple detection methods for better reliability
 * 
 * @param onDevToolsOpen - Callback when DevTools are detected as open
 * @param checkInterval - Interval in ms to check for DevTools (default: 1000ms)
 * @returns Detection state and method used
 */
export function useDevToolsDetection(
  onDevToolsOpen: () => void,
  checkInterval: number = 1000
): UseDevToolsDetectionReturn {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [detectionMethod, setDetectionMethod] = useState<'timing' | 'debugger' | 'resize' | 'none'>('none');
  const lastStateRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Method 1: Timing-based detection
    // DevTools slow down console operations significantly
    const checkWithTiming = (): boolean => {
      const start = performance.now();
      // This will be slow if DevTools console is open
      console.profile();
      console.profileEnd();
      const end = performance.now();
      const duration = end - start;
      
      // If it takes more than 100ms, DevTools are likely open
      return duration > 100;
    };

    // Method 2: Debugger statement detection
    // Debugger pauses execution if DevTools are open
    const checkWithDebugger = (): boolean => {
      const before = new Date().getTime();
      // This will pause if DevTools are open with breakpoints enabled
      // We use a try-catch to prevent actual pausing
      try {
        // eslint-disable-next-line no-debugger
        (function() {})();
      } catch (e) {
        // Ignore
      }
      const after = new Date().getTime();
      
      // If there's a significant delay, debugger was hit
      return (after - before) > 100;
    };

    // Method 3: Window resize detection
    // DevTools docking changes window dimensions
    const checkWithResize = (): boolean => {
      const threshold = 160; // Minimum DevTools height/width
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      return widthThreshold || heightThreshold;
    };

    // Combined detection function
    const detectDevTools = () => {
      let detected = false;
      let method: 'timing' | 'debugger' | 'resize' | 'none' = 'none';

      // Try timing method first (most reliable)
      if (checkWithTiming()) {
        detected = true;
        method = 'timing';
      }
      // Try resize method
      else if (checkWithResize()) {
        detected = true;
        method = 'resize';
      }
      // Try debugger method (least reliable, can cause issues)
      // Disabled by default to prevent interference
      // else if (checkWithDebugger()) {
      //   detected = true;
      //   method = 'debugger';
      // }

      setIsDevToolsOpen(detected);
      setDetectionMethod(method);

      // Only trigger callback on state change (closed → open)
      if (detected && !lastStateRef.current) {
        onDevToolsOpen();
      }

      lastStateRef.current = detected;
    };

    // Start periodic detection
    checkIntervalRef.current = setInterval(detectDevTools, checkInterval);

    // Run initial check
    detectDevTools();

    // Cleanup
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [onDevToolsOpen, checkInterval]);

  return {
    isDevToolsOpen,
    detectionMethod,
  };
}

export default useDevToolsDetection;
