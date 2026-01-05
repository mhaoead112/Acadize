import React, { useRef } from 'react';
import { ArrowRight, TrendingUp, Activity, PieChart, Download } from "lucide-react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";

const Analytics: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15]);

  return (
    <section ref={ref} className="py-20 lg:py-28 bg-slate-100 dark:bg-background-secondary border-y border-slate-200 dark:border-white/5 relative overflow-hidden">
      {/* Background Blurs with Animation */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <motion.div 
          className="absolute -top-24 -left-24 w-96 h-96 bg-primary blur-[100px] rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600 blur-[120px] rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Text Content */}
          <motion.div 
            className="lg:col-span-5 flex flex-col gap-10"
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div>
              <motion.h2 
                className="text-3xl font-bold text-slate-900 dark:text-white mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Real-time Analytics & Insights
              </motion.h2>
              <motion.p 
                className="text-slate-600 dark:text-text-muted text-lg"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Make data-driven decisions with our comprehensive reporting suite. Monitor engagement, performance, and institutional health at a glance.
              </motion.p>
            </div>
            
            <motion.div 
              className="flex flex-col gap-6"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <AnalyticsFeature 
                icon={<Activity className="h-5 w-5" />}
                title="Student Performance Tracking" 
                description="Visualize progress with granular charts and identify at-risk students early." 
                delay={0.5}
              />
              <AnalyticsFeature 
                icon={<PieChart className="h-5 w-5" />}
                title="Course Engagement Metrics" 
                description="Understand which materials resonate most with students through heatmaps and logs." 
                delay={0.6}
              />
              <AnalyticsFeature 
                icon={<Download className="h-5 w-5" />}
                title="Exportable Reports" 
                description="Generate PDF or CSV reports for board meetings or parent-teacher conferences instantly." 
                delay={0.7}
              />
            </motion.div>
            
            <motion.button 
              className="w-fit text-primary font-bold flex items-center gap-2 hover:text-white transition-colors group"
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              whileHover={{ x: 5 }}
            >
              See all analytics features 
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>

          {/* Right Column: Visual with 3D Effect */}
          <motion.div 
            className="lg:col-span-7"
            initial={{ opacity: 0, x: 50, rotateY: -20 }}
            animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: 50, rotateY: -20 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ 
              y, 
              rotateX,
              perspective: "1000px",
              transformStyle: "preserve-3d"
            }}
          >
            <motion.div 
              className="relative rounded-xl border border-white/10 bg-[#0B1120] shadow-2xl p-2 md:p-4 aspect-video group"
              whileHover={{ 
                scale: 1.02, 
                rotateY: 5,
                rotateX: -5,
                boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.5)"
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Browser Bar */}
              <div className="absolute top-0 left-0 right-0 h-10 bg-background-dark/90 backdrop-blur rounded-t-xl flex items-center px-4 gap-2 z-10 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-500/50"></div>
                  <div className="size-3 rounded-full bg-yellow-500/50"></div>
                  <div className="size-3 rounded-full bg-green-500/50"></div>
                </div>
                <div className="flex-1 text-center text-xs text-text-muted/50 font-mono">lms-pro.analytics.com</div>
              </div>
              
              {/* Content */}
              <motion.div 
                className="h-full w-full rounded-lg bg-cover bg-top pt-10" 
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAbYuIS_FJQXhypQ1U1K1SRKN6yPjPg2XI4PNoP4VER-LgUdWn8eZPpG3BmwYVuFRQY_e8YJxYgi41eQirUk8i5X9UjUs0ll39_9z2JuMkcpu-YzfB-3UE5Wz-nl52ropaRQjM49IlkuyZacas-x8jh9onbAGZ9f3ZHVQ9IeJswDPMac_GURdzk4K5Ke91RfvUfS9OE2TFKV1B0DxDMbrpQYJEEpRD7Gb9Dqg3uchJ_p54EFWafLomzEzNE-GB5AKsoeMhcB6iHRyw')" }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-background-secondary/50 to-transparent pointer-events-none"></div>
              </motion.div>

              {/* Floating Stat Card with 3D Effect */}
              <motion.div 
                className="absolute bottom-8 left-8 bg-background-dark/95 border border-white/10 p-4 rounded-lg shadow-xl max-w-xs backdrop-blur-md cursor-default"
                initial={{ opacity: 0, y: 30, scale: 0.8, rotateX: -20 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1, rotateX: 0 } : { opacity: 0, y: 30, scale: 0.8, rotateX: -20 }}
                transition={{ delay: 0.8, duration: 0.8, type: "spring", stiffness: 200 }}
                whileHover={{ 
                  scale: 1.1, 
                  y: -10,
                  rotateX: 10,
                  rotateY: 5,
                  boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.5)"
                }}
                style={{ 
                  transformStyle: "preserve-3d",
                  perspective: "1000px"
                }}
              >
                <div className="flex gap-3 items-center">
                  <motion.div 
                    className="size-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <TrendingUp className="h-6 w-6" />
                  </motion.div>
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Total Engagement</p>
                    <motion.p 
                      className="text-xl font-bold text-white"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                      transition={{ delay: 1, duration: 0.5 }}
                    >
                      98.5% <span className="text-xs font-normal text-green-500 ml-1">↑ 2.4%</span>
                    </motion.p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

interface AnalyticsFeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const AnalyticsFeature: React.FC<AnalyticsFeatureProps> = ({ icon, title, description, delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <motion.div 
      ref={ref}
      className="flex gap-4"
      initial={{ opacity: 0, x: -30, rotateY: -10 }}
      animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: -30, rotateY: -10 }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
      whileHover={{ x: 5 }}
    >
      <motion.div 
        className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/20"
        whileHover={{ scale: 1.2, rotate: 360, backgroundColor: "rgba(var(--primary), 0.4)" }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {icon}
      </motion.div>
      <div>
        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{title}</h3>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
    </motion.div>
  );
};

export default Analytics;
