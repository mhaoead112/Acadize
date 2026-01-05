import React, { useRef } from 'react';
import { School, BookOpen, FlaskConical, Languages } from "lucide-react";
import { motion, useInView } from "framer-motion";

const Logos: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const logoVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.8 },
    visible: { 
      opacity: 0.6, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    }
  };

  return (
    <div className="border-y border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-background-secondary py-12 overflow-hidden">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.p 
          className="text-sm font-medium text-slate-500 dark:text-text-muted mb-8 uppercase tracking-widest opacity-60"
          initial={{ opacity: 0, y: -10 }}
          animate={isInView ? { opacity: 0.6, y: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
        >
          Powering education at top institutions
        </motion.p>
        <motion.div 
          className="flex flex-wrap justify-center items-center gap-8 md:gap-16 grayscale"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.div 
            className="flex items-center gap-2"
            variants={logoVariants}
            whileHover={{ scale: 1.1, opacity: 1, filter: "grayscale(0%)" }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <School className="h-8 w-8" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">EduTech</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2"
            variants={logoVariants}
            whileHover={{ scale: 1.1, opacity: 1, filter: "grayscale(0%)" }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <BookOpen className="h-8 w-8" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">UniLearn</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2"
            variants={logoVariants}
            whileHover={{ scale: 1.1, opacity: 1, filter: "grayscale(0%)" }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <FlaskConical className="h-8 w-8" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">LabAcademy</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-2"
            variants={logoVariants}
            whileHover={{ scale: 1.1, opacity: 1, filter: "grayscale(0%)" }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Languages className="h-8 w-8" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">GlobalInst</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Logos;
