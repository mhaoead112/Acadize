import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Lock, Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

interface RegisterStep3Props {
  data: {
    password: string;
    confirmPassword: string;
    agreeTerms: boolean;
  };
  updateData: (data: Partial<RegisterStep3Props['data']>) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function RegisterStep3({ data, updateData, onSubmit, onBack, isLoading }: RegisterStep3Props) {
  const { t } = useTranslation('auth');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!data.password || data.password.length < 8) {
      newErrors.password = t('passwordMinLength');
    }
    if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = t('passwordsDoNotMatch');
    }
    if (!data.agreeTerms) {
      newErrors.agreeTerms = t('mustAgreeTerms');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit();
    }
  };

  const getStrength = (pass: string) => {
    let strength = 0;
    if (pass.length > 7) strength += 1;
    if (pass.match(/[A-Z]/)) strength += 1;
    if (pass.match(/[0-9]/)) strength += 1;
    if (pass.match(/[^A-Za-z0-9]/)) strength += 1;
    return strength;
  };

  const strength = getStrength(data.password);
  
  return (
    <div className="w-full max-w-md mx-auto p-8 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('securityTitle')}</h2>
        <p className="text-gray-500 dark:text-gray-400">{t('finalStepSecure')}</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8 gap-2">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-sm shadow-md">✓</div>
          <span className="ml-2 text-sm font-medium text-brand-primary hidden sm:block">{t('personalInfo')}</span>
        </div>
        <div className="h-1 w-12 bg-brand-primary rounded-full mx-2"></div>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-sm shadow-md">✓</div>
          <span className="ml-2 text-sm font-medium text-brand-primary hidden sm:block">{t('roleDetails')}</span>
        </div>
        <div className="h-1 w-12 bg-brand-primary rounded-full mx-2"></div>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-brand-primary/30">3</div>
          <span className="ml-2 text-sm font-medium text-brand-primary hidden sm:block">{t('security')}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1 ml-1">{t('password')} *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={data.password}
              onChange={(e) => updateData({ password: e.target.value })}
              className={`w-full pl-10 pr-10 py-3 rounded-xl border ${errors.password ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-navy-600 focus:border-brand-primary focus:ring-brand-primary/20'} focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 dark:bg-navy-900/50 focus:bg-white dark:focus:bg-navy-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          {/* Strength Meter */}
          {data.password && (
            <div className="mt-2 flex gap-1 h-1">
              {[1, 2, 3, 4].map((s) => (
                <div 
                  key={s} 
                  className={`flex-1 rounded-full transition-all duration-300 ${s <= strength ? (strength < 2 ? 'bg-red-400' : strength < 4 ? 'bg-yellow-400' : 'bg-brand-primary') : 'bg-gray-200 dark:bg-navy-700'}`}
                />
              ))}
            </div>
          )}
          {errors.password && <p className="text-red-500 text-xs ml-1 mt-1">{errors.password}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1 ml-1">{t('confirmPassword')} *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <Lock size={18} />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={data.confirmPassword}
              onChange={(e) => updateData({ confirmPassword: e.target.value })}
              className={`w-full pl-10 pr-10 py-3 rounded-xl border ${errors.confirmPassword ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-navy-600 focus:border-brand-primary focus:ring-brand-primary/20'} focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 dark:bg-navy-900/50 focus:bg-white dark:focus:bg-navy-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {data.confirmPassword && data.password === data.confirmPassword && (
             <p className="text-brand-primary text-xs ml-1 mt-1 flex items-center gap-1"><Check size={12} /> {t('passwordsMatch')}</p>
          )}
          {errors.confirmPassword && <p className="text-red-500 text-xs ml-1 mt-1">{errors.confirmPassword}</p>}
        </div>

        <div className="bg-brand-primary/10 dark:bg-brand-primary/20 p-4 rounded-xl border border-brand-primary/20 dark:border-brand-primary/30">
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative flex items-center mt-1">
              <input
                type="checkbox"
                checked={data.agreeTerms}
                onChange={(e) => updateData({ agreeTerms: e.target.checked })}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 dark:border-navy-600 transition-all checked:border-brand-primary checked:bg-brand-primary"
              />
              <Check className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" size={14} strokeWidth={3} />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed select-none">
              <Trans i18nKey="auth:agreeTermsAndPrivacy" components={{ 1: <Link href="/terms" className="text-brand-primary font-semibold hover:underline" target="_blank" />, 2: <Link href="/privacy" className="text-brand-primary font-semibold hover:underline" target="_blank" /> }} />
            </span>
          </label>
           {errors.agreeTerms && <p className="text-red-500 text-xs mt-2 ml-8">{errors.agreeTerms}</p>}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="w-1/3 bg-gray-100 dark:bg-navy-700 hover:bg-gray-200 dark:hover:bg-navy-600 text-gray-700 dark:text-gray-300 font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> {t('back')}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all duration-200 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isLoading ? (
              <span className="animate-pulse">{t('creatingAccount')}</span>
            ) : (
              <>{t('createAccount')} <Check size={18} strokeWidth={3} /></>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
