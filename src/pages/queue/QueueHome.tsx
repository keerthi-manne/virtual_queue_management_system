import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import QueueLayout from '@/components/queue/QueueLayout';
import { Ticket, Users, UserCog, LayoutDashboard, ArrowRight } from 'lucide-react';

const QueueHome = () => {
  const features = [
    { title: 'Join Queue', description: 'Get a token and join the queue', icon: Ticket, href: '/queue/join', color: 'bg-blue-500' },
    { title: 'Check Status', description: 'Track your position in queue', icon: Users, href: '/queue/status', color: 'bg-green-500' },
    { title: 'Staff Panel', description: 'Manage and call tokens', icon: UserCog, href: '/staff', color: 'bg-amber-500' },
    { title: 'Admin Dashboard', description: 'Monitor and analytics', icon: LayoutDashboard, href: '/admin', color: 'bg-purple-500' },
  ];

  return (
    <QueueLayout>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">Virtual Queue Management</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Efficient queue management for municipal and public offices. Join queues, track your position, and get served faster.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {features.map((feature) => (
          <Card key={feature.title} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to={feature.href}>
                  Go to {feature.title} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </QueueLayout>
  );
};

export default QueueHome;
