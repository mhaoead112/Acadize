'use client';
import { motion } from "framer-motion";
import Link from "next/link"
import { Button } from "@/components/ui/button";
import { MascotFloat } from "@/components/MascotFloat";
import { Lightbulb, ShieldCheck, Heart, Globe } from "lucide-react";
import { GeometricShapes } from "@/components/GeometricShapes";
const mascotWaving = "/images/mascot-3.png";
const mascotThumbsUp = "/images/mascot-4.png";

export default function About() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero / Mission — intentionally dark panel */}
      <section className="bg-slate-900 text-white pt-24 pb-32 relative overflow-hidden">
        <GeometricShapes variant="dark" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-8">
              Transforming education through intelligent technology
            </h1>
            <p className="text-xl text-slate-300">
              Our Vision: Every school empowered by AI. Every teacher given their time back. Every student given the tools to succeed.
            </p>
          </motion.div>
          <MascotFloat src={mascotWaving} alt="Waving Mascot" className="absolute -bottom-48 right-0 lg:right-10 w-48 drop-shadow-2xl z-10 hidden md:block" animation="spin-float" />
        </div>
      </section>

      {/* Story */}
      <section className="py-24 bg-background relative z-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">Why We Built Acadize</h2>
          <div className="prose prose-lg text-muted-foreground dark:prose-invert max-w-none">
            <p>
              We noticed a pattern. Schools were using up to a dozen different tools to run their daily operations: one app for attendance, another for grades, a third for parent communication, and yet another for financial management.
            </p>
            <p>
              This fragmentation was causing massive inefficiencies. Teachers were spending more time doing data entry than actually teaching. Data was siloed, making it impossible for administrators to get a clear picture of school health. Parents were confused by multiple logins.
            </p>
            <p>
              Acadize was built to be the single source of truth. By combining robust school management features with cutting-edge AI assistance, we're building the operating system for modern education.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        <GeometricShapes variant="section" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl font-bold text-center text-foreground mb-16">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Lightbulb, title: "Innovation", desc: "Always pushing the boundaries of what educational technology can achieve." },
              { icon: ShieldCheck, title: "Integrity", desc: "Protecting student data and building trust through transparent practices." },
              { icon: Heart, title: "Impact", desc: "Measuring our success by the positive difference we make in classrooms." },
              { icon: Globe, title: "Inclusivity", desc: "Building tools that are accessible and beneficial to all types of learners." }
            ].map((value, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card p-8 rounded-2xl border border-border shadow-sm text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-6">
                  <value.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{value.title}</h3>
                <p className="text-muted-foreground">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-16">Leadership Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: "Sarah Jenkins", role: "Chief Executive Officer", initials: "SJ" },
              { name: "David Chen", role: "Chief Technology Officer", initials: "DC" },
              { name: "Elena Rodriguez", role: "Head of Product", initials: "ER" },
              { name: "Marcus Johnson", role: "Head of Customer Success", initials: "MJ" }
            ].map((member, i) => (
              <div key={i} className="text-center">
                <div className="w-32 h-32 mx-auto rounded-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground mb-4">
                  {member.initials}
                </div>
                <h3 className="text-xl font-bold text-foreground">{member.name}</h3>
                <p className="text-primary font-medium">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30 border-t">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Join our mission</h2>
            <p className="text-lg text-muted-foreground">We're always looking for passionate people to join our team.</p>
          </div>
          <div className="flex gap-4">
            <Button size="lg" variant="outline">View Open Roles</Button>
            <Link href="/contact"><Button size="lg">Contact Us</Button></Link>
          </div>
          <MascotFloat src={mascotThumbsUp} alt="Thumbs Up Mascot" className="w-24 hidden lg:block" animation="bounce" />
        </div>
      </section>
    </div>
  );
}
