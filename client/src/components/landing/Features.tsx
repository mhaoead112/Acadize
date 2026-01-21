import React, { useRef } from 'react';
import { Lock, Smartphone, Cloud, Webhook, Video, Award } from "lucide-react";
import { motion, useInView } from "framer-motion";

const Features: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, rotateX: -15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <section id="features" className="py-20 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Animated background gradient */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2 
            className="text-3xl font-bold text-slate-900 dark:text-white"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.6 }}
          >
            More than just an LMS
          </motion.h2>
          <motion.p 
            className="mt-4 text-slate-600 dark:text-text-muted max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Built on modern infrastructure to ensure reliability, security, and scalability for institutions of any size.
          </motion.p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          style={{ perspective: "1000px" }}
        >
          <motion.div variants={itemVariants}>
            <FeatureCard 
              icon={<Lock className="h-6 w-6" />}
              title="Enterprise Security" 
              description="ISO 27001 certified data centers with end-to-end encryption for all user data." 
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureCard 
              icon={<Smartphone className="h-6 w-6" />}
              title="Mobile First" 
              description="Fully responsive design and dedicated mobile apps for iOS and Android." 
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureCard 
              icon={<Cloud className="h-6 w-6" />}
              title="Cloud Storage" 
              description="Unlimited storage for course materials, video lectures, and student submissions." 
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureCard 
              icon={<Webhook className="h-6 w-6" />}
              title="API & Integrations" 
              description="Seamlessly connect with Zoom, Google Classroom, Microsoft Teams, and SIS." 
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureCard 
              icon={<Video className="h-6 w-6" />}
              title="Virtual Classroom" 
              description="Built-in live video conferencing with whiteboard and breakout rooms." 
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureCard 
              icon={<Award className="h-6 w-6" />}
              title="Certifications" 
              description="Auto-generate and distribute custom certificates upon course completion." 
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <motion.div 
    className="flex gap-4 p-6 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 transition-all h-full"
    whileHover={{ 
      y: -8,
      rotateX: 5,
      rotateY: 5,
      scale: 1.02,
      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
      borderColor: "rgba(255, 215, 0, 0.3)"
    }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    style={{ transformStyle: "preserve-3d" }}
  >
    <motion.div 
      className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
      whileHover={{ scale: 1.1, rotate: 5 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      {icon}
    </motion.div>
    <div>
      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h4>
      <p className="text-sm text-slate-600 dark:text-text-muted">{description}</p>
    </div>
  </motion.div>
);

export default Features;
