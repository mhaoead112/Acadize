'use client';
import { motion } from "framer-motion";
import Link from "next/link"
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MascotFloat } from "@/components/MascotFloat";
import { Users, GraduationCap, Building2, UserCircle, Settings2, ArrowRight } from "lucide-react";
import { GeometricShapes } from "@/components/GeometricShapes";
const mascotWaving = "/images/mascot-3.png";
const mascotFlying = "/images/mascot-2.png";

export default function Solutions() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="bg-background pt-20 pb-20 border-b relative overflow-hidden">
        <GeometricShapes variant="hero" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <motion.div 
              className="flex-1 text-center md:text-left"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-4 inline-flex px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm">
                Solutions
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
                Built for every role. <br/>Designed for every school.
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto md:mx-0">
                A unified ecosystem that adapts to the unique needs of your institution, staff, students, and parents.
              </p>
              <Link href="/contact">
                <Button size="lg" className="text-lg h-14 px-8 shadow-lg hover:shadow-xl transition-all">
                  Book a Demo
                </Button>
              </Link>
            </motion.div>
            <motion.div 
              className="flex-1 flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <MascotFloat src={mascotWaving} alt="Waving Mascot" className="w-full max-w-md drop-shadow-2xl" animation="spin-float" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        <GeometricShapes variant="section" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Solutions for everyone in your school</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: GraduationCap, title: "For Students", desc: "Interactive learning materials, clear assignment tracking, and direct access to educational resources.", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/40" },
              { icon: UserCircle, title: "For Teachers", desc: "Automated grading, AI lesson planning, and streamlined communication with parents and students.", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-950/40" },
              { icon: Users, title: "For Parents", desc: "Real-time updates on attendance, grades, and school announcements all in one mobile-friendly view.", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-950/40" },
              { icon: Settings2, title: "For Administrators", desc: "Comprehensive dashboards for attendance, scheduling, and staff management.", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-950/40" },
              { icon: Building2, title: "For School Owners", desc: "High-level analytics, financial reporting, and multi-campus management capabilities.", color: "text-foreground", bg: "bg-muted" },
            ].map((role, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-8">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${role.bg} ${role.color}`}>
                      <role.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{role.title}</h3>
                    <p className="text-muted-foreground mb-6">{role.desc}</p>
                    <div className="flex items-center text-primary font-medium group-hover:underline">
                      Learn more <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* School Types */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-12">Adaptable to any institution</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-muted/40 border border-border">
              <h3 className="font-bold text-lg mb-2 text-foreground">International Schools</h3>
              <p className="text-muted-foreground text-sm">Multi-language support and complex curriculum frameworks.</p>
            </div>
            <div className="p-6 rounded-2xl bg-muted/40 border border-border">
              <h3 className="font-bold text-lg mb-2 text-foreground">National Schools</h3>
              <p className="text-muted-foreground text-sm">State-standard compliance and local reporting integrations.</p>
            </div>
            <div className="p-6 rounded-2xl bg-muted/40 border border-border">
              <h3 className="font-bold text-lg mb-2 text-foreground">Training Centers</h3>
              <p className="text-muted-foreground text-sm">Flexible scheduling, cohort management, and certification tracking.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — intentionally dark panel */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <GeometricShapes variant="dark" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6">Find the perfect solution for your school</h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">Our team will help you configure Acadize to match your exact workflows.</p>
          <Link href="/contact">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white text-lg h-14 px-10 shadow-xl border-none">
              Talk to Sales
            </Button>
          </Link>
          <MascotFloat src={mascotFlying} alt="Flying Mascot" className="absolute top-10 right-10 lg:right-40 w-32 hidden md:block" animation="sway" />
        </div>
      </section>
    </div>
  );
}
