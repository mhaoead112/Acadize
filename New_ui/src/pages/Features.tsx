'use client';
import { motion } from "framer-motion";
import Link from "next/link"
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MascotFloat } from "@/components/MascotFloat";
import { CheckCircle2, Shield, Lock, Cloud, Zap, BookOpen, MessageSquare, ClipboardCheck, BarChart3, Users, Settings } from "lucide-react";
import { GeometricShapes } from "@/components/GeometricShapes";
const mascotFlying = "/images/mascot-2.png";
const mascotWaving = "/images/mascot-3.png";

export default function Features() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="bg-muted/30 pt-20 pb-20 border-b relative overflow-hidden">
        <GeometricShapes variant="hero" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
              Everything your school needs. <br/><span className="text-primary">One platform.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10">
              Powerful tools designed to simplify administrative tasks, engage parents, and empower teachers.
            </p>
            <Link href="/contact">
              <Button size="lg" className="text-lg h-14 px-8 shadow-lg hover:shadow-xl transition-all">
                Book a Demo
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Powerful features for every aspect of your school</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: "Learning Management", color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400", desc: "Create, distribute, and grade assignments with ease. Support for rich media, quizzes, and automated grading." },
              { icon: ClipboardCheck, title: "Attendance Tracking", color: "bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400", desc: "Automated QR code attendance, quick daily logs, and instant parent notifications for absences." },
              { icon: MessageSquare, title: "Communication", color: "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400", desc: "Secure messaging channels between staff, students, and parents. Broadcast announcements easily." },
              { icon: BarChart3, title: "Analytics & Reports", color: "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400", desc: "Visual dashboards tracking student performance, attendance trends, and school-wide metrics." },
              { icon: Zap, title: "AI Assistant", color: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400", desc: "Smart tools to help teachers generate lesson plans, grade essays, and provide personalized feedback." },
              { icon: Settings, title: "School Operations", color: "bg-muted text-muted-foreground", desc: "Manage schedules, room allocations, transport, and inventory from a centralized dashboard." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-8">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${feature.color}`}>
                      <feature.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Tools Section — intentionally dark panel */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <GeometricShapes variant="dark" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              className="flex-1"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">Save time with AI that works for you.</h2>
              <p className="text-slate-300 text-lg mb-8">Our intelligent assistant helps educators reclaim hours of administrative work every week.</p>
              
              <ul className="space-y-6">
                {[
                  "Generate comprehensive lesson plans from simple prompts",
                  "Automatically evaluate short answers and essays",
                  "Create differentiated materials for different reading levels",
                  "Analyze student performance to identify learning gaps"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-accent shrink-0 mt-0.5" />
                    <span className="text-slate-200 text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              className="flex-1 relative w-full"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl relative z-10">
                <div className="space-y-6 font-mono text-sm">
                  <div className="flex flex-col gap-2">
                    <span className="text-slate-400">Teacher</span>
                    <div className="bg-slate-700 p-4 rounded-xl text-slate-200">
                      Create a 10-question multiple choice quiz on the solar system for 6th graders.
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-primary flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Acadize AI
                    </span>
                    <div className="bg-primary/20 border border-primary/30 p-4 rounded-xl text-blue-100">
                      Here is your quiz on the solar system... [Quiz Generated] <br/><br/>
                      Would you like me to export this directly to your Science 101 classroom assignments?
                    </div>
                  </div>
                </div>
              </div>
              <MascotFloat src={mascotFlying} alt="Flying Mascot" className="absolute -top-12 -right-8 w-40 z-20" animation="sway" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-16">Enterprise-Grade Security</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-8">
                <Cloud className="w-12 h-12 text-primary mx-auto mb-6" />
                <h3 className="text-xl font-bold mb-3">Cloud Based</h3>
                <p className="text-muted-foreground">Reliable uptime and automated backups ensure your data is always accessible and safe.</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-8">
                <Shield className="w-12 h-12 text-primary mx-auto mb-6" />
                <h3 className="text-xl font-bold mb-3">Data Encryption</h3>
                <p className="text-muted-foreground">End-to-end encryption for all sensitive student and school information.</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-8">
                <Lock className="w-12 h-12 text-primary mx-auto mb-6" />
                <h3 className="text-xl font-bold mb-3">Role & Permissions</h3>
                <p className="text-muted-foreground">Granular access control ensures users only see what they are authorized to see.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <GeometricShapes variant="cta" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
            <h2 className="text-4xl font-bold text-white">Ready to transform your school?</h2>
            <MascotFloat src={mascotWaving} alt="Waving Mascot" className="w-32 hidden md:block" animation="bounce" />
          </div>
          <Link href="/contact">
            <Button size="lg" className="bg-white text-primary hover:bg-muted text-lg h-14 px-10 shadow-xl">
              Book a Demo
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
