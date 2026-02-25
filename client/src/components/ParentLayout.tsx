import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import NotificationBell from './NotificationBell';
import { AcadizeLogo } from './AcadizeLogo';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'nav.dashboard', icon: 'dashboard', path: '/parent/dashboard' },
  { label: 'nav.myChildren', icon: 'family_restroom', path: '/parent/children' },
  { label: 'nav.attendance', icon: 'how_to_reg', path: '/parent/attendance' },
  { label: 'nav.classes', icon: 'school', path: '/parent/courses' },
  { label: 'nav.reportCards', icon: 'assessment', path: '/parent/reports' },
  { label: 'nav.messages', icon: 'message', path: '/parent/messages' },
];

interface ParentLayoutProps {
  children: React.ReactNode;
}

export default function ParentLayout({ children }: ParentLayoutProps) {
  const { t } = useTranslation('common');
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
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
          setLocation(`/parent/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#0a192f] overflow-hidden font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 h-full flex-col mr-10 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a192f] shadow-xl dark:shadow-none z-30 transition-colors duration-300">
        <div className="p-6 pb-2">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <AcadizeLogo variant="icon" size="md" />
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Acadize</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t('parentPortal')}</p>
            </div>
          </div>

          {/* User Profile Card */}
          <Link to="/parent/profile">
            <div className="flex gap-3 mb-6 p-3 bg-slate-50 dark:bg-[#112240] rounded-xl items-center border border-slate-100 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group">
              {user?.profilePicture ? (
                <div 
                  className="rounded-full size-10 bg-cover bg-center border-2 border-[#FFD700]"
                  style={{ backgroundImage: `url("${user.profilePicture}")` }}
                />
              ) : (
                <div className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-10 flex items-center justify-center text-sm font-bold text-slate-900">
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'P'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || 'Parent'}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{t('viewProfile')}</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 px-4 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path}>
                <div
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

        {/* Logout */}
        <div className="p-6 border-t border-slate-200 dark:border-white/10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-white/5 transition-colors w-full group"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-medium">{t('nav.logout')}</span>
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
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-[#0a192f] z-50 transform transition-transform duration-300 lg:hidden ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Same content as desktop sidebar */}
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="size-8 text-[#001f3f] dark:text-[#FFD700]">
                <svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg">
                  <path d="M39.1 18.4L24.3 4.69999C24.1 4.49999 23.9 4.49999 23.7 4.69999L8.89999 18.4C8.69999 18.6 8.69999 18.8 8.89999 19L23.7 32.7C23.9 32.9 24.1 32.9 24.3 32.7L39.1 19C39.3 18.8 39.3 18.6 39.1 18.4Z" fill="currentColor" />
                  <path d="M24 43.2L39.1 29.5C39.3 29.3 39.3 29.1 39.1 28.9L35.2 25C35 24.8 34.8 24.8 34.6 25L24 35.6L13.4 25C13.2 24.8 13 24.8 12.8 25L8.89999 28.9C8.69999 29.1 8.69999 29.3 8.89999 29.5L24 43.2Z" fill="currentColor" />
                </svg>
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Acadize</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">{t('parentPortal')}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <Link to="/parent/profile">
            <div className="flex gap-3 mb-6 p-3 bg-slate-50 dark:bg-[#112240] rounded-xl items-center border border-slate-100 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group">
              {user?.profilePicture ? (
                <div 
                  className="rounded-full size-10 bg-cover bg-center border-2 border-[#FFD700]"
                  style={{ backgroundImage: `url("${user.profilePicture}")` }}
                />
              ) : (
                <div className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-10 flex items-center justify-center text-sm font-bold text-slate-900">
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'P'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || 'Parent'}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{t('viewProfile')}</div>
              </div>
            </div>
          </Link>
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
                      ? 'bg-[#FFD700] text-slate-900 shadow-lg shadow-[#FFD700]/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
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
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-white/5 transition-colors w-full group"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-medium">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Navbar - Desktop and Mobile */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a192f] shadow-sm dark:shadow-none z-20 transition-colors duration-300">
          {/* Left - Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          {/* Center/Left - Page Title or Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl hidden lg:flex">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
            <input
              type="text"
              placeholder={t('searchPlaceholderParent')}
              className="h-10 w-full px-3 bg-slate-100 dark:bg-[#112240] border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001f3f]/20 dark:focus:ring-[#FFD700]/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center size-10 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-all duration-200 border border-slate-200 dark:border-white/10"
              aria-label="Toggle theme"
            >
              <span className="material-symbols-outlined text-xl">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <LanguageSwitcher />
            {/* Notifications */}
            <NotificationBell />

            {/* User Avatar */}
            <Link to="/parent/profile">
              <div className="size-10 cursor-pointer hover:ring-2 hover:ring-[#FFD700] rounded-full transition-all duration-200">
                {user?.profilePicture ? (
                  <div 
                    className="rounded-full size-10 bg-cover bg-center border-2 border-slate-200 dark:border-white/20"
                    style={{ backgroundImage: `url("${user.profilePicture}")` }}
                  />
                ) : (
                  <div className="bg-gradient-to-br from-[#FFD700] to-yellow-600 rounded-full size-10 flex items-center justify-center text-sm font-bold text-slate-900 border-2 border-slate-200 dark:border-white/20">
                    {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'P'}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
