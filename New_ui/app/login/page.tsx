'use client';
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Eye, EyeOff, Zap, Shield, BarChart3, Users, ArrowRight } from "lucide-react";
import { MascotFloat } from "@/components/MascotFloat";
const mascotWaving = "/images/mascot-3.png";

const FEATURES = [
  { icon: <Zap className="w-4 h-4" />, text: "AI-powered lesson planning & grading" },
  { icon: <BarChart3 className="w-4 h-4" />, text: "Real-time analytics & reporting" },
  { icon: <Users className="w-4 h-4" />, text: "Parent & student communication hub" },
  { icon: <Shield className="w-4 h-4" />, text: "Enterprise-grade security & privacy" },
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email address";
    if (!form.password || form.password.length < 6) e.password = "Password must be at least 6 characters";
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
  };

  const change = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="min-h-[calc(100vh-5rem)] flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-gradient-to-br from-slate-900 via-primary/90 to-slate-900 overflow-hidden flex-col justify-between p-12">
        {/* Background glow blobs */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

        {/* Top: Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/images/logo-icon.png" alt="Acadize" className="h-9 w-auto object-contain" />
            <span className="text-white text-xl font-extrabold tracking-tight">Acadize</span>
          </Link>
        </motion.div>

        {/* Middle: Welcome back + mascot */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-10">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl xl:text-5xl font-extrabold text-white text-center mb-12"
          >
            Welcome back
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="w-64 xl:w-80"
          >
            <MascotFloat src={mascotWaving} alt="Acadize mascot" className="w-full h-auto drop-shadow-2xl" animation="spin-float" />
          </motion.div>
        </div>
      </div>

      {/* ── Right panel: Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <img src="/images/logo-icon.png" alt="Acadize" className="h-9 w-auto object-contain" />
              <span className="text-xl font-extrabold tracking-tight">Acadize</span>
            </Link>
          </div>

          <h2 className="text-3xl font-extrabold text-foreground mb-1.5">Sign in</h2>
          <p className="text-muted-foreground mb-8">
            Don't have an account?{" "}
            <Link href="/contact" className="text-primary font-semibold hover:underline">
              Get started free
            </Link>
          </p>

          {/* Social login */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Google", icon: "G" },
              { label: "Microsoft", icon: "M" },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                className="flex items-center justify-center gap-2.5 h-11 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-semibold text-foreground"
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-extrabold">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@school.edu"
                value={form.email}
                onChange={change("email")}
                className={`h-11 ${errors.email ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                autoComplete="email"
              />
              {errors.email && <p className="text-destructive text-xs mt-1.5">{errors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link href="#" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={change("password")}
                  className={`h-11 pr-11 ${errors.password ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-xs mt-1.5">{errors.password}</p>}
            </div>

            <div className="flex items-center gap-2.5">
              <Checkbox
                id="remember"
                checked={form.remember}
                onCheckedChange={(v) => setForm((p) => ({ ...p, remember: Boolean(v) }))}
              />
              <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Remember me for 30 days
              </Label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Trust badges */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {[
                { icon: <Shield className="w-3.5 h-3.5" />, text: "SOC 2 Certified" },
                { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: "FERPA Compliant" },
                { icon: <Shield className="w-3.5 h-3.5" />, text: "256-bit Encryption" },
              ].map((b) => (
                <span key={b.text} className="flex items-center gap-1.5">
                  <span className="text-primary">{b.icon}</span>
                  {b.text}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
