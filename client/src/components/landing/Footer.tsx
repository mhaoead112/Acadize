import { Link } from "wouter";
import { Twitter, Linkedin, Facebook, Instagram } from "lucide-react";

const logoImg = "/images/logo-icon.png";

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t pt-16 pb-8" data-testid="footer">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-6 inline-flex">
              <img
                src={logoImg}
                alt="Acadize"
                className="h-8 w-auto object-contain"
              />
              <span className="font-bold text-xl tracking-tight text-foreground">Acadize</span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              The all-in-one school platform that simplifies operations and maximizes student potential. Learn. Teach. Achieve.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-card border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors" data-testid="social-twitter" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-card border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors" data-testid="social-linkedin" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-card border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors" data-testid="social-facebook" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-card border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors" data-testid="social-instagram" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-6 text-foreground">Features</h3>
            <ul className="space-y-4">
              <li><Link href="/features" className="text-muted-foreground hover:text-primary transition-colors">Learning Management</Link></li>
              <li><Link href="/features" className="text-muted-foreground hover:text-primary transition-colors">Teacher Tools</Link></li>
              <li><Link href="/features" className="text-muted-foreground hover:text-primary transition-colors">Parent Engagement</Link></li>
              <li><Link href="/features" className="text-muted-foreground hover:text-primary transition-colors">AI Assistant</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-6 text-foreground">Solutions</h3>
            <ul className="space-y-4">
              <li><Link href="/solutions" className="text-muted-foreground hover:text-primary transition-colors">For Schools</Link></li>
              <li><Link href="/solutions" className="text-muted-foreground hover:text-primary transition-colors">For Teachers</Link></li>
              <li><Link href="/solutions" className="text-muted-foreground hover:text-primary transition-colors">For Parents</Link></li>
              <li><Link href="/solutions" className="text-muted-foreground hover:text-primary transition-colors">For Students</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-6 text-foreground">Company</h3>
            <ul className="space-y-4">
              <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Careers</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Acadize Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/help-center" className="hover:text-foreground transition-colors">Help Center</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
