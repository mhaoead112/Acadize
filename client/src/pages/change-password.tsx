import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiEndpoint } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import { motion } from 'framer-motion';

export default function ChangePassword() {
  const [, setLocation] = useLocation();
  const { user, token, updateUser } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  // Calculate password strength
  useEffect(() => {
    let strength = 0;
    if (newPassword.length > 5) strength += 20;
    if (newPassword.length > 8) strength += 20;
    if (/[A-Z]/.test(newPassword)) strength += 20;
    if (/[0-9]/.test(newPassword)) strength += 20;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength += 20;
    setPasswordStrength(strength);
  }, [newPassword]);

  useEffect(() => {
    if (confirmPassword) {
      setPasswordsMatch(newPassword === confirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordsMatch(false);
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(apiEndpoint('/api/password-reset/change'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id,
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || 'Failed to change password');
      }

      toast({
        title: 'Password changed successfully',
        description: 'You can now access your dashboard',
      });
      
      // Update local user state to remove temporary password flag
      updateUser({ isTemporaryPassword: false });

      // Redirect to dashboard after successful password change
      setTimeout(() => {
        // Redirect based on role
        const role = user?.role || 'student';
        setLocation(`/${role}`);
      }, 1000);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 20) return 'bg-red-500';
    if (passwordStrength <= 50) return 'bg-orange-500';
    if (passwordStrength <= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (!newPassword) return '';
    if (passwordStrength <= 20) return 'Weak';
    if (passwordStrength <= 50) return 'Fair';
    if (passwordStrength <= 80) return 'Good';
    return 'Strong';
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0F172A] p-4 font-sans pt-20 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg space-y-8 bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm"
        >
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Change Password
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Please update your password to continue using EduVerse securely.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-slate-700 dark:text-slate-300 font-medium">Current Password</Label>
              <div className="relative group">
                <Input
                  id="current-password"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-white pr-10 h-11 rounded-lg transition-all"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-slate-700 dark:text-slate-300 font-medium">New Password</Label>
              <div className="relative group">
                <Input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  className="bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-white pr-10 h-11 rounded-lg transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Password Strength Meter */}
              <div className="space-y-2 pt-2 transition-all duration-300 ease-in-out" style={{ opacity: newPassword ? 1 : 0.5 }}>
                <div className="flex gap-1 h-1.5 w-full">
                  <div className={`h-full rounded-full transition-all duration-300 ${newPassword && passwordStrength >= 20 ? getStrengthColor() : 'bg-slate-200 dark:bg-slate-700'} flex-1`}></div>
                  <div className={`h-full rounded-full transition-all duration-300 ${newPassword && passwordStrength >= 40 ? getStrengthColor() : 'bg-slate-200 dark:bg-slate-700'} flex-1`}></div>
                  <div className={`h-full rounded-full transition-all duration-300 ${newPassword && passwordStrength >= 60 ? getStrengthColor() : 'bg-slate-200 dark:bg-slate-700'} flex-1`}></div>
                  <div className={`h-full rounded-full transition-all duration-300 ${newPassword && passwordStrength >= 80 ? getStrengthColor() : 'bg-slate-200 dark:bg-slate-700'} flex-1`}></div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Strength</span>
                  <span className={`font-medium transition-colors duration-300 ${
                    !newPassword ? 'text-slate-500' :
                    getStrengthText() === 'Weak' ? 'text-red-500' : 
                    getStrengthText() === 'Fair' ? 'text-orange-500' :
                    getStrengthText() === 'Good' ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {getStrengthText() || 'Enter password'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-slate-700 dark:text-slate-300 font-medium">Confirm New Password</Label>
              <div className="relative group">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  className={`bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-white pr-10 h-11 rounded-lg transition-all ${!passwordsMatch ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {!passwordsMatch ? (
                <div className="flex items-center gap-1.5 text-red-500 text-xs mt-1 animate-in slide-in-from-top-1 fade-in duration-300">
                  <X className="h-3 w-3" />
                  <span>Passwords do not match</span>
                </div>
              ) : confirmPassword && newPassword === confirmPassword ? (
                 <div className="flex items-center gap-1.5 text-green-500 text-xs mt-1 animate-in slide-in-from-top-1 fade-in duration-300">
                  <Check className="h-3 w-3" />
                  <span>Passwords match</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setLocation('/')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-8 rounded-lg shadow-lg hover:shadow-blue-500/20 transition-all duration-300 dark:bg-blue-600 dark:hover:bg-blue-500"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : 'Save Changes'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}
