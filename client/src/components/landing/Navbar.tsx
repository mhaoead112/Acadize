import React, { useEffect, useState } from 'react';
import { Link, useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { Menu } from "lucide-react";
import { AcadizeLogo } from "@/components/AcadizeLogo";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const Navbar: React.FC = () => {
  const { t } = useTranslation('landing');
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isHome = location === "/" || location === "/home";
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 1)"]
  );
  const backgroundColorDark = useTransform(
    scrollY,
    [0, 100],
    ["rgba(10, 25, 47, 0)", "rgba(10, 25, 47, 1)"]
  );
  // Theme-aware border colors that increase opacity on scroll
  const borderColorLight = useTransform(
    scrollY,
    [0, 100],
    ["rgba(226, 232, 240, 0)", "rgba(226, 232, 240, 1)"]
  );
  const borderColorDark = useTransform(
    scrollY,
    [0, 100],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.1)"]
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFeaturesClick = (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault();
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If not on home, the Link will handle navigation to "/"
      // We can add a hash to the URL if we want to scroll after navigation, 
      // but for now just linking to home is fine.
    }
  };

  return (
    <motion.nav 
      className="absolute top-0 z-50 w-full border-b backdrop-blur-md"
      style={{
        backgroundColor: theme === 'dark' ? backgroundColorDark : backgroundColor,
        borderColor: theme === 'dark' ? borderColorDark : borderColorLight,
      }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <motion.div 
              className="flex items-center gap-2 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AcadizeLogo variant="full" size="xl" />
            </motion.div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href={isHome ? "#features" : "/"}>
              <motion.span 
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer"
                onClick={handleFeaturesClick}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                {t('features')}
              </motion.span>
            </Link>
            <Link href="/pricing">
              <motion.span 
                className={`text-sm font-semibold transition-colors cursor-pointer ${location === '/pricing' ? 'text-primary' : 'text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary'}`}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                {t('pricingTitle')}
              </motion.span>
            </Link>
            <Link href="/docs">
              <motion.span 
                className={`text-sm font-semibold transition-colors cursor-pointer ${location === '/docs' ? 'text-primary' : 'text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary'}`}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                {t('docs')}
              </motion.span>
            </Link>
            <Link href="/contact">
              <motion.span 
                className={`text-sm font-semibold transition-colors cursor-pointer ${location === '/contact' ? 'text-primary' : 'text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary'}`}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                {t('contact')}
              </motion.span>
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              className="hidden md:flex items-center justify-center rounded-full p-2.5 bg-slate-100 dark:bg-[#112240] border border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all shadow-sm"
              aria-label="Toggle theme"
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <span className="material-symbols-outlined text-slate-800 dark:text-white text-[20px]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </motion.button>
            
            {user ? (
              <Link href={user.role === 'admin' ? '/admin/dashboard' : user.role === 'teacher' ? '/teacher/dashboard' : user.role === 'parent' ? '/parent/dashboard' : '/student/dashboard'}>
                <motion.button 
                  className="hidden md:flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white transition-colors hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('nav.dashboard', { ns: 'common' })}
                </motion.button>
              </Link>
            ) : (
              <Link href="/login">
                <motion.button 
                  className="hidden md:flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white transition-colors hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('login')}
                </motion.button>
              </Link>
            )}
            {!user && (
              <Link href="/register">
                <motion.button 
                  className="flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background-dark shadow-[0_0_15px_rgba(242,208,13,0.3)]"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 25px rgba(242,208,13,0.5)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {t('getStarted')}
                </motion.button>
              </Link>
            )}
            {/* Mobile Menu Button */}
            <motion.button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-text-muted hover:text-slate-900 dark:hover:text-white"
              whileTap={{ scale: 0.9 }}
              aria-label="Toggle mobile menu"
            >
              <Menu className="h-6 w-6" />
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden border-t border-slate-200 dark:border-white/10"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 py-4 space-y-3 bg-white dark:bg-slate-950">
              <Link href={isHome ? "#features" : "/"}>
                <motion.div
                  onClick={(e) => {
                    handleFeaturesClick(e);
                    setIsMobileMenuOpen(false);
                  }}
                  className="block px-3 py-2 text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors cursor-pointer"
                  whileTap={{ scale: 0.98 }}
                >
                  {t('features')}
                </motion.div>
              </Link>
              <Link href="/pricing">
                <motion.div
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-base font-semibold rounded-md transition-colors cursor-pointer ${location === '/pricing' ? 'text-primary bg-primary/10' : 'text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-white/5'}`}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('pricingTitle')}
                </motion.div>
              </Link>
              <Link href="/docs">
                <motion.div
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-base font-semibold rounded-md transition-colors cursor-pointer ${location === '/docs' ? 'text-primary bg-primary/10' : 'text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-white/5'}`}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('docs')}
                </motion.div>
              </Link>
              <Link href="/contact">
                <motion.div
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-base font-semibold rounded-md transition-colors cursor-pointer ${location === '/contact' ? 'text-primary bg-primary/10' : 'text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-white/5'}`}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('contact')}
                </motion.div>
              </Link>
              
              {/* Theme Toggle Mobile */}
              <motion.button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                <span>Theme</span>
                <span className="material-symbols-outlined text-[20px]">
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </motion.button>

              {/* Auth Buttons Mobile */}
              <div className="pt-3 space-y-2 border-t border-slate-200 dark:border-white/10">
                {user ? (
                  <Link href={user.role === 'admin' ? '/admin/dashboard' : user.role === 'teacher' ? '/teacher/dashboard' : user.role === 'parent' ? '/parent/dashboard' : '/student/dashboard'}>
                    <motion.button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                      whileTap={{ scale: 0.98 }}
                    >
                      {t('nav.dashboard', { ns: 'common' })}
                    </motion.button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login">
                      <motion.button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                        whileTap={{ scale: 0.98 }}
                      >
                        {t('login')}
                      </motion.button>
                    </Link>
                    <Link href="/register">
                      <motion.button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full px-4 py-2 text-sm font-bold bg-primary text-background-dark rounded-lg shadow-[0_0_15px_rgba(242,208,13,0.3)]"
                        whileTap={{ scale: 0.98 }}
                      >
                        {t('getStarted')}
                      </motion.button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
