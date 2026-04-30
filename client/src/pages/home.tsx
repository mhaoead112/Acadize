import { motion } from 'framer-motion';
import Hero from '@/components/landing/Hero';
import Logos from '@/components/landing/Logos';
import Features from '@/components/landing/Features';
import Analytics from '@/components/landing/Analytics';
import Stakeholders from '@/components/landing/Stakeholders';
import CTA from '@/components/landing/CTA';

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
    >
      <Hero />

    </motion.div>
  );
}
