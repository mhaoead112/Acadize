import { useState, useEffect, useRef } from "react";
import { Search, FileText, Book, HelpCircle, X } from "lucide-react";
import { Link } from "wouter";

interface SearchResult {
  title: string;
  description: string;
  url: string;
  type: 'doc' | 'help' | 'blog';
}

// Static content to search through
const searchableContent: SearchResult[] = [
  // Documentation
  { title: "Getting Started Guide", description: "Learn how to set up your EduVerse account and configure basic settings", url: "/docs#getting-started", type: "doc" },
  { title: "Course Creation", description: "Step-by-step guide to creating and managing courses", url: "/docs#course-creation", type: "doc" },
  { title: "Student Management", description: "How to add, manage, and track student progress", url: "/docs#student-management", type: "doc" },
  { title: "Assignments & Grading", description: "Create assignments, quizzes, and grade submissions", url: "/docs#assignments", type: "doc" },
  { title: "Analytics Dashboard", description: "Understanding your analytics and generating reports", url: "/docs#analytics", type: "doc" },
  { title: "API Integration", description: "Integrate EduVerse with your existing systems using our API", url: "/docs#api", type: "doc" },
  
  // Help Center
  { title: "How to reset password", description: "Step-by-step instructions for resetting your password", url: "/help-center#reset-password", type: "help" },
  { title: "Troubleshooting login issues", description: "Common login problems and their solutions", url: "/help-center#login-issues", type: "help" },
  { title: "Managing notifications", description: "Configure email and in-app notification preferences", url: "/help-center#notifications", type: "help" },
  { title: "Uploading course materials", description: "How to upload videos, PDFs, and other content", url: "/help-center#uploads", type: "help" },
  { title: "Mobile app setup", description: "Download and configure the EduVerse mobile app", url: "/help-center#mobile", type: "help" },
  
  // Blog posts
  { title: "AI-Powered Learning: The Future of Education", description: "Explore how artificial intelligence is transforming education", url: "/blog/ai-powered-learning", type: "blog" },
  { title: "10 Tips for Effective Online Teaching", description: "Best practices for engaging students in virtual classrooms", url: "/blog/online-teaching-tips", type: "blog" },
  { title: "Student Engagement Strategies", description: "Proven methods to increase student participation", url: "/blog/student-engagement", type: "blog" },
];

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchQuery = query.toLowerCase();
    const filtered = searchableContent.filter(item => 
      item.title.toLowerCase().includes(searchQuery) ||
      item.description.toLowerCase().includes(searchQuery)
    );

    setResults(filtered.slice(0, 8));
    setIsOpen(filtered.length > 0);
  }, [query]);

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'doc': return <Book className="h-4 w-4" />;
      case 'help': return <HelpCircle className="h-4 w-4" />;
      case 'blog': return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'doc': return 'Documentation';
      case 'help': return 'Help';
      case 'blog': return 'Blog';
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder="Search documentation, help articles, and blog posts..."
          className="w-full pl-10 pr-10 py-3 rounded-lg border border-secondary-dark bg-surface-dark text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-surface-dark border border-secondary-dark rounded-lg shadow-2xl shadow-black/50 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-text-muted font-semibold px-3 py-2">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
            {results.map((result, index) => (
              <Link key={index} href={result.url}>
                <a
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="block px-3 py-3 rounded-lg hover:bg-background-dark transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-primary group-hover:scale-110 transition-transform">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-white group-hover:text-primary transition-colors">
                          {result.title}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {getTypeLabel(result.type)}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted line-clamp-2">
                        {result.description}
                      </p>
                    </div>
                  </div>
                </a>
              </Link>
            ))}
          </div>
          <div className="border-t border-secondary-dark px-4 py-2 bg-background-dark/50">
            <p className="text-xs text-text-muted">
              Press <kbd className="px-1.5 py-0.5 text-xs border border-secondary-dark rounded bg-surface-dark">Enter</kbd> to navigate
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
