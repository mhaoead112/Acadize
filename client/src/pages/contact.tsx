import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { 
  School, 
  Mail, 
  Headphones, 
  Phone, 
  BookOpen, 
  FlaskConical, 
  Globe, 
  User, 
  FileText, 
  Send
} from "lucide-react";
import type { InsertContact } from "@shared/schema";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { apiEndpoint } from "@/lib/config";

export default function Contact() {
  const { t } = useTranslation('landing');
  const { toast } = useToast();
  const [formData, setFormData] = useState<InsertContact>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const { scrollYProgress } = useScroll();
  const orbTopY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const orbBottomY = useTransform(scrollYProgress, [0, 1], [0, 40]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { staggerChildren: 0.12 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0 }
  };

  const contactMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      const response = await fetch(apiEndpoint("/api/contacts"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('contactForm.messageSentSuccess'),
        description: t('contactForm.messageSentDescription'),
      });
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    },
    onError: (error) => {
      toast({
        title: t('contactForm.failedToSendMessage'),
        description: error instanceof Error ? error.message : t('contactForm.failedToSendDescription'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    contactMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans antialiased overflow-x-hidden">

      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
        <motion.div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] bg-primary/5 blur-[120px] rounded-full" style={{ y: orbTopY }}></motion.div>
        <motion.div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] bg-blue-900/10 blur-[100px] rounded-full" style={{ y: orbBottomY }}></motion.div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start" variants={containerVariants} initial="hidden" animate="show">
            {/* Left Column */}
            <motion.div className="flex flex-col gap-8" variants={itemVariants}>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 w-fit mb-6">
                  <span className="flex size-2 rounded-full bg-primary"></span>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">24/7 Support</span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white mb-6">
                  {t('contactTitle')}
                </h1>
                <p className="text-lg text-slate-600 dark:text-text-muted leading-relaxed max-w-lg">
                  Whether you're an administrator looking for a demo, a teacher needing support, or a student with login issues, our team is ready to help.
                </p>
              </div>
              
              <div className="space-y-6">
                <motion.div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-white/5 dark:bg-slate-900/50 dark:hover:bg-slate-900 transition-colors group" whileHover={{ y: -4, rotateX: 2, rotateY: -2 }} transition={{ type: "spring", stiffness: 350, damping: 20 }} style={{ perspective: 1000, transformStyle: 'preserve-3d' }}>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-950 border border-white/10 text-primary group-hover:scale-110 transition-transform">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Email Us</h3>
                    <p className="text-sm text-slate-600 dark:text-text-muted mb-1">For general inquiries and sales</p>
                    <a className="text-primary font-medium hover:text-white transition-colors" href="mailto:support@acadize.com">support@acadize.com</a>
                  </div>
                </motion.div>
                
                <motion.div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-white/5 dark:bg-slate-900/50 dark:hover:bg-slate-900 transition-colors group" whileHover={{ y: -4, rotateX: 2, rotateY: -2 }} transition={{ type: "spring", stiffness: 350, damping: 20 }} style={{ perspective: 1000, transformStyle: 'preserve-3d' }}>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-950 border border-white/10 text-primary group-hover:scale-110 transition-transform">
                    <Headphones className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Technical Support</h3>
                    <p className="text-sm text-slate-600 dark:text-text-muted mb-1">For existing customers needing help</p>
                    <a className="text-primary font-medium hover:text-white transition-colors" href="mailto:contact@acadize.com">contact@acadize.com</a>
                  </div>
                </motion.div>
                
                <motion.div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-white/5 dark:bg-slate-900/50 dark:hover:bg-slate-900 transition-colors group" whileHover={{ y: -4, rotateX: 2, rotateY: -2 }} transition={{ type: "spring", stiffness: 350, damping: 20 }} style={{ perspective: 1000, transformStyle: 'preserve-3d' }}>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-950 border border-white/10 text-primary group-hover:scale-110 transition-transform">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Call Us</h3>
                    <p className="text-sm text-slate-600 dark:text-text-muted mb-1">Mon-Fri from 8am to 6pm EST</p>
                    <a className="text-primary font-medium hover:text-white transition-colors" href="tel:+201008547459">+20 10 08547459</a>
                  </div>
                </motion.div>
              </div>
              
              {/* <div className="pt-6 border-t border-white/10">
                <p className="text-sm text-text-muted mb-4">Trusted by 500+ institutions worldwide</p>
                <div className="flex gap-4 opacity-50 grayscale">
                  <School className="h-8 w-8" />
                  <BookOpen className="h-8 w-8" />
                  <FlaskConical className="h-8 w-8" />
                  <Globe className="h-8 w-8" />
                </div>
              </div> */}
            </motion.div>

            {/* Right Column - Form */}
            <motion.div className="relative" variants={itemVariants}>
              <motion.div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-500/30 rounded-2xl blur-lg opacity-50" style={{ y: orbTopY }}></motion.div>
              <motion.div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 lg:p-10 shadow-2xl" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Send us a message</h2>
                  <p className="text-slate-600 dark:text-text-muted text-sm">We typically reply within 2 hours during business days.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-600 dark:text-text-muted" htmlFor="name">Full Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted/50">
                          <User className="h-[18px] w-[18px]" />
                        </div>
                        <input 
                          className="block w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/50 pl-10 py-2.5 text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm transition-colors" 
                          id="name" 
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Jane Doe" 
                          type="text"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-600 dark:text-text-muted" htmlFor="email">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted/50">
                          <Mail className="h-[18px] w-[18px]" />
                        </div>
                        <input 
                          className="block w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/50 pl-10 py-2.5 text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm transition-colors" 
                          id="email" 
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="jane@school.edu" 
                          type="email"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-600 dark:text-text-muted" htmlFor="subject">Subject</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted/50">
                        <FileText className="h-[18px] w-[18px]" />
                      </div>
                      <select 
                        className="block w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/50 pl-10 py-2.5 text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm transition-colors [&>option]:bg-white dark:[&>option]:bg-slate-900 [&>option]:text-slate-900 dark:[&>option]:text-white" 
                        id="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      >
                        <option value="" disabled>Select a subject</option>
                        <option value="demo">I'd like to schedule a demo</option>
                        <option value="sales">Sales & Pricing Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="billing">Billing Question</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-600 dark:text-text-muted" htmlFor="message">Message</label>
                    <div className="relative">
                      <textarea 
                        className="block w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/50 p-3 text-slate-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm transition-colors resize-none" 
                        id="message" 
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="How can we help you today?" 
                        rows={4}
                        required
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <input 
                      className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-950 text-primary focus:ring-primary/50" 
                      id="newsletter" 
                      type="checkbox"
                    />
                    <label className="text-xs text-slate-600 dark:text-text-muted" htmlFor="newsletter">I agree to receive communications from Acadize.</label>
                  </div>
                  
                  <button 
                    className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-bold text-background-dark transition-all hover:bg-primary-hover hover:scale-[1.02] shadow-lg shadow-primary/20" 
                    type="submit"
                    disabled={contactMutation.isPending}
                  >
                    {contactMutation.isPending ? "Sending..." : "Send Message"}
                    <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/20 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-10">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-white/5 dark:bg-slate-900/40">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">What are your support hours?</h3>
              <p className="text-sm text-slate-600 dark:text-text-muted">Our support team is available Monday through Friday, 8am - 6pm EST. Critical issues are monitored 24/7.</p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-white/5 dark:bg-slate-900/40">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Do you offer free trials?</h3>
              <p className="text-sm text-slate-600 dark:text-text-muted">Yes, we offer a 14-day free trial for all plans so you can explore the features before committing.</p>
            </div>
            <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-white/5 dark:bg-slate-900/40">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Where are you located?</h3>
              <p className="text-sm text-slate-600 dark:text-text-muted">We have remote teams supporting clients globally.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
