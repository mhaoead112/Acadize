import React, { useRef } from 'react';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CalendarDays, Sparkles, BookOpen, Users, BarChart3, GraduationCap } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
/* ─────────────────────────────────────────────────────────────
   Incident.io Style Abstract Glow
───────────────────────────────────────────────────────────────*/
function AbstractGlow() {
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Primary yellow/gold glow */}
      <div 
        className="absolute top-1/4 w-[800px] h-[600px] rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-40 dark:opacity-20 translate-x-1/4"
        style={{ background: 'var(--color-primary, #F2D00D)' }}
      />
      {/* Secondary accent glow */}
      <div 
        className="absolute top-1/3 w-[600px] h-[500px] rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-30 dark:opacity-10 -translate-x-1/4"
        style={{ background: '#3b82f6' }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Animated Stacked Screenshots (Mobile, Tablet, Desktop)
───────────────────────────────────────────────────────────────*/
function StackedScreenshots({ scrollYProgress }: { scrollYProgress: any }) {
  // Parallax unstacking values
  // Mobile (Left) moves further left as we scroll
  const mobileX = useTransform(scrollYProgress, [0, 1], [20, -40]);
  
  // Tablet (Middle) stays mostly central
  const tabletX = useTransform(scrollYProgress, [0, 1], [0, 0]);

  // Desktop (Right) moves further right as we scroll
  const desktopX = useTransform(scrollYProgress, [0, 1], [-20, 60]);

  return (
    <div className="relative w-full max-w-[1200px] h-[350px] sm:h-[450px] md:h-[550px] mx-auto overflow-hidden sm:overflow-visible mt-6 sm:mt-12 perspective-[1200px]">
      
      {/* 
        INSTRUCTION: Screenshot Placements
        To use your actual screenshots, place your image files in:
        `client/public/assets/images/`
        Then update the `src` attributes below to point to those files.
      */}

      {/* Mobile Layer (Left - Animates in 1st) */}
      <motion.div 
        className="absolute left-[2%] sm:left-[15%] bottom-0 z-30 h-[85%] aspect-[9/19]"
        style={{ x: mobileX }}
      >
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
          className="w-full h-full rounded-[1.5rem] sm:rounded-[2rem] border-[6px] sm:border-[10px] border-slate-900 dark:border-black bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          {/* Mobile Notch */}
          <div className="absolute top-0 inset-x-0 h-4 sm:h-5 flex justify-center z-10">
              <div className="w-1/2 h-3 sm:h-4 bg-slate-900 dark:bg-black rounded-b-lg sm:rounded-b-2xl" />
          </div>
          <img 
            src="/assets/images/mobile-mockup.png" 
            onError={(e) => { e.currentTarget.src = "https://placehold.co/400x800/1e293b/FFFFFF/png?text=Mobile" }}
            alt="Mobile app preview" 
            className="w-full h-full object-cover"
          />
        </motion.div>
      </motion.div>

      {/* Tablet Layer (Middle - Animates in 2nd) */}
      <motion.div 
        className="absolute left-[35%] sm:left-[40%] bottom-0 z-20 h-[92%] aspect-[4/3]"
        style={{ x: tabletX }}
      >
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6, ease: 'easeOut' }}
          className="w-full h-full rounded-[1rem] sm:rounded-[1.5rem] border-[6px] sm:border-[10px] border-slate-900 dark:border-black bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden"
        >
          {/* Tablet Camera Hole (Landscape) */}
          <div className="absolute top-0 bottom-0 left-2 my-auto w-2 h-2 rounded-full bg-black/50 z-10 hidden sm:block" />
          
          <img 
            src="/assets/images/tablet-mockup.png" 
            onError={(e) => { e.currentTarget.src = "https://placehold.co/800x600/f8fafc/0f172a/png?text=Tablet" }}
            alt="Tablet interface preview" 
            className="w-full h-full object-cover"
          />
        </motion.div>
      </motion.div>

      {/* Desktop Layer (Right - Animates in 3rd) */}
      <motion.div 
        className="absolute right-[-10%] sm:right-[-5%] bottom-0 z-10 h-full aspect-[16/10]"
        style={{ x: desktopX }}
      >
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.8, ease: 'easeOut' }}
          className="w-full h-full rounded-[1rem] sm:rounded-[1.5rem] border-[6px] sm:border-[10px] border-slate-900 dark:border-black bg-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden"
        >
          {/* Desktop Webcam Hole */}
          <div className="absolute top-2 inset-x-0 mx-auto w-2 h-2 rounded-full bg-black/50 z-10 hidden sm:block" />
          
          <img 
            src="/assets/images/desktop-mockup.png" 
            onError={(e) => { e.currentTarget.src = "https://placehold.co/1200x800/f8fafc/0f172a/png?text=Desktop" }}
            alt="Desktop dashboard preview" 
            className="w-full h-full object-cover"
          />
        </motion.div>
      </motion.div>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Hero Export
───────────────────────────────────────────────────────────────*/
const Hero: React.FC = () => {
  const { t } = useTranslation('landing');
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY       = useTransform(scrollYProgress, [0, 0.5], [0, 100]);
  const mockupScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.05]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-white dark:bg-slate-950 pt-28 sm:pt-36 pb-0 flex flex-col items-center"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      
      {/* ── Hero Content ── */}
      <motion.div
        className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        {/* Announcement pill */}
        

        {/* Headline */}
        <motion.h1
          className="max-w-4xl text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-bold leading-[1.05] tracking-tight text-slate-900 dark:text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        >
          {t('heroTitle')}{' '}
          <span 
            className="inline-block relative"
            style={{ color: 'var(--color-primary, #F2D00D)' }}
          >
            {t('heroTitleHighlight')}
            <svg className="absolute w-full h-3 -bottom-1 left-0 opacity-80" viewBox="0 0 100 10" preserveAspectRatio="none">
               <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="mt-8 max-w-2xl text-lg sm:text-xl leading-relaxed text-slate-500 dark:text-slate-400"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          {t('heroSubtitle')}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        >
          <Link href="/register">
            <Button
              size="lg"
              className="w-full sm:w-auto h-12 rounded-xl text-slate-900 px-8 font-bold text-base shadow-sm hover:scale-105 transition-transform"
              style={{ backgroundColor: 'var(--color-primary, #F2D00D)' }}
            >
              {t('getStarted')}
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-12 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-transparent px-8 font-semibold text-base text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              {t('bookDemo')}
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* ── Product Screenshot Frame ── */}
      <motion.div
        className="relative z-10 w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 mt-20 sm:mt-24 mb-[-100px] sm:mb-[-150px]"
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ scale: mockupScale }}
      >
        <StackedScreenshots scrollYProgress={scrollYProgress} />
      </motion.div>
    </section>
  );
};

export default Hero;
