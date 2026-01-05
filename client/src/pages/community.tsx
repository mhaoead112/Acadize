import { Users, MessageSquare, Calendar, Trophy, TrendingUp, Heart } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Community() {
  const [activeTab, setActiveTab] = useState("discussions");
  const stats = [
    { icon: Users, value: "50K+", label: "Community Members" },
    { icon: MessageSquare, value: "100K+", label: "Discussions" },
    { icon: Calendar, value: "500+", label: "Events Hosted" },
    { icon: Trophy, value: "1K+", label: "Success Stories" }
  ];

  const forums = [
    {
      title: "General Discussion",
      description: "Share ideas, ask questions, and connect with other educators",
      members: "12.5K",
      posts: "45.2K",
      icon: MessageSquare
    },
    {
      title: "Course Design",
      description: "Best practices and tips for creating engaging course content",
      members: "8.3K",
      posts: "23.1K",
      icon: TrendingUp
    },
    {
      title: "Student Success",
      description: "Strategies to help students achieve their learning goals",
      members: "10.1K",
      posts: "31.5K",
      icon: Trophy
    },
    {
      title: "Technical Support",
      description: "Get help with technical issues and platform features",
      members: "15.2K",
      posts: "52.8K",
      icon: Users
    }
  ];

  const events = [
    {
      title: "Webinar: Advanced Analytics for Educators",
      date: "Dec 18, 2024",
      time: "2:00 PM EST",
      attendees: "234 registered"
    },
    {
      title: "Monthly Community Meetup",
      date: "Dec 22, 2024",
      time: "3:00 PM EST",
      attendees: "156 registered"
    },
    {
      title: "Workshop: Creating Interactive Assessments",
      date: "Dec 28, 2024",
      time: "1:00 PM EST",
      attendees: "189 registered"
    }
  ];

  return (
    <div className="min-h-screen bg-background-dark text-white font-sans antialiased overflow-x-hidden">

      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=600&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className="relative mx-auto max-w-7xl text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Join Our{" "}
            <span className="bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
              Community
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-text-muted max-w-3xl mx-auto mb-8">
            Connect with thousands of educators, share knowledge, and grow together in the world's largest learning management community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30">
                Join Community
              </button>
            </Link>
            <button className="px-8 py-3 rounded-lg border border-secondary-dark text-white font-bold transition-all hover:bg-white/5">
              Browse Forums
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-secondary-dark bg-surface-dark/30">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-sm text-text-muted">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Forums */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">Discussion Forums</h2>
            <p className="text-text-muted">Explore topics and join conversations</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {forums.map((forum, index) => {
              const Icon = forum.icon;
              return (
                <div
                  key={index}
                  className="group rounded-2xl border border-secondary-dark bg-surface-dark p-6 hover:border-primary hover:shadow-2xl hover:shadow-primary/20 transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {forum.title}
                      </h3>
                      <p className="text-sm text-text-muted">{forum.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-text-muted pt-4 border-t border-secondary-dark">
                    <div>
                      <span className="font-bold text-white">{forum.members}</span> members
                    </div>
                    <div>
                      <span className="font-bold text-white">{forum.posts}</span> posts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-surface-dark/30">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold mb-4">Upcoming Events</h2>
              <p className="text-text-muted mb-8">Join live sessions, workshops, and community meetups</p>
              
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-secondary-dark bg-surface-dark p-6 hover:border-primary transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2">{event.title}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{event.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>•</span>
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{event.attendees}</span>
                          </div>
                        </div>
                      </div>
                      <button className="px-6 py-2 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover whitespace-nowrap">
                        Register
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border border-secondary-dark bg-surface-dark p-6">
                <h3 className="text-lg font-bold mb-4">Community Guidelines</h3>
                <ul className="space-y-3 text-sm text-text-muted">
                  <li className="flex items-start gap-2">
                    <Heart className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Be respectful and supportive</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Heart className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Share knowledge generously</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Heart className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Keep discussions on-topic</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Heart className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>No spam or self-promotion</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-secondary-dark bg-surface-dark p-6">
                <h3 className="text-lg font-bold mb-2">Need Help?</h3>
                <p className="text-sm text-text-muted mb-4">
                  Our support team is here to assist you
                </p>
                <Link href="/help-center">
                  <button className="w-full px-4 py-2 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover">
                    Visit Help Center
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to join the conversation?
          </h2>
          <p className="text-lg text-text-muted mb-8">
            Create your free account and connect with educators worldwide
          </p>
          <Link href="/register">
            <button className="px-8 py-3 rounded-lg bg-primary text-background-dark font-bold transition-all hover:bg-primary-hover shadow-lg shadow-primary/30">
              Join Community Now
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
