import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiEndpoint } from '@/lib/config';
import { Button } from '@/components/ui/button';
import TeacherLayout from '@/components/TeacherLayout';
import { 
  Lock, ShieldAlert, Upload, X, Loader2
} from 'lucide-react';

export default function CreateCoursePage() {
  const { isAuthenticated, user, isLoading: authLoading, token, getAuthHeaders } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    courseCode: '',
    description: '',
    department: '',
    semesterStart: '',
    semesterEnd: '',
  });

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] dark:bg-navy-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-navy-dark flex items-center justify-center p-4">
        <div className="bg-surface-dark rounded-2xl shadow-2xl p-10 max-w-md w-full text-center border border-gray-800">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
          <p className="text-gray-400 mb-8">
            You must be logged in as a teacher or administrator to create a course.
          </p>
          <Button
            onClick={() => setLocation('/demo')}
            className="w-full bg-gold hover:bg-yellow-500 text-navy font-semibold py-6 rounded-xl"
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
      <div className="min-h-screen bg-navy-dark flex items-center justify-center p-4">
        <div className="bg-surface-dark rounded-2xl shadow-2xl p-10 max-w-md w-full text-center border border-gray-800">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Insufficient Permissions</h1>
          <p className="text-gray-400 mb-2">
            Only teachers and administrators can create classes.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Your current role: <span className="font-semibold text-amber-400 capitalize">{user?.role}</span>
          </p>
          <Button
            onClick={() => setLocation('/teacher')}
            className="w-full bg-gold hover:bg-yellow-500 text-navy font-semibold py-6 rounded-xl"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setCoverImage(null);
    setCoverImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e?: React.FormEvent, isDraft = false) => {
    if (e) e.preventDefault();
    
    if (!formData.title.trim() || !formData.courseCode.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Course title and code are required',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Upload image if selected
      let imageUrl = null;
      if (coverImage) {
        try {
          imageUrl = await new Promise<string>((resolve, reject) => {
            const imageFormData = new FormData();
            imageFormData.append('file', coverImage);
            
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percentComplete);
              }
            });
            
            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const result = JSON.parse(xhr.responseText);
                  const uploadedPath = result.filePath || result.url || result.path || result.fileName;
                  if (uploadedPath) {
                    resolve(uploadedPath);
                  } else {
                    reject(new Error('Upload succeeded but no file path was returned'));
                  }
                } catch (parseError) {
                  reject(new Error('Invalid response from upload server'));
                }
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            });
            
            xhr.addEventListener('error', () => {
              reject(new Error('Network error during upload'));
            });
            
            xhr.open('POST', apiEndpoint('/api/upload'));
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            xhr.send(imageFormData);
          });
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          toast({
            title: 'Image Upload Failed',
            description: uploadError instanceof Error ? uploadError.message : 'Failed to upload course image',
            variant: 'destructive'
          });
          imageUrl = null;
        }
      }

      const courseData = {
        title: formData.title.trim(),
        courseCode: formData.courseCode.trim(),
        description: formData.description.trim() || 'No description provided',
        department: formData.department || null,
        semesterStart: formData.semesterStart || null,
        semesterEnd: formData.semesterEnd || null,
        imageUrl: imageUrl,
        isPublished: !isDraft
      };

      const response = await fetch(apiEndpoint('/api/courses'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(courseData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create course');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: isDraft ? 'Course saved as draft!' : 'Course published successfully!',
        variant: 'default'
      });

      setTimeout(() => {
        setLocation('/teacher/courses');
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TeacherLayout>
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-navy-dark transition-colors duration-200">
        {/* Top Header Section */}
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md px-6 py-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLocation('/teacher/courses')}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex flex-col">
              <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Create New Course</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Set up your semester curriculum</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLocation('/teacher/courses')}
              className="hidden sm:block px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              onClick={() => handleSubmit(undefined, false)}
              disabled={isLoading || !formData.title.trim() || !formData.courseCode.trim()}
              className="px-5 py-2 bg-gold text-navy font-bold rounded-lg text-sm hover:bg-yellow-500 transition-all shadow-md shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Publishing...' : 'Publish Course'}
            </button>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-8 text-sm text-slate-500 dark:text-slate-400">
            <button onClick={() => setLocation('/teacher/courses')} className="hover:text-gold transition-colors">Courses</button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-slate-900 dark:text-white font-medium">Create New</span>
          </div>

          <form onSubmit={(e) => handleSubmit(e, false)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content Column */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              {/* General Info */}
              <section className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gold">edit_document</span>
                  General Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Course Title <span className="text-red-500">*</span></label>
                    <input 
                      className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-gold/50 outline-none transition-all"
                      placeholder="e.g. Introduction to Physics"
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Course Code <span className="text-red-500">*</span></label>
                    <input 
                      className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-gold/50 outline-none transition-all" 
                      placeholder="e.g. PHYS-101"
                      type="text"
                      name="courseCode"
                      value={formData.courseCode}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-navy-dark overflow-hidden">
                    <textarea 
                      className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 p-4 min-h-[160px] focus:ring-0 resize-y outline-none" 
                      placeholder="Provide a comprehensive overview of the course content..."
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                </div>
              </section>

              {/* Media Upload */}
              <section className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gold">image</span>
                  Course Media
                </h3>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Course Thumbnail</p>
                  
                  {coverImagePreview ? (
                    <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 overflow-hidden">
                      <img src={coverImagePreview} alt="Course thumbnail preview" className="w-full h-48 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-6 right-6 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-surface-dark rounded-lg p-2">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div className="bg-gold h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-dark transition-all group"
                    >
                      <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-slate-900 dark:text-white font-bold">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">SVG, PNG, JPG (Recommended: 800x400px)</p>
                    </div>
                  )}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </section>
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <section className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm sticky top-24">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gold">settings</span>
                  Course Settings
                </h3>
                
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Department <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-gold/50 outline-none"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Department</option>
                      <option value="Science">Science</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="English">English</option>
                      <option value="History">History</option>
                      <option value="Arts">Arts</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Semester Duration</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="date" 
                        className="bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-gold/50 outline-none"
                        name="semesterStart"
                        value={formData.semesterStart}
                        onChange={handleInputChange}
                      />
                      <input 
                        type="date" 
                        className="bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-gold/50 outline-none"
                        name="semesterEnd"
                        value={formData.semesterEnd}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Co-Instructors</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                      <input 
                        className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-gold/50 outline-none" 
                        placeholder="Find colleagues..." 
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <div className="bg-gold/10 text-gold text-xs px-2.5 py-1 rounded-full border border-gold/20 flex items-center gap-2">
                        <div className="size-4 rounded-full bg-gradient-to-br from-gold to-yellow-500"></div>
                        You
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-2 space-y-3">
                    <button 
                      type="button"
                      onClick={() => handleSubmit(undefined, true)}
                      disabled={isLoading || !formData.title.trim() || !formData.courseCode.trim()}
                      className="w-full py-3 bg-gold text-navy font-bold rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isLoading ? 'Saving...' : 'Save Draft & Continue'}
                    </button>
                    <p className="text-center text-[11px] text-slate-400">Changes are saved automatically.</p>
                  </div>
                </div>
              </section>
            </div>
          </form>
        </div>
      </div>
    </TeacherLayout>
  );
}
