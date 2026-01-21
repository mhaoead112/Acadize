import { Link } from "wouter";
import { School, Menu } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Logos from "@/components/landing/Logos";
import Features from "@/components/landing/Features";
import Analytics from "@/components/landing/Analytics";
import Stakeholders from "@/components/landing/Stakeholders";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <motion.div 
      className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans antialiased overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Hero />
      <Logos />
      <Features />
      <Analytics />
      <Stakeholders />
      <CTA />
    </motion.div>
  );
}
