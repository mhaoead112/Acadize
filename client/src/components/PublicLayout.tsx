import React from "react";
import Navbar from "./landing/Navbar";
import { Footer } from "./landing/Footer";
import { useLocation } from "wouter";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  // We can still use location if we need specific hiding logic, 
  // but ideally any route inside <PublicLayout> always shows the navbar/footer
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 font-sans antialiased overflow-x-hidden transition-colors duration-300">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
