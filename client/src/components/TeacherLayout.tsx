import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from './NotificationBell';
import { useTheme } from '@/contexts/ThemeContext';
import { AcadizeLogo } from './AcadizeLogo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useBranding } from '@/contexts/BrandingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePortalI18n } from '@/hooks/usePortalI18n';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'nav.dashboard', icon: 'dashboard', path: '/teacher/dashboard' },
  { label: 'nav.classes', icon: 'school', path: '/teacher/courses' },
  { label: 'nav.assignments', icon: 'task', path: '/teacher/assignments' },
  { label: 'nav.exams', icon: 'quiz', path: '/teacher/exams' },
  { label: 'nav.sessions', icon: 'event', path: '/teacher/sessions' },
  { label: 'nav.students', icon: 'groups', path: '/teacher/students' },
  { label: 'nav.calendar', icon: 'calendar_month', path: '/teacher/calendar' },
  { label: 'nav.reportCards', icon: 'assessment', path: '/teacher/report-cards' },
  { label: 'nav.messages', icon: 'message', path: '/teacher/messages' },
  { label: 'nav.analytics', icon: 'analytics', path: '/teacher/analytics' },
];

interface TeacherLayoutProps {
  children: React.ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  const { t, isRTL, dir } = usePortalI18n("common");
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDesktopHeader, setIsDesktopHeader] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const { theme, toggleTheme } = useTheme();
  const branding = useBranding();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const onChange = (event: MediaQueryListEvent) => setIsDesktopHeader(event.matches);

    setIsDesktopHeader(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);

    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  // Initialize from URL if available
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });

  // Debounced live search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        const params = new URLSearchParams(window.location.search);
        const currentQ = params.get('q');
        
        // Only navigate if query changed
        if (currentQ !== searchQuery.trim()) {
          setLocation(`/teacher/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, setLocation]);

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  return (
    <div dir={dir} className="flex h-screen w-full bg-slate-50 dark:bg-[#0a192f] font-sans transition-colors duration-300">
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 90 : 288 }}
        className="hidden lg:flex h-full flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a192f] shadow-xl dark:shadow-none z-30 transition-colors duration-300 relative overflow-hidden"
      >
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`absolute ${isRTL ? '-left-3' : '-right-3'} top-10 bg-white dark:bg-[#112240] border border-slate-200 dark:border-white/10 rounded-full p-1 z-40 hover:bg-slate-50 dark:hover:bg-white/5 opacity-0 group-hover/aside:opacity-100 transition-opacity`}
        >
          <span className="material-symbols-outlined text-sm">
            {isRTL
              ? (isSidebarCollapsed ? 'chevron_left' : 'chevron_right')
              : (isSidebarCollapsed ? 'chevron_right' : 'chevron_left')}
          </span>
        </button>

        <div className={`p-6 pb-2`}>
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8 h-10 overflow-hidden">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.name} className={`${isSidebarCollapsed ? 'h-8' : 'h-10'} w-auto object-contain transition-all duration-300`} />
            ) : (
              <>
                <div className="flex-shrink-0"><AcadizeLogo variant="icon" size="md" /></div>
                <AnimatePresence>
                  {!isSidebarCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex flex-col whitespace-nowrap"
                    >
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{branding.name || 'Acadize'}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t('teacherPortal')}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* User Profile Card */}
          <div 
            onClick={() => setLocation('/teacher/profile')}
            className={`flex gap-3 mb-6 bg-slate-50 dark:bg-[#112240] rounded-xl items-center border border-slate-100 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group px-3 py-3 ${isSidebarCollapsed ? 'justify-center mx-2' : ''}`}
          >
              {user?.profilePicture ? (
                <div 
                  className="rounded-full size-10 bg-cover bg-center border-2 border-[#FFD700]"
                  style={{ backgroundImage: `url("${user.profilePicture}")` }}
                />
              ) : (
                <div className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-10 flex items-center justify-center text-sm font-bold text-slate-900">
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'T'}
                </div>
              )}
              <AnimatePresence>
                {!isSidebarCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex-1 min-w-0"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || t("roles.teacher")}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t('viewProfile')}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 px-4 flex-1 overflow-y-auto overflow-x-hidden p-2">
          <TooltipProvider delayDuration={0}>
            {navItems.map((item) => {
              const isActive = location === item.path || location.startsWith(item.path + '/');
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <Link to={item.path}>
                      <div
                        className={`flex items-center gap-3 py-3 rounded-lg transition-all cursor-pointer group relative ${
                          isSidebarCollapsed ? 'justify-center px-0' : 'px-4'
                        } ${
                          isActive
                            ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">{item.icon}</span>
                        <AnimatePresence>
                          {!isSidebarCollapsed && (
                            <motion.div
                              initial={{ opacity: 0, width: 0, display: "none" }}
                              animate={{ opacity: 1, width: "auto", display: "flex" }}
                              exit={{ opacity: 0, width: 0, display: "none" }}
                              transition={{ duration: 0.2 }}
                              className="flex-1 items-center justify-between overflow-hidden whitespace-nowrap"
                            >
                              <span className="font-medium text-sm">{t(item.label)}</span>
                              {item.badge && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ms-auto">
                                  {item.badge}
                                </span>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {isSidebarCollapsed && item.badge && (
                          <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} size-2 bg-red-500 rounded-full`} />
                        )}
                      </div>
                    </Link>
                  </TooltipTrigger>
                  {isSidebarCollapsed && (
                    <TooltipContent side={isRTL ? "left" : "right"}>
                      {t(item.label)}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>

        {/* Logout */}
        <div className={`p-4 border-t border-slate-200 dark:border-white/10 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleLogout}
                  className={`flex items-center gap-3 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-white/5 transition-colors group ${
                    isSidebarCollapsed ? 'justify-center w-full px-0' : 'px-4 w-full'
                  }`}
                >
                  <span className="material-symbols-outlined">logout</span>
                  <AnimatePresence>
                    {!isSidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium whitespace-nowrap overflow-hidden"
                      >
                        {t('nav.logout')}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </TooltipTrigger>
              {isSidebarCollapsed && (
                <TooltipContent side={isRTL ? "left" : "right"}>
                  {t('nav.logout')}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-full w-72 bg-white dark:bg-[#0a192f] z-50 transform transition-transform duration-300 lg:hidden ${
        isMobileSidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')
      }`}>
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.name} className="h-8 w-auto object-contain" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="size-8 text-[#001f3f] dark:text-[#FFD700]">
                    <svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg">
                      <path d="M39.1 18.4L24.3 4.69999C24.1 4.49999 23.9 4.49999 23.7 4.69999L8.89999 18.4C8.69999 18.6 8.69999 18.8 8.89999 19L23.7 32.7C23.9 32.9 24.1 32.9 24.3 32.7L39.1 19C39.3 18.8 39.3 18.6 39.1 18.4Z" fill="currentColor" />
                      <path d="M24 43.2L39.1 29.5C39.3 29.3 39.3 29.1 39.1 28.9L35.2 25C35 24.8 34.8 24.8 34.6 25L24 35.6L13.4 25C13.2 24.8 13 24.8 12.8 25L8.89999 28.9C8.69999 29.1 8.69999 29.3 8.89999 29.5L24 43.2Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{branding.name || 'Acadize'}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('teacherPortal')}</p>
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div 
            onClick={() => {
              setLocation('/teacher/profile');
              setIsMobileSidebarOpen(false);
            }}
            className="flex gap-3 mb-6 p-3 bg-slate-50 dark:bg-[#112240] rounded-xl items-center border border-slate-100 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
          >
              {user?.profilePicture ? (
                <div 
                  className="rounded-full size-10 bg-cover bg-center border-2 border-[#FFD700]"
                  style={{ backgroundImage: `url("${user.profilePicture}")` }}
                />
              ) : (
                <div className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-10 flex items-center justify-center text-sm font-bold text-slate-900">
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'T'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || t("roles.teacher")}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('viewProfile')}</div>
              </div>
            </div>
        </div>

        <nav className="flex flex-col gap-2 px-4 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path}>
                <div
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="font-medium text-sm flex-1">{t(item.label)}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-200 dark:border-white/10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-white/5 transition-colors w-full group"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-medium">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto relative">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0a192f]/95 backdrop-blur-sm z-20">
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-4">
            {!isDesktopHeader && <NotificationBell />}
            <div className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-8 flex items-center justify-center text-sm font-bold text-slate-900">
              {user?.username?.charAt(0).toUpperCase() || 'T'}
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0a192f]/95 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <span className={`material-symbols-outlined text-slate-400 text-[20px] ${isRTL ? 'order-2' : 'order-1'}`}>search</span>
            <input
              type="text"
              placeholder={t('searchPlaceholderTeacher')}
              className={`h-10 w-full px-3 bg-slate-100 dark:bg-[#112240] border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f]/20 dark:focus:ring-[#FFD700]/30 ${isRTL ? 'text-right order-1' : 'order-2 text-left'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label={t("aria.toggleTheme")}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <LanguageSwitcher />
            {isDesktopHeader && <NotificationBell />}
            {user?.profilePicture ? (
              <div
                className="rounded-full size-8 bg-cover bg-center border-2 border-[#FFD700]"
                style={{ backgroundImage: `url("${user.profilePicture}")` }}
                title={user?.fullName || user?.username || t("aria.userAvatar")}
              />
            ) : (
              <div className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-8 flex items-center justify-center text-sm font-bold text-slate-900" title={user?.fullName || user?.username || t("aria.userAvatar")}>
                {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'T'}
              </div>
            )}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

