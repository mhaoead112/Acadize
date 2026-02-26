import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Check, CreditCard, Tag, ShieldCheck, Loader2, Zap, Lock, Award, ArrowLeft } from 'lucide-react';
import { apiEndpoint } from '@/lib/config';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AcadizeLogo } from '@/components/AcadizeLogo';

export default function Activate() {
  const [, setLocation] = useLocation();
  const { data: tenant, isLoading: isTenantLoading } = useTenant();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [promoCode, setPromoCode] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoStatus, setPromoStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoTrialDays, setPromoTrialDays] = useState(0);
  
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoApplying(true);
    setPromoStatus('idle');
    setPromoMessage('');

    try {
      const res = await fetch(apiEndpoint('/api/subscription/validate-promo'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('acadize_token') || localStorage.getItem('eduverse_token')}`
        },
        body: JSON.stringify({ 
          code: promoCode,
          plan: selectedPlan
        }),
      });

      const data = await res.json();

      if (data.valid) {
        setPromoStatus('valid');
        setPromoDiscount(data.discount ?? 0);
        setPromoTrialDays(data.trialDays ?? 0);
        setPromoMessage(data.description || `Code applied: ${promoCode.toUpperCase()}`);
        toast({
          title: "Promo Code Applied!",
          description: data.trialDays ? `${data.trialDays}-day free trial` : `You saved ${data.discount ?? 0}%!`,
        });
      } else {
        setPromoStatus('invalid');
        setPromoMessage(data.message || 'Invalid promo code');
      }
    } catch (error) {
      setPromoStatus('invalid');
      setPromoMessage('Error validating code');
    } finally {
      setPromoApplying(false);
    }
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('acadize_token') || localStorage.getItem('eduverse_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      // If valid trial promo, activate trial instead of Paymob checkout
      if (promoStatus === 'valid' && promoTrialDays > 0 && promoCode.trim()) {
        const res = await fetch(apiEndpoint('/api/subscription/activate-trial'), {
          method: 'POST',
          headers,
          body: JSON.stringify({ code: promoCode.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Trial activation failed');
        toast({ title: "Free trial activated!", description: `You have ${promoTrialDays} days of full access.` });
        setLocation('/checkout-success');
        return;
      }

      const res = await fetch(apiEndpoint('/api/subscription/checkout'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          billingCycle: selectedPlan,
          promoCode: promoStatus === 'valid' ? promoCode : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Checkout failed');
      }

      const checkoutUrl = data.iframeUrl ?? data.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else if (data.success) {
        toast({ title: "Subscription Activated!", description: "Welcome aboard!" });
        setLocation('/checkout-success');
      }
    } catch (error) {
      console.error(error);
      toast({ 
        title: "Checkout Failed", 
        description: error instanceof Error ? error.message : "Failed to initiate checkout",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Pricing from tenant (piasters → EGP: divide by 100); fallback 80 EGP / 768 EGP annual
  const monthlyPrice = tenant?.userMonthlyPricePiasters != null ? tenant.userMonthlyPricePiasters / 100 : 80;
  const annualPrice = tenant?.userAnnualPricePiasters != null ? tenant.userAnnualPricePiasters / 100 : 768;
  const currency = tenant?.userCurrency || 'EGP';
  const currencySymbol = currency === 'EGP' ? 'EGP' : currency === 'USD' ? '$' : currency;

  const selectedPrice = selectedPlan === 'monthly' ? monthlyPrice : annualPrice;
  const hasTrial = promoStatus === 'valid' && promoTrialDays > 0;
  const discountPercent = promoStatus === 'valid' ? promoDiscount : 0;
  const discountAmount = hasTrial ? selectedPrice : (selectedPrice * discountPercent / 100);
  const totalDue = hasTrial ? 0 : Math.max(0, selectedPrice - discountAmount);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white flex flex-col font-sans relative overflow-hidden transition-colors duration-300">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 dark:bg-blue-900/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-100/20 dark:bg-amber-900/10 blur-[120px] rounded-full" />

      {/* Header */}
      <header className="container mx-auto px-6 py-8 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/subscription-required')}
            className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <AcadizeLogo variant="full" size="xl" />
        </div>

        <div className="w-16"></div> {/* Spacer for alignment */}
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
            >
              Master Your <span className="text-primary italic">Future</span>
            </motion.h1>
            <p className="text-lg text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose the learning path that fits your goals. Get full access to courses, AI mentoring, and certifications.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column - Plan Selection */}
            <div className="lg:col-span-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Monthly Plan */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPlan('monthly')}
                  className={`p-8 rounded-3xl border-2 transition-all text-left relative overflow-hidden h-full flex flex-col ${
                    selectedPlan === 'monthly'
                      ? 'border-primary bg-white dark:bg-primary/5 shadow-2xl shadow-primary/10'
                      : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-primary/50'
                  }`}
                >
                  <div className="mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                      selectedPlan === 'monthly' ? 'bg-primary text-navy-950' : 'bg-slate-100 dark:bg-white/10 text-slate-400'
                    }`}>
                      <Zap size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Monthly</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">Flexible learning, cancel anytime.</p>
                  </div>
                  
                  <div className="mb-auto">
                    <span className="text-4xl font-bold">{currencySymbol} {monthlyPrice}</span>
                    <span className="text-slate-400 ml-2">/ month</span>
                  </div>

                  <hr className="my-6 border-slate-100 dark:border-white/5" />

                  <ul className="space-y-3">
                    {['All Courses', '24/7 AI Tutor', 'Study Communities'].map((f, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium">
                        <Check size={16} className="text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {selectedPlan === 'monthly' && (
                    <div className="absolute top-6 right-6">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check size={14} className="text-navy-950" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </motion.button>

                {/* Annual Plan */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPlan('annual')}
                  className={`p-8 rounded-3xl border-2 transition-all text-left relative overflow-hidden h-full flex flex-col ${
                    selectedPlan === 'annual'
                      ? 'border-primary bg-white dark:bg-primary/5 shadow-2xl shadow-primary/10'
                      : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-primary/50'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-primary px-4 py-1.5 rounded-bl-2xl text-[10px] font-bold text-navy-950 uppercase tracking-widest">
                    Best Value
                  </div>

                  <div className="mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                      selectedPlan === 'annual' ? 'bg-primary text-navy-950' : 'bg-slate-100 dark:bg-white/10 text-slate-400'
                    }`}>
                      <Award size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Annual</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">Total mastery, best price.</p>
                  </div>
                  
                  <div className="mb-auto">
                    <span className="text-4xl font-bold">{currencySymbol} {Math.round(annualPrice / 12)}</span>
                    <span className="text-slate-400 ml-2">/ month</span>
                    <p className="text-xs text-primary font-bold mt-1">{currencySymbol} {annualPrice} billed annually</p>
                  </div>

                  <hr className="my-6 border-slate-100 dark:border-white/5" />

                  <ul className="space-y-3">
                    {['2 Months FREE', 'Certifications', 'Priority Support', 'Everything in Monthly'].map((f, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium">
                        <Check size={16} className="text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {selectedPlan === 'annual' && (
                    <div className="absolute top-6 right-12">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check size={14} className="text-navy-950" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </motion.button>
              </div>

              {/* Promo Code */}
              <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-slate-200 dark:border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Tag size={18} className="text-primary" />
                  Have a Promo Code?
                </h3>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    className="flex-1 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                  <Button 
                    onClick={handleApplyPromo}
                    disabled={promoApplying || !promoCode}
                    className="bg-primary hover:bg-primary-hover text-navy-950 font-bold px-8 rounded-xl"
                  >
                    {promoApplying ? <Loader2 className="animate-spin" size={20} /> : 'Apply'}
                  </Button>
                </div>
                <AnimatePresence>
                  {promoMessage && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mt-4 p-3 rounded-xl text-xs font-bold border ${
                        promoStatus === 'valid' 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}
                    >
                      {promoMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-white/5 rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none sticky top-8">
                <h3 className="text-xl font-bold mb-6">Order Summary</h3>
                
                <div className="space-y-4 mb-6 pb-6 border-b border-slate-100 dark:border-white/5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-gray-400 capitalize">{selectedPlan} Plan</span>
                    <span className="font-bold">{currencySymbol} {selectedPrice}</span>
                  </div>
                  {promoStatus === 'valid' && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex justify-between items-center text-green-500 font-bold"
                    >
                      <span>{hasTrial ? `Free trial (${promoTrialDays} days)` : `Discount (${promoDiscount}%)`}</span>
                      <span>-{currencySymbol} {discountAmount}</span>
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-between items-center mb-8">
                  <span className="text-lg font-bold">Total Due</span>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-primary">{currencySymbol} {totalDue}</span>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-bold mt-1">
                      {hasTrial ? 'Free trial — no charge today' : 'One-time Charge'}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSubscribe}
                  disabled={isProcessing}
                  size="lg"
                  className="w-full bg-primary hover:bg-primary-hover text-navy-950 font-bold h-14 rounded-xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <CreditCard size={18} className="group-hover:scale-110 transition-transform" />
                      Complete Checkout
                    </>
                  )}
                </Button>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-tighter">
                    <ShieldCheck size={14} className="text-green-500" /> 
                    Secure 256-bit SSL Payment
                  </div>
                  
                  <div className="flex items-center justify-center gap-3 opacity-30 grayscale">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-3" alt="Visa" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5" alt="Mastercard" />
                    <img src="https://cdn.worldvectorlogo.com/logos/stripe-2.svg" className="h-4" alt="Stripe" />
                  </div>
                </div>
              </div>

              {/* Learning Guarantee */}
              <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 rounded-3xl border border-primary/10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Lock size={18} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-1">Learning Guarantee</h4>
                    <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                      Instant access to all premium features. No hidden fees, no complicated cancellations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Simplified Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-slate-100 dark:border-white/5 text-center relative z-10">
        <p className="text-xs text-slate-400 dark:text-gray-500 font-medium">
          Powered by <span className="text-primary">Acadize</span>
        </p>
      </footer>
    </div>
  );
}
