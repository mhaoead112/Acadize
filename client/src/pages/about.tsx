import { useTranslation } from "react-i18next";
import { Lightbulb, Globe, Rocket, Shield, Users, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function About() {
  const { t } = useTranslation('landing');
  const values = [
    { icon: Rocket, title: 'Innovation', desc: 'Constantly pushing boundaries to create better learning experiences.' },
    { icon: Shield, title: 'Integrity', desc: 'Building trust through transparency and honest relationships.' },
    { icon: Users, title: 'User-Centric', desc: 'Our users are at the heart of every feature we build.' },
    { icon: TrendingUp, title: 'Growth', desc: 'Commitment to the continuous improvement of our platform and ourselves.' }
  ];

  const timeline = [
    { year: '2018', title: 'LMS Platform Founded', desc: 'Started with a small team of 3 in a shared workspace with a big dream.' },
    { year: '2020', title: 'First Enterprise Client', desc: 'Secured our first Fortune 500 partnership, validating our enterprise capabilities.' },
    { year: '2022', title: 'Reaching 500k Learners', desc: 'A major milestone in our mission to democratize education globally.' },
    { year: '2023', title: 'Global Expansion', desc: 'Opened offices in London and Singapore to better serve our international markets.' },
  ];

  const stats = [
    { label: 'Active Learners', val: '1M+' },
    { label: 'Enterprise Clients', val: '500+' },
    { label: 'Countries Served', val: '40+' },
    { label: 'Years of Innovation', val: '6' }
  ];

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden w-full min-h-screen font-sans antialiased">

      <section ref={heroRef} className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
          initial={{ opacity: 0 }}
          animate={heroInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        />
        <motion.div 
          className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: -50 }}
              animate={heroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                {t('aboutHeroTitle')}{" "}
                <span className="bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
                  {t('aboutHeroHighlight')}
                </span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-text-muted leading-relaxed">
                We are building the infrastructure for the future of education, helping organizations and individuals unlock their full potential through technology.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/pricing">
                  <button className="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30 hover:scale-105">
                    View Pricing
                  </button>
                </Link>
                <Link href="/contact">
                  <button className="px-8 py-3 rounded-lg border border-slate-300 dark:border-secondary-dark text-slate-900 dark:text-white font-bold transition-all hover:bg-slate-100 dark:hover:bg-white/5 hover:border-primary">
                    Contact Us
                  </button>
                </Link>
              </div>
            </motion.div>
            <div className="relative animate-slide-in-right">
              <div 
                className="w-full aspect-video bg-cover bg-center rounded-2xl shadow-2xl border border-slate-200 dark:border-secondary-dark"
                style={{ backgroundImage: 'linear-gradient(rgba(35, 32, 16, 0.3), rgba(35, 32, 16, 0.3)), url("https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=800&fit=crop")' }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section ref={missionRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-100 dark:bg-slate-800/30 border-y border-slate-200 dark:border-secondary-dark">
        <div className="mx-auto max-w-7xl">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={missionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-primary text-sm font-bold uppercase tracking-wider mb-4">Our Purpose</h2>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              Driving the Future of Learning
            </h1>
            <p className="text-slate-600 dark:text-text-muted max-w-3xl mx-auto">
              Our core principles guide every decision we make, ensuring we stay true to our goal of democratizing education for everyone, everywhere.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group rounded-2xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-slate-800 p-8 hover:border-primary transition-all duration-300 animate-slide-in-left">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-slate-600 dark:text-text-muted leading-relaxed">
                To democratize education through scalable, accessible, and intuitive technology that empowers learners globally to achieve more.
              </p>
            </div>
            <div className="group rounded-2xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-slate-800 p-8 hover:border-primary transition-all duration-300 animate-slide-in-right">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
                <Globe className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
              <p className="text-slate-600 dark:text-text-muted leading-relaxed">
                A world where learning has no boundaries, and every individual has the tools, resources, and community they need to succeed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 animate-fade-in">
            <h2 className="text-3xl font-bold mb-2">Our Core Values</h2>
            <p className="text-slate-600 dark:text-text-muted">The pillars that define our culture and product.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, idx) => {
              const Icon = value.icon;
              return (
                <div 
                  key={idx} 
                  className="group rounded-xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-slate-800 p-6 hover:border-primary hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <Icon className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-text-muted">{value.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Journey Timeline */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-100 dark:bg-slate-800/30 border-y border-slate-200 dark:border-secondary-dark">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6 animate-slide-in-left">
              <h2 className="text-3xl sm:text-4xl font-bold">Our Journey</h2>
              <p className="text-lg text-slate-600 dark:text-text-muted">
                From a small startup to a global leader in education technology, every step has been driven by our passion for learning.
              </p>
              <div 
                className="mt-6 rounded-2xl overflow-hidden aspect-video w-full bg-cover bg-center border border-slate-200 dark:border-secondary-dark shadow-2xl"
                style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800&h=600&fit=crop")' }}
              ></div>
            </div>
            <div className="flex flex-col pl-0 lg:pl-8 border-l-0 lg:border-l border-slate-200 dark:border-secondary-dark space-y-10 animate-slide-in-right">
              {timeline.map((step, idx) => (
                <div key={idx} className="relative group">
                  <div className="hidden lg:block absolute -left-[33px] top-1 h-4 w-4 rounded-full bg-primary border-4 border-white dark:border-background-dark group-hover:scale-125 transition-transform"></div>
                  <span className="text-primary font-bold text-sm">{step.year}</span>
                  <h3 className="text-xl font-bold mt-1 group-hover:text-primary transition-colors">{step.title}</h3>
                  <p className="text-slate-600 dark:text-text-muted mt-2">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div 
                key={idx} 
                className="rounded-2xl border border-slate-200 dark:border-secondary-dark bg-white dark:bg-slate-800 p-8 text-center hover:border-primary hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 animate-scale-in"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <p className="text-slate-600 dark:text-text-muted text-sm font-medium mb-2">{stat.label}</p>
                <p className="text-primary text-4xl font-bold">{stat.val}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-slate-900/80 dark:bg-slate-950/90"></div>
        <div className="relative mx-auto max-w-4xl text-center space-y-6 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to Transform Your Learning Experience?
          </h2>
          <p className="text-lg text-slate-300 dark:text-text-muted">
            Join hundreds of innovative organizations building the future with EduVerse.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/contact">
              <button className="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30 hover:scale-105">
                Request a Demo
              </button>
            </Link>
            <Link href="/pricing">
              <button className="px-8 py-3 rounded-lg border border-slate-300 dark:border-secondary-dark backdrop-blur-sm bg-white/10 text-white font-bold transition-all hover:bg-white/20 hover:border-primary">
                View Pricing
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
