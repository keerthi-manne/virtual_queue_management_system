import { useState } from 'react';
import { useOffices, useServices, useTokens, useCounters, useMetrics } from '@/hooks/useQueueData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import QueueLayout from '@/components/queue/QueueLayout';
import LoadingState from '@/components/queue/LoadingState';
import { Users, Clock, CheckCircle, TrendingUp, Brain, BarChart3, Sparkles } from 'lucide-react';

const AdminDashboard = () => {
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const { offices, loading: officesLoading } = useOffices();
  const { services } = useServices(selectedOffice);
  const { counters } = useCounters(selectedOffice);
  const { tokens: waitingTokens } = useTokens(undefined, 'WAITING');
  const { tokens: allTokens } = useTokens();
  const { metrics } = useMetrics(selectedOffice);

  const activeCounters = counters.filter(c => c.is_active).length;
  const completedToday = allTokens.filter(t => t.status === 'COMPLETED').length;
  const avgWait = waitingTokens.length > 0 
    ? Math.round(waitingTokens.reduce((acc, t) => acc + (t.estimated_wait_minutes || 0), 0) / waitingTokens.length)
    : 0;

  if (officesLoading) {
    return <QueueLayout title="Admin Dashboard"><LoadingState /></QueueLayout>;
  }

  return (
    <QueueLayout title="Admin Dashboard" subtitle="Monitor queues and view analytics">
      <div className="space-y-6">
        {/* Office Filter */}
        <Card>
          <CardContent className="pt-6">
            <Select value={selectedOffice} onValueChange={setSelectedOffice}>
              <SelectTrigger className="max-w-xs"><SelectValue placeholder="All Offices" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Offices</SelectItem>
                {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Live Monitoring */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 text-center"><Users className="h-8 w-8 mx-auto mb-2 text-blue-500" /><p className="text-3xl font-bold">{waitingTokens.length}</p><p className="text-muted-foreground">In Queue</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><Clock className="h-8 w-8 mx-auto mb-2 text-amber-500" /><p className="text-3xl font-bold">{avgWait} min</p><p className="text-muted-foreground">Avg Wait</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" /><p className="text-3xl font-bold">{completedToday}</p><p className="text-muted-foreground">Completed</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-500" /><p className="text-3xl font-bold">{activeCounters}</p><p className="text-muted-foreground">Active Counters</p></CardContent></Card>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Daily Analytics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Tokens</span><span className="font-bold">{metrics?.total_tokens || allTokens.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="font-bold">{metrics?.completed_tokens || completedToday}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avg Wait Time</span><span className="font-bold">{metrics?.avg_wait_time || avgWait} min</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Peak Hour</span><span className="font-bold">{metrics?.peak_hour ? `${metrics.peak_hour}:00` : '--'}</span></div>
            </CardContent>
          </Card>

          {/* AI Features Placeholder */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /><Sparkles className="h-4 w-4" /> AI Insights</CardTitle><CardDescription>Powered by machine learning</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-background/50 rounded-lg"><p className="text-sm font-medium">Demand Forecasting</p><p className="text-xs text-muted-foreground">Predict busy periods (Coming Soon)</p></div>
              <div className="p-3 bg-background/50 rounded-lg"><p className="text-sm font-medium">No-Show Prediction</p><p className="text-xs text-muted-foreground">Identify likely no-shows (Coming Soon)</p></div>
              <div className="p-3 bg-background/50 rounded-lg"><p className="text-sm font-medium">Staff Optimization</p><p className="text-xs text-muted-foreground">Optimal counter allocation (Coming Soon)</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Services Breakdown */}
        <Card>
          <CardHeader><CardTitle>Queue by Service</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {services.map(s => {
                const count = waitingTokens.filter(t => t.service_id === s.id).length;
                return (
                  <div key={s.id} className="p-4 border rounded-lg">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">waiting</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </QueueLayout>
  );
};

export default AdminDashboard;
