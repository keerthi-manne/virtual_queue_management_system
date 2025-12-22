import { ReactNode } from 'react';
import QueueHeader from './QueueHeader';

interface QueueLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const QueueLayout = ({ children, title, subtitle }: QueueLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <QueueHeader />
      <main className="container mx-auto px-4 py-8">
        {(title || subtitle) && (
          <div className="mb-8">
            {title && <h1 className="text-3xl font-bold text-foreground">{title}</h1>}
            {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
      <footer className="border-t border-border bg-muted/30 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Virtual Queue Management System • Municipal Services</p>
        </div>
      </footer>
    </div>
  );
};

export default QueueLayout;
