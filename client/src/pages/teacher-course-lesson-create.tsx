import { useState, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Loader2 } from "lucide-react";
import { apiEndpoint } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function TeacherCourseLessonCreate() {
  const [, params] = useRoute("/teacher/courses/:courseId/lessons/create");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const courseId = params?.courseId;
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [releaseDate, setReleaseDate] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [prerequisiteLesson, setPrerequisiteLesson] = useState("none");
  const [tags, setTags] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
  };

  // Form submission
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a lesson title",
        variant: "destructive",
      });
      return;
    }

    if (!file) {
      toast({
        title: "Validation Error",
        description: "Please upload a lesson file",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('courseId', courseId!);
      formData.append('lessonTitle', title);
      
      // Add optional fields only if they have values
      if (content) {
        formData.append('content', content);
      }
      if (videoUrl) {
        formData.append('videoUrl', videoUrl);
      }
      
      // File is required
      formData.append('file', file);

      const response = await fetch(apiEndpoint('/api/lessons/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Lesson created successfully",
        });
        // Redirect to course page
        setLocation(`/teacher/courses/${courseId}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create lesson");
      }
    } catch (error) {
      console.error('Lesson creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create lesson",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Go back to course page
    setLocation(`/teacher/courses/${courseId}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-navy-dark transition-colors duration-200">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/teacher-dashboard" className="text-slate-500 hover:text-gold transition-colors">
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
            <p className="text-slate-500 dark:text-slate-400 mt-1">Creating content for your course</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCancel} 
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-gold text-navy font-bold rounded-lg text-sm hover:shadow-lg hover:shadow-gold/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-gold focus:ring-0 px-0 py-3 text-2xl font-bold text-slate-900 dark:text-white placeholder-slate-300 transition-colors"
                placeholder="e.g. Introduction to Thermodynamics"
                disabled={isSubmitting}
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
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full bg-transparent border-none p-6 text-slate-800 dark:text-slate-200 focus:ring-0 resize-none text-base leading-relaxed"
                placeholder="Describe the lesson content, goals, and key learning outcomes..."
                disabled={isSubmitting}
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
                <p className="text-xs text-slate-400 mt-1">PDF, DOC, PPT, MP4, MP3 (Max 50MB) - Required</p>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.mp4,.mp3"
                disabled={isSubmitting}
              />

              {/* Uploaded File Display */}
              {file && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Uploaded File
                  </p>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="material-symbols-outlined text-gold">insert_drive_file</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500 transition-colors"
                      disabled={isSubmitting}
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
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

              <div className="space-y-4">
                {/* Release Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Release Date</label>
                  <input 
                    type="date" 
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" 
                    disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
