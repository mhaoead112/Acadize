import React from "react";
import { Navbar } from "@/components/landing-new/Navbar";
import { Footer } from "@/components/landing-new/Footer";
import { useLocation } from "wouter";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  // We can still use location if we need specific hiding logic, 
  // but ideally any route inside <PublicLayout> always shows the navbar/footer
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased overflow-x-hidden transition-colors duration-300">
      <Navbar />
      <main className="flex-1 flex flex-col pt-20">
        {children}
      </main>
      <Footer />
    </div>
  );
}
