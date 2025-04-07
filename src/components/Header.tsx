
import { Shield } from "lucide-react";

export default function Header() {
  return (
    <header className="w-full border-b border-gray-200 bg-white py-3">
      <div className="container flex items-center justify-between">
        <a 
          href="https://preview--medivault-final.lovable.app/" 
          className="flex items-center gap-2 text-medivault-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Shield className="h-6 w-6" />
          <span className="font-bold text-xl">MediVault</span>
        </a>
      </div>
    </header>
  );
}
