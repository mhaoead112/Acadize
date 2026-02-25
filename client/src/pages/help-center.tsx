import { useTranslation } from "react-i18next";
import { Search, Book, MessageCircle, Video, FileText, HelpCircle, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import SearchBar from "@/components/SearchBar";

interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  steps?: string[];
  tips?: string[];
}

export default function HelpCenter() {
  const { t } = useTranslation('landing');
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  const categories = [
    {
      id: "getting-started",
      icon: Book,
      title: "Getting Started",
      description: "Learn the basics and set up your account",
      articles: 6
    },
    {
      id: "account",
      icon: FileText,
      title: "Account & Settings",
      description: "Manage your account and preferences",
      articles: 4
    },
    {
      id: "courses",
      icon: Video,
      title: "Course Management",
      description: "Create, edit, and manage your courses",
      articles: 5
    },
    {
      id: "troubleshooting",
      icon: HelpCircle,
      title: "Troubleshooting",
      description: "Common issues and how to resolve them",
      articles: 5
    }
  ];

  const articles: Article[] = [
    {
      id: "create-course",
      title: "How to create your first course",
      category: "getting-started",
      content: "Creating your first course on Acadize is simple and straightforward. Follow these steps to get started.",
      steps: [
        "Log in to your teacher account",
        "Click 'Create New Course' from your dashboard",
        "Enter the course title and description",
        "Select grade level and subject",
        "Upload a course thumbnail (optional)",
        "Click 'Create Course' to save as draft",
        "Add lessons and assignments",
        "Click 'Publish' when ready for students"
      ],
      tips: [
        "Start with a clear, descriptive course title",
        "Write a detailed description to help students understand what they'll learn",
        "You can save as draft and publish later"
      ]
    },
    {
      id: "add-students",
      title: "Adding students to your course",
      category: "getting-started",
      content: "Students can enroll in your published courses. Here's how the enrollment process works.",
      steps: [
        "Publish your course first",
        "Students can browse and find your course",
        "Students click 'Enroll' to join",
        "View enrolled students in the 'Students' tab",
        "Monitor student progress and grades"
      ],
      tips: [
        "Courses must be published for students to enroll",
        "You can see all enrolled students from your course dashboard",
        "Students will receive notifications about new assignments"
      ]
    },
    {
      id: "grading",
      title: "Setting up grading and assessments",
      category: "getting-started",
      content: "Create assignments and grade student submissions effectively.",
      steps: [
        "Go to your course and click 'Assignments'",
        "Click 'Create Assignment'",
        "Set title, description, and due date",
        "Assign point value (e.g., 100 points)",
        "Choose submission type (text or file upload)",
        "Publish the assignment",
        "View submissions and add grades with feedback"
      ],
      tips: [
        "Provide clear grading rubrics",
        "Give students enough time to complete work",
        "Include constructive feedback with grades"
      ]
    },
    {
      id: "reset-password",
      title: "How to reset your password",
      category: "account",
      content: "If you've forgotten your password, you can easily reset it.",
      steps: [
        "Go to the login page",
        "Click 'Forgot Password?'",
        "Enter your email address",
        "Check your email for reset link",
        "Click the link and enter new password",
        "Confirm your new password",
        "Log in with your new password"
      ],
      tips: [
        "Use a strong password with letters, numbers, and symbols",
        "Keep your password secure and don't share it",
        "The reset link expires after 1 hour"
      ]
    },
    {
      id: "update-profile",
      title: "Updating your profile information",
      category: "account",
      content: "Keep your profile information up to date.",
      steps: [
        "Click on your profile icon in the top right",
        "Select 'Profile Settings'",
        "Update your name, email, or photo",
        "Change your password if needed",
        "Click 'Save Changes'"
      ],
      tips: [
        "Use a professional profile photo",
        "Keep your email updated for important notifications"
      ]
    },
    {
      id: "upload-lessons",
      title: "Uploading course lessons and materials",
      category: "courses",
      content: "Add engaging content to your courses with lesson uploads.",
      steps: [
        "Open your course and go to 'Lessons'",
        "Click 'Add New Lesson'",
        "Enter lesson title and description",
        "Upload files (PDF, PowerPoint, videos)",
        "Arrange lessons in order",
        "Save and preview"
      ],
      tips: [
        "Supported formats: PDF, PPT, DOCX, MP4, MOV",
        "Maximum file size: 50MB",
        "Break complex topics into multiple lessons",
        "You can reorder lessons by drag and drop"
      ]
    },
    {
      id: "analytics",
      title: "Understanding analytics and reports",
      category: "courses",
      content: "Track student performance and course effectiveness.",
      steps: [
        "Go to your course dashboard",
        "Click 'Analytics' tab",
        "View enrollment trends",
        "Check completion rates",
        "See average grades",
        "Identify struggling students",
        "Export reports as needed"
      ],
      tips: [
        "Use analytics to improve your course content",
        "Reach out to students who are falling behind",
        "Track assignment completion patterns"
      ]
    },
    {
      id: "video-issues",
      title: "Troubleshooting video playback issues",
      category: "troubleshooting",
      content: "Having trouble with videos? Here's how to fix common issues.",
      steps: [
        "Check your internet connection",
        "Refresh the page",
        "Clear browser cache and cookies",
        "Try a different browser",
        "Ensure video format is supported (MP4, MOV)",
        "Check if file size is under 50MB",
        "Contact support if issues persist"
      ],
      tips: [
        "Use Chrome or Firefox for best compatibility",
        "Close other tabs to free up bandwidth",
        "Download the video for offline viewing if available"
      ]
    },
    {
      id: "login-issues",
      title: "Can't log in to your account",
      category: "troubleshooting",
      content: "Resolve login problems quickly.",
      steps: [
        "Verify your username and password are correct",
        "Check if Caps Lock is on",
        "Clear browser cookies and cache",
        "Try using 'Forgot Password' to reset",
        "Try a different browser",
        "Check if your account is active",
        "Contact support if you're still locked out"
      ],
      tips: [
        "Make sure you're using the correct email address",
        "Password is case-sensitive",
        "Allow cookies in your browser settings"
      ]
    },
    {
      id: "file-upload",
      title: "File upload problems",
      category: "troubleshooting",
      content: "Fix issues when uploading files.",
      steps: [
        "Check file size (must be under 50MB)",
        "Verify file format is supported",
        "Compress large PDFs if needed",
        "Ensure stable internet connection",
        "Try uploading from different browser",
        "Clear browser cache",
        "Contact support if problem continues"
      ],
      tips: [
        "Supported formats: PDF, DOC, PPT, MP4, MOV, JPG, PNG",
        "Use online tools to compress large files",
        "Upload one file at a time for large files"
      ]
    }
  ];

  const faqs = [
    {
      question: "How do I enroll in a course?",
      answer: "Browse available courses from your student dashboard, click on a course to view details, and click the 'Enroll' button. Once enrolled, you'll have instant access to all course materials."
    },
    {
      question: "Can I access Acadize on my mobile device?",
      answer: "Yes! Acadize is fully responsive and works on all devices. Simply visit the website from your mobile browser. We're also working on dedicated mobile apps for iOS and Android."
    },
    {
      question: "How do I submit an assignment?",
      answer: "Go to your course, click on 'Assignments', select the assignment, and either type your answer or upload a file. Click 'Submit' before the due date. You'll receive a confirmation when submitted successfully."
    },
    {
      question: "What file types can I upload?",
      answer: "We support PDF, Word documents (DOC/DOCX), PowerPoint (PPT/PPTX), images (JPG/PNG), and videos (MP4/MOV). Maximum file size is 50MB per file."
    },
    {
      question: "How do I contact my teacher?",
      answer: "You can message your teacher through the course page. Click on the teacher's name and select 'Send Message'. For parents, use the Messages section in your dashboard to communicate with teachers."
    },
    {
      question: "Can I download course materials?",
      answer: "Yes! Most course materials like PDFs and documents can be downloaded for offline viewing. Click the download icon next to the file you want to save."
    },
    {
      question: "How do I check my grades?",
      answer: "Your grades are visible on your student dashboard. You can also view grades for individual assignments within each course. Teachers may also provide feedback along with your grade."
    },
    {
      question: "What should I do if I miss a deadline?",
      answer: "Contact your teacher as soon as possible. Some teachers may accept late submissions with a penalty, while others may not. It's best to communicate early about any issues that might affect your ability to submit on time."
    }
  ];

  const categoryArticles = selectedCategory 
    ? articles.filter(a => a.category === selectedCategory)
    : [];

  const popularArticles = articles.filter(a => 
    ["create-course", "add-students", "grading", "video-issues", "analytics", "upload-lessons"].includes(a.id)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased overflow-x-hidden">

      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"></div>
        <div className="relative mx-auto max-w-7xl text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            {t('helpCenterTitle')}
          </h1>
          <p className="text-lg sm:text-xl text-text-muted max-w-3xl mx-auto mb-8">
            Search our knowledge base or browse categories to find answers
          </p>
          
          <div className="max-w-3xl mx-auto">
            <SearchBar />
          </div>
        </div>
      </section>

      {!selectedCategory && !selectedArticle && (
        <>
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <div
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className="group rounded-2xl border border-secondary-dark bg-slate-800 p-6 hover:border-primary hover:shadow-2xl hover:shadow-primary/20 transition-all cursor-pointer"
                    >
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                            {category.title}
                          </h3>
                          <p className="text-sm text-text-muted mb-3">{category.description}</p>
                          <div className="text-xs text-text-muted">
                            {category.articles} articles
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Popular Articles */}
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
            <div className="mx-auto max-w-7xl">
              <h2 className="text-2xl font-bold mb-6">Popular Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                {popularArticles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => setSelectedArticle(article.id)}
                    className="group flex items-center gap-4 rounded-xl border border-secondary-dark bg-slate-800 p-5 hover:border-primary transition-all cursor-pointer"
                  >
                    <Book className="h-5 w-5 text-primary shrink-0" />
                    <span className="flex-1 font-medium group-hover:text-primary transition-colors">
                      {article.title}
                    </span>
                    <span className="text-text-muted group-hover:text-primary transition-colors">
                      →
                    </span>
                  </div>
                ))}
              </div>

              {/* FAQ Section */}
              <div className="mt-16">
                <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-secondary-dark bg-slate-800 overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                      >
                        <span className="font-medium pr-4">{faq.question}</span>
                        {expandedFaq === index ? (
                          <ChevronUp className="h-5 w-5 text-primary shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-text-muted shrink-0" />
                        )}
                      </button>
                      {expandedFaq === index && (
                        <div className="px-5 pb-5 text-text-muted border-t border-secondary-dark pt-4">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {selectedCategory && !selectedArticle && (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <button
              onClick={() => setSelectedCategory(null)}
              className="mb-6 text-primary hover:text-primary-hover transition-colors flex items-center gap-2"
            >
              ← Back to categories
            </button>
            <h2 className="text-3xl font-bold mb-8">
              {categories.find(c => c.id === selectedCategory)?.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryArticles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article.id)}
                  className="group flex items-center gap-4 rounded-xl border border-secondary-dark bg-slate-800 p-5 hover:border-primary transition-all cursor-pointer"
                >
                  <Book className="h-5 w-5 text-primary shrink-0" />
                  <span className="flex-1 font-medium group-hover:text-primary transition-colors">
                    {article.title}
                  </span>
                  <span className="text-text-muted group-hover:text-primary transition-colors">
                    →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {selectedArticle && (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <button
              onClick={() => {
                setSelectedArticle(null);
                if (!selectedCategory) {
                  setSelectedCategory(null);
                }
              }}
              className="mb-6 text-primary hover:text-primary-hover transition-colors flex items-center gap-2"
            >
              ← Back to {selectedCategory ? 'articles' : 'help center'}
            </button>
            {(() => {
              const article = articles.find(a => a.id === selectedArticle);
              if (!article) return null;
              
              return (
                <div className="rounded-2xl border border-secondary-dark bg-slate-800 p-8">
                  <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
                  <p className="text-text-muted mb-8">{article.content}</p>
                  
                  {article.steps && article.steps.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Step-by-Step Guide
                      </h3>
                      <ol className="space-y-3">
                        {article.steps.map((step, index) => (
                          <li key={index} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            <span className="text-text-muted pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  
                  {article.tips && article.tips.length > 0 && (
                    <div className="bg-slate-950/50 p-6 rounded-lg border border-primary/20">
                      <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Helpful Tips
                      </h3>
                      <ul className="space-y-2">
                        {article.tips.map((tip, index) => (
                          <li key={index} className="flex gap-2 text-text-muted">
                            <span className="text-primary">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {!selectedCategory && !selectedArticle && (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-xl border border-secondary-dark bg-slate-800 p-6">
                  <h3 className="text-lg font-bold mb-2">Still need help?</h3>
                  <p className="text-sm text-text-muted mb-4">
                    Can't find what you're looking for? Our support team is ready to assist you.
                  </p>
                  <Link href="/contact">
                    <button className="w-full px-4 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30">
                      Contact Support
                    </button>
                  </Link>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-secondary-dark bg-slate-800 p-6">
                  <h3 className="text-lg font-bold mb-2">Video Tutorials</h3>
                  <p className="text-sm text-text-muted mb-4">
                    Watch step-by-step guides to master Acadize
                  </p>
                  <Link href="/docs">
                    <button className="w-full px-4 py-3 rounded-lg border border-secondary-dark text-white font-bold transition-all hover:bg-white/5">
                      View Documentation
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}


      {/* Contact Options - Only show on main page */}
      {!selectedCategory && !selectedArticle && (
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Additional Support Options</h2>
              <p className="text-text-muted">Choose the best way to get help</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-secondary-dark bg-slate-800 p-8 text-center hover:border-primary transition-all">
                <div className="flex justify-center mb-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FileText className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Submit a Ticket</h3>
                <p className="text-sm text-text-muted mb-4">
                  Create a support ticket for detailed issues
                </p>
                <p className="text-xs text-text-muted mb-4">
                  Response within 24 hours
                </p>
                <Link href="/contact">
                  <button className="px-6 py-2 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30">
                    Submit Ticket
                  </button>
                </Link>
              </div>

              <div className="rounded-2xl border border-secondary-dark bg-slate-800 p-8 text-center hover:border-primary transition-all">
                <div className="flex justify-center mb-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Book className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Documentation</h3>
                <p className="text-sm text-text-muted mb-4">
                  Comprehensive guides and tutorials
                </p>
                <p className="text-xs text-text-muted mb-4">
                  Always available
                </p>
                <Link href="/docs">
                  <button className="px-6 py-2 rounded-lg border border-secondary-dark text-white font-bold transition-all hover:bg-white/5">
                    View Docs
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
