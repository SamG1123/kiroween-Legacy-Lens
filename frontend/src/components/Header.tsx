import { Link, useLocation } from 'react-router-dom';
import { Code2, Home } from 'lucide-react';
import { Button } from './ui/button';
import { HelpDialog } from './Help';

export default function Header() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <header 
      className="border-b bg-white shadow-sm sticky top-0 z-50"
      role="banner"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <Link 
            to="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible-ring rounded-md"
            aria-label="Legacy Code Revival - Return to home page"
          >
            <Code2 
              className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" 
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <span className="text-base sm:text-xl font-bold text-gray-900">
                Legacy Code Revival
              </span>
              <span className="text-xs text-gray-500 hidden sm:block">
                AI-Powered Code Analysis
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav 
            className="flex items-center gap-2 sm:gap-4"
            aria-label="Main navigation"
          >
            {!isHomePage && (
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <Link 
                  to="/" 
                  className="flex items-center gap-1 sm:gap-2 focus-visible-ring"
                  aria-label="Return to dashboard"
                >
                  <Home className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sr-only sm:hidden">Dashboard</span>
                </Link>
              </Button>
            )}
            <HelpDialog />
          </nav>
        </div>
      </div>
    </header>
  );
}
