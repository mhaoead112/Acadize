import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description?: string;
}

export default function LessonManagementPage() {
  const { user, token, getAuthHeaders } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  
  // Form state
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [prerequisiteLesson, setPrerequisiteLesson] = useState("none");
  const [tags, setTags] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Fetch teacher's courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      if (!token) {
        setIsLoadingCourses(false);
        return;
      }

      try {
        const response = await fetch(apiEndpoint('/api/courses/user'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCourses(Array.isArray(data) ? data : []);
          if (data.length > 0 && !selectedCourse) {
            setSelectedCourse(data[0].id);
          }
        } else {
          throw new Error('Failed to fetch courses');
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your courses',
          variant: 'destructive'
        });
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [token]);

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // TODO: Implement actual lesson creation API call
  const handlePublishLesson = async () => {
    if (!lessonTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a lesson title",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCourse) {
      toast({
        title: "Validation Error",
        description: "Please select a course",
        variant: "destructive"
      });
      return;
    }

    setIsPublishing(true);
    
    try {
      // TODO: Replace with actual API endpoint when backend is ready
      // const formData = new FormData();
      // formData.append('title', lessonTitle);
      // formData.append('content', lessonContent);
      // formData.append('courseId', selectedCourse);
      // formData.append('releaseDate', releaseDate);
      // formData.append('estimatedDuration', estimatedDuration);
      // formData.append('prerequisite', prerequisiteLesson);
      // formData.append('tags', tags);
      // uploadedFiles.forEach(file => formData.append('files', file));
      
      // const response = await fetch(apiEndpoint('/api/lessons'), {
      //   method: 'POST',
      //   headers: getAuthHeaders(),
      //   body: formData
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: "Lesson published successfully"
      });
      
      // Reset form
      setLessonTitle("");
      setLessonContent("");
      setReleaseDate("");
      setEstimatedDuration("");
      setPrerequisiteLesson("none");
      setTags("");
      setUploadedFiles([]);
      
      // Navigate back to dashboard
      navigate("/teacher/dashboard");
      
    } catch (error) {
      console.error('Error publishing lesson:', error);
      toast({
        title: "Error",
        description: "Failed to publish lesson. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = () => {
      navigate("/teacher/dashboard");
  };

  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500 text-3xl">lock</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Only teachers and administrators can access this page.
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingCourses) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-navy-dark">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-navy-dark transition-colors duration-200">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
              <Link href="/teacher/dashboard" className="text-slate-500 hover:text-gold transition-colors">
            Dashboard
          </Link>
          <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
          <span className="text-slate-900 dark:text-white font-medium">New Lesson</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 hidden sm:flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">cloud_done</span>
            Draft saved just now
          </span>
          <div className="h-8 w-8 rounded-full bg-slate-200 border border-slate-300 dark:border-slate-700"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-6xl mx-auto p-6 md:p-10">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Add New Lesson</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Creating content for {selectedCourse ? courses.find(c => c.id === selectedCourse)?.title || 'your course' : 'Week 4 Module'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCancel} 
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              disabled={isPublishing}
            >
              Cancel
            </button>
            <button 
              onClick={handlePublishLesson}
              disabled={isPublishing}
              className="px-5 py-2 bg-gold text-navy font-bold rounded-lg text-sm hover:shadow-lg hover:shadow-gold/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                  Publish Lesson
                </>
              )}
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Lesson Title Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-500">Lesson Title</label>
              <input 
                type="text" 
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-gold focus:ring-0 px-0 py-3 text-2xl font-bold text-slate-900 dark:text-white placeholder-slate-300 transition-colors"
                placeholder="e.g. Introduction to Thermodynamics"
              />
            </div>

            {/* Rich Text Editor */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[400px] overflow-hidden">
              {/* Toolbar */}
              <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 flex flex-wrap gap-2">
                <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500 transition-colors">
                  <span className="material-symbols-outlined">format_bold</span>
                </button>
                <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500 transition-colors">
                  <span className="material-symbols-outlined">format_italic</span>
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500 transition-colors">
                  <span className="material-symbols-outlined">image</span>
                </button>
                <button className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500 transition-colors">
                  <span className="material-symbols-outlined">code</span>
                </button>
              </div>
              {/* Content Area */}
              <textarea 
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
                className="flex-1 w-full bg-transparent border-none p-6 text-slate-800 dark:text-slate-200 focus:ring-0 resize-none text-base leading-relaxed"
                placeholder="Describe the lesson content, goals, and key learning outcomes..."
              ></textarea>
            </div>

            {/* Lesson Materials Upload */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-gold">folder_open</span>
                Lesson Materials
              </h3>
              
              {/* Upload Area */}
              <div 
                onClick={handleUploadClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer group transition-all ${
                  isDragging 
                    ? 'border-gold bg-gold/5 dark:bg-gold/10' 
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-navy-dark'
                }`}
              >
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-slate-500">cloud_upload</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">Click to upload or drag files</p>
                <p className="text-xs text-slate-400 mt-1">PDF, MP4, MP3 (Max 50MB)</p>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.mp4,.mp3,.doc,.docx,.ppt,.pptx"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Uploaded Files ({uploadedFiles.length})
                  </p>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="material-symbols-outlined text-gold">insert_drive_file</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Publishing Section */}
            <section className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Publishing</h3>
              
              {/* Visibility Indicator */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-900 dark:text-white font-semibold">Visibility</span>
                <div className="size-10 flex items-center justify-center bg-green-500/10 text-green-500 rounded-full">
                  <span className="material-symbols-outlined">visibility</span>
                </div>
              </div>

              {/* Course Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Select Course</label>
                  <select 
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">Choose a course...</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Release Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Release Date</label>
                  <input 
                    type="date" 
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" 
                  />
                </div>

                {/* Estimated Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Estimated Duration</label>
                  <div className="flex items-center bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <input 
                      type="number" 
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      className="flex-1 bg-transparent border-none p-2.5 text-sm text-center text-slate-900 dark:text-white focus:ring-0" 
                      placeholder="45" 
                    />
                    <span className="px-3 text-xs font-bold text-slate-400">MINS</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Meta Data Section */}
            <section className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Meta Data</h3>
              <div className="space-y-4">
                {/* Prerequisite Lesson */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500">Prerequisite Lesson</label>
                  <select 
                    value={prerequisiteLesson}
                    onChange={(e) => setPrerequisiteLesson(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="none">None</option>
                    <option value="basic-algebra">Basic Algebra</option>
                    {/* TODO: Populate from actual lessons when available */}
                  </select>
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500">Tags</label>
                  <input 
                    type="text" 
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" 
                    placeholder="Add keywords..." 
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
