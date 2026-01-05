import { Link } from "wouter";
import { Logo } from "./logo";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white py-20 relative overflow-hidden">
      {/* Luxury Background Elements */}
      <div className="absolute top-0 left-0 w-full h-px gold-shimmer"></div>
      <div className="absolute top-10 right-20 w-24 h-24 bg-gradient-to-br from-yellow-400/10 to-blue-400/10 rounded-full blur-lg"></div>
      <div className="absolute bottom-20 left-20 w-32 h-32 bg-gradient-to-br from-purple-400/5 to-yellow-400/5 rounded-full blur-xl"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">
          {/* School Info */}
          <div>
            <div className="mb-8 transform hover:scale-105 transition-transform duration-300">
              <Logo showText={true} className="text-white" />
            </div>
            <p className="text-gray-300 mb-6 text-lg font-elegant leading-relaxed">
              Empowering global citizens through luxury education excellence since 2025.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="w-12 h-12 premium-glass rounded-2xl flex items-center justify-center hover:bg-yellow-500/20 transition-all duration-300 hover:scale-110 border border-yellow-400/30"
              >
                <Facebook size={20} />
              </a>
              <a
                href="#"
                className="w-12 h-12 premium-glass rounded-2xl flex items-center justify-center hover:bg-yellow-500/20 transition-all duration-300 hover:scale-110 border border-yellow-400/30"
              >
                <Twitter size={20} />
              </a>
              <a
                href="#"
                className="w-12 h-12 premium-glass rounded-2xl flex items-center justify-center hover:bg-yellow-500/20 transition-all duration-300 hover:scale-110 border border-yellow-400/30"
              >
                <Instagram size={20} />
              </a>
              <a
                href="#"
                className="w-12 h-12 premium-glass rounded-2xl flex items-center justify-center hover:bg-yellow-500/20 transition-all duration-300 hover:scale-110 border border-yellow-400/30"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-2xl font-luxury mb-8 text-yellow-400">Quick Links</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/about" className="text-gray-300 hover:text-yellow-300 transition-all duration-300 hover:translate-x-2 font-premium text-lg">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/programs" className="text-gray-300 hover:text-yellow-300 transition-all duration-300 hover:translate-x-2 font-premium text-lg">
                  Academic Programs
                </Link>
              </li>
              <li>
                <Link href="/admissions" className="text-gray-300 hover:text-yellow-300 transition-all duration-300 hover:translate-x-2 font-premium text-lg">
                  Admissions
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-yellow-300 transition-all duration-300 hover:translate-x-2 font-premium text-lg">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/ai-chat" className="text-gray-300 hover:text-yellow-300 transition-all duration-300 hover:translate-x-2 font-premium text-lg">
                  Ask EduVerse AI
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Programs */}
          <div>
            <h3 className="text-2xl font-luxury mb-8 text-yellow-400">Our Programs</h3>
            <ul className="space-y-4">
              <li><span className="text-gray-300 font-premium text-lg">💎 Elementary School (PYP)</span></li>
              <li><span className="text-gray-300 font-premium text-lg">✨ Middle School (MYP)</span></li>
              <li><span className="text-gray-300 font-premium text-lg">🏆 High School (DP)</span></li>
              <li><span className="text-gray-300 font-premium text-lg">🌟 IGCSE Programme</span></li>
              <li><span className="text-gray-300 font-premium text-lg">🗣️ Language Immersion</span></li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h3 className="text-2xl font-luxury mb-8 text-yellow-400">Contact Info</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-eduverse-blue mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-300">
                  6th of October City<br />
                  Giza, Egypt
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-eduverse-blue" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span className="text-gray-300">01000701016</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-eduverse-blue" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span className="text-gray-300">info@eduverse.edu</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Footer */}
        <div className="border-t border-gradient-to-r border-yellow-400/30 mt-16 pt-12 text-center">
          <div className="mb-6">
            <div className="w-20 h-px gold-shimmer mx-auto"></div>
          </div>
          <p className="text-gray-400 font-elegant text-lg">
            © {currentYear} EduVerse. All rights reserved. |{" "}
            <a href="#" className="hover:text-yellow-300 transition-all duration-300 font-premium">
              Privacy Policy
            </a>{" "}
            |{" "}
            <a href="#" className="hover:text-yellow-300 transition-all duration-300 font-premium">
              Terms of Service
            </a>
          </p>
          <p className="text-gray-500 mt-4 font-elegant">
            Crafted with excellence for discerning educational families
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
