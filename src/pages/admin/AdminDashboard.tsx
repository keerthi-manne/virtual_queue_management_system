import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOffices, useServices, useTokens, useCounters, useMetrics } from '@/hooks/useQueueData';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import QueueLayout from '@/components/queue/QueueLayout';
import LoadingState from '@/components/queue/LoadingState';
import { 
  Users, Clock, CheckCircle, TrendingUp, Brain, BarChart3, 
  Sparkles, LogOut, AlertTriangle, UserCheck, Accessibility,
  Activity
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { userRecord, loading: userLoading } = useUserRole();
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

  // Priority breakdown
  const priorityBreakdown = {
    EMERGENCY: waitingTokens.filter(t => t.priority === 'EMERGENCY').length,
    DISABLED: waitingTokens.filter(t => t.priority === 'DISABLED').length,
    SENIOR: waitingTokens.filter(t => t.priority === 'SENIOR').length,
    NORMAL: waitingTokens.filter(t => t.priority === 'NORMAL').length,
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (officesLoading || userLoading) {
    return <QueueLayout title="Admin Dashboard"><LoadingState /></QueueLayout>;
  }

  return (
    <QueueLayout 
      title="Admin Dashboard" 
      subtitle={`Welcome, ${userRecord?.name || 'Administrator'}`}
    >
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>

      <div className="space-y-6">
        {/* Office Filter */}
        <Card>
          <CardContent className="pt-6">
            <Select value={selectedOffice} onValueChange={setSelectedOffice}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="All Offices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Offices</SelectItem>
                {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Live Monitoring */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{waitingTokens.length}</p>
              <p className="text-muted-foreground">In Queue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p className="text-3xl font-bold">{avgWait} min</p>
              <p className="text-muted-foreground">Avg Wait</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-bold">{completedToday}</p>
              <p className="text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{activeCounters}</p>
              <p className="text-muted-foreground">Active Counters</p>
            </CardContent>
          </Card>
        </div>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Queue by Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-bold">{priorityBreakdown.EMERGENCY}</p>
                <p className="text-sm text-muted-foreground">Emergency</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 text-center">
                <Accessibility className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{priorityBreakdown.DISABLED}</p>
                <p className="text-sm text-muted-foreground">Disabled</p>
              </div>
              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center">
                <UserCheck className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                <p className="text-2xl font-bold">{priorityBreakdown.SENIOR}</p>
                <p className="text-sm text-muted-foreground">Senior</p>
              </div>
              <div className="p-4 bg-muted rounded-lg border text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{priorityBreakdown.NORMAL}</p>
                <p className="text-sm text-muted-foreground">Normal</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics & AI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> 
                Daily Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Total Tokens</span>
                <span className="font-bold text-lg">{metrics?.total_tokens || allTokens.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-bold text-lg">{metrics?.completed_tokens || completedToday}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Avg Wait Time</span>
                <span className="font-bold text-lg">{metrics?.avg_wait_time || avgWait} min</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Avg Handle Time</span>
                <span className="font-bold text-lg">{metrics?.avg_handle_time || '--'} min</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Peak Hour</span>
                <span className="font-bold text-lg">{metrics?.peak_hour ? `${metrics.peak_hour}:00` : '--'}</span>
              </div>
            </CardContent>
          </Card>

          {/* AI Features Placeholder */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <Sparkles className="h-4 w-4 text-primary" /> 
                AI Insights
              </CardTitle>
              <CardDescription>Powered by machine learning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-background/80 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="font-medium">Demand Forecasting</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Predict busy periods and optimize staff allocation
                </p>
                <p className="text-xs text-primary mt-2">Coming Soon</p>
              </div>
              <div className="p-4 bg-background/80 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="font-medium">No-Show Prediction</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Identify likely no-shows to optimize queue flow
                </p>
                <p className="text-xs text-primary mt-2">Coming Soon</p>
              </div>
              <div className="p-4 bg-background/80 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <p className="font-medium">Staff Optimization</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI-driven counter and staff allocation recommendations
                </p>
                <p className="text-xs text-primary mt-2">Coming Soon</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Queue by Service</CardTitle>
            <CardDescription>Current waiting tokens per service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {services.length > 0 ? services.map(s => {
                const count = waitingTokens.filter(t => t.service_id === s.id).length;
                return (
                  <div key={s.id} className="p-4 border rounded-lg hover:border-primary transition-colors">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-3xl font-bold mt-2">{count}</p>
                    <p className="text-sm text-muted-foreground">waiting</p>
                  </div>
                );
              }) : (
                <p className="text-muted-foreground col-span-3 text-center py-8">
                  Select an office to view service breakdown
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </QueueLayout>
  );
};

export default AdminDashboard;
