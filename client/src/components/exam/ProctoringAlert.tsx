import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, User, UserX, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

type AlertType = 'face_not_detected' | 'multiple_faces' | 'looking_away' | 'info';

interface ProctoringAlertProps {
  isOpen: boolean;
  type: AlertType;
  onDismiss: () => void;
  metadata?: {
    faceCount?: number;
    duration?: number;
  };
}

// ============================================================================
// ALERT CONFIGS
// ============================================================================

const alertConfigs: Record<AlertType, {
  icon: React.ElementType;
  title: string;
  message: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  face_not_detected: {
    icon: UserX,
    title: 'Face Not Detected',
    message: 'Please ensure your face is visible to the webcam. Position yourself in front of the camera.',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  multiple_faces: {
    icon: User,
    title: 'Multiple Faces Detected',
    message: 'Only one person should be visible during the exam. Please ensure you are alone.',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  looking_away: {
    icon: EyeOff,
    title: 'Please Look at the Screen',
    message: 'You appear to be looking away from the exam. Please focus on your screen.',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  info: {
    icon: CheckCircle,
    title: 'Proctoring Active',
    message: 'Your exam session is being monitored. Please stay focused.',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ProctoringAlert({
  isOpen,
  type,
  onDismiss,
  metadata,
}: ProctoringAlertProps) {
  const config = alertConfigs[type];
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div className={`
            relative overflow-hidden rounded-xl
            border-2 ${config.borderColor}
            ${config.bgColor}
            backdrop-blur-md shadow-2xl
            bg-gradient-to-br from-[#0a192f]/95 to-[#112240]/95
          `}>
            {/* Glow effect */}
            <div className={`absolute inset-0 opacity-10 ${
              type === 'info' ? 'bg-emerald-500' : 
              type === 'looking_away' ? 'bg-yellow-500' : 
              'bg-red-500'
            }`} />

            <div className="relative p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <IconComponent className={`h-5 w-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h4 className={`text-sm font-bold ${config.color}`}>
                    {config.title}
                  </h4>
                  <p className="text-xs text-gray-300 mt-1">
                    {config.message}
                  </p>
                </div>
              </div>

              {/* Positioning hint for face detection issues */}
              {(type === 'face_not_detected' || type === 'multiple_faces') && (
                <div className="flex justify-center gap-4 mt-4 pt-3 border-t border-white/10">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-lg border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-emerald-400">Correct</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-lg border-2 border-red-500/50 bg-red-500/10 flex items-center justify-center">
                      {type === 'multiple_faces' ? (
                        <div className="flex -space-x-2">
                          <User className="h-5 w-5 text-red-400" />
                          <User className="h-5 w-5 text-red-400" />
                        </div>
                      ) : (
                        <UserX className="h-6 w-6 text-red-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-red-400">Incorrect</span>
                  </div>
                </div>
              )}

              {/* Violation logged notice */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  This violation has been logged
                </p>
                <Button
                  size="sm"
                  onClick={onDismiss}
                  className="h-7 px-3 text-xs bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#0a192f] font-bold"
                >
                  I understand
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ProctoringAlert;
