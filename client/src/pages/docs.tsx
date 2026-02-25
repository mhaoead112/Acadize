import { Book, Search, ChevronRight, FileText, Zap, GraduationCap, Users, BarChart, Bell, Calendar, MessageSquare, Upload, Download, Settings, CheckCircle, PlayCircle, Star } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import SearchBar from "@/components/SearchBar";

interface DocSection {
  id: string;
  title: string;
  content: string;
  subSections?: {
    title: string;
    content: string;
    steps?: string[];
    tips?: string[];
  }[];
}

export default function Docs() {
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<string>("getting-started");
  
  const quickStart = [
    {
      title: "For Students",
      description: "Learn how to access courses and submit assignments",
      icon: GraduationCap,
      link: "#student-guide"
    },
    {
      title: "For Teachers",
      description: "Create courses, manage lessons, and grade assignments",
      icon: Users,
      link: "#teacher-guide"
    },
    {
      title: "For Parents",
      description: "Monitor your child's progress and communicate with teachers",
      icon: Bell,
      link: "#parent-guide"
    }
  ];

  const documentationSections: DocSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      content: "Welcome to Acadize LMS! This guide will help you get started with the platform.",
      subSections: [
        {
          title: "Platform Overview",
          content: "Acadize is a modern Learning Management System that brings students, teachers, and parents together in one platform. Access your courses, submit assignments, track progress, and collaborate with classmates - all in one place."
        },
        {
          title: "Creating Your Account",
          content: "Getting started is easy! Follow these simple steps to create your account:",
          steps: [
            "Visit the registration page and select your role (Student or Teacher)",
            "Enter your full name, email address, and create a username",
            "Choose a strong password (at least 6 characters)",
            "Click 'Register' to create your account",
            "Check your email for verification (if required)"
          ],
          tips: [
            "Use your school email address for easy verification",
            "Choose a username you'll remember",
            "Keep your password secure and don't share it with anyone"
          ]
        },
        {
          title: "Logging In",
          content: "Once your account is created, you can log in anytime:",
          steps: [
            "Go to the login page",
            "Enter your username or email",
            "Enter your password",
            "Click 'Log In' to access your dashboard"
          ],
          tips: [
            "Bookmark the login page for quick access",
            "If you forget your password, use the 'Forgot Password' link",
            "Your dashboard will show different features based on your role"
          ]
        }
      ]
    },
    {
      id: "student-guide",
      title: "Student Guide",
      content: "Everything you need to know as a student to make the most of Acadize.",
      subSections: [
        {
          title: "Your Student Dashboard",
          content: "Your dashboard is your home base. Here's what you'll find:",
          steps: [
            "Overview of all your enrolled courses",
            "Upcoming assignments and due dates",
            "Recent grades and feedback",
            "Learning streak tracker",
            "Quick access to AI Study Buddy"
          ]
        },
        {
          title: "Accessing Courses",
          content: "View and enroll in courses easily:",
          steps: [
            "Browse available courses from your dashboard",
            "Click on a course to view details and lessons",
            "Click 'Enroll' to join a course",
            "Access course materials, videos, and PDFs anytime"
          ],
          tips: [
            "Enrolled courses appear in your 'My Courses' section",
            "You can see course progress and completion status",
            "Download lesson materials for offline study"
          ]
        },
        {
          title: "Submitting Assignments",
          content: "Never miss a deadline with our assignment system:",
          steps: [
            "Go to your course and click on 'Assignments'",
            "Select the assignment you want to complete",
            "Read the instructions carefully",
            "Type your answer or upload a file (PDF, DOC, etc.)",
            "Click 'Submit' before the due date",
            "Check back later for grades and teacher feedback"
          ],
          tips: [
            "Submit assignments early to avoid last-minute issues",
            "You can save drafts and come back later",
            "After submission, you can view your submission status",
            "Late submissions may not be accepted (check with your teacher)"
          ]
        },
        {
          title: "Tracking Your Progress",
          content: "Stay on top of your learning journey:",
          steps: [
            "View your overall progress percentage on the dashboard",
            "Check individual course completion rates",
            "See your grades and average scores",
            "Track your learning streak (consecutive days of activity)"
          ]
        },
        {
          title: "Using AI Study Buddy",
          content: "Get instant help with your studies using our AI assistant:",
          steps: [
            "Click on the 'AI Study Buddy' tab",
            "Type your question (e.g., 'Explain photosynthesis')",
            "Get detailed, easy-to-understand answers",
            "Ask follow-up questions for deeper understanding"
          ],
          tips: [
            "Be specific with your questions for better answers",
            "AI Study Buddy works best for educational questions",
            "Use it to review concepts, prepare for tests, or clarify doubts"
          ]
        },
        {
          title: "Joining Study Groups",
          content: "Collaborate and learn with your classmates:",
          steps: [
            "Go to the 'Study Groups' section",
            "Browse available groups or create your own",
            "Join groups related to your courses",
            "Chat with group members, share files, and ask questions",
            "Participate in polls and scheduled study sessions"
          ]
        }
      ]
    },
    {
      id: "teacher-guide",
      title: "Teacher Guide",
      content: "Comprehensive guide for teachers to create courses, manage students, and track progress.",
      subSections: [
        {
          title: "Your Teacher Dashboard",
          content: "Your command center for managing courses and students:",
          steps: [
            "View all your courses at a glance",
            "See pending assignments to grade",
            "Access student analytics and performance data",
            "Manage announcements and events",
            "Quick course creation tools"
          ]
        },
        {
          title: "Creating a Course",
          content: "Start teaching by creating your first course:",
          steps: [
            "Click 'Create New Course' from your dashboard",
            "Enter course title (e.g., 'Introduction to Biology')",
            "Add a detailed description of what students will learn",
            "Select grade level and subject",
            "Upload a course thumbnail (optional)",
            "Click 'Create Course' to save as draft"
          ],
          tips: [
            "Start with a draft - you can edit everything later",
            "Write clear, engaging course descriptions",
            "Add prerequisites if your course requires prior knowledge"
          ]
        },
        {
          title: "Adding Lessons",
          content: "Build your course by adding engaging lessons:",
          steps: [
            "Open your course and go to the 'Lessons' tab",
            "Click 'Add New Lesson'",
            "Enter lesson title and description",
            "Upload lesson materials (PDF, PowerPoint, videos)",
            "Arrange lessons in the order you want students to follow",
            "Save and preview how students will see it"
          ],
          tips: [
            "Supported file types: PDF, PPT, DOCX, MP4, MOV",
            "Break complex topics into multiple smaller lessons",
            "Use descriptive titles so students know what to expect",
            "You can reorder lessons by dragging and dropping"
          ]
        },
        {
          title: "Creating Assignments",
          content: "Test student knowledge with assignments:",
          steps: [
            "Navigate to your course's 'Assignments' section",
            "Click 'Create Assignment'",
            "Write clear instructions for students",
            "Set the due date and time",
            "Assign point value (e.g., 100 points)",
            "Choose if students should upload files or type answers",
            "Link assignment to specific lesson (optional)",
            "Click 'Publish' when ready"
          ],
          tips: [
            "Give students enough time to complete assignments",
            "Provide clear grading criteria",
            "You can create assignments as drafts and publish later",
            "Set reminders for yourself to grade on time"
          ]
        },
        {
          title: "Grading Submissions",
          content: "Review and grade student work efficiently:",
          steps: [
            "Go to 'Assignments' and select an assignment",
            "Click 'View Submissions' to see all student work",
            "Review each submission",
            "Enter the points earned (out of total points)",
            "Add personalized feedback to help students improve",
            "Click 'Submit Grade'",
            "Students receive automatic notification of their grade"
          ],
          tips: [
            "Provide constructive feedback, not just a number",
            "Grade consistently using a rubric",
            "Sort submissions by date to prioritize early submissions",
            "You can update grades if you made a mistake"
          ]
        },
        {
          title: "Managing Students",
          content: "View enrolled students and track their progress:",
          steps: [
            "Open your course and click 'Students' tab",
            "See all enrolled students with their progress",
            "Click on a student to view detailed performance",
            "See assignment completion rates and average grades",
            "Export student data for your records"
          ]
        },
        {
          title: "Publishing Your Course",
          content: "Make your course available to students:",
          steps: [
            "Ensure you have at least one lesson added",
            "Review all course details for accuracy",
            "Click 'Publish Course' button",
            "Students can now find and enroll in your course",
            "You can unpublish anytime to make changes"
          ],
          tips: [
            "Courses must be published for students to enroll",
            "You can still edit published courses",
            "Unpublishing doesn't remove enrolled students"
          ]
        },
        {
          title: "Using Analytics",
          content: "Understand your course performance:",
          steps: [
            "Go to 'Analytics' in your course",
            "View enrollment trends over time",
            "See average completion rates",
            "Identify struggling students who need help",
            "Track assignment submission patterns",
            "Export reports for administrative purposes"
          ]
        }
      ]
    },
    {
      id: "parent-guide",
      title: "Parent Guide",
      content: "Stay informed about your child's academic progress and support their learning journey.",
      subSections: [
        {
          title: "Setting Up Your Parent Account",
          content: "Connect with your child's education:",
          steps: [
            "Register for a parent account using your email",
            "Log in to your parent dashboard",
            "Add your child using their student ID or email",
            "Your child will need to accept the connection request",
            "Once connected, you can view their progress"
          ],
          tips: [
            "You can monitor multiple children from one account",
            "Your child's teacher may need to approve the connection",
            "Respect your child's privacy while staying involved"
          ]
        },
        {
          title: "Viewing Your Child's Progress",
          content: "Keep track of how your child is doing:",
          steps: [
            "Select your child from your dashboard",
            "View their enrolled courses",
            "See overall grade average and progress percentage",
            "Check recent assignment scores",
            "Review teacher feedback and comments",
            "Track attendance and participation"
          ]
        },
        {
          title: "Communicating with Teachers",
          content: "Stay in touch with your child's educators:",
          steps: [
            "Go to the 'Messages' section",
            "Select a teacher to start a conversation",
            "Ask questions about your child's progress",
            "Schedule parent-teacher meetings",
            "Receive important announcements and updates"
          ],
          tips: [
            "Teachers may have specific office hours for messages",
            "Be respectful of teacher's time and response schedules",
            "Keep communication focused on your child's education"
          ]
        },
        {
          title: "Viewing Report Cards",
          content: "Access comprehensive academic reports:",
          steps: [
            "Click on 'Report Cards' from the parent dashboard",
            "Select the academic term/semester",
            "Download the PDF report card",
            "Review grades across all subjects",
            "Read teacher comments and recommendations"
          ]
        },
        {
          title: "Supporting Your Child's Learning",
          content: "Ways to help your child succeed:",
          tips: [
            "Review their dashboard together weekly",
            "Help them set goals and track progress",
            "Encourage them to use the AI Study Buddy for homework help",
            "Celebrate achievements and learning streaks",
            "Provide a quiet study space and consistent schedule",
            "Communicate with teachers if you notice struggles"
          ]
        }
      ]
    },
    {
      id: "features",
      title: "Platform Features",
      content: "Discover all the powerful features available in Acadize LMS.",
      subSections: [
        {
          title: "Real-Time Notifications",
          content: "Never miss important updates:",
          steps: [
            "Enable notifications in your profile settings",
            "Get alerts for new assignments",
            "Receive grade updates instantly",
            "Stay informed about course announcements",
            "Get reminders for upcoming deadlines"
          ]
        },
        {
          title: "Calendar & Events",
          content: "Stay organized with the built-in calendar:",
          steps: [
            "View all your assignments and events in one place",
            "Filter by course or event type",
            "Set personal reminders",
            "Sync with your personal calendar (upcoming feature)"
          ]
        },
        {
          title: "File Management",
          content: "Upload and organize your documents:",
          tips: [
            "Supported formats: PDF, Word, PowerPoint, images, videos",
            "Maximum file size: 50MB per file",
            "Files are securely stored and backed up",
            "Download your submitted work anytime"
          ]
        },
        {
          title: "Mobile Access",
          content: "Learn on the go:",
          tips: [
            "Access Acadize from any device",
            "Responsive design works on phones and tablets",
            "Submit assignments from your mobile device",
            "Receive push notifications on your phone"
          ]
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting & FAQs",
      content: "Solutions to common issues and frequently asked questions.",
      subSections: [
        {
          title: "Login Issues",
          content: "Can't log in? Try these steps:",
          steps: [
            "Double-check your username and password",
            "Use 'Forgot Password' to reset if needed",
            "Clear your browser cache and cookies",
            "Try a different browser",
            "Contact support if issues persist"
          ]
        },
        {
          title: "File Upload Problems",
          content: "Trouble uploading files?",
          steps: [
            "Check file size (must be under 50MB)",
            "Verify file format is supported",
            "Try compressing large PDFs",
            "Ensure stable internet connection",
            "Try uploading from a different browser"
          ]
        },
        {
          title: "Missing Assignments or Grades",
          content: "Don't see your work?",
          steps: [
            "Refresh the page",
            "Check if you selected the correct course",
            "Verify submission was successful (check for confirmation message)",
            "Contact your teacher if the issue continues",
            "Check your email for confirmation receipts"
          ]
        },
        {
          title: "Frequently Asked Questions",
          content: "Quick answers to common questions:",
          tips: [
            "Q: Can I edit a submitted assignment? A: No, but you can contact your teacher to unlock it",
            "Q: How do I drop a course? A: Contact your teacher or administrator",
            "Q: Are my files safe? A: Yes, all data is encrypted and backed up regularly",
            "Q: Can I use Acadize offline? A: You need internet to submit work, but you can download materials for offline viewing",
            "Q: Who can see my grades? A: Only you, your teachers, and your linked parent accounts"
          ]
        }
      ]
    }
  ];

  const currentSection = documentationSections.find(s => s.id === activeSection) || documentationSections[0];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans antialiased overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-secondary-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"></div>
        <div className="relative mx-auto max-w-7xl text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
              Documentation
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-text-muted max-w-3xl mx-auto mb-8">
            Complete guide to using Acadize LMS - from getting started to advanced API integration
          </p>
          
          <div className="max-w-2xl mx-auto">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Quick Start Cards */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold mb-6">Quick Start Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickStart.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    const sectionId = item.link.replace('#', '');
                    setActiveSection(sectionId);
                    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="group rounded-2xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-slate-800 p-6 hover:border-primary hover:shadow-2xl hover:shadow-primary/20 transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-text-muted mb-3">{item.description}</p>
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        Read Guide
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Documentation Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <h2 className="text-xl font-bold mb-4">Browse Topics</h2>
                <nav className="space-y-1">
                  {documentationSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id);
                        document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`block w-full text-left rounded-lg px-4 py-3 text-sm transition-all ${
                        activeSection === section.id
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-slate-600 dark:text-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
                
                <div className="mt-8 rounded-xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-slate-800 p-6">
                  <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
                  <p className="text-sm text-slate-600 dark:text-text-muted mb-4">
                    Can't find what you're looking for? Our support team is here to help.
                  </p>
                  <button 
                    onClick={() => setLocation('/help-center')}
                    className="w-full px-4 py-2 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover"
                  >
                    Visit Help Center
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <div className="space-y-16">
                {documentationSections.map((section) => (
                  <div
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-24"
                  >
                    <div className="mb-6">
                      <h2 className="text-3xl font-bold mb-4">{section.title}</h2>
                      <p className="text-lg text-text-muted leading-relaxed">{section.content}</p>
                    </div>

                    {section.subSections && (
                      <div className="space-y-8">
                        {section.subSections.map((subSection, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-slate-800 p-6">
                            <h3 className="text-xl font-bold mb-3 text-primary flex items-center gap-2">
                              <PlayCircle className="w-5 h-5" />
                              {subSection.title}
                            </h3>
                            <p className="text-slate-600 dark:text-text-muted mb-4 whitespace-pre-line leading-relaxed">{subSection.content}</p>
                            
                            {subSection.steps && subSection.steps.length > 0 && (
                              <div className="mb-4">
                                <h4 className="text-primary font-medium mb-2 flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4" />
                                  Steps:
                                </h4>
                                <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-text-muted ml-4">
                                  {subSection.steps.map((step, stepIndex) => (
                                    <li key={stepIndex}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            
                            {subSection.tips && subSection.tips.length > 0 && (
                              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded border border-slate-200 dark:border-primary/20">
                                <h4 className="text-primary font-medium mb-2 flex items-center gap-2">
                                  <Star className="w-4 h-4" />
                                  Tips:
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-text-muted ml-4">
                                  {subSection.tips.map((tip, tipIndex) => (
                                    <li key={tipIndex}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Need Help CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800/30">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-slate-800 p-8 lg:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Need Help?</h2>
              <p className="text-slate-600 dark:text-text-muted text-lg">
                Can't find what you're looking for? We're here to help!
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setLocation('/contact')}
                className="px-6 py-4 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-5 w-5" />
                Contact Support
              </button>
              <button 
                onClick={() => setLocation('/dashboard')}
                className="px-6 py-4 rounded-lg border border-slate-200 dark:border-secondary-dark text-slate-900 dark:text-white font-bold transition-all hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center gap-2"
              >
                <PlayCircle className="h-5 w-5" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
