import React, { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { XCircle, RefreshCw, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { apiEndpoint } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';

export default function CheckoutFailed() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const { data: tenant } = useTenant();
  const { toast } = useToast();

  const [isRetrying, setIsRetrying] = useState(false);

  const orderId = searchParams.get('order');
  const transactionId = searchParams.get('transaction');
  const errorParam = searchParams.get('error');

  // Retry payment — creates a new Paymob session for the same user/subscription
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // We use the orderId to find the payment and retry
      const res = await fetch(apiEndpoint('/api/registration/retry-payment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymobOrderId: orderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Could not create a new payment session.');
      }

      const newIframeUrl = data.checkoutUrl || data.iframeUrl;
      if (newIframeUrl) {
        // Redirect to a retry page that shows the iframe
        window.location.href = newIframeUrl;
      } else {
        throw new Error('No checkout URL returned from server.');
      }
    } catch (err) {
      toast({
        title: 'Retry Failed',
        description: err instanceof Error ? err.message : 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRegisterAgain = () => {
    setLocation('/register');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-navy-950 dark:via-navy-900 dark:to-navy-950 flex items-center justify-center py-12 px-4 font-sans">
      <div className="max-w-lg w-full">
        {/* Card */}
        <div className="bg-white dark:bg-navy-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-navy-700 p-10 text-center">

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-xl">
                <XCircle size={40} className="text-white" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Message */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Payment Failed
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Your payment could not be processed. Don't worry — your account has been saved.
          </p>

          {/* Error detail */}
          {(orderId || errorParam) && (
            <div className="my-5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 text-left">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">What happened?</p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                    {errorParam === 'processing'
                      ? 'There was an error processing your payment callback.'
                      : 'Your card was declined or the transaction was not completed.'}
                  </p>
                  {orderId && (
                    <p className="text-xs text-red-400 dark:text-red-600 mt-1">
                      Reference: {orderId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Common reasons */}
          <div className="my-5 rounded-xl bg-gray-50 dark:bg-navy-700/50 p-4 text-left">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">COMMON REASONS</p>
            <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
              <li>• Insufficient funds in your account</li>
              <li>• Card details entered incorrectly</li>
              <li>• Bank declined the transaction</li>
              <li>• Payment session timed out</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3 mt-6">
            {orderId && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isRetrying ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Creating new session...</>
                ) : (
                  <><RefreshCw className="w-5 h-5" /> Try Payment Again</>
                )}
              </button>
            )}

            <button
              onClick={handleRegisterAgain}
              className="w-full py-3.5 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-navy-700 hover:bg-gray-200 dark:hover:bg-navy-600 transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              Start Registration Again
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
            Need help?{' '}
            <a href="mailto:support@acadize.com" className="text-indigo-500 hover:underline">
              Contact support
            </a>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} {tenant?.name || 'Acadize'}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
