import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { 
  Home, Menu, X, User, Settings, LogOut, Bell, Search,
  BookOpen, GraduationCap, Calendar, ClipboardList, BarChart3,
  Users, MessageCircle, PlusCircle, FileText, TrendingUp,
  Shield, Database, Wrench, CreditCard, Eye, UserCog,
  Baby, Heart, Phone, Mail, Sparkles, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Logo } from "./logo";
import { NotificationsPanel } from "./NotificationsPanel";
import { assetUrl } from "@/lib/config";
import VersaFloatingChat from "./VersaFloatingChat";

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  submenu?: NavigationItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Role-based navigation configurations
const navigationConfig: Record<string, NavigationItem[]> = {
  student: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/student',
      icon: Home
    },
    {
      id: 'courses',
      label: 'Classes',
      href: '/student/courses',
      icon: BookOpen
    },
    {
      id: 'assignments',
      label: 'Assignments',
      href: '/student/assignments',
      icon: ClipboardList
    },
    {
      id: 'calendar',
      label: 'Calendar',
      href: '/student/calendar',
      icon: Calendar
    },
    {
      id: 'report-cards',
      label: 'Report Cards',
      href: '/student/report-cards',
      icon: FileText
    },
    {
      id: 'messages',
      label: 'Messages',
      href: '/student/messages',
      icon: MessageCircle
    }
  ],
  teacher: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/teacher',
      icon: Home
    },
    {
      id: 'courses',
      label: 'Classes',
      href: '/teacher/courses',
      icon: BookOpen
    },
    {
      id: 'assignments',
      label: 'Assignments',
      href: '/teacher/assignments',
      icon: ClipboardList
    },
    {
      id: 'calendar',
      label: 'Calendar',
      href: '/teacher/calendar',
      icon: Calendar
    },
    {
      id: 'students',
      label: 'Students',
      href: '/teacher/students',
      icon: Users
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: '/teacher/analytics',
      icon: TrendingUp
    },
    {
      id: 'report-cards',
      label: 'Report Cards',
      href: '/teacher/report-cards',
      icon: FileText
    },
    {
      id: 'messages',
      label: 'Messages',
      href: '/teacher/messages',
      icon: MessageCircle
    }
  ],
  admin: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/admin',
      icon: Home
    },
    {
      id: 'users',
      label: 'Users',
      href: '/admin/users',
      icon: Users
    },
    {
      id: 'courses',
      label: 'Classes',
      href: '/admin/courses',
      icon: BookOpen
    },
    {
      id: 'calendar',
      label: 'Calendar',
      href: '/admin/calendar',
      icon: Calendar
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3
    },
    {
      id: 'announcements',
      label: 'Announcements',
      href: '/admin/announcements',
      icon: Megaphone
    },
    {
      id: 'reports',
      label: 'Reports',
      href: '/admin/reports',
      icon: FileText
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/admin/settings',
      icon: Wrench
    }
  ],
  parent: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/parent',
      icon: Home
    },
    {
      id: 'children',
      label: 'My Children',
      href: '/parent/children',
      icon: Users
    },
    {
      id: 'courses',
      label: 'Classes',
      href: '/parent/courses',
      icon: BookOpen
    },
    {
      id: 'progress',
      label: 'Progress Report',
      href: '/parent/progress',
      icon: TrendingUp
    },
    {
      id: 'reports',
      label: 'Report Cards',
      href: '/parent/reports',
      icon: FileText
    },
  ]
};

// Role-based color schemes
const roleColors: Record<string, { primary: string; secondary: string; accent: string }> = {
  student: {
    primary: 'text-blue-600',
    secondary: 'bg-blue-50',
    accent: 'border-blue-200'
  },
  teacher: {
    primary: 'text-green-600',
    secondary: 'bg-green-50',
    accent: 'border-green-200'
  },
  admin: {
    primary: 'text-purple-600',
    secondary: 'bg-purple-50',
    accent: 'border-purple-200'
  },
  parent: {
    primary: 'text-pink-600',
    secondary: 'bg-pink-50',
    accent: 'border-pink-200'
  }
};

function SidebarNavItem({ item, isActive, colors, isSubmenuItem = false }: {
  item: NavigationItem;
  isActive: boolean;
  colors: typeof roleColors[string];
  isSubmenuItem?: boolean;
}) {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const hasSubmenu = item.submenu && item.submenu.length > 0;
  
  const baseClasses = `
    flex items-center justify-between w-full px-3 py-2.5 text-left 
    rounded-lg transition-all duration-200 group
    ${isSubmenuItem ? 'pl-10 text-sm' : ''}
    ${isActive 
      ? 'bg-gray-900 dark:bg-slate-700 text-white' 
      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
    }
  `;

  if (hasSubmenu) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
          className={baseClasses}
          data-testid={`nav-${item.id}`}
        >
          <div className="flex items-center space-x-3">
            <item.icon className={`h-5 w-5 ${isActive ? colors.primary : ''}`} />
            <span className="font-medium">{item.label}</span>
            {item.badge && (
              <Badge className="h-5 text-xs" variant={isActive ? "default" : "secondary"}>
                {item.badge}
              </Badge>
            )}
          </div>
          <div className={`transform transition-transform ${isSubmenuOpen ? 'rotate-90' : ''}`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
        
        {isSubmenuOpen && (
          <div className="space-y-1 animate-slide-up">
            {item.submenu!.map((subItem) => (
              <Link key={subItem.id} href={subItem.href}>
                <SidebarNavItem 
                  item={subItem} 
                  isActive={window.location.pathname === subItem.href}
                  colors={colors}
                  isSubmenuItem={true}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href}>
      <div className={baseClasses} data-testid={`nav-${item.id}`}>
        <div className="flex items-center space-x-3">
          <item.icon className="h-5 w-5" />
          <span className="font-medium text-sm">{item.label}</span>
        </div>
        {item.badge && (
          <Badge className="h-5 text-xs" variant={isActive ? "default" : "secondary"}>
            {item.badge}
          </Badge>
        )}
      </div>
    </Link>
  );
}

function UserMenu({ user, onLogout }: { user: any; onLogout: () => void }) {
  const profilePictureUrl = user?.profilePicture 
    ? assetUrl(user.profilePicture) 
    : '';

  const getProfileLink = () => {
    const role = user?.role || 'student';
    return `/${role}/profile`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
          data-testid="user-menu-trigger"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage 
              src={user?.profilePicture ? assetUrl(user.profilePicture) : ''} 
              alt={user?.fullName || user?.username} 
            />
            <AvatarFallback className="bg-eduverse-blue text-white">
              {(user?.fullName || user?.username || 'U')?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">{user?.fullName || user?.username || 'User'}</p>
            <p className="w-[200px] truncate text-sm text-gray-600 dark:text-slate-400">
              {user?.email}
            </p>
            <Badge className="w-fit text-xs capitalize" variant="secondary">
              {user?.role}
            </Badge>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${user?.role || 'student'}/profile`} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer text-red-600" 
          onClick={onLogout}
          data-testid="logout-button"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  // Push notifications - auto-subscribe on login
  const { 
    isSupported: pushSupported, 
    permission: pushPermission, 
    isSubscribed: pushSubscribed,
    subscribe: subscribePush 
  } = usePushNotifications();
  
  const userRole = user?.role || 'student';
  const navigation = navigationConfig[userRole] || navigationConfig.student;
  const colors = roleColors[userRole] || roleColors.student;
  
  // Handle both fullName (correct) and name (legacy from backend)
  const displayName = (user as any)?.fullName || (user as any)?.name || user?.username || 'User';
  
  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Auto-subscribe to push notifications when user logs in
  useEffect(() => {
    if (user && pushSupported && !pushSubscribed && pushPermission !== 'denied') {
      // Delay to not block initial render
      const timer = setTimeout(() => {
        subscribePush();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, pushSupported, pushSubscribed, pushPermission, subscribePush]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const userName = displayName.split(' ')[0];
  const welcomeMessages: Record<string, string> = {
    student: `Welcome back, ${userName}! Ready to learn something new today?`,
    teacher: `Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${userName}! Your students are waiting.`,
    admin: `Hello, ${userName}! Keep EduVerse running smoothly.`,
    parent: `Hi, ${userName}! Check on your child's progress.`
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 sm:w-[245px] bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800
        transform transition-transform duration-300 ease-in-out md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 sm:h-20 px-4 sm:px-6 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
<div className="mb-6 mt-10">
            <img 
              src="/nies-logo.png" 
              alt="NIES Logo" 
              className="w-400 h-200 object-contain drop-shadow-2xl"
            />              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden -mr-2"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 sm:px-4 pt-4 sm:pt-6 pb-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              // Check if current location matches this item or is a child route
              // For dashboard items (exact paths like /student, /teacher, /admin, /parent), 
              // only highlight on exact match
              const isDashboardItem = ['/student', '/teacher', '/admin', '/parent'].includes(item.href);
              const isActive = isDashboardItem 
                ? item.href === location 
                : (item.href === location || location.startsWith(item.href + '/'));
              return (
                <SidebarNavItem
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  colors={colors}
                />
              );
            })}
          </nav>

          {/* Sidebar footer - Settings and Logout */}
          <div className="border-t border-gray-100 dark:border-slate-800">
            <div className="px-3 sm:px-4 py-3 space-y-1">
              <Link href="/settings">
                <div className={`
                  flex items-center w-full px-3 py-2.5 text-left rounded-lg
                  transition-all duration-200 group
                  ${location === '/settings' 
                    ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }
                `}>
                  <div className="flex items-center space-x-3">
                    <Settings className="h-5 w-5" />
                    <span className="font-medium text-sm">Settings</span>
                  </div>
                </div>
              </Link>
              
              <button
                onClick={handleLogout}
                className="
                  flex items-center w-full px-3 py-2.5 text-left rounded-lg
                  transition-all duration-200 group
                  text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800
                "
              >
                <div className="flex items-center space-x-3">
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium text-sm">Logout</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 sm:md:pl-[245px]">
        {/* Top header */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 h-14 sm:h-16 md:h-20">
          <div className="flex items-center justify-between h-full px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="flex items-center flex-1 max-w-2xl">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden mr-2 p-2"
                onClick={() => setSidebarOpen(true)}
                data-testid="mobile-menu-button"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Search */}
              <div className="flex items-center flex-1">
                <div className="relative w-full max-w-xl">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-9 sm:pl-11 pr-3 sm:pr-4 h-9 sm:h-10 md:h-11 bg-gray-50 dark:bg-slate-800 border-0 rounded-lg text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-gray-300 dark:focus-visible:ring-slate-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="search-input"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
              {/* Notifications */}
              <NotificationsPanel />

              {/* User Profile */}
              <Link href={`/${user?.role || 'student'}/profile`}>
                <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors">
                  <div className="hidden lg:block text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                      {user?.grade || (user?.role === 'student' ? 'Student' : user?.role)}
                    </p>
                  </div>
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 ring-2 ring-gray-100 dark:ring-slate-700">
                    <AvatarImage 
                      src={user?.profilePicture ? assetUrl(user.profilePicture) : ''} 
                      alt={displayName} 
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold text-xs sm:text-sm">
                      {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6 bg-gray-50 dark:bg-slate-950">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Versa Chat - Show for students only */}
      {user?.role === 'student' && <VersaFloatingChat />}
    </div>
  );
}
