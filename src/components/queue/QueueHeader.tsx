import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Users, UserCog, LayoutDashboard, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import { useUserRole } from '@/hooks/useUserRole';

const QueueHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { role, loading } = useUserRole();

  // Role-based navigation items
  const getNavItems = () => {
    if (loading || !role) return [];

    switch (role) {
      case 'USER':
        return [
          { name: 'Join Queue', href: '/queue/join', icon: Ticket },
          { name: 'Check Status', href: '/queue/status', icon: Users },
        ];
      case 'STAFF':
        return [
          { name: 'Staff Panel', href: '/staff', icon: UserCog },
        ];
      case 'ADMIN':
        return [
          { name: 'Admin', href: '/admin', icon: LayoutDashboard },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b-2 border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">QueueFlow</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1" role="navigation" aria-label="Main navigation">
            {navItems.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.href)}
                className="gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Button>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <ThemeToggle />
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <nav className="flex flex-col space-y-2" role="navigation" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  className="justify-start gap-2"
                  onClick={() => {
                    navigate(item.href);
                    setIsMenuOpen(false);
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-border">
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default QueueHeader;
