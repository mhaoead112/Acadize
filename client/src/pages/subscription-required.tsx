import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { 
  ShieldAlert, 
  ArrowLeft, 
  LogOut, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  ChevronRight,
  HeadphonesIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AcadizeLogo } from '@/components/AcadizeLogo';

export default function SubscriptionRequired() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  const features = [
    {
      icon: <Sparkles className="h-6 w-6 text-primary" />,
      title: "24/7 AI Tutor",
      description: "Get instant personalized help with any subject, anytime you need it."
    },
    {
      icon: <Users className="h-6 w-6 text-primary" />,
      title: "Study Rooms",
      description: "Join collaborative learning spaces with peers and teachers."
    },
    {
      icon: <CheckCircle2 className="h-6 w-6 text-primary" />,
      title: "Certified Tracking",
      description: "Earn recognized certificates and track your progress precisely."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white flex flex-col font-sans relative overflow-hidden transition-colors duration-300">
      {/* Background Glows for Dark Mode */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 dark:bg-blue-900/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-100/20 dark:bg-amber-900/10 blur-[120px] rounded-full" />

      {/* Header */}
      <header className="container mx-auto px-6 py-8 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <AcadizeLogo variant="full" size="xl" />
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500 dark:text-gray-400">
          <a href="/home" className="hover:text-primary dark:hover:text-white transition-colors">Home</a>
          <a href="#" className="hover:text-primary dark:hover:text-white transition-colors">Courses</a>
          <a href="#" className="hover:text-primary dark:hover:text-white transition-colors">Support</a>
        </nav>

        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 flex flex-col items-center justify-center relative z-10 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl w-full text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-8 border border-primary/20">
            <ShieldAlert className="h-10 w-10 text-primary" />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight text-slate-900 dark:text-white">
            Access <span className="text-primary italic">Restricted</span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
            To access your personalized dashboard, classes, and learning tools, you need an active subscription. Please activate your account to get started.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              size="lg"
              onClick={() => setLocation('/activate')}
              className="bg-primary hover:bg-primary-hover text-navy-950 font-bold h-14 px-8 rounded-xl shadow-xl shadow-primary/20 transform hover:scale-105 transition-all flex items-center gap-2 text-lg"
            >
              Activate My Account
              <ChevronRight className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="outline"
              size="lg"
              onClick={() => setLocation('/home')}
              className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-gray-300 h-14 px-8 rounded-xl transition-all flex items-center gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Home
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + (idx * 0.1) }}
              >
                <Card className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 backdrop-blur-sm overflow-hidden group hover:border-primary/30 transition-all shadow-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 p-3 bg-primary/10 rounded-xl inline-block group-hover:scale-110 transition-transform">
                      {React.cloneElement(feature.icon as React.ReactElement, { className: 'h-6 w-6 text-primary' })}
                    </div>
                    <h4 className="text-lg font-bold mb-2 text-slate-900 dark:text-white italic">{feature.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-10 border-t border-slate-200 dark:border-white/5 relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 text-slate-400 dark:text-gray-500 text-sm">
          <HeadphonesIcon className="h-4 w-4" />
          <span>Having trouble? <a href="#" className="text-primary hover:underline">Contact Support</a></span>
        </div>

        <div className="flex items-center gap-6 text-sm text-slate-400 dark:text-gray-500">
          <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-primary transition-colors">Cookie Settings</a>
        </div>
      </footer>
    </div>
  );
}
