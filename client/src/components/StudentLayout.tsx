import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import NotificationBell from './NotificationBell';
import ParallaxBackground from './ParallaxBackground';
import { 
  sidebarVariants, 
  navItemVariants, 
  buttonVariants,
  iconButtonVariants,
  fadeInVariants,
  pulseVariants,
  springConfigs
} from '@/lib/animations';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/student/dashboard' },
  { label: 'Courses', icon: 'school', path: '/student/courses' },
  { label: 'Assignments', icon: 'task', path: '/student/assignments' },
  { label: 'Calendar', icon: 'calendar_month', path: '/student/calendar' },
  { label: 'Report Cards', icon: 'assessment', path: '/student/report-cards' },
  { label: 'Messages', icon: 'message', path: '/student/messages' },
];

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results page with query parameter
      setLocation(`/student/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#0a192f] overflow-hidden font-sans transition-colors duration-300 relative">
      {/* Parallax Background */}
      <ParallaxBackground />
      
      {/* Sidebar */}
      <motion.aside 
        className="hidden lg:flex w-72 h-full flex-col border-r border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0a192f]/80 backdrop-blur-xl shadow-xl dark:shadow-none z-30 transition-colors duration-300 relative"
        initial="initial"
        animate="animate"
        variants={sidebarVariants}
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div className="p-6 pb-2">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-4 mb-8"
            variants={fadeInVariants}
          >
            <motion.div 
              className="size-8 text-[#001f3f] dark:text-[#FFD700]"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ ...springConfigs.bouncy, duration: 0.6 }}
            >
              <svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg">
                <path d="M39.1 18.4L24.3 4.69999C24.1 4.49999 23.9 4.49999 23.7 4.69999L8.89999 18.4C8.69999 18.6 8.69999 18.8 8.89999 19L23.7 32.7C23.9 32.9 24.1 32.9 24.3 32.7L39.1 19C39.3 18.8 39.3 18.6 39.1 18.4Z" fill="currentColor" />
                <path d="M24 43.2L39.1 29.5C39.3 29.3 39.3 29.1 39.1 28.9L35.2 25C35 24.8 34.8 24.8 34.6 25L24 35.6L13.4 25C13.2 24.8 13 24.8 12.8 25L8.89999 28.9C8.69999 29.1 8.69999 29.3 8.89999 29.5L24 43.2Z" fill="currentColor" />
              </svg>
            </motion.div>
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Eduverse</h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">Student Portal</p>
                <motion.div 
                  className="w-2 h-2 rounded-full bg-green-500"
                  variants={pulseVariants}
                  initial="initial"
                  animate="animate"
                />
              </div>
            </div>
          </motion.div>

          {/* User Profile Card */}
          <Link to="/student/profile">
            <motion.div 
              className="flex gap-3 mb-6 p-3 bg-slate-50/80 dark:bg-[#112240]/80 backdrop-blur-md rounded-xl items-center border border-slate-100 dark:border-white/10 cursor-pointer group relative overflow-hidden"
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
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || 'Student'}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-[#FFD700] transition-colors">View Profile</div>
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer group relative overflow-hidden ${
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
                  <span className="font-medium text-sm flex-1 relative z-10">{item.label}</span>
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
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-6 border-t border-slate-200 dark:border-white/10">
          <motion.button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-white/5 transition-colors w-full group relative overflow-hidden"
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
            <span className="font-medium relative z-10">Logout</span>
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
            className="fixed top-0 left-0 h-full w-72 bg-white/95 dark:bg-[#0a192f]/95 backdrop-blur-xl z-50 lg:hidden border-r border-slate-200 dark:border-white/10"
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={springConfigs.gentle}
          >
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
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Eduverse</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Student Portal</p>
              </div>
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
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || 'Student'}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">View Profile</div>
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
                  <span className="font-medium text-sm flex-1 relative z-10">{item.label}</span>
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
            <span className="font-medium">Logout</span>
          </motion.button>
        </div>
      </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
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
              aria-label="Toggle theme"
              variants={iconButtonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {theme === 'dark' ? (
                <motion.span 
                  className="material-symbols-outlined text-[#FFD700] text-lg"
                  initial={{ rotate: 0, scale: 0 }}
                  animate={{ rotate: 360, scale: 1 }}
                  transition={springConfigs.bouncy}
                >
                  light_mode
                </motion.span>
              ) : (
                <motion.span 
                  className="material-symbols-outlined text-slate-700 text-lg"
                  initial={{ rotate: 0, scale: 0 }}
                  animate={{ rotate: 360, scale: 1 }}
                  transition={springConfigs.bouncy}
                >
                  dark_mode
                </motion.span>
              )}
            </motion.button>
            <NotificationBell />
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
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <motion.span 
                  className="material-symbols-outlined text-slate-400 dark:text-slate-500"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  search
                </motion.span>
              </div>
              <motion.input 
                className="block w-full pl-12 pr-4 py-3 bg-slate-50/80 dark:bg-[#112240]/80 backdrop-blur-md border-none rounded-full text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-[#FFD700] focus:bg-white/90 dark:focus:bg-[#112240]/90 transition-all shadow-inner" 
                placeholder="Search for classes, assignments, or teachers..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                whileFocus={{ scale: 1.02 }}
                transition={springConfigs.snappy}
              />
            </motion.form>
          </div>
          <div className="flex items-center gap-6 ml-6">
            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-slate-100/80 dark:bg-[#112240]/80 backdrop-blur-md border border-slate-200 dark:border-white/10 group"
              aria-label="Toggle theme"
              variants={iconButtonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {theme === 'dark' ? (
                <motion.span 
                  className="material-symbols-outlined text-[#FFD700] text-xl"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={springConfigs.bouncy}
                >
                  light_mode
                </motion.span>
              ) : (
                <motion.span 
                  className="material-symbols-outlined text-slate-700 text-xl"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={springConfigs.bouncy}
                >
                  dark_mode
                </motion.span>
              )}
            </motion.button>
            <NotificationBell />
            <motion.div 
              className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-700"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfigs.gentle, delay: 0.3 }}
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{user?.fullName || user?.username || 'Student'}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Student</div>
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
