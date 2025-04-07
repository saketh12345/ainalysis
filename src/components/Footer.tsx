
import { Shield, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-medivault-dark text-white pt-12 pb-6">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-medivault-primary" />
              <span className="font-bold text-xl">MediVault</span>
            </div>
            <p className="text-sm text-gray-300">
              Your secure platform for managing medical records with convenience and privacy.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/" className="hover:text-medivault-primary">Home</Link></li>
              <li><Link to="/features" className="hover:text-medivault-primary">Features</Link></li>
              <li><Link to="/about" className="hover:text-medivault-primary">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-medivault-primary">Contact</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Legal</h3>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/privacy" className="hover:text-medivault-primary">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-medivault-primary">Terms of Service</Link></li>
              <li><Link to="/data-policy" className="hover:text-medivault-primary">Data Policy</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Contact</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-medivault-primary" />
                <a href="mailto:info@medivault.com" className="hover:text-medivault-primary">info@medivault.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-medivault-primary" />
                <a href="tel:+1-555-123-4567" className="hover:text-medivault-primary">+1 (555) 123-4567</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 text-medivault-primary" />
                <span>123 Health Street, Medical District, MD 12345</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6 flex justify-between items-center">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} MediVault. All rights reserved.</p>
          <div className="flex items-center">
            <span className="text-xs text-gray-400 mr-1">Edit with</span>
            <span className="text-yellow-400">❤</span>
            <span className="ml-1 text-gray-300 text-xs">lovable</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
