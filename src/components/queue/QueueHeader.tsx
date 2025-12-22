import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Users, UserCog, LayoutDashboard, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';

const QueueHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Join Queue', href: '/queue/join', icon: Ticket },
    { name: 'Check Status', href: '/queue/status', icon: Users },
    { name: 'Staff Panel', href: '/staff', icon: UserCog },
    { name: 'Admin', href: '/admin', icon: LayoutDashboard },
  ];

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-foreground">QueueFlow</span>
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
