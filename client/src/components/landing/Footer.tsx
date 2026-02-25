import React, { useRef } from 'react';
import { Link } from "wouter";
import { useTranslation } from 'react-i18next';
import { Globe, AtSign, Rss } from "lucide-react";
import { AcadizeLogo } from "@/components/AcadizeLogo";
import { motion, useInView } from "framer-motion";

const Footer: React.FC = () => {
  const { t } = useTranslation('landing');
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
              <AcadizeLogo variant="full" size="xl" />
            </motion.div>
            <p className="text-slate-600 dark:text-text-muted text-sm max-w-xs mb-6">{t('footerTagline')}</p>
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
            <h4 className="text-slate-900 dark:text-white font-bold mb-4">{t('product')}</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-text-muted">
              <motion.li whileHover={{ x: 5 }}><a className="hover:text-primary transition-colors" href="/#features">{t('features')}</a></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/pricing">{t('pricingTitle')}</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/integrations">{t('integrations')}</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/blog">{t('updates')}</Link></motion.li>
            </ul>
          </motion.div>

          {/* Resources Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h4 className="text-slate-900 dark:text-white font-bold mb-4">{t('resources')}</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-text-muted">
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/docs">{t('docs')}</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/community">Community</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/help-center">{t('help')}</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/integrations">{t('integrations')}</Link></motion.li>
            </ul>
          </motion.div>

          {/* Company Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h4 className="text-slate-900 dark:text-white font-bold mb-4">{t('company')}</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-text-muted">
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/about">{t('about')}</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/blog">{t('blog')}</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/contact">{t('contact')}</Link></motion.li>
              <motion.li whileHover={{ x: 5 }}><Link className="hover:text-primary transition-colors" href="/pricing">{t('pricingTitle')}</Link></motion.li>
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
          <p className="text-xs text-text-muted">© 2024 Acadize. {t('allRightsReserved')}</p>
          <div className="flex gap-6 text-xs text-text-muted">
            <motion.div whileHover={{ y: -2 }}><Link className="hover:text-white" href="/privacy">{t('privacy')}</Link></motion.div>
            <motion.div whileHover={{ y: -2 }}><Link className="hover:text-white" href="/terms">{t('terms')}</Link></motion.div>
            <motion.div whileHover={{ y: -2 }}><a className="hover:text-white" href="#">Cookie Settings</a></motion.div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export { Footer };
export default Footer;
