import { useTranslation } from "react-i18next";
import { Shield, Eye, Lock, Database, UserCheck, Globe } from "lucide-react";
import { Link } from "wouter";

export default function Privacy() {
  const { t } = useTranslation('landing');
  const sections = [
    {
      id: "information-collection",
      title: "Information We Collect",
      icon: Database,
      content: `We collect information that you provide directly to us, including when you create an account, enroll in courses, communicate with instructors or other users, or contact us for support. This may include your name, email address, profile information, and any other information you choose to provide.`
    },
    {
      id: "how-we-use",
      title: "How We Use Your Information",
      icon: UserCheck,
      content: `We use the information we collect to provide, maintain, and improve our services, to develop new features, to protect Acadize and our users, and to communicate with you about our services. We also use this information to personalize your learning experience and provide relevant content recommendations.`
    },
    {
      id: "information-sharing",
      title: "Information Sharing and Disclosure",
      icon: Globe,
      content: `We do not sell your personal information. We may share your information with third-party service providers who perform services on our behalf, such as hosting, data analysis, payment processing, and customer service. We may also share information when required by law or to protect our rights.`
    },
    {
      id: "data-security",
      title: "Data Security",
      icon: Lock,
      content: `We implement appropriate technical and organizational measures to protect your personal information against unauthorized or unlawful processing, accidental loss, destruction, or damage. We use encryption, secure socket layer technology, and other industry-standard security measures.`
    },
    {
      id: "your-rights",
      title: "Your Rights and Choices",
      icon: Eye,
      content: `You have the right to access, update, or delete your personal information. You can manage your account settings, opt out of marketing communications, and request a copy of your data. For EU residents, we comply with GDPR requirements including the right to data portability and erasure.`
    },
    {
      id: "cookies",
      title: "Cookies and Tracking",
      icon: Shield,
      content: `We use cookies and similar tracking technologies to collect information about your browsing activities and to remember your preferences. You can set your browser to refuse cookies, though this may limit some features of our platform. We also use analytics tools to understand how our services are used.`
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans antialiased overflow-x-hidden">

      <section className="relative py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-secondary-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"></div>
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="flex justify-center mb-6">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Shield className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            {t('privacyTitle')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-text-muted mb-4">
            Last updated: December 15, 2024
          </p>
          <p className="text-slate-600 dark:text-text-muted max-w-2xl mx-auto">
            At Acadize, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information.
          </p>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-100 dark:bg-slate-800/30 border-b border-slate-200 dark:border-secondary-dark">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-xl font-bold mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-secondary-dark bg-white dark:bg-slate-800 p-3 text-sm hover:border-primary hover:text-primary transition-all"
              >
                <span>→</span>
                <span>{section.title}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="space-y-16">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <div key={section.id} id={section.id} className="scroll-mt-24">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        {index + 1}. {section.title}
                      </h2>
                      <div className="h-1 w-20 bg-primary rounded-full"></div>
                    </div>
                  </div>
                  <div className="pl-0 lg:pl-16">
                    <p className="text-text-muted leading-relaxed">{section.content}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Information */}
          <div className="mt-16 pt-12 border-t border-secondary-dark">
            <h2 className="text-2xl font-bold mb-6">Additional Information</h2>
            
            <div className="space-y-6">
              <div className="rounded-xl border border-secondary-dark bg-slate-800 p-6">
                <h3 className="text-lg font-bold mb-2">Children's Privacy</h3>
                <p className="text-sm text-text-muted">
                  Our services are not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
                </p>
              </div>

              <div className="rounded-xl border border-secondary-dark bg-slate-800 p-6">
                <h3 className="text-lg font-bold mb-2">International Data Transfers</h3>
                <p className="text-sm text-text-muted">
                  Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this privacy policy and applicable laws.
                </p>
              </div>

              <div className="rounded-xl border border-secondary-dark bg-slate-800 p-6">
                <h3 className="text-lg font-bold mb-2">Changes to This Policy</h3>
                <p className="text-sm text-text-muted">
                  We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-secondary-dark bg-slate-800 p-8 lg:p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Questions About Privacy?</h2>
            <p className="text-text-muted mb-6 max-w-2xl mx-auto">
              If you have any questions about this privacy policy or our data practices, please don't hesitate to contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <button className="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30">
                  Contact Us
                </button>
              </Link>
              <Link href="/help-center">
                <button className="px-8 py-3 rounded-lg border border-secondary-dark text-white font-bold transition-all hover:bg-white/5">
                  Visit Help Center
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
