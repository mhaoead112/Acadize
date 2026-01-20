import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ShieldCheck, Monitor, Eye, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface ProctoringConsentProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  examTitle?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProctoringConsent({
  isOpen,
  onAccept,
  onDecline,
  examTitle = 'this exam',
}: ProctoringConsentProps) {
  if (!isOpen) return null;

  const features = [
    {
      icon: Camera,
      title: 'Webcam access for face detection',
      description: 'Ensures you are present during the exam',
    },
    {
      icon: Monitor,
      title: 'Screen activity monitoring',
      description: 'Detects tab switches and window changes',
    },
    {
      icon: Eye,
      title: 'Attention tracking',
      description: 'Monitors if you are looking at the screen',
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <Card className="w-full max-w-lg border-2 border-[#FFD700]/30 bg-gradient-to-br from-[#0a192f] to-[#112240] shadow-2xl">
            <CardHeader className="relative pb-4">
              <button
                onClick={onDecline}
                className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[#FFD700]/20">
                  <Camera className="h-6 w-6 text-[#FFD700]" />
                </div>
                <CardTitle className="text-xl font-bold text-white">
                  Enable Exam Proctoring
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Feature list */}
              <div className="space-y-3">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/5"
                  >
                    <feature.icon className="h-5 w-5 text-[#FFD700] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm">
                        {feature.title}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Webcam preview placeholder */}
              <div className="flex justify-center">
                <div className="w-32 h-24 rounded-lg border-2 border-dashed border-[#FFD700]/40 bg-black/30 flex flex-col items-center justify-center gap-2">
                  <Camera className="h-6 w-6 text-[#FFD700]/60" />
                  <span className="text-xs text-gray-400">Webcam Preview</span>
                  <span className="text-[10px] text-gray-500">Face will appear here</span>
                </div>
              </div>

              {/* Privacy notice */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Lock className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-emerald-300">
                  All processing is done locally on your device. No video is recorded or sent to any server.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={onAccept}
                  className="flex-1 bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#0a192f] font-bold h-12"
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Allow & Start Exam
                </Button>
                <Button
                  onClick={onDecline}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 h-12"
                >
                  Cancel
                </Button>
              </div>

              <p className="text-center text-xs text-gray-500">
                By clicking "Allow & Start Exam", you agree to the proctoring requirements for {examTitle}.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ProctoringConsent;
