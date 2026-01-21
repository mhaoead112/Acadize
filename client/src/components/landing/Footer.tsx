import React, { useRef } from 'react';
import { Link } from "wouter";
import { School, Globe, AtSign, Rss } from "lucide-react";
import { motion, useInView } from "framer-motion";

const Footer: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <footer ref={ref} className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          
          {/* Brand Column */}
          <motion.div 
            className="col-span-2 lg:col-span-2"
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <motion.div 
              className="flex items-center gap-2 mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="flex size-6 items-center justify-center rounded bg-primary text-background-dark"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <School className="h-4 w-4" />
              </motion.div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">EduVerse</span>
            </motion.div>
            <p className="text-slate-600 dark:text-text-muted text-sm max-w-xs mb-6">Empowering the next generation of learners through innovative technology and seamless design.</p>
            <div className="flex gap-4">
              <motion.a 
                className="text-slate-600 dark:text-text-muted hover:text-slate-900 dark:hover:text-white transition-colors" 
                href="#"
                whileHover={{ scale: 1.2, y: -3 }}
                whileTap={{ scale: 0.9 }}
              >
                <Globe className="h-5 w-5" />
              </motion.a>
              <motion.a 
                className="text-slate-600 dark:text-text-muted hover:text-slate-900 dark:hover:text-white transition-colors" 
                href="#"
                whileHover={{ scale: 1.2, y: -3 }}
                whileTap={{ scale: 0.9 }}
              >
                <AtSign className="h-5 w-5" />
              </motion.a>
              <motion.a 
                className="text-slate-600 dark:text-text-muted hover:text-slate-900 dark:hover:text-white transition-colors" 
                href="#"
                whileHover={{ scale: 1.2, y: -3 }}
                whileTap={{ scale: 0.9 }}
              >
                <Rss className="h-5 w-5" />
              </motion.a>
            </div>
          </motion.div>

          {/* Product Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h4 className="text-slate-900 dark:text-white font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-text-muted">
              <motion.li whileHover={{ x: 5 }}><a className="hover:text-primary transition-colors" href="/#features">Features</a></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/pricing">Pricing</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/integrations">Integrations</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/blog">Updates</Link></motion.li>
            </ul>
          </motion.div>

          {/* Resources Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h4 className="text-slate-900 dark:text-white font-bold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-text-muted">
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/docs">Documentation</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/community">Community</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/help-center">Help Center</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/integrations">Integrations</Link></motion.li>
            </ul>
          </motion.div>

          {/* Company Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h4 className="text-slate-900 dark:text-white font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-text-muted">
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/about">About Us</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/blog">Blog</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/contact">Contact</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/pricing">Pricing</Link></motion.li>
            </ul>
          </motion.div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div 
          className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <p className="text-xs text-text-muted">© 2024 EduVerse Inc. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-text-muted">
            <motion.div whileHover={{ y: -2 }}><Link className="hover:text-white" href="/privacy">Privacy Policy</Link></motion.div>
            <motion.div whileHover={{ y: -2 }}><Link className="hover:text-white" href="/terms">Terms of Service</Link></motion.div>
            <motion.div whileHover={{ y: -2 }}><a className="hover:text-white" href="#">Cookie Settings</a></motion.div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export { Footer };
export default Footer;
