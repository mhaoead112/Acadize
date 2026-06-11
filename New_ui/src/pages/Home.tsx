'use client';
import { motion } from "framer-motion";
import Link from "next/link"
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Shield, Zap, CheckCircle2, BookOpen, MessageSquare, ClipboardCheck, BarChart3, Users, Clock } from "lucide-react";
import { MascotFloat } from "@/components/MascotFloat";
import { GeometricShapes } from "@/components/GeometricShapes";
const mascotWaving = "/images/mascot-3.png";
const mascotFlying = "/images/mascot-2.png";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <GeometricShapes variant="hero" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
            <motion.div 
              className="flex-1 text-center lg:text-left z-10"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeIn} className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm">
                <Zap className="w-4 h-4" />
                All-in-One School Platform
              </motion.div>
              <motion.h1 variants={fadeIn} className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-tight">
                Simplify School. <br/>
                <span className="text-primary">Maximize Potential.</span>
              </motion.h1>
              <motion.p variants={fadeIn} className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto lg:mx-0">
                Acadize is a modern, AI-powered platform that helps schools, teachers, parents, and students manage learning, communication, and operations in one place.
              </motion.p>
              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
                <Link href="/contact">
                  <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 shadow-lg hover:shadow-xl transition-all">
                    Book a Demo
                  </Button>
                </Link>
                <Button size="lg" variant="ghost" className="w-full sm:w-auto text-lg h-14 px-8 gap-2 group">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Play className="w-4 h-4 fill-current" />
                  </span>
                  Watch 2-Min Demo
                </Button>
              </motion.div>
              <motion.div variants={fadeIn} className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> Easy to Use</div>
                <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-accent" /> AI-Powered</div>
                <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Secure & Reliable</div>
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex-1 relative w-full max-w-lg lg:max-w-none"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-full blur-3xl -z-10 transform scale-110"></div>
              <MascotFloat src={mascotWaving} alt="Waving Mascot" className="w-full h-auto max-w-[500px] mx-auto drop-shadow-2xl" animation="spin-float" />
              
              <motion.div 
                className="absolute top-1/4 -left-8 lg:-left-16 bg-card p-4 rounded-2xl shadow-xl border border-border flex flex-col gap-1"
                animate={{ y: [-10, 10, -10] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">User Rating</div>
                <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                  9.5 <span className="text-accent text-lg">★★★★★</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-10 border-b bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-widest mb-8">
            Trusted by schools and organizations worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground"><Shield className="w-6 h-6" /> Greenfield Int.</div>
            <div className="flex items-center gap-2 font-bold text-xl text-foreground"><BookOpen className="w-6 h-6" /> Bright Future</div>
            <div className="flex items-center gap-2 font-bold text-xl text-foreground"><Users className="w-6 h-6" /> Maple Leaf</div>
            <div className="flex items-center gap-2 font-bold text-xl text-foreground"><Shield className="w-6 h-6" /> New Horizon</div>
          </div>
        </div>
      </section>

      {/* The Problem & Solution */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        <GeometricShapes variant="section" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">One Platform. Everything Your School Needs.</h2>
            <p className="text-lg text-muted-foreground">Replace dozens of fragmented tools with one cohesive ecosystem designed specifically for education.</p>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {[
              { icon: BookOpen, title: "Learning Management", desc: "Create courses, assignments, and track progress." },
              { icon: MessageSquare, title: "Communication Center", desc: "Seamless messaging between teachers, parents, and students." },
              { icon: ClipboardCheck, title: "Attendance Management", desc: "Automated QR attendance and reporting." },
              { icon: BarChart3, title: "Analytics & Reports", desc: "Deep insights into student performance and school health." },
              { icon: Zap, title: "AI-Powered Tools", desc: "Automate grading, lesson planning, and student support." },
              { icon: Users, title: "Parent Engagement", desc: "Keep parents informed with real-time updates." }
            ].map((feature, i) => (
              <motion.div key={i} variants={fadeIn}>
                <Card className="h-full border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-8 flex flex-col items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI Features */}
      <section className="py-24 bg-background overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              className="flex-1"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-yellow-700 dark:text-accent font-medium text-sm">
                <Zap className="w-4 h-4" />
                Acadize AI
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">Save time with AI that works for you.</h2>
              <ul className="space-y-6 mb-10">
                <li className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground mb-1">Generate quizzes in seconds</h4>
                    <p className="text-muted-foreground">Turn any lesson content into an interactive quiz instantly.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground mb-1">Create lesson plans instantly</h4>
                    <p className="text-muted-foreground">Give AI your topic and standards, get a full lesson plan.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground mb-1">Get learning insights</h4>
                    <p className="text-muted-foreground">Identify struggling students before they fall behind.</p>
                  </div>
                </li>
              </ul>
              <Link href="/features">
                <Button variant="outline" size="lg" className="h-12 px-8">Explore AI Features</Button>
              </Link>
            </motion.div>

            <motion.div 
              className="flex-1 relative"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl relative z-10 border border-slate-800">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-slate-400 text-sm font-mono">AI Study Buddy</div>
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">U</div>
                    <div className="bg-slate-800 p-3 rounded-xl rounded-tl-none text-slate-200">
                      Can you explain photosynthesis to a 5th grader?
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">A</div>
                    <div className="bg-primary/10 p-3 rounded-xl rounded-tl-none text-blue-100">
                      Sure! Imagine a plant is like a little chef. It uses sunlight as its stove, water as its ingredients, and carbon dioxide (the air we breathe out) to cook up its own food!
                    </div>
                  </div>
                </div>
              </div>
              <MascotFloat src={mascotFlying} alt="Flying Mascot" className="absolute -right-12 -bottom-12 w-48 z-20 drop-shadow-2xl" animation="sway" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-black mb-2">500k+</div>
              <div className="text-blue-200 font-medium">Students</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black mb-2">50k+</div>
              <div className="text-blue-200 font-medium">Teachers</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black mb-2">1,200+</div>
              <div className="text-blue-200 font-medium">Schools</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black mb-2">99%</div>
              <div className="text-blue-200 font-medium">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 lg:p-16 text-center text-white relative overflow-hidden shadow-2xl">
            <GeometricShapes variant="cta" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2"></div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Your School?</h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">Join hundreds of schools already using Acadize to streamline operations and enhance learning.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact">
                <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-10 bg-primary hover:bg-primary/90 text-white shadow-xl hover:shadow-2xl transition-all border-none">
                  Book a Demo
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-10 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
