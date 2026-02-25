import React, { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { CheckCircle, ArrowRight, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const orderId = searchParams.get('order');
  const plan = searchParams.get('plan') || 'Monthly';

  // If user is already logged in, auto-redirect to their dashboard after 5s
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      setIsRedirecting(true);
      const role = (user as any)?.role;
      const dest = role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/student';
      setLocation(dest);
    }, 5000);
    return () => clearTimeout(timer);
  }, [user, setLocation]);

  const handleContinue = () => {
    setIsRedirecting(true);
    if (user) {
      const role = (user as any)?.role;
      const dest = role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/student';
      setLocation(dest);
    } else {
      // New registrant — go to login
      setLocation('/login?registered=true');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-navy-950 dark:via-navy-900 dark:to-navy-950 flex items-center justify-center py-12 px-4 font-sans">
      <div className="max-w-lg w-full">
        {/* Card */}
        <div className="bg-white dark:bg-navy-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-navy-700 p-10 text-center">

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-xl">
                <CheckCircle size={40} className="text-white" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Message */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            🎉 Payment Successful!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Your subscription is now active. Welcome to {tenant?.name || 'Acadize'}!
          </p>

          {/* Details */}
          <div className="bg-gray-50 dark:bg-navy-700/50 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Plan</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{plan} Subscription</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
              <span className="text-sm font-semibold text-emerald-600">Active ✓</span>
            </div>
            {orderId && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Reference</span>
                <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{orderId}</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleContinue}
            disabled={isRedirecting}
            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-70 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isRedirecting ? (
              <><Loader2 className="animate-spin w-5 h-5" /> Redirecting...</>
            ) : user ? (
              <><ArrowRight className="w-5 h-5" /> Go to Dashboard</>
            ) : (
              <><LogIn className="w-5 h-5" /> Login to your account</>
            )}
          </button>

          {!user && (
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              Your account is ready. Log in with your email and password to get started.
            </p>
          )}
          {user && (
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
              Auto-redirecting in 5 seconds...
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} {tenant?.name || 'Acadize'}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
