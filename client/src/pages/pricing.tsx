import React, { useState, useRef } from 'react';
import { Check, Zap, Building2, Rocket } from "lucide-react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, amount: 0.2 });
  const plans = [
    {
      name: "Starter",
      priceMonthly: 29,
      priceAnnual: 23, // 20% discount
      period: "/month",
      description: "Perfect for small institutions and pilot programs",
      icon: Zap,
      features: [
        "Up to 100 students",
        "5 courses",
        "Basic analytics",
        "Email support",
        "Mobile app access",
        "Community forum access"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Professional",
      priceMonthly: 99,
      priceAnnual: 79, // 20% discount
      period: "/month",
      description: "Ideal for growing schools and training centers",
      icon: Building2,
      features: [
        "Up to 500 students",
        "Unlimited courses",
        "Advanced analytics",
        "Priority support",
        "Custom branding",
        "API access",
        "Video hosting",
        "Certificates"
      ],
      cta: "Get Started",
      popular: true
    },
    {
      name: "Enterprise",
      priceMonthly: null,
      priceAnnual: null,
      period: "",
      description: "For large institutions with specific needs",
      icon: Rocket,
      features: [
        "Unlimited students",
        "Unlimited courses",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantee",
        "White-label solution",
        "Advanced security",
        "Custom training"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans antialiased overflow-x-hidden">

      {/* Hero Section */}
      <section ref={heroRef} className="relative py-20 px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"
          initial={{ opacity: 0 }}
          animate={heroInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        />
        <motion.div 
          className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <div className="relative mx-auto max-w-7xl text-center">
          <motion.h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={heroInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.7 }}
          >
            Simple, Transparent{" "}
            <span className="bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
              Pricing
            </span>
          </motion.h1>
          <motion.p 
            className="text-lg sm:text-xl text-slate-600 dark:text-text-muted max-w-3xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Choose the perfect plan for your institution. All plans include a 14-day free trial.
          </motion.p>
          
          {/* Billing Toggle */}
          <motion.div 
            className="flex items-center justify-center gap-3 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-text-muted'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-secondary-dark transition-all hover:border-primary"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-primary transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-1'}`}></span>
            </button>
            <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-text-muted'}`}>
              Annual <span className="text-primary">(Save 20%)</span>
            </span>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <div
                  key={index}
                  className={`relative rounded-2xl border p-8 transition-all hover:shadow-2xl hover:shadow-primary/20 hover-lift animate-scale-in ${
                    plan.popular
                      ? "border-primary bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-background-dark scale-105"
                      : "border-slate-200 bg-white dark:border-secondary-dark dark:bg-slate-800"
                  }`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-full bg-primary px-4 py-1 text-xs font-bold text-background-dark">
                        MOST POPULAR
                      </span>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-text-muted">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      {plan.priceMonthly !== null ? (
                        <>
                          <span className="text-5xl font-bold tracking-tight">
                            ${isAnnual ? plan.priceAnnual : plan.priceMonthly}
                          </span>
                          <span className="text-text-muted">{plan.period}</span>
                          {isAnnual && (
                            <span className="ml-2 text-sm text-primary">
                              (billed ${plan.priceAnnual * 12}/year)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-5xl font-bold tracking-tight">Custom</span>
                      )}
                    </div>
                  </div>

                  <button
                    className={`w-full rounded-lg px-6 py-3 text-sm font-bold transition-all mb-8 ${
                      plan.popular
                        ? "bg-primary text-background-dark hover:bg-primary-hover shadow-lg shadow-primary/30"
                        : "bg-slate-100 border border-slate-200 text-slate-900 hover:bg-slate-200 dark:bg-slate-800er dark:border-secondary-dark dark:text-white dark:hover:bg-white/5"
                    }`}
                  >
                    {plan.cta}
                  </button>

                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600 dark:text-text-muted">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800/30">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-600 dark:text-text-muted">Everything you need to know about our pricing</p>
          </div>
          
          <div className="space-y-6">
            {[
              {
                q: "Can I change my plan later?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, PayPal, and wire transfers for enterprise plans."
              },
              {
                q: "Is there a setup fee?",
                a: "No, there are no hidden fees or setup costs. You only pay the monthly subscription price."
              },
              {
                q: "What happens after the free trial?",
                a: "You can choose to subscribe to a paid plan or continue with our free tier with limited features."
              }
            ].map((faq, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-white dark:border-secondary-dark dark:bg-slate-800 p-6 animate-fade-in-up hover-lift"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <h3 className="text-lg font-bold mb-2">{faq.q}</h3>
                <p className="text-slate-600 dark:text-text-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to transform your learning experience?
          </h2>
          <p className="text-lg text-slate-600 dark:text-text-muted mb-8">
            Join thousands of institutions already using EduVerse
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30 hover:scale-105">
                Start Free Trial
              </button>
            </Link>
            <Link href="/contact">
              <button className="px-8 py-3 rounded-lg border border-slate-200 text-slate-900 dark:border-secondary-dark dark:text-white font-bold transition-all hover:bg-slate-100 dark:hover:bg-white/5 hover:border-primary">
                Contact Sales
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
