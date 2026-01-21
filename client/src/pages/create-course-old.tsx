import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { CreateCourseForm } from '@/components/CreateCourseForm';
import { Button } from '@/components/ui/button';
import TeacherLayout from '@/components/TeacherLayout';
import { 
  ArrowLeft, Lock, ShieldAlert, CheckCircle, 
  ClipboardList, FileText, Rocket, Lightbulb, Check,
  BookOpen, Users, Video, Award, Sparkles, GraduationCap
} from 'lucide-react';

export default function CreateCoursePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [successMessage, setSuccessMessage] = useState(false);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mx-auto"></div>
            <BookOpen className="w-8 h-8 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 mt-4 font-medium">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border border-white/20">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
          <p className="text-gray-300 mb-8">
            You must be logged in as a teacher or administrator to create a course.
          </p>
          <Button
            onClick={() => setLocation('/demo')}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-6 rounded-xl shadow-lg"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Check if user has proper role
  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border border-white/20">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Insufficient Permissions</h1>
          <p className="text-gray-300 mb-2">
            Only teachers and administrators can create classes.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Your current role: <span className="font-semibold text-amber-400 capitalize">{user?.role}</span>
          </p>
          <Button
            onClick={() => setLocation('/teacher')}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-6 rounded-xl shadow-lg"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TeacherLayout>
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-4 bg-[#f6f6f8] dark:bg-navy-dark">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/teacher/courses')}
            className="mb-4 text-slate-600 dark:text-gray-400 hover:text-navy dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Classes
          </Button>
          
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gold/10 dark:bg-gold/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-gold" />
            </div>
            <div>
              <h1 className="text-navy dark:text-white text-3xl font-bold leading-tight tracking-[-0.033em]">
                Create a New Class
              </h1>
              <p className="text-slate-500 dark:text-gray-400 text-base font-normal leading-normal mt-1">
                Design an engaging learning experience for your students
              </p>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 mb-6 shadow-sm animate-in slide-in-from-top duration-500">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-green-900 dark:text-green-100 text-base">Course Created Successfully!</p>
                <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                  Your new course has been created. Redirecting you to add lessons and content...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form Section - Takes 2 columns */}
          <div className="lg:col-span-2">
            <CreateCourseForm
              onSuccess={() => {
                setSuccessMessage(true);
                setTimeout(() => {
                  setLocation('/teacher/courses');
                }, 2500);
              }}
              onCancel={() => setLocation('/teacher/courses')}
            />
          </div>

          {/* Sidebar - Takes 1 column */}
          <div className="space-y-4">
            {/* Quick Tips Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500 dark:bg-amber-600 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-navy dark:text-white">Pro Tips</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Use action verbs in your title',
                  'Outline clear learning outcomes',
                  'Keep descriptions concise but informative',
                  'Courses are unpublished by default',
                  'Add lessons after creation'
                ].map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* What's Next Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-gray-800">
              <h3 className="font-bold text-navy dark:text-white mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-purple-500" />
                What's Next?
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                  <div className="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-semibold text-navy dark:text-white text-sm">Add Lessons</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">Create engaging content</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-semibold text-navy dark:text-white text-sm">Enroll Students</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">Build your class roster</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                  <div className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-semibold text-navy dark:text-white text-sm">Publish Course</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">Make it available to students</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
