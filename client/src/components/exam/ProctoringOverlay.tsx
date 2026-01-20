import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, CheckCircle, AlertTriangle, XCircle, Users, EyeOff } from 'lucide-react';
import { ProctoringStatus } from '@/hooks/useWebcamProctoring';

// ============================================================================
// TYPES
// ============================================================================

interface ProctoringOverlayProps {
  status: ProctoringStatus;
  webcamRef: React.RefObject<HTMLVideoElement>;
  showPreview?: boolean;
  onTogglePreview?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProctoringOverlay({
  status,
  webcamRef,
  showPreview = true,
  onTogglePreview,
}: ProctoringOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Sync the stream from the main video to the preview video
  useEffect(() => {
    if (previewVideoRef.current && webcamRef.current?.srcObject) {
      previewVideoRef.current.srcObject = webcamRef.current.srcObject;
    }
  }, [webcamRef.current?.srcObject]); // Only run when srcObject changes

  // Determine status indicator color and icon
  const getStatusIndicator = () => {
    if (status.status === 'error') {
      return { color: 'bg-red-500', icon: XCircle, text: 'Error' };
    }
    if (status.status === 'initializing' || status.status === 'requesting_permission') {
      return { color: 'bg-yellow-500 animate-pulse', icon: Camera, text: 'Starting...' };
    }
    if (status.status === 'paused') {
      return { color: 'bg-yellow-500', icon: AlertTriangle, text: 'Paused' };
    }
    if (status.faceCount === 0) {
      return { color: 'bg-red-500 animate-pulse', icon: XCircle, text: 'No face' };
    }
    if (status.faceCount > 1) {
      return { color: 'bg-red-500', icon: Users, text: 'Multiple faces' };
    }
    if (status.isFaceOutOfFrame) {
      return { color: 'bg-yellow-500', icon: AlertTriangle, text: 'Center face' };
    }
    if (status.isLookingAway) {
      return { color: 'bg-yellow-500', icon: EyeOff, text: 'Look at screen' };
    }
    return { color: 'bg-emerald-500', icon: CheckCircle, text: 'Active' };
  };

  const indicator = getStatusIndicator();
  const StatusIcon = indicator.icon;

  if (status.status === 'disabled') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-40"
    >
      <div
        className={`
          relative overflow-hidden rounded-2xl
          border-2 border-[#FFD700]/40
          bg-gradient-to-br from-[#0a192f]/95 to-[#112240]/95
          backdrop-blur-md shadow-2xl
          ${isMinimized ? 'w-auto' : 'w-64'}
        `}
      >
        {/* Glow effect */}
        <div className={`absolute inset-0 opacity-20 ${
          status.faceCount === 1 && !status.isLookingAway 
            ? 'bg-[#FFD700]' 
            : status.faceCount === 0 || status.faceCount > 1 
              ? 'bg-red-500' 
              : 'bg-yellow-500'
        }`} />

        <div className="relative p-3">
          {/* Minimized view */}
          {isMinimized ? (
            <button
              onClick={() => setIsMinimized(false)}
              className="flex items-center gap-2"
            >
              <div className={`w-3 h-3 rounded-full ${indicator.color}`} />
              <span className="text-xs text-white font-medium">Proctoring</span>
            </button>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${indicator.color}`} />
                  <span className="text-xs font-medium text-white">
                    {indicator.text === 'Active' ? 'Proctoring Active' : indicator.text}
                  </span>
                </div>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="text-xs">−</span>
                </button>
              </div>

              {/* Webcam preview */}
              {showPreview && (
                <div className="relative rounded-lg overflow-hidden bg-black mb-2">
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-28 object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  
                  {/* Face detection indicator */}
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70">
                    <StatusIcon className={`h-3 w-3 ${
                      status.faceCount === 1 && !status.isLookingAway ? 'text-emerald-400' : 
                      status.faceCount === 0 || status.faceCount > 1 ? 'text-red-400' : 
                      'text-yellow-400'
                    }`} />
                    <span className="text-[10px] text-white font-medium">
                      {status.faceCount === 1 ? 'Face detected' : 
                       status.faceCount === 0 ? 'No face' : 
                       `${status.faceCount} faces`}
                    </span>
                  </div>
                </div>
              )}

              {/* Violation counter (only show if violations exist) */}
              {status.violationCount > 0 && (
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-red-500/10 border border-red-500/20">
                  <span className="text-[10px] text-red-300">Violations logged</span>
                  <span className="text-xs font-bold text-red-400">{status.violationCount}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ProctoringOverlay;

