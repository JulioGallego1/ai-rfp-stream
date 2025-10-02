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
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={nttDataLogo} alt="NTT DATA" className="h-12 w-auto" />
            </Link>
            
            <div className="flex gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    location.pathname === item.path
                      ? "bg-primary text-primary-foreground shadow-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
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
