import { Link, useLocation } from "react-router-dom";
import { FileText, Building2, CheckSquare, Upload, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import nttDataLogo from "@/assets/ntt-data-logo.png";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: FileText, label: "RFPs" },
    { path: "/upload", icon: Upload, label: "Upload RFP" },
    { path: "/company", icon: Building2, label: "Company Profile" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-white backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <Link to="/" className="flex items-center gap-3">
              <img src={nttDataLogo} alt="NTT DATA" className="h-[90px] w-auto" />
            </Link>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
