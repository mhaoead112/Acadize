import { useTranslation } from "react-i18next";
import { FileText, AlertCircle, Users, Shield, CreditCard, Ban } from "lucide-react";
import { Link } from "wouter";

export default function Terms() {
  const { t } = useTranslation('landing');
  const sections = [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      icon: FileText,
      content: `By accessing or using Acadize's services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.`
    },
    {
      id: "account",
      title: "Account Registration and Security",
      icon: Users,
      content: `You must create an account to access certain features of our platform. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information during registration and to update it as necessary.`
    },
    {
      id: "acceptable-use",
      title: "Acceptable Use Policy",
      icon: Shield,
      content: `You agree not to use the platform for any unlawful purpose or in any way that interrupts, damages, or impairs the service. Prohibited activities include harassment, spreading malware, attempting unauthorized access, impersonating others, or violating intellectual property rights.`
    },
    {
      id: "payment",
      title: "Payment and Subscriptions",
      icon: CreditCard,
      content: `Access to certain features requires payment. You agree to pay all fees associated with your chosen subscription plan. Subscriptions automatically renew unless cancelled before the renewal date. Refunds are provided in accordance with our refund policy.`
    },
    {
      id: "intellectual-property",
      title: "Intellectual Property Rights",
      icon: Shield,
      content: `All content on Acadize, including text, graphics, logos, and software, is the property of Acadize or its content suppliers and is protected by copyright and other intellectual property laws. Course materials created by instructors remain their intellectual property.`
    },
    {
      id: "termination",
      title: "Termination and Suspension",
      icon: Ban,
      content: `We reserve the right to terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason at our sole discretion.`
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans antialiased overflow-x-hidden">

      <section className="relative py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-secondary-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"></div>
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="flex justify-center mb-6">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            {t('termsTitle')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-text-muted mb-4">
            Last updated: December 15, 2024
          </p>
          <p className="text-slate-600 dark:text-text-muted max-w-2xl mx-auto">
            Please read these terms carefully before using our services. These terms govern your access to and use of Acadize.
          </p>
        </div>
      </section>

      <section className="py-8 px-4 sm:px-6 lg:px-8 bg-slate-100 dark:bg-slate-800/30 border-b border-slate-200 dark:border-secondary-dark">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-50 dark:bg-yellow-500/5 p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-yellow-700 dark:text-yellow-500 mb-2">Important Notice</h3>
                <p className="text-sm text-slate-600 dark:text-text-muted">
                  These terms include an arbitration clause and class action waiver that affect your legal rights. Please read Section 8 carefully.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-800/30 border-b border-secondary-dark">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-xl font-bold mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 rounded-lg border border-secondary-dark bg-slate-800 p-3 text-sm hover:border-primary hover:text-primary transition-all"
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

          {/* Additional Sections */}
          <div className="mt-16 pt-12 border-t border-secondary-dark">
            <h2 className="text-2xl font-bold mb-6">Additional Terms</h2>
            
            <div className="space-y-6">
              <div className="rounded-xl border border-secondary-dark bg-slate-800 p-6">
                <h3 className="text-lg font-bold mb-2">Limitation of Liability</h3>
                <p className="text-sm text-text-muted">
                  Acadize shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability shall not exceed the amount paid by you in the twelve months prior to the event giving rise to liability.
                </p>
              </div>

              <div className="rounded-xl border border-secondary-dark bg-slate-800 p-6">
                <h3 className="text-lg font-bold mb-2">Dispute Resolution</h3>
                <p className="text-sm text-text-muted">
                  Any disputes arising from these terms or your use of the service will be resolved through binding arbitration, rather than in court, except that you may assert claims in small claims court if your claims qualify. You waive your right to participate in a class action lawsuit or class-wide arbitration.
                </p>
              </div>

              <div className="rounded-xl border border-secondary-dark bg-slate-800 p-6">
                <h3 className="text-lg font-bold mb-2">Governing Law</h3>
                <p className="text-sm text-text-muted">
                  These terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.
                </p>
              </div>

              <div className="rounded-xl border border-secondary-dark bg-slate-800 p-6">
                <h3 className="text-lg font-bold mb-2">Changes to Terms</h3>
                <p className="text-sm text-text-muted">
                  We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the platform. Your continued use of the service after such modifications constitutes your acceptance of the updated terms.
                </p>
              </div>

              <div className="rounded-xl border border-secondary-dark bg-slate-800 p-6">
                <h3 className="text-lg font-bold mb-2">Severability</h3>
                <p className="text-sm text-text-muted">
                  If any provision of these terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that these Terms of Service will otherwise remain in full force and effect.
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
            <h2 className="text-2xl font-bold mb-4">Questions About These Terms?</h2>
            <p className="text-text-muted mb-6 max-w-2xl mx-auto">
              If you have any questions about these Terms of Service, please contact our legal team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <button className="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30">
                  Contact Us
                </button>
              </Link>
              <Link href="/privacy">
                <button className="px-8 py-3 rounded-lg border border-slate-600 dark:border-secondary-dark text-white font-bold transition-all hover:bg-slate-100 dark:hover:bg-white/5">
                  View Privacy Policy
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
