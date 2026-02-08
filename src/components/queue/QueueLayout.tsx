import { ReactNode } from 'react';
import { Users } from 'lucide-react';
import QueueHeader from './QueueHeader';

interface QueueLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const QueueLayout = ({ children, title, subtitle }: QueueLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pattern-dots">
      <QueueHeader />
      <main className="container mx-auto px-4 py-8">
        {(title || subtitle) && (
          <div className="mb-8 animate-fade-in">
            {title && (
              <div className="flex items-center gap-3 mb-2">
                <div className="h-1 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" />
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-slate-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
                  {title}
                </h1>
              </div>
            )}
            {subtitle && (
              <p className="text-slate-600 dark:text-slate-400 ml-16 text-lg font-medium">
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
      <footer className="border-t-2 border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">QueueFlow</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Virtual Queue Management System</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              © 2026 Municipal Services • All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default QueueLayout;
