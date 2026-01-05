import { Puzzle, Zap, Shield, Cloud, Database, Code, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Integrations() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const integrations = [
    {
      name: "Google Workspace",
      description: "Seamlessly integrate with Gmail, Calendar, and Drive for complete productivity",
      icon: Cloud,
      category: "Productivity",
      color: "from-blue-500 to-blue-600"
    },
    {
      name: "Microsoft Teams",
      description: "Connect your LMS with Teams for video conferencing and collaboration",
      icon: Code,
      category: "Communication",
      color: "from-purple-500 to-purple-600"
    },
    {
      name: "Zoom",
      description: "Host live classes and webinars directly from your LMS platform",
      icon: Zap,
      category: "Communication",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      name: "Stripe",
      description: "Process payments for courses and subscriptions securely",
      icon: Shield,
      category: "Payments",
      color: "from-green-500 to-green-600"
    },
    {
      name: "Salesforce",
      description: "Sync student data and manage relationships with CRM integration",
      icon: Database,
      category: "CRM",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      name: "Slack",
      description: "Real-time notifications and team communication within your workspace",
      icon: Puzzle,
      category: "Communication",
      color: "from-pink-500 to-pink-600"
    }
  ];

  const categories = ["All", "Productivity", "Communication", "Payments", "CRM"];

  return (
    <div className="min-h-screen bg-background-dark text-white font-sans antialiased overflow-x-hidden">

      <section className="relative py-20 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"></div>
        <div className="relative mx-auto max-w-7xl text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up">
            Connect Your{" "}
            <span className="bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
              Favorite Tools
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-text-muted max-w-3xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Integrate with the apps you already use. Our platform works seamlessly with over 100+ popular tools and services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Link href="/register">
              <button className="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30 hover:scale-105">
                Get Started Free
              </button>
            </Link>
            <Link href="/contact">
              <button className="px-8 py-3 rounded-lg border border-secondary-dark text-white font-bold transition-all hover:bg-white/5 hover:border-primary">
                Request Integration
              </button>
            </Link>
          </div>
        </div>
      </section>


      <section className="py-8 px-4 sm:px-6 lg:px-8 border-y border-secondary-dark animate-fade-in-up">
        <div className="mx-auto max-w-7xl">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((category, index) => (
              <button
                key={index}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-primary text-background-dark"
                    : "bg-surface-dark border border-secondary-dark text-text-muted hover:bg-white/5 hover:border-primary"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations
              .filter((integration) => selectedCategory === "All" || integration.category === selectedCategory)
              .map((integration, index) => {
              const Icon = integration.icon;
              return (
                <div
                  key={index}
                  className="group relative rounded-2xl border border-secondary-dark bg-surface-dark p-6 transition-all hover:border-primary hover:shadow-2xl hover:shadow-primary/20 hover-lift animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`flex size-12 items-center justify-center rounded-lg bg-gradient-to-br ${integration.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">{integration.name}</h3>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {integration.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-text-muted mb-4">{integration.description}</p>
                  <button className="flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                    Learn More
                    <span className="text-lg">→</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-surface-dark/30">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-in-left">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Build Custom Integrations
              </h2>
              <p className="text-lg text-text-muted mb-6">
                Use our powerful API to create custom integrations tailored to your specific needs. Full documentation and support included.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "RESTful API with comprehensive documentation",
                  "Webhooks for real-time event notifications",
                  "OAuth 2.0 authentication",
                  "Rate limiting and security built-in",
                  "Developer sandbox environment"
                ].map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-text-muted">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/docs">
                <button className="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30 hover:scale-105">
                  View API Docs
                </button>
              </Link>
            </div>
            <div className="rounded-2xl border border-secondary-dark bg-background-dark p-6 font-mono text-sm animate-slide-in-right">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-500"></div>
                  <div className="size-3 rounded-full bg-yellow-500"></div>
                  <div className="size-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-text-muted text-xs">api-request.js</span>
              </div>
              <pre className="text-primary">
                <code>{`fetch('https://api.lmspro.com/v1/courses', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Don't see your integration?
          </h2>
          <p className="text-lg text-text-muted mb-8">
            Let us know what tools you'd like to integrate and we'll prioritize them in our development roadmap.
          </p>
          <Link href="/contact">
            <button className="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30 hover:scale-105">
              Request an Integration
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
