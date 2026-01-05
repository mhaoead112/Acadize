import { useRoute, Link } from "wouter";
import { blogPosts } from "@/content/blog/posts";
import { Calendar, User, Clock, ArrowLeft, Tag } from "lucide-react";
import { useEffect } from "react";

export default function BlogPostDetail() {
  const [, params] = useRoute("/blog/:slug");
  const post = blogPosts.find(p => p.slug === params?.slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params?.slug]);

  if (!post) {
    return (
      <div className="min-h-screen bg-white dark:bg-background-dark text-slate-900 dark:text-white font-sans antialiased flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
          <Link href="/blog">
            <button className="px-6 py-3 rounded-lg bg-primary text-background-dark font-bold hover:bg-primary-hover transition-all">
              Back to Blog
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const relatedPosts = blogPosts
    .filter(p => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-white dark:bg-background-dark text-slate-900 dark:text-white font-sans antialiased">

      <article className="relative">
        <div className="relative h-[400px] bg-cover bg-center" style={{ backgroundImage: `url(${post.image})` }}>
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/40 to-white dark:from-background-dark/50 dark:via-background-dark/70 dark:to-background-dark"></div>
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-12">
            <Link href="/blog">
              <button className="flex items-center gap-2 text-primary hover:text-primary-hover transition-colors mb-6">
                <ArrowLeft className="h-4 w-4" />
                Back to Blog
              </button>
            </Link>
            
            <div className="flex items-center gap-4 mb-4 text-sm text-slate-600 dark:text-text-muted">
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary font-medium">
                {post.category}
              </span>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readTime}
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 animate-fade-in-up">
              {post.title}
            </h1>
            
            <div className="flex items-center gap-3">
              {post.author.avatar && (
                <img 
                  src={post.author.avatar} 
                  alt={post.author.name}
                  className="h-12 w-12 rounded-full border-2 border-primary"
                />
              )}
              <div>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                  <User className="h-4 w-4" />
                  {post.author.name}
                </div>
                {post.author.bio && (
                  <p className="text-sm text-slate-600 dark:text-text-muted">{post.author.bio}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="prose prose-lg max-w-none animate-fade-in-up dark:prose-invert">
            <div 
              className="blog-content"
              dangerouslySetInnerHTML={{ 
                __html: post.content
                  .split('\n')
                  .map(line => {
                    if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
                    if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
                    if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return `<p><strong>${line.substring(2, line.length - 2)}</strong></p>`;
                    }
                    if (line.startsWith('- ')) return `<li>${line.substring(2)}</li>`;
                    if (line.startsWith('1. ')) return `<li>${line.substring(3)}</li>`;
                    if (line.trim() === '') return '<br/>';
                    return `<p>${line}</p>`;
                  })
                  .join('')
              }} 
            />
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-secondary-dark">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Tags:</span>
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-secondary-dark text-sm text-slate-600 dark:text-text-muted hover:border-primary hover:text-primary transition-all cursor-pointer"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Author Bio */}
          <div className="mt-12 p-6 rounded-2xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-surface-dark">
            <h3 className="text-xl font-bold mb-4">About the Author</h3>
            <div className="flex items-start gap-4">
              {post.author.avatar && (
                <img 
                  src={post.author.avatar} 
                  alt={post.author.name}
                  className="h-16 w-16 rounded-full border-2 border-primary"
                />
              )}
              <div>
                <h4 className="text-lg font-bold">{post.author.name}</h4>
                {post.author.bio && (
                  <p className="text-slate-600 dark:text-text-muted mt-2">{post.author.bio}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-surface-dark/30 border-t border-slate-200 dark:border-secondary-dark">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-3xl font-bold mb-8">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost, index) => (
                <Link key={index} href={`/blog/${relatedPost.slug}`}>
                  <div className="group rounded-2xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-surface-dark overflow-hidden hover:border-primary hover:shadow-2xl hover:shadow-primary/20 transition-all cursor-pointer hover-lift">
                    <div 
                      className="h-48 bg-cover bg-center"
                      style={{ backgroundImage: `url(${relatedPost.image})` }}
                    ></div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3 text-sm text-text-muted">
                        <span className="text-primary font-medium">{relatedPost.category}</span>
                        <span>•</span>
                        <span>{relatedPost.readTime}</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {relatedPost.title}
                      </h3>
                      <p className="text-slate-600 dark:text-text-muted text-sm line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
