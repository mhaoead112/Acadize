import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronRight, Home, Sparkles, Heart, Palette, BookOpen, Calendar, GraduationCap, Phone, FileText, LogIn, Bot } from "lucide-react";
import { Logo } from "./logo";
import { useAuth } from "@/hooks/useAuth";

const navigationItems = [
  { name: "Home", href: "/home" },
  { name: "About", href: "/about" },
  { name: "Programs", href: "/programs" },
  { name: "Subjects", href: "/subjects" },
  { name: "Events", href: "/events" },
  { name: "Admissions", href: "/admissions" },
  { name: "Contact", href: "/contact" },
];

const featureItems = [
  { 
    name: "AR Learning", 
    href: "/ar-learning", 
    icon: Sparkles,
    description: "Explore space and science with AR visualization",
    color: "from-purple-50 to-indigo-100" 
  },
  { 
    name: "Emotional Learning", 
    href: "/emotional-learning", 
    icon: Heart,
    description: "AI-powered emotional intelligence development",
    color: "from-blue-50 to-cyan-100" 
  },
  { 
    name: "Learning Avatars", 
    href: "/avatars", 
    icon: Palette,
    description: "Create your personalized learning character",
    color: "from-amber-50 to-yellow-100" 
  },
  { 
    name: "Study Materials", 
    href: "/subjects", 
    icon: BookOpen,
    description: "Access comprehensive learning resources",
    color: "from-amber-50 to-yellow-100" 
  },
  { 
    name: "Live Events", 
    href: "/events", 
    icon: Calendar,
    description: "Join educational events and workshops",
    color: "from-yellow-50 to-amber-100" 
  },
];

// Breadcrumb component for better navigation
function Breadcrumb({ location }: { location: string }) {
  const getBreadcrumbs = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', path: '/home' }];
    
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = segment.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      // Special handling for known routes
      const routeLabels: Record<string, string> = {
        'ai-chat': 'AI Study Buddy',
        'group-chat': 'Group Chat',
        'ar-learning': 'AR Learning',
        'emotional-learning': 'Emotional Learning',
        'lms-structure': 'LMS Structure',
        'teacher-dashboard': 'Teacher Dashboard',
        'student-dashboard': 'Student Dashboard',
        'admin-dashboard': 'Admin Dashboard'
      };
      
      breadcrumbs.push({
        label: routeLabels[segment] || label,
        path: currentPath
      });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = getBreadcrumbs(location);
  
  if (location === '/' || location === '/home' || breadcrumbs.length <= 1) {
    return null;
  }
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100">
      <div className="container mx-auto px-6 py-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.path} className="flex items-center">
                {index === 0 && <Home className="w-4 h-4 mr-1 text-eduverse-blue" />}
                {index < breadcrumbs.length - 1 ? (
                  <>
                    <Link 
                      href={crumb.path}
                      className="text-eduverse-blue hover:text-eduverse-dark transition-colors font-medium"
                    >
                      {crumb.label}
                    </Link>
                    <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                  </>
                ) : (
                  <span className="text-gray-700 font-semibold">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    setIsOpen(false);
  }, [location]);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    return location === href;
  };

  return (
    <>
      <header className={`fixed w-full top-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'luxury-card backdrop-blur-xl border-0 shadow-2xl' 
          : 'luxury-card shadow-xl'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-50/98 via-white/99 to-slate-50/98"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px gold-shimmer"></div>
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 relative z-10">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <Link href="/" className="relative group flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-blue-600/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative transform group-hover:scale-105 transition-transform duration-300">
              <Logo />
            </div>
          </Link>
          
          {/* Desktop Navigation - Optimized for space */}
          <div className="hidden md:flex items-center gap-2 lg:gap-2.5 xl:gap-3 flex-1 justify-end">
            {/* Main Navigation Group - Compact */}
            <div className="flex items-center space-x-1 premium-glass rounded-full px-2.5 md:px-3 py-2 border border-white/30">
              <Link
                href="/home"
                className={`px-2.5 md:px-3 lg:px-3.5 py-1.5 md:py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-1.5 text-xs md:text-sm ${
                  isActive("/home") 
                    ? "luxury-button text-white shadow-md transform scale-105" 
                    : "text-gray-700 hover:text-yellow-600 hover:bg-white/80"
                }`}
              >
                <Home size={14} /> <span className="hidden xl:inline">Home</span>
              </Link>
              <Link
                href="/about"
                className={`px-2.5 md:px-3 lg:px-3.5 py-1.5 md:py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-1.5 text-xs md:text-sm ${
                  isActive("/about") 
                    ? "luxury-button text-white shadow-md transform scale-105" 
                    : "text-gray-700 hover:text-yellow-600 hover:bg-white/80"
                }`}
              >
                <BookOpen size={14} /> <span className="hidden xl:inline">About</span>
              </Link>
            </div>

            {/* Academic Section - Compact */}
            <div className="flex items-center space-x-1 bg-blue-50/80 rounded-full px-2.5 md:px-3 py-2">
              <Link
                href="/programs"
                className={`px-2.5 md:px-3 lg:px-3.5 py-1.5 md:py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-1.5 text-xs md:text-sm ${
                  isActive("/programs") 
                    ? "bg-eduverse-blue text-white shadow-md" 
                    : "text-gray-700 hover:text-eduverse-blue hover:bg-white/50"
                }`}
              >
                <GraduationCap size={14} /> <span className="hidden xl:inline">Programs</span>
              </Link>
              <Link
                href="/subjects"
                className={`px-2.5 md:px-3 lg:px-3.5 py-1.5 md:py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-1.5 text-xs md:text-sm ${
                  isActive("/subjects") 
                    ? "bg-eduverse-blue text-white shadow-md" 
                    : "text-gray-700 hover:text-eduverse-blue hover:bg-white/50"
                }`}
              >
                <BookOpen size={14} /> <span className="hidden xl:inline">Subjects</span>
              </Link>
            </div>

            {/* Events Section - Compact */}
            <div className="flex items-center space-x-1 bg-purple-50/80 rounded-full px-2.5 md:px-3 py-2">
              <Link
                href="/events"
                className={`px-2.5 md:px-3 lg:px-3.5 py-1.5 md:py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-1.5 text-xs md:text-sm ${
                  isActive("/events") 
                    ? "bg-eduverse-blue text-white shadow-md" 
                    : "text-gray-700 hover:text-eduverse-blue hover:bg-white/50"
                }`}
              >
                <Calendar size={14} /> <span className="hidden xl:inline">Events</span>
              </Link>
            </div>

            {/* Contact Section - Compact */}
            <div className="flex items-center space-x-1 bg-green-50/80 rounded-full px-2.5 md:px-3 py-2">
              <Link
                href="/admissions"
                className={`px-2.5 md:px-3 lg:px-3.5 py-1.5 md:py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-1.5 text-xs md:text-sm ${
                  isActive("/admissions") 
                    ? "bg-eduverse-blue text-white shadow-md" 
                    : "text-gray-700 hover:text-eduverse-blue hover:bg-white/50"
                }`}
              >
                <FileText size={14} /> <span className="hidden xl:inline">Admissions</span>
              </Link>
              <Link
                href="/contact"
                className={`px-2.5 md:px-3 lg:px-3.5 py-1.5 md:py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-1.5 text-xs md:text-sm ${
                  isActive("/contact") 
                    ? "bg-eduverse-blue text-white shadow-md" 
                    : "text-gray-700 hover:text-eduverse-blue hover:bg-white/50"
                }`}
              >
                <Phone size={14} /> <span className="hidden xl:inline">Contact</span>
              </Link>
            </div>
            
            {/* Interactive Features Dropdown - Compact */}
            <div className="relative group">
              <button className="luxury-button flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 text-white rounded-full font-medium text-xs md:text-sm shadow-lg hover:shadow-xl transform hover:scale-105 border border-yellow-300/40">
                <Sparkles size={16} />
                <span className="hidden xl:inline">Features</span>
                <svg className="w-3 h-3 transition-transform group-hover:rotate-180 duration-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Compact Features Dropdown */}
              <div className="absolute top-full right-0 mt-2 w-[90vw] sm:w-80 md:w-96 lg:w-[600px] xl:w-[700px] luxury-card border-0 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50" data-testid="features-dropdown">
                <div className="p-4">
                  {/* Luxury Header */}
                  <div className="text-center mb-4 pb-3 border-b border-yellow-200/50">
                    <h3 className="font-luxury text-lg text-gray-800 flex items-center justify-center gap-2">
                      <Sparkles size={20} className="text-yellow-600" />
                      <span className="luxury-text-gradient">EduVerse Features</span>
                    </h3>
                  </div>
                  
                  {/* Compact Features Grid with Responsive Breakpoints */}
                  <div className="max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {featureItems.map((item, index) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`group/item luxury-card relative overflow-hidden rounded-xl p-3 transition-all duration-400 hover:scale-105 border-0 ${
                            isActive(item.href) 
                              ? "bg-gradient-to-br from-yellow-50 to-yellow-100 text-gray-800 shadow-lg border border-yellow-300/50" 
                              : "hover:bg-gradient-to-br hover:from-yellow-50/50 hover:to-white hover:text-gray-800 hover:border-yellow-200/30"
                          }`}
                          data-testid={`feature-link-${item.href.slice(1)}`}
                        >
                          <div className="relative z-10 text-center">
                            {/* Compact Icon */}
                            <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl shadow-sm">
                              {typeof item.icon === 'string' ? (
                                <span className="text-xl">{item.icon}</span>
                              ) : (
                                <item.icon size={20} className="text-gray-700" />
                              )}
                            </div>
                            
                            {/* Compact Content */}
                            <div className="font-luxury text-sm mb-1 leading-tight line-clamp-2 text-gray-800">
                              {item.name}
                            </div>
                            <p className="text-xs text-gray-600 leading-tight line-clamp-2 hidden sm:block font-elegant">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Auth Section - Login Only */}
            {!isAuthenticated ? (
              <Link
                href="/login"
                className="px-4 md:px-5 py-2 md:py-2.5 rounded-full font-medium bg-eduverse-blue text-white hover:bg-eduverse-blue/90 shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 text-sm md:text-base"
              >
                <LogIn size={16} />
                <span>Login</span>
              </Link>
            ) : (
              <Link
                href={`/${user?.role || 'student'}`}
                className="px-4 md:px-5 py-2 md:py-2.5 rounded-full font-medium bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 text-sm md:text-base"
              >
                <GraduationCap size={16} />
                <span>Dashboard</span>
              </Link>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-eduverse-blue"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Enhanced Mobile Navigation with Animations */}
        <div className={`md:hidden overflow-hidden transition-all duration-500 ease-out ${
          isOpen 
            ? 'max-h-[2000px] opacity-100 translate-y-0 visible' 
            : 'max-h-0 opacity-0 -translate-y-4 invisible'
        }`}>
          <div className="mt-4 pb-6 px-2 space-y-3">
            {/* Main Navigation Section */}
            <div className="bg-gradient-to-br from-blue-50/50 to-purple-50/30 rounded-2xl p-3">
              <p className="text-xs font-bold text-gray-600 mb-2 px-2 uppercase tracking-wider">
                Main Menu
              </p>
              <div className="grid grid-cols-2 gap-2">
                {navigationItems.map((item, index) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`p-3 rounded-xl border transition-all duration-300 ${
                      isActive(item.href) 
                        ? "bg-eduverse-blue text-white shadow-lg border-eduverse-blue" 
                        : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50 active:bg-blue-100"
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="text-center font-semibold text-sm leading-tight">{item.name}</div>
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Mobile Features Section with Enhanced Design */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-sm font-bold text-eduverse-blue mb-3 flex items-center px-1">
                <Sparkles size={18} className="mr-2 text-yellow-600" /> 
                Interactive Features
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {featureItems.map((item, index) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`luxury-card flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-300 active:scale-98 border-0 ${
                      isActive(item.href) 
                        ? "text-gray-800 bg-gradient-to-r from-yellow-50 to-yellow-100 font-premium shadow-lg border border-yellow-300/50" 
                        : "text-gray-700 hover:text-gray-800 hover:bg-gradient-to-r hover:from-yellow-50/50 hover:to-white active:bg-yellow-50"
                    }`}
                    style={{ animationDelay: `${(index + 4) * 100}ms` }}
                  >
                    <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl shadow-sm">
                      {typeof item.icon === 'string' ? (
                        <span className="text-lg">{item.icon}</span>
                      ) : (
                        <item.icon size={20} className="text-gray-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-luxury text-base text-gray-800 leading-tight">{item.name}</div>
                      <div className="text-xs text-gray-600 mt-0.5 font-elegant line-clamp-1">{item.description}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Mobile Auth Button */}
            {!isAuthenticated ? (
              <div className="pt-4 border-t border-gray-200">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-semibold bg-eduverse-blue text-white hover:bg-eduverse-blue/90 active:bg-eduverse-blue/80 shadow-lg hover:shadow-xl transition-all duration-300 text-base w-full"
                >
                  <LogIn size={20} />
                  <span>Login to Dashboard</span>
                </Link>
              </div>
            ) : (
              <div className="pt-4 border-t border-gray-200">
                <Link
                  href={`/${user?.role || 'student'}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 active:from-green-700 active:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300 text-base w-full"
                >
                  <GraduationCap size={22} />
                  <span>Go to Dashboard</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      </header>
      
      {/* Add Breadcrumb Navigation */}
      <div className="pt-20">
        <Breadcrumb location={location} />
      </div>
    </>
  );
}
