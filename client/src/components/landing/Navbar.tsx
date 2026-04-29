import React, { useEffect, useState } from 'react';
import { Link, useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { Menu, Radio, Zap, Sparkles, BarChart, Blocks, LineChart, BookOpen, ArrowRight } from "lucide-react";
import { AcadizeLogo } from "@/components/AcadizeLogo";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

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
          <div className="hidden md:flex flex-1 items-center justify-center">
            <NavigationMenu>
              <NavigationMenuList className="gap-2">
                
                {/* Products Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent hover:bg-transparent data-[state=open]:bg-transparent text-primary hover:text-primary data-[state=open]:text-primary font-semibold text-sm">
                    Products
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-[1.5fr_1.5fr_1.5fr] gap-8 p-6 md:w-[850px] lg:w-[950px] bg-[#FAF9F5] dark:bg-slate-900 border-none rounded-xl">
                      
                      {/* Products Col */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-4 px-2 tracking-wide font-serif">Products</h4>
                        <ul className="space-y-2">
                          <li>
                            <Link href="/products/on-call" className="group flex items-start gap-4 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FFF5E6] text-[#FF5A25]">
                                <Radio className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#FF5A25] transition-colors">On-call</h5>
                                <p className="text-xs text-slate-500 leading-tight mt-0.5">On-call scheduling and alerting</p>
                              </div>
                            </Link>
                          </li>
                          <li>
                            <Link href="/products/response" className="group flex items-start gap-4 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FFF5E6] text-[#FF5A25]">
                                <Zap className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#FF5A25] transition-colors">Response</h5>
                                <p className="text-xs text-slate-500 leading-tight mt-0.5">Respond to incidents in Slack or Teams</p>
                              </div>
                            </Link>
                          </li>
                          <li>
                            <Link href="/products/ai-sre" className="group flex items-start gap-4 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FFF5E6] text-[#FF5A25]">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#FF5A25] transition-colors">AI SRE</h5>
                                <p className="text-xs text-slate-500 leading-tight mt-0.5">Resolve incidents in record time</p>
                              </div>
                            </Link>
                          </li>
                          <li>
                            <Link href="/products/status-pages" className="group flex items-start gap-4 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FFF5E6] text-[#FF5A25]">
                                <BarChart className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#FF5A25] transition-colors">Status Pages</h5>
                                <p className="text-xs text-slate-500 leading-tight mt-0.5">Share updates with your customers</p>
                              </div>
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Platform Col */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-4 px-2 tracking-wide font-serif">Platform</h4>
                        <ul className="space-y-2">
                          <li>
                            <Link href="/platform/ai" className="group flex items-start gap-4 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FFF5E6] text-[#FF5A25]">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#FF5A25] transition-colors">AI Platform</h5>
                                <p className="text-xs text-slate-500 leading-tight mt-0.5">AI-powered incident management</p>
                              </div>
                            </Link>
                          </li>
                          <li>
                            <Link href="/platform/integrations" className="group flex items-start gap-4 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FFF5E6] text-[#FF5A25]">
                                <Blocks className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#FF5A25] transition-colors">Integrations</h5>
                                <p className="text-xs text-slate-500 leading-tight mt-0.5">Connect with your existing tools</p>
                              </div>
                            </Link>
                          </li>
                          <li>
                            <Link href="/platform/insights" className="group flex items-start gap-4 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FFF5E6] text-[#FF5A25]">
                                <LineChart className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#FF5A25] transition-colors">Insights</h5>
                                <p className="text-xs text-slate-500 leading-tight mt-0.5">Learn from your incidents</p>
                              </div>
                            </Link>
                          </li>
                          <li>
                            <Link href="/platform/catalog" className="group flex items-start gap-4 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FFF5E6] text-[#FF5A25]">
                                <BookOpen className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#FF5A25] transition-colors">Catalog</h5>
                                <p className="text-xs text-slate-500 leading-tight mt-0.5">Powerful routing for your organization</p>
                              </div>
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Changelog Col */}
                      <div className="flex flex-col">
                        <NavigationMenuLink asChild>
                          <Link href="/changelog" className="flex items-center text-sm font-medium text-slate-400 hover:text-slate-600 mb-4 px-2 tracking-wide font-serif transition-colors">
                            Changelog <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <Link href="/changelog/team-scoped-api-keys" className="group block h-full bg-[#F3F0E6] dark:bg-slate-800 rounded-xl p-6 transition-transform hover:-translate-y-1">
                            <div className="flex justify-center mb-6">
                              <div className="relative">
                                {/* Add a simplified illustration resembling the team scoped api keys */}
                                <div className="bg-[#DFD8C8] dark:bg-slate-700 w-16 h-12 rounded-lg absolute -inset-2 opacity-50 transform -rotate-6" />
                                <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg shadow-sm relative z-10 flex items-center justify-center font-serif text-lg text-slate-900 dark:text-white whitespace-nowrap">
                                  Team-scoped
                                  <br/>API keys
                                </div>
                              </div>
                            </div>
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Team-scoped API keys</h5>
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                API keys can now either have global permissions and/or team-scoped permissions. Plus, check out ...
                              </p>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </div>
                      
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Other standard items */}
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100/50 hover:text-slate-900 dark:hover:bg-slate-800/50 dark:hover:text-slate-50 focus:bg-slate-100/50 focus:text-slate-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    <Link href="/solutions">
                      Solutions
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100/50 hover:text-slate-900 dark:hover:bg-slate-800/50 dark:hover:text-slate-50 focus:bg-slate-100/50 focus:text-slate-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    <Link href="/resources">
                      Resources
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100/50 hover:text-slate-900 dark:hover:bg-slate-800/50 dark:hover:text-slate-50 focus:bg-slate-100/50 focus:text-slate-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    <Link href="/customers">
                      Customers
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100/50 hover:text-slate-900 dark:hover:bg-slate-800/50 dark:hover:text-slate-50 focus:bg-slate-100/50 focus:text-slate-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    <Link href="/pricing">
                      Pricing
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100/50 hover:text-slate-900 dark:hover:bg-slate-800/50 dark:hover:text-slate-50 focus:bg-slate-100/50 focus:text-slate-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                    <Link href="/careers">
                      Careers
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

              </NavigationMenuList>
            </NavigationMenu>
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
