'use client';
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link"
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, X } from "lucide-react";
import { MascotFloat } from "@/components/MascotFloat";
import { GeometricShapes } from "@/components/GeometricShapes";
const mascotThumbsUp = "/images/mascot-4.png";
const mascotThinking = "/images/mascot-5.png";
const mascotFlying = "/images/mascot-2.png";

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: "Free",
      price: "$0",
      desc: "Perfect for small pilot programs.",
      features: [
        "Up to 50 users",
        "5GB Storage",
        "Community support",
        "Basic exam tools",
        "10 AI queries/month"
      ],
      notIncluded: ["QR attendance", "AI answer evaluation", "Custom domain"],
      cta: "Get Started",
      highlight: false
    },
    {
      name: "Starter",
      price: annual ? "$24" : "$29",
      desc: "For growing educational centers.",
      features: [
        "Up to 150 users",
        "20GB Storage",
        "Email support",
        "Full exam engine",
        "100 AI queries/month",
        "QR attendance",
        "AI answer evaluation"
      ],
      notIncluded: ["Custom domain"],
      cta: "Start Free Trial",
      highlight: false
    },
    {
      name: "Pro",
      price: annual ? "$64" : "$79",
      desc: "Everything you need for a full school.",
      features: [
        "Up to 500 users",
        "100GB Storage",
        "Priority support",
        "1,000 AI queries/month",
        "AI lesson digestion",
        "Exam anti-cheat",
        "Multi-language",
        "Custom domain"
      ],
      notIncluded: [],
      cta: "Start Free Trial",
      highlight: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      desc: "For large school districts.",
      features: [
        "Unlimited users",
        "500GB+ Storage",
        "Dedicated account manager",
        "Unlimited AI",
        "Advanced AI models",
        "Custom SLA",
        "Full customization",
        "Private cloud optional"
      ],
      notIncluded: [],
      cta: "Contact Sales",
      highlight: false
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="bg-muted/30 pt-20 pb-16 border-b relative overflow-hidden">
        <GeometricShapes variant="hero" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
              Simple, Transparent Pricing <br/>for Every Institution
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Choose the plan that fits your school's size and needs. No hidden fees.
            </p>
            
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`text-sm font-medium ${!annual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
              <Switch checked={annual} onCheckedChange={setAnnual} />
              <span className={`text-sm font-medium flex items-center gap-2 ${annual ? 'text-foreground' : 'text-muted-foreground'}`}>
                Annually <span className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full">Save 20%</span>
              </span>
            </div>
          </motion.div>

          <MascotFloat src={mascotThumbsUp} alt="Thumbs Up Mascot" className="absolute top-0 right-10 lg:right-32 w-32 hidden md:block" animation="bounce" />
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-background -mt-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex"
              >
                <Card className={`w-full flex flex-col relative ${plan.highlight ? 'border-primary shadow-xl scale-105 z-10' : 'border-border shadow-sm'}`}>
                  {plan.highlight && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      {plan.price !== "Custom" && <span className="text-muted-foreground">/mo</span>}
                    </div>
                    <ul className="space-y-3 text-sm">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          <span className="text-foreground/90">{f}</span>
                        </li>
                      ))}
                      {plan.notIncluded.map((f, j) => (
                        <li key={j} className="flex items-start gap-3 opacity-50">
                          <X className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground line-through">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${plan.highlight ? '' : 'bg-muted text-foreground hover:bg-muted/80 border-none shadow-none'}`}
                    >
                      {plan.cta}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        <GeometricShapes variant="section" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
          </div>
          
          <Accordion type="single" collapsible className="w-full bg-card rounded-2xl p-6 shadow-sm border border-border">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-medium">Can I change plans later?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                Yes, you can upgrade or downgrade your plan at any time. Prorated charges will be applied automatically to your next billing cycle.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-medium">Is there a setup fee?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                No, there are no hidden setup fees for Free, Starter, or Pro plans. Enterprise plans may include a one-time setup fee depending on the complexity of the data migration.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-medium">What payment methods do you accept?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. For Enterprise plans, we also accept manual invoicing and wire transfers.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg font-medium">Do you offer refunds?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                We offer a 14-day money-back guarantee for all new subscriptions. If you're not satisfied, simply contact support within the first 14 days for a full refund.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <MascotFloat src={mascotThinking} alt="Thinking Mascot" className="absolute -left-16 bottom-0 w-48 hidden lg:block" animation="float" />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background border-t relative overflow-hidden">
        <GeometricShapes variant="section" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <MascotFloat src={mascotFlying} alt="Flying Mascot" className="absolute right-10 -top-10 w-28 hidden lg:block" animation="sway" />
          <h2 className="text-3xl font-bold mb-6 text-foreground">Not sure which plan is right for you?</h2>
          <div className="flex justify-center gap-4">
            <Link href="/contact"><Button size="lg">Book a Demo</Button></Link>
            <Link href="/contact"><Button size="lg" variant="outline">Contact Sales</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
