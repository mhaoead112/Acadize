import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, Zap, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiEndpoint } from '@/lib/config';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function ActivateFreeTrial() {
  const [, setLocation] = useLocation();
  const { data: tenant, isLoading: isTenantLoading } = useTenant();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isActivating, setIsActivating] = useState(false);

  if (isAuthLoading || isTenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B1120]">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!user) {
    setLocation('/login');
    return null;
  }

  const handleActivateFreeTrial = async () => {
    setIsActivating(true);
    try {
      const res = await fetch(apiEndpoint('/api/subscription/activate-free-trial'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('acadize_token') || localStorage.getItem('eduverse_token')}`
        },
      });

      const data = await res.json();

      if (data.success) {
        toast({ 
          title: "Free Trial Activated!", 
          description: "Enjoy 30 days of full access!" 
        });
        setLocation('/student');
      } else {
        toast({ 
          title: "Activation Failed", 
          description: data.message || "Unable to activate free trial",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(error);
      toast({ 
        title: "Error", 
        description: "Failed to activate free trial",
        variant: "destructive"
      });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white flex flex-col font-sans relative overflow-hidden transition-colors duration-300">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 dark:bg-blue-900/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-100/20 dark:bg-amber-900/10 blur-[120px] rounded-full" />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 flex flex-col items-center justify-center relative z-10 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl w-full"
        >
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-white/10 p-8 md:p-12 text-center">
            {/* Icon */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 dark:bg-primary/30 rounded-full blur-2xl animate-pulse-soft"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 transform -rotate-6">
                  <Zap size={40} className="text-navy-950" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight leading-tight text-slate-900 dark:text-white">
              Start Your <span className="text-primary italic">Free Trial</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
              Experience the premium power of {tenant?.name || 'Acadize'} for 30 days with no commitment.
            </p>

            {/* Features List */}
            <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-6 md:p-8 mb-8 border border-slate-100 dark:border-white/5 text-left">
              <h3 className="text-sm font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Calendar size={16} className="text-primary" />
                30-Day Premium Access Includes
              </h3>
              
              <ul className="grid sm:grid-cols-2 gap-4">
                {[
                  'Full Course Access',
                  'AI Learning Tutor',
                  'Live Study Rooms',
                  'Progress Tracking',
                  'Course Certificates',
                  'Priority Support'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 dark:text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                      <Check size={12} strokeWidth={4} />
                    </div>
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <Button
                onClick={handleActivateFreeTrial}
                disabled={isActivating}
                size="lg"
                className="w-full bg-primary hover:bg-primary-hover text-navy-950 font-bold h-14 rounded-xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 text-lg"
              >
                {isActivating ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Activate My Free Trial
                    <ArrowRight size={20} />
                  </>
                )}
              </Button>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                 <Button 
                  variant="ghost"
                  onClick={() => setLocation('/subscription-required')}
                  className="flex-1 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                
                <Button 
                  variant="link"
                  onClick={() => setLocation('/activate')}
                  className="flex-1 text-primary font-bold hover:text-primary-hover"
                >
                  Skip to Subscriptions
                </Button>
              </div>
            </div>

            <p className="mt-8 text-xs text-slate-400 dark:text-gray-500">
              No credit card required • Cancel anytime • 30 days of full access
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-slate-200 dark:border-white/5 text-center relative z-10">
        <p className="text-xs text-slate-400 dark:text-gray-500">
          By activating, you agree to our <a href="#" className="underline hover:text-primary">Terms of Service</a> and <a href="#" className="underline hover:text-primary">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
}
