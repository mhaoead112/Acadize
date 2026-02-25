import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';

export default function RegisterSuccess() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Redirecting to activation...',
    'Nearly ready to start...',
    'Preparing your account...'
  ];

  useEffect(() => {
    // Simulate activation progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setLocation('/activate'), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Update step text
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 1500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-navy-950 dark:via-navy-900 dark:to-navy-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-lg w-full">
        {/* Success Card */}
        <div className="bg-white dark:bg-navy-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-navy-700 p-12 text-center animate-scale-in">
          {/* Success Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 dark:bg-primary/30 rounded-full blur-2xl animate-pulse-soft"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-primary via-gold to-primary rounded-full flex items-center justify-center shadow-xl">
                <CheckCircle size={48} className="text-navy-900" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Account Created!
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Welcome, {user?.fullName || 'Student'}. Your journey with Acadize begins now.
          </p>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="relative h-3 bg-gray-200 dark:bg-navy-700 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary via-gold to-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              {steps[currentStep]}
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-br from-primary/10 to-gold/10 dark:from-primary/20 dark:to-gold/20 rounded-2xl p-6 border border-primary/20 dark:border-primary/30">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              <span className="font-semibold text-gray-900 dark:text-white">Please check your email</span> to verify your address for full account access!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Didn't receive it? Check your spam folder or contact support.
            </p>
          </div>

          {/* Manual Continue Button (if auto-redirect fails) */}
          {progress === 100 && (
            <button
              onClick={() => setLocation('/activate')}
              className="mt-6 w-full bg-gradient-to-r from-primary via-gold to-primary hover:from-primary-hover hover:via-gold hover:to-primary-hover text-navy-900 font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              Continue to Activation <ArrowRight size={20} />
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
          © 2024 {tenant?.name || 'Acadize'}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
