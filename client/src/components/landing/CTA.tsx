import React, { useRef } from 'react';
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";

const CTA: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section ref={ref} className="relative py-24 overflow-hidden bg-slate-50 dark:bg-background-dark">
      {/* Animated Background Layers */}
      <motion.div 
        className="absolute inset-0 bg-primary/5"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1 }}
      />
      <motion.div 
        className="absolute inset-0 opacity-5" 
        style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 0.05 } : { scale: 1.2, opacity: 0 }}
        transition={{ duration: 1.5 }}
      />
      
      {/* Animated Gradient Orbs */}
      <motion.div 
        className="absolute top-0 left-0 w-96 h-96 bg-primary blur-[150px] rounded-full opacity-20"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 100, 0],
          y: [0, 50, 0]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600 blur-[150px] rounded-full opacity-20"
        animate={{
          scale: [1, 1.4, 1],
          x: [0, -100, 0],
          y: [0, -50, 0]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />
      
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.h2 
          className="text-4xl font-bold text-slate-900 dark:text-white mb-6"
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          Ready to upgrade your institution?
        </motion.h2>
        <motion.p 
          className="text-xl text-slate-600 dark:text-text-muted mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Get access to all these features and transform the way you teach and learn.
        </motion.p>
        
        <motion.div 
          className="flex flex-col sm:flex-row justify-center gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <Link href="/register">
            <motion.button 
              className="flex items-center justify-center rounded-lg bg-primary px-8 py-4 text-base font-bold text-background-dark shadow-lg w-full sm:w-auto"
              whileHover={{ 
                scale: 1.05, 
                backgroundColor: "var(--primary-hover)",
                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.3)"
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Start Your Free Trial
            </motion.button>
          </Link>
          <Link href="/contact">
            <motion.button 
              className="flex items-center justify-center rounded-lg bg-white dark:bg-background-dark border border-slate-300 dark:border-white/20 px-8 py-4 text-base font-bold text-slate-900 dark:text-white w-full sm:w-auto"
              whileHover={{ 
                scale: 1.05,
                backgroundColor: "rgba(241, 245, 249, 1)",
                boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.2)"
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Schedule a Demo
            </motion.button>
          </Link>
        </motion.div>
        
        <motion.p 
          className="mt-6 text-sm text-slate-500 dark:text-text-muted"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          No credit card required • 14-day free trial • Cancel anytime
        </motion.p>
      </div>
    </section>
  );
};

export default CTA;
