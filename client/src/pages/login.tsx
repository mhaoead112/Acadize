import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { School, Eye } from 'lucide-react';
import { apiEndpoint } from '@/lib/config';
import { useAuth } from '@/hooks/useAuth';

interface LoginCredentials {
  email: string;
  password: string;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const roleRoutes: Record<string, string> = {
        student: '/student/dashboard',
        teacher: '/teacher/dashboard',
        parent: '/parent/dashboard',
        admin: '/admin/dashboard'
      };
      setLocation(roleRoutes[user.role] || '/');
    }
  }, [isAuthenticated, user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email || !formData.password) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use AuthContext login to properly set state
      const result = await login({
        username: formData.email, // API accepts username or email
        email: formData.email,
        password: formData.password
      });

      if (result.success) {
        // Get user from localStorage (set by login function)
        const storedUser = localStorage.getItem('eduverse_user');
        const userData = storedUser ? JSON.parse(storedUser) : null;

        // Check if user has a temporary password that needs to be changed
        // User needs to change password if:
        // 1. They have a passwordResetExpires date (temporary password)
        // 2. The password hasn't expired yet
        // 3. Email is not verified (first login)
        const hasTemporaryPassword = userData?.passwordResetExpires && 
          new Date(userData.passwordResetExpires) > new Date();
        
        if (hasTemporaryPassword && !userData?.emailVerified) {
          toast({
            title: 'Password Change Required',
            description: 'You must change your temporary password to continue',
          });
          
          setTimeout(() => {
            setLocation('/change-password');
          }, 300);
          return;
        }

        // Track login streak for students
        if (userData?.role === 'student') {
          const storedToken = localStorage.getItem('eduverse_token');
          if (storedToken) {
            fetch(apiEndpoint('/api/streaks/login'), {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json'
              },
            }).catch(err => console.error('Failed to track login:', err));
          }
        }

        toast({
          title: 'Login Successful',
          description: `Welcome back, ${userData?.fullName || 'User'}!`,
        });

        // Redirect based on role
        const roleRoutes: Record<string, string> = {
          student: '/student/dashboard',
          teacher: '/teacher/dashboard',
          parent: '/parent/dashboard',
          admin: '/admin/dashboard'
        };

        setTimeout(() => {
          setLocation(roleRoutes[userData?.role] || '/');
        }, 300);
      } else {
        toast({
          title: 'Login Failed',
          description: result.error || 'Invalid email or password',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
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
    <div className="bg-slate-50 dark:bg-background-dark font-display min-h-screen flex flex-col transition-colors duration-300">
      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center p-4 relative overflow-hidden">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#f2d00d 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 top-20 w-72 h-72 bg-blue-900/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Login Card Container */}
        <div className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex overflow-hidden z-10 border border-slate-200 dark:border-slate-700 min-h-[600px] transition-colors duration-300">
          {/* Left Side: Login Form */}
          <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <div className="max-w-[400px] mx-auto w-full">
              {/* Header Text */}
              <div className="mb-10 text-center lg:text-left">
                <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl md:text-4xl font-bold leading-tight mb-3 transition-colors duration-300">Student Portal</h1>
                <p className="text-slate-600 dark:text-gray-400 text-base font-normal leading-normal transition-colors duration-300">Welcome back! Please enter your credentials to access your courses.</p>
              </div>

              {/* Form */}
              <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                {/* Student ID / Email Field */}
                <label className="flex flex-col gap-2">
                  <span className="text-slate-900 dark:text-white text-sm font-medium leading-normal transition-colors duration-300">Student ID / Email</span>
                  <div className="relative">
                    <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 h-5 w-5 transition-colors duration-300" />
                    <input 
                      className="form-input w-full rounded-lg text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-primary focus:ring-1 focus:ring-primary h-12 pl-12 pr-4 text-base transition-colors duration-300" 
                      placeholder="e.g. student@university.edu" 
                      type="text"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                </label>

                {/* Password Field */}
                <label className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-900 dark:text-white text-sm font-medium leading-normal transition-colors duration-300">Password</span>
                    <a className="text-sm font-medium text-primary hover:text-yellow-400 transition-colors cursor-pointer" onClick={() => setLocation('/forgot-password')}>Forgot Password?</a>
                  </div>
                  <div className="relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 h-5 w-5 transition-colors duration-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input 
                      className="form-input w-full rounded-lg text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-primary focus:ring-1 focus:ring-primary h-12 pl-12 pr-12 text-base transition-colors duration-300" 
                      placeholder="Enter your password" 
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    <button 
                      className="absolute right-0 top-0 h-full px-4 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors duration-300" 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>
                </label>

                {/* Login Button */}
                <button 
                  className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary hover:bg-[#d9bb0c] active:bg-[#bfa50b] text-[#232010] text-base font-bold leading-normal tracking-[0.015em] transition-all transform active:scale-[0.99] mt-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging in...' : 'Log In'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Side: Decorative Image */}
          <div className="hidden lg:block lg:w-1/2 relative bg-slate-100 dark:bg-[#1a180c] transition-colors duration-300">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-200 dark:from-[#221f10] via-transparent to-transparent z-10 opacity-90 transition-colors duration-300"></div>
            <div className="absolute inset-0 bg-primary/10 z-10 mix-blend-overlay"></div>
            <img alt="Students collaborating on laptops in a modern library setting" className="w-full h-full object-cover opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFe4ZCH4jZcZf-h8lhDDzBHAmP3Lid79fErhtboMOdlku0tVl_G2OFGyq3Djt63mimRgNWt7YzOXmWffX2J-KrIcWcFz2uHKQcxlozKaT7LC_ci6GoOoIZQGOwsZOWM5wO2K2ERWMIPfMdmCl-nFKtEzi9Y-hhPo8l3Rm-rqX6-FX_h8z8W3qfS5thGQ3h05eyInwl6QfzELrur5FdXK-1AhvsfRWC4poJoVI2ZMpOu5-NZST0q5-MudHSnl7U2-46NwPTN4vI7kg"/>
            <div className="absolute bottom-12 left-12 z-20 max-w-md">
              <div className="w-12 h-1 bg-primary mb-6"></div>
              <blockquote className="text-slate-900 dark:text-white text-2xl font-medium leading-relaxed mb-4 transition-colors duration-300">
                "Education is the passport to the future, for tomorrow belongs to those who prepare for it today."
              </blockquote>
              <p className="text-slate-700 dark:text-gray-400 text-sm font-light transition-colors duration-300">— Malcolm X</p>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 text-center text-slate-600 dark:text-gray-600 text-xs transition-colors duration-300">
        <p>© 2024 LMS Portal Inc. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <a className="hover:text-slate-400 dark:hover:text-gray-400 cursor-pointer transition-colors" onClick={() => setLocation('/terms')}>Privacy Policy</a>
          <span className="w-[1px] h-3 bg-slate-300 dark:bg-gray-700 inline-block my-auto transition-colors duration-300"></span>
          <a className="hover:text-slate-400 dark:hover:text-gray-400 cursor-pointer transition-colors" onClick={() => setLocation('/terms')}>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
