import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const formatSegment = (str: string) => {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-sans" aria-label="Breadcrumb">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        // Skip rendering "dashboard" or "pages" redundant keywords if it is the first segment
        if (value.toLowerCase() === 'dashboard' && index === 0 && pathnames.length > 1) {
          return null;
        }

        return (
          <React.Fragment key={to}>
            <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-600 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                {formatSegment(value)}
              </span>
            ) : (
              <Link
                to={to}
                className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors truncate max-w-[120px]"
              >
                {formatSegment(value)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
