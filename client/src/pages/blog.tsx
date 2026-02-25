import { useTranslation } from "react-i18next";
import { Calendar, User, Tag, TrendingUp, Clock } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { blogPosts, blogCategories } from "@/content/blog/posts";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Blog() {
  const { t } = useTranslation('landing');
  const [selectedCategory, setSelectedCategory] = useState("All Posts");
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6;

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const containerVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { staggerChildren: 0.12 } } };
  const itemVariants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "All Posts") return blogPosts;
    return blogPosts.filter(post => post.category === selectedCategory);
  }, [selectedCategory]);

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const currentPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage);
  
  const featuredPost = blogPosts[0];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans antialiased overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-secondary-dark">
        <div className="mx-auto max-w-7xl">
          <motion.div className="text-center mb-8" style={{ y: heroY }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              EduVerse{" "}
              <span className="bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
                {t('blogTitle')}
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-text-muted max-w-2xl mx-auto">
              Insights, updates, and best practices for modern online education
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href={`/blog/${featuredPost.slug}`}>
            <motion.div className="rounded-2xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-slate-800 overflow-hidden hover:border-primary transition-all group cursor-pointer" whileHover={{ y: -6, rotateX: 2, rotateY: -2 }} transition={{ type: "spring", stiffness: 350, damping: 22 }} style={{ perspective: 1000, transformStyle: 'preserve-3d' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div
                  className="h-64 lg:h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url(${featuredPost.image})` }}
                ></div>
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4 w-fit">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Featured
                  </span>
                  <h2 className="text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-slate-600 dark:text-text-muted mb-6">{featuredPost.excerpt}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted mb-6">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{featuredPost.author.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(featuredPost.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{featuredPost.readTime}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                    Read Full Article
                    <span className="text-lg">→</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>
        </div>
      </section>

      {/* Filter Categories */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 border-y border-slate-200 dark:border-secondary-dark bg-slate-50 dark:bg-slate-800/30">
        <div className="mx-auto max-w-7xl">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {blogCategories.map((category, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  setSelectedCategory(category);
                  setCurrentPage(1);
                }}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-primary text-background-dark"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-secondary-dark text-slate-600 dark:text-text-muted hover:bg-slate-100 dark:hover:bg-white/5 hover:border-primary"
                }`}
                whileHover={{ y: -2 }} whileTap={{ y: 0 }}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 text-slate-600 dark:text-text-muted">
            Showing {startIndex + 1}-{Math.min(startIndex + postsPerPage, filteredPosts.length)} of {filteredPosts.length} articles
          </div>
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" variants={containerVariants} initial="hidden" animate="show">
            {currentPosts.map((post, index) => (
              <Link key={index} href={`/blog/${post.slug}`}>
                <motion.article className="group rounded-2xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-slate-800 overflow-hidden hover:border-primary hover:shadow-2xl hover:shadow-primary/20 transition-all cursor-pointer" variants={itemVariants} whileHover={{ y: -4, rotateX: 2, rotateY: -2 }} transition={{ type: "spring", stiffness: 350, damping: 22 }} style={{ perspective: 1000, transformStyle: 'preserve-3d' }}>
                  <div
                    className="h-48 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url(${post.image})` }}
                  ></div>
                  <div className="p-6">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
                      <Tag className="h-3 w-3 mr-1" />
                      {post.category}
                    </span>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-slate-600 dark:text-text-muted text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-text-muted border-t border-secondary-dark pt-4">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{post.author.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                  </div>
                </motion.article>
              </Link>
            ))}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-secondary-dark text-slate-900 dark:text-white font-medium transition-all hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentPage === page
                      ? "bg-primary text-background-dark"
                      : "border border-slate-200 dark:border-secondary-dark text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-secondary-dark text-slate-900 dark:text-white font-medium transition-all hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800/30">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Stay Updated
          </h2>
          <p className="text-lg text-slate-600 dark:text-text-muted mb-8">
            Get the latest articles and updates delivered to your inbox
          </p>
          <motion.div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-secondary-dark text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <button className="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30 whitespace-nowrap">
              Subscribe
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
