import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useTheme } from "@/contexts/ThemeContext";
import { useTenant } from '@/hooks/useTenant';
import { apiEndpoint } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import {
  Check, ArrowLeft, ShieldCheck, Tag, Loader2,
  Zap, Crown, Calendar, CreditCard, Smartphone, Star, ChevronRight, Sparkles, PartyPopper
} from 'lucide-react';

interface RegisterStep4Props {
  data: {
    fullName: string;
    email: string;
    phone?: string;
    role: string;
    gradeLevel?: string;
    dateOfBirth?: string;
    subject?: string;
    childName?: string;
    password: string;
    selectedPlan: 'monthly' | 'annual' | null;
    billingCycle: 'monthly' | 'annual';
  };
  updateData: (data: any) => void;
  onBack: () => void;
  onPaymentComplete: () => void;
  userId: string;
  organizationId: string;
  pricing: any;
  userRole: string;
  checkoutData: any;
  onInitiatePayment: (billingCycle: 'monthly' | 'annual', couponCode?: string) => Promise<void>;
  isInitiatingPayment: boolean;
}

type Phase = 'select' | 'paying';

export function RegisterStep4({
  data,
  updateData,
  onBack,
  onPaymentComplete,
  pricing,
  checkoutData,
  onInitiatePayment,
  isInitiatingPayment,
}: RegisterStep4Props) {
  const { t } = useTranslation('auth');
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>(data.selectedPlan || 'monthly');
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [couponMessage, setCouponMessage] = useState('');
  const [couponTrialDays, setCouponTrialDays] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [freeTrialData, setFreeTrialData] = useState<{ trialDays: number; message: string } | null>(null);

  // Sync checkout data from parent
  useEffect(() => {
    if (checkoutData?.freeCheckout) {
      // Trial activated on backend — show confirmation, no Paymob needed
      setFreeTrialData({ trialDays: checkoutData.trialDays, message: checkoutData.message });
      setPhase('freeConfirm' as any);
      return;
    }
    const url = checkoutData?.iframeUrl || checkoutData?.checkoutUrl;
    if (url) {
      setIframeUrl(url);
      setPhase('paying');
    }
  }, [checkoutData]);

  // Pricing — API returns monthlyPricePiasters / annualPricePiasters
  const monthlyPiasters = pricing?.monthlyPricePiasters ?? pricing?.monthlyPrice ?? 8000;
  const annualPiasters = pricing?.annualPricePiasters ?? pricing?.annualPrice ?? 76800;
  const monthlyEGP = Math.round(monthlyPiasters / 100);
  const annualTotalEGP = Math.round(annualPiasters / 100);
  const annualMonthlyEGP = Math.round(annualPiasters / 100 / 12);
  const annualSavings = Math.round((monthlyPiasters * 12 - annualPiasters) / 100);

  const currentPrice = selectedPlan === 'monthly' ? monthlyEGP : annualTotalEGP;
  const hasTrialDiscount = couponStatus === 'valid' && couponTrialDays && couponTrialDays > 0;
  const discountAmount = hasTrialDiscount ? currentPrice : 0;
  const finalPrice = hasTrialDiscount ? 0 : currentPrice;
  const currentLabel = selectedPlan === 'monthly' ? `EGP ${monthlyEGP}/month` : `EGP ${annualTotalEGP}/year`;

  const handleValidateCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponStatus('validating');
    try {
      const res = await fetch(apiEndpoint('/api/registration/validate-coupon'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim() }),
      });
      const result = await res.json();
      if (res.ok && result.valid) {
        setCouponStatus('valid');
        setCouponCode(couponInput.trim());
        setCouponMessage(result.description || t('promoCodeApplied'));
        setCouponTrialDays(result.trialDays || null);
        toast({ title: `🎉 ${t('promoApplied')}`, description: result.description });
      } else {
        setCouponStatus('invalid');
        setCouponMessage(result.message || t('invalidPromoCode'));
      }
    } catch {
      setCouponStatus('invalid');
      setCouponMessage(t('couldNotValidate'));
    }
  };

  const handleProceedToPayment = async () => {
    setIsLoading(true);
    updateData({ selectedPlan, billingCycle: selectedPlan });
    try {
      await onInitiatePayment(selectedPlan, couponCode || undefined);
      // iframeUrl will be set via useEffect when checkoutData updates
    } catch {
      // error toast handled in wizard
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSelect = () => {
    setPhase('select');
    setIframeUrl(null);
  };

  const isBusy = isLoading || isInitiatingPayment;

  const planFeatures = [
    t('fullPlatformAccess'),
    t('aiLearningTools'),
    t('progressTracking'),
    t('examPrep'),
    t('prioritySupport'),
  ];

  // ─── PHASE: FREE TRIAL CONFIRMATION ────────────────────────────────────────
  if ((phase as any) === 'freeConfirm' && freeTrialData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: '520px' }}>
        {/* Animated glow ring */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl scale-150" />
          <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
            isDark ? 'bg-emerald-500/20 border-2 border-emerald-500/40' : 'bg-emerald-50 border-2 border-emerald-200'
          }`}>
            <Sparkles className="w-10 h-10 text-emerald-500" />
          </div>
        </div>

        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('freeTrialActivated')} 🎉
        </h2>
        <p className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          <Trans i18nKey="auth:freeTrialDaysReady" values={{ days: freeTrialData.trialDays }} components={{ 1: <span className="font-semibold text-emerald-500" /> }} />
        </p>
        <p className={`text-xs mb-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {t('noChargeToday')}
        </p>

        {/* 0 EGP summary card */}
        <div className={`w-full max-w-xs rounded-2xl border p-5 mb-6 ${
          isDark ? 'bg-navy-800 border-navy-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('plan')}</span>
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {selectedPlan === 'monthly' ? t('monthly') : t('annual')}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('promoCode')}</span>
            <span className="text-sm font-medium text-emerald-500">{t('applied')} ✓</span>
          </div>
          <div className={`border-t pt-3 flex justify-between items-center ${
            isDark ? 'border-navy-700' : 'border-gray-200'
          }`}>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('dueToday')}</span>
            <span className="text-2xl font-bold text-emerald-500">EGP 0</span>
          </div>
        </div>

        <button
          onClick={onPaymentComplete}
          className="w-full max-w-xs py-3.5 rounded-2xl font-semibold text-white text-sm
            bg-gradient-to-r from-emerald-500 to-teal-500
            hover:from-emerald-400 hover:to-teal-400
            transition-all duration-200 shadow-lg shadow-emerald-500/25
            flex items-center justify-center gap-2"
        >
          <PartyPopper className="w-4 h-4" />
          {t('startMyFreeTrial')}
        </button>

        <p className={`text-xs mt-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          {t('accountSecuredCancelAnytime')}
        </p>
      </div>
    );
  }

  // ─── PHASE: PAYING (iframe) ───────────────────────────────────────────────
  if (phase === 'paying' && iframeUrl) {
    return (
      <div className="flex flex-col" style={{ minHeight: '600px' }}>
        {/* Header */}
        <div className={`px-5 py-3.5 border-b flex items-center gap-3 ${isDark ? 'border-navy-700 bg-navy-900' : 'border-gray-100 bg-white'}`}>
          <button
            onClick={handleBackToSelect}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-navy-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('securePayment')}
            </h3>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {selectedPlan === 'monthly' ? t('monthlyPlan') : t('annualPlan')} · {currentLabel}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('sslSecured')}</span>
          </div>
        </div>

        {/* Iframe */}
        <iframe
          src={iframeUrl}
          className="flex-1 w-full border-0"
          style={{ minHeight: '560px' }}
          title={t('securePayment')}
          allow="payment"
        />
      </div>
    );
  }

  // ─── PHASE: SELECT (plan + summary + promo) ───────────────────────────────
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className={`px-6 py-4 border-b flex items-center gap-3 ${isDark ? 'border-navy-700 bg-navy-900' : 'border-gray-100 bg-white'}`}>
        <button
          onClick={onBack}
          className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-navy-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('chooseYourPlan')}
          </h2>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('step4Of4')}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('securedByPaymob')}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* LEFT: Plan cards */}
        <div className={`lg:w-[400px] flex-shrink-0 p-5 border-r ${isDark ? 'border-navy-700' : 'border-gray-100'}`}>

          {/* Plan toggle */}
          <div className="space-y-3 mb-5">
            {/* Monthly */}
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 relative ${
                selectedPlan === 'monthly'
                  ? 'border-indigo-500 shadow-md shadow-indigo-500/10'
                  : isDark ? 'border-navy-600 hover:border-navy-500' : 'border-gray-200 hover:border-gray-300'
              } ${isDark ? 'bg-navy-800' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedPlan === 'monthly' ? 'bg-indigo-100 dark:bg-indigo-900/40' : isDark ? 'bg-navy-700' : 'bg-gray-100'}`}>
                    <Calendar className={`w-4 h-4 ${selectedPlan === 'monthly' ? 'text-indigo-600' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('monthly')}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('billedEveryMonth')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>EGP {monthlyEGP}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('perMonth')}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPlan === 'monthly' ? 'border-indigo-500 bg-indigo-500' : isDark ? 'border-navy-500' : 'border-gray-300'}`}>
                    {selectedPlan === 'monthly' && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </div>
            </button>

            {/* Annual */}
            <button
              onClick={() => setSelectedPlan('annual')}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 relative ${
                selectedPlan === 'annual'
                  ? 'border-amber-500 shadow-md shadow-amber-500/10'
                  : isDark ? 'border-navy-600 hover:border-navy-500' : 'border-gray-200 hover:border-gray-300'
              } ${isDark ? 'bg-navy-800' : 'bg-white'}`}
            >
              <div className="absolute -top-2.5 left-4">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> {t('saveEgp', { amount: annualSavings })}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedPlan === 'annual' ? 'bg-amber-100 dark:bg-amber-900/40' : isDark ? 'bg-navy-700' : 'bg-gray-100'}`}>
                    <Crown className={`w-4 h-4 ${selectedPlan === 'annual' ? 'text-amber-600' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('annual')}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>EGP {annualTotalEGP}{t('perYear')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>EGP {annualMonthlyEGP}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('perMonth')}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPlan === 'annual' ? 'border-amber-500 bg-amber-500' : isDark ? 'border-navy-500' : 'border-gray-300'}`}>
                    {selectedPlan === 'annual' && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Features */}
          <div className={`rounded-xl p-3.5 mb-4 ${isDark ? 'bg-navy-800/50' : 'bg-gray-50'}`}>
            <p className={`text-xs font-semibold mb-2.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('whatsIncluded')}</p>
            <ul className="space-y-2">
              {planFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                  </div>
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment method info */}
          <div className={`rounded-xl p-3.5 mb-4 border ${isDark ? 'border-navy-600 bg-navy-800' : 'border-gray-200 bg-white'}`}>
            <p className={`text-xs font-semibold mb-2.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('acceptedPaymentMethods')}</p>
            <div className="flex gap-2">
              <div className={`flex items-center gap-2 flex-1 rounded-lg px-3 py-2 border ${isDark ? 'border-navy-600 bg-navy-700' : 'border-gray-200 bg-gray-50'}`}>
                <CreditCard className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('card')}</span>
              </div>
              <div className={`flex items-center gap-2 flex-1 rounded-lg px-3 py-2 border ${isDark ? 'border-navy-600 bg-navy-700' : 'border-gray-200 bg-gray-50'}`}>
                <Smartphone className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('mobileWallet')}</span>
              </div>
            </div>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('choosePaymentNextScreen')}
            </p>
          </div>
        </div>

        {/* RIGHT: Order summary + promo + CTA */}
        <div className={`flex-1 p-5 flex flex-col gap-4 ${isDark ? 'bg-navy-900' : 'bg-gray-50'}`}>

          {/* Order Summary */}
          <div className={`rounded-2xl border p-5 ${isDark ? 'border-navy-700 bg-navy-800' : 'border-gray-200 bg-white'}`}>
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('orderSummary')}</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {selectedPlan === 'monthly' ? t('monthlyPlan') : t('annualPlan')}
                </span>
                <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  EGP {currentPrice}
                </span>
              </div>

              {selectedPlan === 'annual' && (
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    (EGP {annualMonthlyEGP}{t('perMonth')} × 12)
                  </span>
                  <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {t('saveEgp', { amount: annualSavings })}
                  </span>
                </div>
              )}

              {couponStatus === 'valid' && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-500">{t('promoCode')} ({couponCode})</span>
                  <span className="text-xs text-emerald-500 font-medium">- EGP {discountAmount}</span>
                </div>
              )}

              <div className={`border-t pt-3 ${isDark ? 'border-navy-600' : 'border-gray-100'}`}>
                <div className="flex justify-between items-center">
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('totalDueToday')}</span>
                  <div className="flex items-center gap-2">
                    {hasTrialDiscount && (
                      <span className={`text-sm line-through ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        EGP {currentPrice}
                      </span>
                    )}
                    <span className={`font-bold text-lg ${hasTrialDiscount ? 'text-emerald-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
                      EGP {finalPrice}
                    </span>
                  </div>
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {hasTrialDiscount
                    ? t('freeForDaysThen', { days: couponTrialDays, label: currentLabel })
                    : selectedPlan === 'monthly' ? t('renewsMonthly') : t('renewsAnnually')}
                </p>
              </div>
            </div>
          </div>

          {/* Promo Code */}
          <div className={`rounded-2xl border p-4 ${isDark ? 'border-navy-700 bg-navy-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-indigo-500" />
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{t('promoCode')}</span>
              {couponStatus === 'valid' && (
                <span className="ml-auto text-xs text-emerald-500 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> {t('applied')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                placeholder={t('enterPromoCode')}
                disabled={couponStatus === 'valid'}
                className={`flex-1 px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${
                  couponStatus === 'valid'
                    ? isDark ? 'border-emerald-600 bg-emerald-900/20 text-emerald-400' : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : couponStatus === 'invalid'
                    ? isDark ? 'border-red-600 bg-red-900/20 text-red-400' : 'border-red-300 bg-red-50 text-red-700'
                    : isDark ? 'border-navy-600 bg-navy-700 text-white placeholder-gray-500' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'
                }`}
              />
              <button
                onClick={handleValidateCoupon}
                disabled={!couponInput.trim() || couponStatus === 'valid' || couponStatus === 'validating'}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {couponStatus === 'validating' ? <Loader2 className="w-4 h-4 animate-spin" /> : t('apply')}
              </button>
            </div>
            {couponMessage && (
              <p className={`text-xs mt-2 ${couponStatus === 'valid' ? 'text-emerald-500' : 'text-red-500'}`}>
                {couponMessage}
              </p>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleProceedToPayment}
            disabled={isBusy}
            className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('preparingCheckout')}
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                {t('proceedToPay', { price: currentPrice })}
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className={`text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            🔒 {t('paymentEncryptedSecure')}
          </p>
        </div>
      </div>
    </div>
  );
}
