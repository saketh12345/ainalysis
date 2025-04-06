
import { useIsMobile } from "@/hooks/use-mobile";

export default function Header() {
  return (
    <div className="w-full border-b border-gray-200 bg-white/50 backdrop-blur-sm">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-medical-primary to-medical-accent flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full" />
          </div>
          <span className="font-bold text-xl text-medical-dark">MediView AI</span>
        </div>
        <span className="ml-2 text-sm text-gray-500 hidden md:inline-block">Medical Report Analyzer</span>
      </div>
    </div>
  );
}
