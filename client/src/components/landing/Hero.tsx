import React, { useRef } from 'react';
import { Link } from "wouter";
import { ArrowDown, Calendar, CheckCircle } from "lucide-react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const Hero: React.FC = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  // 3D Parallax effects
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  
  // Smooth spring physics
  const ySpring = useSpring(y, { stiffness: 100, damping: 30 });
  const scaleSpring = useSpring(scale, { stiffness: 100, damping: 30 });

  return (
    <section ref={ref} className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
      <motion.div 
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10"
        style={{ opacity }}
      >
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Content */}
          <motion.div 
            className="flex flex-col gap-6 max-w-2xl"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.6, -0.05, 0.01, 0.99] }}
          >
            <motion.div 
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 w-fit"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <span className="flex size-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Feature Tour 2024</span>
            </motion.div>
            
            <motion.h1 
              className="text-4xl lg:text-6xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Everything you need to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-200">manage education</span>
            </motion.h1>
            
            <motion.p 
              className="text-lg text-slate-600 dark:text-text-muted leading-relaxed max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Explore the powerful features that make EduVerse the preferred choice for institutions worldwide. From curriculum planning to advanced analytics.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <motion.button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-bold text-background-dark transition-all shadow-lg shadow-primary/20"
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(255, 215, 0, 0.3)" }}
                whileTap={{ scale: 0.98 }}
              >
                Explore Features
                <ArrowDown className="h-5 w-5" />
              </motion.button>
              <Link href="/contact">
                <motion.button 
                  className="flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 px-8 text-base font-bold text-slate-900 dark:text-white transition-all"
                  whileHover={{ scale: 1.05, borderColor: "rgba(255, 215, 0, 0.4)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Calendar className="h-5 w-5" />
                  Book a Demo
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Column: Image/Visual with 3D Effect */}
          <motion.div 
            className="relative lg:h-auto"
            initial={{ opacity: 0, x: 50, rotateY: -15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, ease: [0.6, -0.05, 0.01, 0.99] }}
            style={{ 
              y: ySpring,
              scale: scaleSpring,
              transformStyle: "preserve-3d",
              perspective: "1000px"
            }}
          >
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-30"></div>
            <motion.div 
              className="relative rounded-xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden aspect-[4/3] group"
              whileHover={{ 
                rotateY: 5, 
                rotateX: -5,
                scale: 1.02,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              }}
              transition={{ duration: 0.5 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Fake Browser Header */}
              <div className="flex items-center gap-2 border-b border-white/10 bg-slate-950/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-500/80"></div>
                  <div className="size-3 rounded-full bg-yellow-500/80"></div>
                  <div className="size-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="mx-auto w-1/2 h-2 rounded-full bg-white/5"></div>
              </div>

              {/* Dashboard Image */}
              <div 
                className="h-full w-full bg-cover bg-center transform transition-transform duration-700 group-hover:scale-105" 
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB8oBVzm-Moy4WIoOg-DjxVynnmB8aTJDd8wjMYjKfRPcYmZqg_iTqjsxUjblNxKTdVFl2lCnikIT6fzERWWicj5pOtCM2Rvj7sOAKn_je42kiA5LYuIbApV0HLkktP44UlbsR7focfIcOQSp32gDGqEqVASHIx5SszzwXnSUnrdNHgZ5abhNGiwSowNN12po2cfuX2p_bbMOG6k_ykbpjVYjoeLQqueo6qNPI0bvZ-8Ah4EUpdbrJqUUK6jkaLVH9UYsaXwAerKMo')" }}
                aria-label="LMS Dashboard Interface showing charts and course lists"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-60"></div>
              </div>

              {/* Floating Cards */}
              <div className="absolute top-8 right-8 flex flex-col gap-2">
                <FloatingBadge icon={<CheckCircle className="h-4 w-4 text-primary" />} text="Live Attendance" delay={0.6} />
                <FloatingBadge icon={<CheckCircle className="h-4 w-4 text-primary" />} text="Auto-Grading" delay={0.7} />
                <FloatingBadge icon={<CheckCircle className="h-4 w-4 text-primary" />} text="Resource Library" delay={0.8} />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Background Decoration with Parallax */}
      <motion.div 
        className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] bg-blue-900/10 blur-[120px] rounded-full"
        style={{ y: ySpring, scale: scaleSpring }}
      ></motion.div>
    </section>
  );
};

const FloatingBadge: React.FC<{ icon: React.ReactNode; text: string; delay: number }> = ({ icon, text, delay }) => (
  <motion.div 
    className="bg-white/90 dark:bg-slate-950/90 backdrop-blur border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg"
    initial={{ x: 48, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    whileHover={{ scale: 1.05, x: -4 }}
  >
    {icon}
    <span className="text-xs font-bold text-slate-900 dark:text-white">{text}</span>
  </motion.div>
);

export default Hero;
