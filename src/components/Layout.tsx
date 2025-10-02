import { Link, useLocation } from "react-router-dom";
import { FileText, Building2, Upload } from "lucide-react";
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
      {/* Banner superior blanco con logo centrado */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-center">
          <Link to="/">
            <img src={nttDataLogo} alt="NTT DATA" className="h-[90px] w-auto" />
          </Link>
        </div>
      </div>

      {/* Navbar colorido debajo del banner */}
      <nav className="bg-gradient-to-r from-primary via-secondary to-accent shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 transition-all relative group",
                  location.pathname === item.path
                    ? "text-white font-semibold"
                    : "text-white/80 hover:text-white font-medium"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {location.pathname === item.path && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-t-full"></div>
                )}
              </Link>
            ))}
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
