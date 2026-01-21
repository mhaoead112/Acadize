import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";

interface Course {
  id: string;
  title: string;
}

export default function TeacherCreateAssignment() {
  const [, setLocation] = useLocation();
  const { getAuthHeaders, token, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Form state
  const [assignmentName, setAssignmentName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [submissionType, setSubmissionType] = useState<"online" | "paper">("online");
  const [totalPoints, setTotalPoints] = useState("100");
  const [displayAs, setDisplayAs] = useState<"points" | "percentage">("points");
  const [assignmentGroup, setAssignmentGroup] = useState("homework");
  const [assignedTo, setAssignedTo] = useState("all");
  const [dueDate, setDueDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [untilDate, setUntilDate] = useState("");
  
  // Data state
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchCourses();
    }
  }, [token, isAuthenticated]);

  const fetchCourses = async () => {
    try {
        const response = await fetch(apiEndpoint("/api/courses/user"), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch courses");
      const data = await response.json();
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourse(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const handleSaveDraft = async () => {
    if (!assignmentName.trim()) {
      toast({
        title: "Validation Error",
        description: "Assignment name is required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCourse) {
      toast({
        title: "Validation Error",
        description: "Please select a course",
        variant: "destructive",
      });
      return;
    }

    setIsSavingDraft(true);
    try {
      const response = await fetch(apiEndpoint(`/api/assignments/courses/${selectedCourse}/assignments`), {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourse,
          title: assignmentName,
          description: instructions,
          type: assignmentGroup,
          dueDate: dueDate || new Date().toISOString(),
          maxScore: totalPoints,
          isPublished: false,
        }),
      });

      if (!response.ok) throw new Error("Failed to save draft");

      toast({
        title: "Success",
        description: "Assignment saved as draft",
      });

      setLocation("/teacher/assignments");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!assignmentName.trim()) {
      toast({
        title: "Validation Error",
        description: "Assignment name is required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCourse) {
      toast({
        title: "Validation Error",
        description: "Please select a course",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(apiEndpoint(`/api/assignments/courses/${selectedCourse}/assignments`), {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourse,
          title: assignmentName,
          description: instructions,
          type: assignmentGroup,
          dueDate: dueDate || new Date().toISOString(),
          maxScore: totalPoints,
          isPublished: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to create assignment");
      const created = await response.json();

      // Immediately publish using the dedicated endpoint
      if (created?.id) {
        const publishRes = await fetch(apiEndpoint(`/api/assignments/${created.id}/publish`), {
          method: "PATCH",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isPublished: true }),
        });
        if (!publishRes.ok) throw new Error("Failed to publish assignment");
      }

      toast({
        title: "Success",
        description: "Assignment published successfully",
      });

      setLocation("/teacher/assignments");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish assignment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-navy-dark transition-colors duration-200">
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLocation("/teacher/assignments")} 
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Create Assignment</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSavingDraft ? "Saving..." : "Save Draft"}
          </button>
          <button 
            onClick={handlePublish}
            disabled={isLoading}
            className="px-5 py-2 bg-gold text-navy font-bold rounded-lg text-sm hover:shadow-lg hover:shadow-gold/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">publish</span>
            {isLoading ? "Publishing..." : "Assign Now"}
          </button>
        </div>
      </header>

      <main className="flex-grow w-full max-w-6xl mx-auto p-6 md:p-10">
        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <button 
              onClick={() => setLocation("/teacher/assignments")}
              className="hover:text-gold transition-colors"
            >
              Assignments
            </button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-slate-900 dark:text-white font-medium">New Assignment</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Assignment Details</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Course Selection */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-gold/50 outline-none"
                >
                  <option value="">Select a course...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignment Details */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Assignment Name</label>
                  <input 
                    type="text" 
                    value={assignmentName}
                    onChange={(e) => setAssignmentName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-gold/50 outline-none" 
                    placeholder="e.g. Midterm Problem Set"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Instructions</label>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-navy-dark">
                    <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 flex gap-2">
                      <button type="button" className="p-1 text-slate-500 hover:text-gold transition-colors">
                        <span className="material-symbols-outlined">format_bold</span>
                      </button>
                      <button type="button" className="p-1 text-slate-500 hover:text-gold transition-colors">
                        <span className="material-symbols-outlined">format_list_bulleted</span>
                      </button>
                      <button type="button" className="p-1 text-slate-500 hover:text-gold transition-colors">
                        <span className="material-symbols-outlined">attach_file</span>
                      </button>
                    </div>
                    <textarea 
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="w-full bg-transparent border-none p-4 min-h-[250px] text-slate-900 dark:text-white focus:ring-0 outline-none resize-none" 
                      placeholder="Enter detailed instructions for your students..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Type */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Submission Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setSubmissionType("online")}
                  className={`p-4 border-2 rounded-xl flex items-start gap-4 cursor-pointer transition-all ${
                    submissionType === "online"
                      ? "border-gold bg-gold/5"
                      : "border-slate-200 dark:border-slate-700 opacity-50 hover:opacity-100"
                  }`}
                >
                  <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                    submissionType === "online"
                      ? "bg-gold/10 text-gold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}>
                    <span className="material-symbols-outlined">cloud_upload</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Online Submission</h4>
                    <p className="text-xs text-slate-500">File uploads, URLs, or text entries</p>
                  </div>
                </div>
                <div 
                  onClick={() => setSubmissionType("paper")}
                  className={`p-4 border-2 rounded-xl flex items-start gap-4 cursor-pointer transition-all ${
                    submissionType === "paper"
                      ? "border-gold bg-gold/5"
                      : "border-slate-200 dark:border-slate-700 opacity-50 hover:opacity-100"
                  }`}
                >
                  <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                    submissionType === "paper"
                      ? "bg-gold/10 text-gold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}>
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">On Paper</h4>
                    <p className="text-xs text-slate-500">Handed in physically in class</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Grading Section */}
            <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-gold">leaderboard</span>
                Grading
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Points</label>
                    <input 
                      type="number" 
                      value={totalPoints}
                      onChange={(e) => setTotalPoints(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-gold/50 outline-none" 
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Display As</label>
                    <select 
                      value={displayAs}
                      onChange={(e) => setDisplayAs(e.target.value as "points" | "percentage")}
                      className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-gold/50 outline-none"
                    >
                      <option value="points">Points</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Assignment Group</label>
                  <select 
                    value={assignmentGroup}
                    onChange={(e) => setAssignmentGroup(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-gold/50 outline-none"
                  >
                    <option value="homework">Homework</option>
                    <option value="exam">Exams</option>
                    <option value="quiz">Quizzes</option>
                    <option value="project">Project</option>
                    <option value="presentation">Presentation</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Availability Section */}
            <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-gold">event_available</span>
                Availability
              </h3>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Assign To</label>
                  <div className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2 flex flex-wrap gap-2">
                    <span className="bg-gold/10 text-gold text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wide">All Students</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Due Date</label>
                  <input 
                    type="datetime-local" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-gold/50 outline-none" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">From</label>
                    <input 
                      type="date" 
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[10px] text-slate-900 dark:text-white focus:ring-2 focus:ring-gold/50 outline-none" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Until</label>
                    <input 
                      type="date" 
                      value={untilDate}
                      onChange={(e) => setUntilDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[10px] text-slate-900 dark:text-white focus:ring-2 focus:ring-gold/50 outline-none" 
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Publish Card */}
            <div className="p-4 bg-navy-light dark:bg-navy text-white rounded-xl shadow-lg shadow-navy-light/20 dark:shadow-navy/20 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">Ready to Publish?</p>
                <span className="material-symbols-outlined text-gold">info</span>
              </div>
              <p className="text-sm font-medium">Publishing will instantly notify all assigned students and add this to their calendars.</p>
              <button 
                onClick={handlePublish}
                disabled={isLoading}
                className="w-full py-2 bg-gold text-navy font-black rounded-lg text-sm hover:bg-yellow-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Publishing..." : "Publish & Notify"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
