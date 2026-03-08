import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { School, Eye, EyeOff, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { AcadizeLogo } from '@/components/AcadizeLogo';
import { useAuth } from '@/hooks/useAuth';
import { getStoredUser } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/contexts/BrandingContext';

interface LoginCredentials {
  email: string;
  password: string;
}

export default function Login() {
  const { t } = useTranslation('auth');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, user } = useAuth();
  const branding = useBranding();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });

  const returnUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('returnUrl') : null;
  const safeReturnUrl = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : null;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (safeReturnUrl) {
        setLocation(safeReturnUrl);
        return;
      }
      const roleRoutes: Record<string, string> = {
        student: '/student/dashboard',
        teacher: '/teacher/dashboard',
        parent: '/parent/dashboard',
        admin: '/admin/dashboard'
      };
      setLocation(roleRoutes[user.role] || '/');
    }
  }, [isAuthenticated, user, setLocation, safeReturnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast({
        title: t('missingCredentials'),
        description: t('pleaseEnterEmailPassword'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login({
        username: formData.email,
        email: formData.email,
        password: formData.password
      });

      if (result.success) {
        const userData = getStoredUser();

        toast({
          title: t('welcomeBackToast'),
          description: t('successfullySignedIn', { name: userData?.fullName || 'User' }),
        });

        const redirectTo = safeReturnUrl || (() => {
          const roleRoutes: Record<string, string> = {
            student: '/student/dashboard',
            teacher: '/teacher/dashboard',
            parent: '/parent/dashboard',
            admin: '/admin/dashboard'
          };
          return roleRoutes[userData?.role] || '/';
        })();

        setTimeout(() => {
          setLocation(redirectTo);
        }, 300);
      } else {
        toast({
          title: t('loginFailed'),
          description: result.error || t('invalidEmailPassword'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('connectionError'),
        description: t('unableToReachServer'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white flex flex-col font-sans relative overflow-hidden transition-colors duration-300">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/40 dark:bg-blue-900/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-100/30 dark:bg-amber-900/10 blur-[120px] rounded-full" />

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[1100px] flex flex-col lg:flex-row bg-white dark:bg-white/5 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
        >
          {/* Left Side: Form Section */}
          <div className="w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-center">
            <div className="max-w-[400px] mx-auto w-full">
              {/* Logo & Brand */}
              <div className="flex items-center gap-3 mb-10">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt={branding.name} className="h-12 w-auto object-contain" />
                ) : (
                  <AcadizeLogo variant="full" size="xl" />
                )}
              </div>

              <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight leading-tight">
                  {t('welcomeBack')}
                </h1>
                <p className="text-slate-500 dark:text-gray-400 font-medium">
                  {branding.name !== 'Acadize' ? `Sign in to ${branding.name}` : t('enterCredentials')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                    {t('studentIdEmail')}
                  </label>
                  <div className="relative group">
                    <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={20} />
                    <input 
                      type="text"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder={t('emailPlaceholder')}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-14 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all font-medium"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">
                      {t('password')}
                    </label>
                    <button 
                      type="button"
                      onClick={() => setLocation('/forgot-password')}
                      className="text-xs font-bold text-brand-primary hover:underline"
                    >
                      {t('forgot')}
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={20} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={t('passwordPlaceholder')}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-14 pl-12 pr-12 outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all font-medium"
                      disabled={isLoading}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-2xl shadow-xl shadow-brand-primary/20 text-lg group"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>
                      {t('signIn')} 
                      <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-10 text-center">
                <p className="text-sm text-slate-500 dark:text-gray-400">
                  {t('noAccount')} <button onClick={() => setLocation('/register')} className="text-brand-primary font-bold hover:underline">{t('createAccount')}</button>
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Visual Section */}
          <div className="hidden lg:flex lg:w-1/2 relative bg-slate-100 dark:bg-navy-950/40 p-12 flex-col justify-end overflow-hidden border-l border-slate-200 dark:border-white/10">
             {/* Decorative Image/Pattern */}
            <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#F2D00D 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            
            <div className="relative z-10 space-y-6">
              <div className="w-16 h-1.5 bg-brand-primary rounded-full shadow-lg shadow-brand-primary/50" />
              <blockquote className="text-3xl font-bold leading-tight tracking-tight">
                "{t('quote')}"
              </blockquote>
              <div>
                <p className="text-lg font-bold text-brand-primary">{branding.name !== 'Acadize' ? branding.name : t('quoteAuthor')}</p>
                <p className="text-sm text-slate-500 font-medium tracking-wide">{t('premiumExperience')}</p>
              </div>
            </div>

            {/* Floating Visual Elements */}
            <div className="absolute top-20 right-20 w-32 h-32 bg-brand-primary/20 rounded-[2rem] blur-2xl animate-float" />
            <div className="absolute bottom-40 right-40 w-24 h-24 bg-brand-secondary/10 rounded-[1.5rem] blur-xl animate-float-delayed" />
          </div>
        </motion.div>
      </main>

      <footer className="py-8 text-center text-xs text-slate-400 dark:text-gray-500 relative z-10 transition-opacity hover:opacity-100">
        <p>{t('copyright')}</p>
        <div className="flex justify-center gap-6 mt-3 font-bold uppercase tracking-widest text-[10px]">
          <button onClick={() => setLocation('/privacy')} className="hover:text-brand-primary transition-colors">{t('privacy')}</button>
          <span className="opacity-20">/</span>
          <button onClick={() => setLocation('/terms')} className="hover:text-brand-primary transition-colors">{t('terms')}</button>
          <span className="opacity-20">/</span>
          <button onClick={() => setLocation('/support')} className="hover:text-brand-primary transition-colors">{t('contact')}</button>
        </div>
      </footer>
    </div>
  );
}
