
import { Link } from "react-router-dom";
import { Home, InfoIcon, Contact, ShieldHeart } from "lucide-react";

export default function Header() {
  return (
    <header className="w-full border-b border-gray-200 bg-white py-3">
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-medivault-primary">
          <ShieldHeart className="h-6 w-6" />
          <span className="font-bold text-xl">MediVault</span>
        </Link>
        
        <nav>
          <ul className="flex items-center gap-6">
            <li>
              <Link to="/" className="flex items-center gap-1 text-gray-700 hover:text-medivault-primary">
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
            </li>
            <li>
              <Link to="/about" className="flex items-center gap-1 text-gray-700 hover:text-medivault-primary">
                <InfoIcon className="h-4 w-4" />
                <span>About</span>
              </Link>
            </li>
            <li>
              <Link to="/contact" className="flex items-center gap-1 text-gray-700 hover:text-medivault-primary">
                <Contact className="h-4 w-4" />
                <span>Contact</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
