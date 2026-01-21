import React, { useRef } from 'react';
import { Scroll, Backpack, Users, ShieldCheck, Check } from "lucide-react";
import { motion, useInView } from "framer-motion";

interface StakeholderCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  colorClass: string;
  bgClass: string;
  borderClass: string;
  hoverBgClass: string;
  hoverTextClass: string;
  bigIconColor: string;
  delay?: number;
}

const StakeholderCard: React.FC<StakeholderCardProps> = ({ 
  icon, title, description, features, 
  colorClass, bgClass, borderClass, hoverBgClass, hoverTextClass, bigIconColor,
  delay = 0
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div 
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 p-8 transition-all duration-300 hover:border-primary/50"
      initial={{ opacity: 0, y: 50, rotateX: -15 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: -15 }}
      transition={{ delay, duration: 0.7, ease: "easeOut" }}
      whileHover={{ 
        y: -8, 
        rotateX: 5,
        rotateY: 5,
        scale: 1.02,
        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)"
      }}
      style={{ 
        perspective: "1000px",
        transformStyle: "preserve-3d"
      }}
    >
      <motion.div 
        className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
        initial={{ scale: 0, rotate: -45 }}
        animate={isInView ? { scale: 1.5, rotate: 0 } : { scale: 0, rotate: -45 }}
        transition={{ delay: delay + 0.3, duration: 0.8 }}
      >
        <div className={`text-8xl text-primary origin-top-right`}>
           {icon}
        </div>
      </motion.div>
      <div className="relative z-10">
        <motion.div 
          className={`mb-6 inline-flex size-14 items-center justify-center rounded-xl ${bgClass} ${colorClass} ${hoverBgClass} ${hoverTextClass} transition-colors ${borderClass}`}
          whileHover={{ scale: 1.2, rotate: 360 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {icon}
        </motion.div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-text-muted mb-6">{description}</p>
        <motion.ul 
          className="space-y-3"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } }
          }}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {features.map((feature, idx) => (
            <motion.li 
              key={idx} 
              className="flex items-start gap-2"
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 }
              }}
              transition={{ delay: delay + 0.4 + (idx * 0.05) }}
            >
              <Check className="h-4 w-4 text-primary mt-0.5" />
              <span className="text-sm text-slate-700 dark:text-gray-300">{feature}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </motion.div>
  );
};

const Stakeholders: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section ref={ref} className="py-20 bg-white dark:bg-slate-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <motion.div 
        className="absolute top-20 left-10 w-72 h-72 bg-primary/10 blur-[100px] rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -30, 0]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -40, 0],
          y: [0, 40, 0]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          className="mb-16 md:text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7 }}
        >
          <motion.h2 
            className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Tailored for Every Stakeholder
          </motion.h2>
          <motion.p 
            className="mt-4 text-lg text-slate-600 dark:text-text-muted"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            A unified platform that adapts to the specific workflows and needs of everyone in the education ecosystem.
          </motion.p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StakeholderCard 
            icon={<Scroll className="h-8 w-8" />}
            title="For Teachers"
            description="Tools to automate administrative tasks so you can focus on teaching."
            features={['Automated Gradebook', 'Lesson Planner', 'Assignment Tracking', 'Plagiarism Checker']}
            bgClass="bg-blue-500/10"
            colorClass="text-blue-400"
            borderClass="border border-blue-500/20"
            hoverBgClass="group-hover:bg-blue-500"
            hoverTextClass="group-hover:text-white"
            bigIconColor="text-primary"
            delay={0.1}
          />
           <StakeholderCard 
            icon={<Backpack className="h-8 w-8" />}
            title="For Students"
            description="An engaging environment to learn, track progress, and collaborate."
            features={['Personalized Dashboard', 'Interactive Quizzes', 'Discussion Forums', 'Mobile Access']}
            bgClass="bg-green-500/10"
            colorClass="text-green-400"
            borderClass="border border-green-500/20"
            hoverBgClass="group-hover:bg-green-500"
            hoverTextClass="group-hover:text-white"
            bigIconColor="text-primary"
            delay={0.2}
          />
           <StakeholderCard 
            icon={<Users className="h-8 w-8" />}
            title="For Parents"
            description="Stay informed about your child's academic journey in real-time."
            features={['Attendance Alerts', 'Report Cards', 'Teacher Messaging', 'Event Calendar']}
            bgClass="bg-purple-500/10"
            colorClass="text-purple-400"
            borderClass="border border-purple-500/20"
            hoverBgClass="group-hover:bg-purple-500"
            hoverTextClass="group-hover:text-white"
            bigIconColor="text-primary"
            delay={0.3}
          />
           <StakeholderCard 
            icon={<ShieldCheck className="h-8 w-8" />}
            title="For Admins"
            description="Complete control over your institution's data and operations."
            features={['Global Analytics', 'User Management', 'Fee & Billing', 'Course Allocation']}
            bgClass="bg-orange-500/10"
            colorClass="text-orange-400"
            borderClass="border border-orange-500/20"
            hoverBgClass="group-hover:bg-orange-500"
            hoverTextClass="group-hover:text-white"
            bigIconColor="text-primary"
            delay={0.4}
          />
        </div>
      </div>
    </section>
  );
};

export default Stakeholders;
