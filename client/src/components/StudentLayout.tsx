import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useBranding } from '@/contexts/BrandingContext';
import { usePortalI18n } from '@/hooks/usePortalI18n';
import NotificationBell from './NotificationBell';
import {
  sidebarVariants, 
  navItemVariants, 
  buttonVariants,
  iconButtonVariants,
  fadeInVariants,
  springConfigs
} from '@/lib/animations';
import { AcadizeLogo } from './AcadizeLogo';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'nav.dashboard', icon: 'dashboard', path: '/student/dashboard' },
  { label: 'nav.courses', icon: 'school', path: '/student/courses' },
  { label: 'nav.attendance', icon: 'how_to_reg', path: '/student/attendance' },
  { label: 'nav.assignments', icon: 'task', path: '/student/assignments' },
  { label: 'nav.calendar', icon: 'calendar_month', path: '/student/calendar' },
  { label: 'nav.reports', icon: 'assessment', path: '/student/report-cards' },
  { label: 'nav.messages', icon: 'message', path: '/student/messages' },
  { label: 'nav.exams', icon: 'quiz', path: '/student/exams' },
  { label: 'nav.mistakes', icon: 'psychology', path: '/student/mistakes' },
];

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const { t, isRTL, dir } = usePortalI18n("common");
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const branding = useBranding();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDesktopHeader, setIsDesktopHeader] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  // Initialize from URL if available
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const onChange = (event: MediaQueryListEvent) => setIsDesktopHeader(event.matches);

    setIsDesktopHeader(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);

    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  // Debounced live search on the search page only to avoid route churn while typing on other screens
  useEffect(() => {
    if (!location.startsWith('/student/search')) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const currentQ = params.get('q') || '';
      const nextQ = searchQuery.trim();

      if (nextQ && currentQ !== nextQ) {
        setLocation(`/student/search?q=${encodeURIComponent(nextQ)}`);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [location, searchQuery, setLocation]);

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/student/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div dir={dir} className="flex h-screen w-full bg-slate-50 dark:bg-[#0a192f] overflow-x-hidden font-sans transition-colors duration-300 relative">
{/* Sidebar */}
      <motion.aside 
        className={`hidden lg:flex flex-col border-r border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0a192f]/80 backdrop-blur-xl shadow-xl dark:shadow-none z-30 transition-all duration-300 relative ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}
        initial="initial"
        animate="animate"
        variants={sidebarVariants}
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`absolute ${isRTL ? '-left-3' : '-right-3'} top-8 bg-white dark:bg-[#112240] border border-slate-200 dark:border-white/10 rounded-full p-1 text-slate-500 hover:text-brand-primary transition-colors z-40`}
        >
          <span className="material-symbols-outlined text-sm">
            {isRTL
              ? (isSidebarCollapsed ? 'chevron_left' : 'chevron_right')
              : (isSidebarCollapsed ? 'chevron_right' : 'chevron_left')}
          </span>
        </button>

        <div className={`p-6 pb-2 ${isSidebarCollapsed ? 'px-4' : ''}`}>
          {/* Logo */}
          <motion.div 
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-4'} mb-8 transition-all`}
            variants={fadeInVariants}
          >
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.name} className={`${isSidebarCollapsed ? 'h-8' : 'h-10'} w-auto object-contain transition-all`} />
            ) : (
              <>
                <AcadizeLogo variant="icon" size={isSidebarCollapsed ? "sm" : "md"} />
                {!isSidebarCollapsed && (
                  <div className="flex flex-col overflow-hidden">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{branding.name}</h2>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('studentPortal')}</p>
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* User Profile Card */}
          <Link to="/student/profile">
            <motion.div 
              className={`flex mb-6 p-3 bg-slate-50/80 dark:bg-[#112240]/80 backdrop-blur-md rounded-xl items-center border border-slate-100 dark:border-white/10 cursor-pointer group relative overflow-hidden ${isSidebarCollapsed ? 'justify-center mx-1' : 'gap-3'}`}
              variants={fadeInVariants}
              whileHover={{ 
                scale: 1.02,
                backgroundColor: "rgba(255, 215, 0, 0.1)",
                transition: springConfigs.snappy
              }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Glow effect on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-[#FFD700]/0 via-[#FFD700]/10 to-[#FFD700]/0"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              {user?.profilePicture ? (
                <motion.div 
                  className="rounded-full size-10 bg-cover bg-center border-2 border-[#FFD700] relative z-10"
                  style={{ backgroundImage: `url("${user.profilePicture}")` }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={springConfigs.bouncy}
                />
              ) : (
                <motion.div 
                  className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-10 flex items-center justify-center text-sm font-bold text-slate-900 relative z-10"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={springConfigs.bouncy}
                >
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'S'}
                </motion.div>
              )}
              <div className="flex-1 min-w-0 relative z-10">
                {!isSidebarCollapsed && (
                  <>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || t("roles.student")}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-[#FFD700] transition-colors">{t('viewProfile')}</div>
                  </>
                )}
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 px-4 flex-1 overflow-y-auto">
          {navItems.map((item, index) => {
            const isActive = location === item.path || location.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  title={isSidebarCollapsed ? t(item.label) : undefined}
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center mx-1 text-xl' : 'gap-3 px-4'} py-3 rounded-lg cursor-pointer group relative overflow-hidden ${
                    isActive
                      ? 'bg-[#FFD700] text-slate-900 shadow-lg shadow-[#FFD700]/30'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  variants={navItemVariants}
                  custom={index}
                  whileHover="hover"
                  whileTap={{ scale: 0.97 }}
                  transition={springConfigs.snappy}
                  style={{
                    ...(isActive && {
                      boxShadow: '0 8px 24px rgba(255, 215, 0, 0.3)',
                    })
                  }}
                >
                  {/* Glassmorphism background for non-active items */}
                  {!isActive && (
                    <motion.div
                      className="absolute inset-0 bg-slate-100/50 dark:bg-white/5 rounded-lg opacity-0 group-hover:opacity-100"
                      transition={springConfigs.snappy}
                    />
                  )}
                  
                  <motion.span 
                    className="material-symbols-outlined text-xl relative z-10"
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    transition={springConfigs.bouncy}
                  >
                    {item.icon}
                  </motion.span>
                  {!isSidebarCollapsed && (
                    <>
                      <span className="font-medium text-sm flex-1 relative z-10">{t(item.label)}</span>
                      {item.badge && (
                        <motion.span 
                          className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full relative z-10"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          whileHover={{ scale: 1.1 }}
                          transition={springConfigs.bouncy}
                        >
                          {item.badge}
                        </motion.span>
                      )}
                    </>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className={`p-6 border-t border-slate-200 dark:border-white/10 ${isSidebarCollapsed ? 'px-4' : ''}`}>
          <motion.button 
            onClick={handleLogout}
            title={isSidebarCollapsed ? t('nav.logout') : undefined}
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center mx-1 w-auto text-xl' : 'gap-3 px-4 w-full'} py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-white/5 transition-colors group relative overflow-hidden`}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            transition={springConfigs.snappy}
          >
            <motion.div
              className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100"
              transition={springConfigs.smooth}
            />
            <motion.span 
              className="material-symbols-outlined relative z-10"
              whileHover={{ rotate: 15 }}
              transition={springConfigs.bouncy}
            >
              logout
            </motion.span>
            {!isSidebarCollapsed && <span className="font-medium relative z-10">{t('nav.logout')}</span>}
          </motion.button>
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springConfigs.smooth}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.aside 
            className={`fixed top-0 ${isRTL ? 'right-0 border-l' : 'left-0 border-r'} h-full w-72 bg-white/95 dark:bg-[#0a192f]/95 backdrop-blur-xl z-50 lg:hidden border-slate-200 dark:border-white/10`}
            initial={{ x: isRTL ? 280 : -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 280 : -280, opacity: 0 }}
            transition={springConfigs.gentle}
          >
        {/* Same content as desktop sidebar */}
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.name} className="h-10 w-auto object-contain" />
              ) : (
                <>
                  <AcadizeLogo variant="icon" size="md" />
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{branding.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('studentPortal')}</p>
                  </div>
                </>
              )}
            </div>
            <motion.button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={springConfigs.snappy}
            >
              <span className="material-symbols-outlined">close</span>
            </motion.button>
          </div>

          <Link to="/student/profile">
            <div className="flex gap-3 mb-6 p-3 bg-slate-50 dark:bg-[#112240] rounded-xl items-center border border-slate-100 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group">
              {user?.profilePicture ? (
                <div 
                  className="rounded-full size-10 bg-cover bg-center border-2 border-[#FFD700]"
                  style={{ backgroundImage: `url("${user.profilePicture}")` }}
                />
              ) : (
                <div className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-10 flex items-center justify-center text-sm font-bold text-slate-900">
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'S'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || t("roles.student")}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('viewProfile')}</div>
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex flex-col gap-2 px-4 flex-1 overflow-y-auto">
          {navItems.map((item, index) => {
            const isActive = location === item.path || location.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer group relative overflow-hidden ${
                    isActive
                      ? 'bg-[#FFD700] text-slate-900 shadow-lg shadow-[#FFD700]/30'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springConfigs.snappy}
                >
                  {!isActive && (
                    <motion.div
                      className="absolute inset-0 bg-slate-100/50 dark:bg-white/5 rounded-lg opacity-0 group-hover:opacity-100"
                      transition={springConfigs.snappy}
                    />
                  )}
                  <span className="material-symbols-outlined text-xl relative z-10">{item.icon}</span>
                  <span className="font-medium text-sm flex-1 relative z-10">{t(item.label)}</span>
                  {item.badge && (
                    <motion.span 
                      className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full relative z-10"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springConfigs.bouncy}
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-200 dark:border-white/10">
          <motion.button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-white/5 transition-colors w-full group"
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-medium">{t('nav.logout')}</span>
          </motion.button>
        </div>
      </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative">
        {/* Mobile Header */}
        <motion.header 
          className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0a192f]/95 backdrop-blur-sm z-20"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springConfigs.gentle}
        >
          <motion.button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            variants={iconButtonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <span className="material-symbols-outlined">menu</span>
          </motion.button>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-slate-100 dark:bg-[#112240] border border-slate-200 dark:border-white/10"
              aria-label={t("aria.toggleTheme")}
              variants={iconButtonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {theme === 'dark' ? (
                <span className="material-symbols-outlined text-[#FFD700] text-lg">light_mode</span>
              ) : (
                <span className="material-symbols-outlined text-slate-700 text-lg">dark_mode</span>
              )}
            </motion.button>
            {!isDesktopHeader && <NotificationBell />}
            <motion.div 
              className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-8 flex items-center justify-center text-sm font-bold text-slate-900"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={springConfigs.bouncy}
            >
              {user?.username?.charAt(0).toUpperCase() || 'S'}
            </motion.div>
          </div>
        </motion.header>

        {/* Desktop Header */}
        <motion.header 
          className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-[#0a192f]/80 backdrop-blur-xl z-20 relative"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springConfigs.gentle}
        >
          <div className="flex-1 max-w-lg">
            <motion.form 
              onSubmit={handleSearch}
              className="relative group"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...springConfigs.gentle, delay: 0.2 }}
            >
              <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">search</span>
              </div>
              <motion.input 
                className={`block w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-slate-50/80 dark:bg-[#112240]/80 backdrop-blur-md border-none rounded-full text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-[#FFD700] focus:bg-white/90 dark:focus:bg-[#112240]/90 transition-all shadow-inner`} 
                placeholder={t('searchPlaceholderStudent')} 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                whileFocus={{ scale: 1.02 }}
                transition={springConfigs.snappy}
              />
            </motion.form>
          </div>
          <div className="flex items-center gap-6 ms-6">
            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-slate-100/80 dark:bg-[#112240]/80 backdrop-blur-md border border-slate-200 dark:border-white/10 group"
              aria-label={t("aria.toggleTheme")}
              variants={iconButtonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {theme === 'dark' ? (
                <span className="material-symbols-outlined text-[#FFD700] text-xl">light_mode</span>
              ) : (
                <span className="material-symbols-outlined text-slate-700 text-xl">dark_mode</span>
              )}
            </motion.button>
            <LanguageSwitcher />
            {isDesktopHeader && <NotificationBell />}
            <motion.div 
              className={`flex items-center gap-3 ${isRTL ? 'pe-6 border-r' : 'ps-6 border-l'} border-slate-200 dark:border-slate-700`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfigs.gentle, delay: 0.3 }}
            >
              <div className={`hidden sm:block ${isRTL ? 'text-left' : 'text-right'}`}>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{user?.fullName || user?.username || t("roles.student")}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t("roles.student")}</div>
              </div>
              {user?.profilePicture ? (
                <motion.div 
                  className="rounded-full size-10 bg-cover bg-center border-2 border-[#FFD700]"
                  style={{ backgroundImage: `url("${user.profilePicture}")` }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={springConfigs.bouncy}
                />
              ) : (
                <motion.div 
                  className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-10 flex items-center justify-center text-sm font-bold text-slate-900"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={springConfigs.bouncy}
                >
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'S'}
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.header>

        {children}
      </div>
    </div>
  );
}

