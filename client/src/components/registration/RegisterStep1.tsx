import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { useBranding } from '@/contexts/BrandingContext';

interface RegisterStep1Props {
  data: {
    fullName: string;
    email: string;
    phone: string;
  };
  updateData: (data: Partial<RegisterStep1Props['data']>) => void;
  onNext: () => void;
}

export function RegisterStep1({ data, updateData, onNext }: RegisterStep1Props) {
  const { t } = useTranslation('auth');
  const branding = useBranding();
  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!data.fullName.trim()) newErrors.fullName = t('fullNameRequired');
    if (!data.email.trim()) {
      newErrors.email = t('emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      newErrors.email = t('emailInvalid');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-brand-primary mb-2">
          {t('joinOrg', { org: branding.name !== 'Acadize' ? branding.name : 'Acadize' })}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{t('empowerFuture')}</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8 gap-2">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-brand-primary/30">1</div>
          <span className="ml-2 text-sm font-medium text-brand-primary hidden sm:block">{t('personalInfo')}</span>
        </div>
        <div className="h-1 w-12 bg-gray-200 dark:bg-navy-700 rounded-full mx-2"></div>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-navy-700 text-gray-400 dark:text-gray-500 flex items-center justify-center font-bold text-sm">2</div>
          <span className="ml-2 text-sm font-medium text-gray-400 dark:text-gray-500 hidden sm:block">{t('roleDetails')}</span>
        </div>
        <div className="h-1 w-12 bg-gray-200 dark:bg-navy-700 rounded-full mx-2"></div>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-navy-700 text-gray-400 dark:text-gray-500 flex items-center justify-center font-bold text-sm">3</div>
          <span className="ml-2 text-sm font-medium text-gray-400 dark:text-gray-500 hidden sm:block">{t('security')}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1 ml-1">{t('fullName')} *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <User size={18} />
            </div>
            <input
              type="text"
              value={data.fullName}
              onChange={(e) => updateData({ fullName: e.target.value })}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.fullName ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-navy-600 focus:border-brand-primary focus:ring-brand-primary/20'} focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 dark:bg-navy-900/50 focus:bg-white dark:focus:bg-navy-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              placeholder={t('placeholderFullName')}
            />
          </div>
          {errors.fullName && <p className="text-red-500 text-xs ml-1 mt-1">{errors.fullName}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1 ml-1">{t('emailAddress')} *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <Mail size={18} />
            </div>
            <input
              type="email"
              value={data.email}
              onChange={(e) => updateData({ email: e.target.value })}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-navy-600 focus:border-brand-primary focus:ring-brand-primary/20'} focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 dark:bg-navy-900/50 focus:bg-white dark:focus:bg-navy-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              placeholder={t('placeholderEmail')}
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs ml-1 mt-1">{errors.email}</p>}
        </div>

        {/* Phone (Optional) */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1 ml-1">{t('phoneOptional')}</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <Phone size={18} />
            </div>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => updateData({ phone: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-navy-600 focus:border-brand-primary focus:ring-brand-primary/20 focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 dark:bg-navy-900/50 focus:bg-white dark:focus:bg-navy-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={t('placeholderPhone')}
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all duration-200 flex items-center justify-center gap-2 mt-4"
        >
          {t('nextStep')} <ArrowRight size={18} />
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        {t('alreadyHaveAccount')}{' '}
        <Link href="/login" className="text-brand-primary hover:text-brand-secondary font-semibold hover:underline">
          {t('signIn')}
        </Link>
      </div>
    </div>
  );
}
