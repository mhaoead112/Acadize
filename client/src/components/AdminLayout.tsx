import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useBranding } from '@/contexts/BrandingContext';
import NotificationBell from './NotificationBell';
import { AcadizeLogo } from './AcadizeLogo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { usePortalI18n } from '@/hooks/usePortalI18n';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'nav.dashboard', icon: 'dashboard', path: '/admin/dashboard' },
  { label: 'nav.attendance', icon: 'how_to_reg', path: '/admin/attendance' },
  { label: 'nav.users', icon: 'group', path: '/admin/users' },
  { label: 'nav.studentParentLinks', icon: 'link', path: '/admin/student-parent-link' },
  { label: 'nav.reports', icon: 'analytics', path: '/admin/reports' },
  { label: 'nav.calendar', icon: 'calendar_month', path: '/admin/calendar' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t, isRTL, dir } = usePortalI18n("common");
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const branding = useBranding();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDesktopHeader, setIsDesktopHeader] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const { theme, toggleTheme } = useTheme();

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
          setLocation(`/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
      <div dir={dir} className="flex h-screen w-full bg-slate-50 dark:bg-[#0a192f] overflow-hidden font-sans transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex ${isSidebarCollapsed ? 'w-20' : 'w-72'} h-full flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a192f] shadow-xl dark:shadow-none z-30 transition-all duration-300 relative`}>
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
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-4'} mb-8 transition-all`}>
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.name} className={`${isSidebarCollapsed ? 'h-8' : 'h-10'} w-auto object-contain transition-all`} />
            ) : (
              <>
                <AcadizeLogo variant="icon" size={isSidebarCollapsed ? "sm" : "md"} />
                {!isSidebarCollapsed && (
                  <div className="flex flex-col overflow-hidden">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{branding.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('adminPortal')}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* User Profile Card */}
          {/* <div 
            onClick={() => setLocation('/settings')}
            className="flex gap-3 mb-6 p-3 bg-slate-50 dark:bg-[#112240] rounded-xl items-center border border-slate-100 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
          >
              {user?.profilePicture ? (
                <div 
                  className="rounded-full size-10 bg-cover bg-center border-2 border-[#FFD700]"
                  style={{ backgroundImage: `url("${user.profilePicture}")` }}
                />
              ) : (
                <div className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-10 flex items-center justify-center text-sm font-bold text-slate-900">
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || 'Admin'}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">View Profile</div>
              </div>
            </div> */}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 px-4 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            if (item.path === '/admin/student-parent-link' && branding.features && !branding.features.enableParentPortal) {
              return null;
            }
            const isActive = location === item.path || location.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path}>
                <div
                  title={isSidebarCollapsed ? t(item.label) : undefined}
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center mx-2' : 'gap-3 px-4'} py-3 rounded-lg transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-[#FFD700] text-slate-900 shadow-lg shadow-[#FFD700]/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <>
                      <span className="font-medium text-sm flex-1">{t(item.label)}</span>
                      {item.badge && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className={`p-6 border-t border-slate-200 dark:border-white/10 ${isSidebarCollapsed ? 'px-4' : ''}`}>
          <button 
            onClick={handleLogout}
            title={isSidebarCollapsed ? t('nav.logout') : undefined}
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center mx-2 w-auto' : 'gap-3 px-4 w-full'} py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-white/5 transition-all group`}
          >
            <span className="material-symbols-outlined">logout</span>
            {!isSidebarCollapsed && <span className="font-medium">{t('nav.logout')}</span>}
          </button>
        </div>
      </aside>

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
                <>
                  <div className="size-8 text-[#001f3f] dark:text-[#FFD700]">
                    <svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg">
                      <path d="M39.1 18.4L24.3 4.69999C24.1 4.49999 23.9 4.49999 23.7 4.69999L8.89999 18.4C8.69999 18.6 8.69999 18.8 8.89999 19L23.7 32.7C23.9 32.9 24.1 32.9 24.3 32.7L39.1 19C39.3 18.8 39.3 18.6 39.1 18.4Z" fill="currentColor" />
                      <path d="M24 43.2L39.1 29.5C39.3 29.3 39.3 29.1 39.1 28.9L35.2 25C35 24.8 34.8 24.8 34.6 25L24 35.6L13.4 25C13.2 24.8 13 24.8 12.8 25L8.89999 28.9C8.69999 29.1 8.69999 29.3 8.89999 29.5L24 43.2Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{branding.name} {t("roles.admin")}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("adminPortal")}</p>
                  </div>
                </>
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
              setLocation('/settings');
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
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || t("roles.admin")}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t("viewProfile")}</div>
              </div>
            </div>
        </div>

        <nav className="flex flex-col gap-2 px-4 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            if (item.path === '/admin/student-parent-link' && branding.features && !branding.features.enableParentPortal) {
              return null;
            }
            const isActive = location === item.path || location.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path}>
                <div
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-[#FFD700] text-slate-900 shadow-lg shadow-[#FFD700]/30'
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
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
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
            {user?.profilePicture ? (
              <div
                className="rounded-full size-8 bg-cover bg-center border-2 border-[#FFD700]"
                style={{ backgroundImage: `url("${user.profilePicture}")` }}
              />
            ) : (
              <div className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-8 flex items-center justify-center text-sm font-bold text-slate-900">
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 mb-5 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0a192f]/95 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <span className={`material-symbols-outlined text-slate-400 text-[20px] ${isRTL ? 'order-2' : 'order-1'}`}>search</span>
            <input
              type="text"
              placeholder={t('searchPlaceholderAdmin')}
              className={`h-10 w-full px-3 bg-slate-100 dark:bg-[#112240] border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f]/20 dark:focus:ring-[#FFD700]/30 ${isRTL ? 'order-1 text-right' : 'order-2 text-left'}`}
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
                {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}

