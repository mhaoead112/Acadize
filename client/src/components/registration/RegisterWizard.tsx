import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useTheme } from "@/contexts/ThemeContext";
import { RegisterStep1 } from './RegisterStep1';
import { RegisterStep2 } from './RegisterStep2';
import { RegisterStep3 } from './RegisterStep3';
import { RegisterStep4 } from './RegisterStep4';
import { useTenant } from '@/hooks/useTenant';
import { apiEndpoint, getTenantHeaders } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';

export function RegisterWizard() {
  const { t } = useTranslation('auth');
  const [step, setStep] = useState(1);
  const [_, setLocation] = useLocation();
  const { data: tenant } = useTenant();
  const { toast } = useToast();
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [pricing, setPricing] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'student' as 'student' | 'teacher' | 'parent',
    gradeLevel: '',
    dateOfBirth: '',
    subject: '',
    childName: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    selectedPlan: null as 'monthly' | 'annual' | null,
    billingCycle: 'monthly' as 'monthly' | 'annual',
  });

  // Fetch pricing on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch(apiEndpoint('/api/registration/pricing'));
        if (response.ok) {
          const data = await response.json();
          setPricing(data);
        }
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
      }
    };
    fetchPricing();
  }, [tenant]);

  const updateData = (newData: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

  /**
   * Step 3 submit: just validate and advance to Step 4.
   * No API call here — account creation + payment happens in Step 4
   * after the user selects their plan.
   */
  const handleStep3Submit = () => {
    setStep(4);
  };

  /**
   * Called from Step 4 after user selects a plan and clicks "Proceed to Checkout".
   * Creates the account AND initiates payment in one call with the correct billing cycle.
   */
  const handleInitiatePayment = async (billingCycle: 'monthly' | 'annual', couponCode?: string) => {
    setIsInitiatingPayment(true);
    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        gradeLevel: formData.gradeLevel,
        dateOfBirth: formData.dateOfBirth,
        subject: formData.subject,
        childName: formData.childName,
        billingCycle,
        couponCode: couponCode || undefined, // ← forward promo code (e.g. TRIAL30 → 0 EGP checkout)
      };

      const response = await fetch(apiEndpoint('/api/registration/create-with-payment'), {
        method: 'POST',
        headers: getTenantHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initiate payment');
      }

      const data = await response.json();

      setUserId(data.userId);

      // freeCheckout = trial activated directly (Paymob can't charge 0 EGP)
      if (data.freeCheckout) {
        setCheckoutData({
          freeCheckout: true,
          trialDays: data.trialDays,
          message: data.message,
        });
        return;
      }

      setCheckoutData({
        iframeUrl: data.iframeUrl || data.checkoutUrl,
        checkoutUrl: data.checkoutUrl || data.iframeUrl,
        paymentToken: data.paymentToken,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: t('paymentSetupFailed'),
        description: error instanceof Error ? error.message : t('couldNotPrepareCheckout'),
        variant: "destructive",
      });
      throw error; // Let Step 4 handle the error state
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  const handlePaymentComplete = async () => {
    toast({
      title: t('registrationSuccessful'),
      description: t('checkEmailVerifyLogin'),
    });
    setTimeout(() => {
      setLocation('/login?registered=true');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:bg-none dark:bg-navy-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative">
      <div className={`w-full ${step === 4 ? 'max-w-5xl' : 'max-w-md'} bg-white dark:bg-navy-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-navy-700 transition-all duration-300`}>
        {step === 1 && (
          <RegisterStep1
            data={formData}
            updateData={updateData}
            onNext={handleNext}
            orgName={tenant?.name}
          />
        )}
        {step === 2 && (
          <RegisterStep2
            data={formData}
            updateData={updateData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {step === 3 && (
          <RegisterStep3
            data={formData}
            updateData={updateData}
            onSubmit={handleStep3Submit}
            onBack={handleBack}
          />
        )}
        {step === 4 && (
          <RegisterStep4
            data={formData}
            updateData={updateData}
            onBack={handleBack}
            onPaymentComplete={handlePaymentComplete}
            userId={userId || ''}
            organizationId={tenant?.organizationId ?? tenant?.id ?? ''}
            pricing={pricing}
            userRole={formData.role}
            checkoutData={checkoutData}
            onInitiatePayment={handleInitiatePayment}
            isInitiatingPayment={isInitiatingPayment}
          />
        )}
      </div>
    </div>
  );
}
