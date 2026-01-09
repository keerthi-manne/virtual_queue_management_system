import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOffices, useServices, useTokens, useCounters, useMetrics } from '@/hooks/useQueueData';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import QueueLayout from '@/components/queue/QueueLayout';
import LoadingState from '@/components/queue/LoadingState';
import StaffRequestsManager from '@/components/admin/StaffRequestsManager';
import PriorityVerificationQueue from '@/components/admin/PriorityVerificationQueue';
import { 
  Users, Clock, CheckCircle, TrendingUp, Brain, BarChart3, 
  Sparkles, LogOut, AlertTriangle, UserCheck, Accessibility,
  Activity, Zap, Target, Building, Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { userRecord, loading: userLoading } = useUserRole();
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  const { offices, loading: officesLoading } = useOffices();
  const { services } = useServices(selectedOffice);
  const { counters } = useCounters(selectedOffice);
  const { tokens: waitingTokens } = useTokens(undefined, 'WAITING');
  const { tokens: allTokens } = useTokens();
  const { metrics } = useMetrics(selectedOffice);

  const activeCounters = counters.filter(c => c.is_active).length;
  const completedToday = allTokens.filter(t => t.status === 'completed').length;
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

  // Fetch AI insights
  useEffect(() => {
    const fetchAiInsights = async () => {
      try {
        setLoadingInsights(true);
        const mlServiceUrl = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(`${mlServiceUrl}/insights/overview${selectedOffice ? `?service_id=${selectedOffice}` : ''}`);
        
        if (response.ok) {
          const data = await response.json();
          setAiInsights(data);
        } else {
          console.warn('ML service unavailable, using fallback mode');
          setAiInsights(null);
        }
      } catch (error) {
        console.error('Failed to fetch AI insights:', error);
        setAiInsights(null);
      } finally {
        setLoadingInsights(false);
      }
    };

    fetchAiInsights();
    // Refresh insights every 5 minutes
    const interval = setInterval(fetchAiInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedOffice]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (officesLoading || userLoading) {
    return <QueueLayout title="Admin Dashboard"><LoadingState /></QueueLayout>;
  }

  return (
    <QueueLayout 
      title="Admin Dashboard" 
      subtitle={`Welcome, ${userRecord?.name || 'Administrator'}`}
    >
      <div className="flex justify-end mb-6">
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => navigate('/admin/ai-insights')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Brain className="h-4 w-4 mr-2" />
            AI Insights
            <Sparkles className="h-3 w-3 ml-2 animate-pulse" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Office Filter */}
        <Card className="glass-card animate-fade-in hover-lift shadow-elegant border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <Select value={selectedOffice || 'all'} onValueChange={(v) => setSelectedOffice(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-12 border-2 hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                    <SelectValue placeholder="All Offices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Monitoring */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="stat-card hover-lift animate-fade-in bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-950/30 border-l-4 border-blue-600 shadow-elegant hover:shadow-elegant-lg">
            <CardContent className="pt-8 pb-6">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">Live</span>
              </div>
              <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1">{waitingTokens.length}</p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">In Queue</p>
            </CardContent>
          </Card>
          <Card className="stat-card hover-lift animate-fade-in bg-gradient-to-br from-amber-50 via-amber-50 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 border-l-4 border-amber-600 shadow-elegant hover:shadow-elegant-lg" style={{animationDelay: '0.1s'}}>
            <CardContent className="pt-8 pb-6">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-amber-600 rounded-xl shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded-full">Avg</span>
              </div>
              <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-1">{avgWait} <span className="text-2xl">min</span></p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Average Wait Time</p>
            </CardContent>
          </Card>
          <Card className="stat-card hover-lift animate-fade-in bg-gradient-to-br from-green-50 via-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30 border-l-4 border-green-600 shadow-elegant hover:shadow-elegant-lg" style={{animationDelay: '0.2s'}}>
            <CardContent className="pt-8 pb-6">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-green-600 rounded-xl shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">Today</span>
              </div>
              <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1">{completedToday}</p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed Tokens</p>
            </CardContent>
          </Card>
          <Card className="stat-card hover-lift animate-fade-in bg-gradient-to-br from-purple-50 via-purple-50 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30 border-l-4 border-purple-600 shadow-elegant hover:shadow-elegant-lg" style={{animationDelay: '0.3s'}}>
            <CardContent className="pt-8 pb-6">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-purple-600 rounded-xl shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-purple-600 bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded-full">Active</span>
              </div>
              <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">{activeCounters}</p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Service Counters</p>
            </CardContent>
          </Card>
        </div>

        {/* Priority Breakdown */}
        <Card className="hover-lift animate-fade-in shadow-elegant pattern-dots" style={{animationDelay: '0.4s'}}>
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Priority Distribution</span>
              </CardTitle>
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">Real-time</span>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="group p-5 bg-gradient-to-br from-red-500/10 via-red-500/5 to-rose-500/10 dark:from-red-500/20 dark:to-rose-500/20 rounded-2xl border-2 border-red-200 dark:border-red-800 text-center hover-lift hover:border-red-400 dark:hover:border-red-600 transition-all duration-300 cursor-pointer">
                <div className="p-3 bg-red-500 rounded-xl inline-block mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mb-1">{priorityBreakdown.EMERGENCY}</p>
                <p className="text-xs font-semibold text-red-600/80 dark:text-red-400/80 uppercase tracking-wide">Emergency</p>
              </div>
              <div className="group p-5 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800 text-center hover-lift hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 cursor-pointer">
                <div className="p-3 bg-blue-500 rounded-xl inline-block mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Accessibility className="h-6 w-6 text-white" />
                </div>
                <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mb-1">{priorityBreakdown.DISABLED}</p>
                <p className="text-xs font-semibold text-blue-600/80 dark:text-blue-400/80 uppercase tracking-wide">Disabled</p>
              </div>
              <div className="group p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-yellow-500/10 dark:from-amber-500/20 dark:to-yellow-500/20 rounded-2xl border-2 border-amber-200 dark:border-amber-800 text-center hover-lift hover:border-amber-400 dark:hover:border-amber-600 transition-all duration-300 cursor-pointer">
                <div className="p-3 bg-amber-500 rounded-xl inline-block mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
                <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-500 mb-1">{priorityBreakdown.SENIOR}</p>
                <p className="text-xs font-semibold text-amber-600/80 dark:text-amber-500/80 uppercase tracking-wide">Senior</p>
              </div>
              <div className="group p-5 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-gray-500/10 dark:from-slate-500/20 dark:to-gray-500/20 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-center hover-lift hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer">
                <div className="p-3 bg-slate-500 rounded-xl inline-block mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <p className="text-3xl font-extrabold text-slate-600 dark:text-slate-400 mb-1">{priorityBreakdown.NORMAL}</p>
                <p className="text-xs font-semibold text-slate-600/80 dark:text-slate-400/80 uppercase tracking-wide">Normal</p>
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

          {/* AI Insights - Real Data */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <Sparkles className="h-4 w-4 text-primary" /> 
                AI Insights
              </CardTitle>
              <CardDescription>
                {loadingInsights ? 'Loading AI predictions...' : 'Powered by machine learning'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingInsights ? (
                <div className="flex items-center justify-center py-8">
                  <Activity className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : aiInsights ? (
                <>
                  {/* Demand Forecasting */}
                  <div className="p-4 bg-background/80 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <p className="font-medium">Demand Forecasting</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-700 rounded-full">Active</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Peak at {aiInsights.demand_forecast?.peak_hour}: ~{aiInsights.demand_forecast?.peak_demand} customers
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <Target className="h-3 w-3 text-primary" />
                      <span className="text-primary font-medium">
                        Recommend {aiInsights.demand_forecast?.recommended_counters} counters
                      </span>
                    </div>
                  </div>

                  {/* No-Show Prediction */}
                  <div className="p-4 bg-background/80 rounded-lg border border-amber-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <p className="font-medium">No-Show Prediction</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-700 rounded-full">Active</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Risk Level: {aiInsights.no_show_analysis?.current_risk_level.toUpperCase()}
                    </p>
                    <p className="text-xs text-amber-600">
                      {aiInsights.no_show_analysis?.recommended_actions[0]}
                    </p>
                  </div>

                  {/* Staff Optimization */}
                  <div className="p-4 bg-background/80 rounded-lg border border-blue-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <p className="font-medium">Staff Optimization</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-700 rounded-full">Active</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      AI-driven recommendations for optimal resource allocation
                    </p>
                    {aiInsights.optimization_recommendations?.slice(0, 2).map((rec: string, idx: number) => (
                      <p key={idx} className="text-xs text-blue-600 mb-1 flex items-start gap-1">
                        <Zap className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </p>
                    ))}
                  </div>

                  {/* Model Status */}
                  <div className="pt-3 border-t text-xs text-muted-foreground">
                    <p className="flex items-center justify-between">
                      <span>Model Accuracy:</span>
                      <span className="font-medium text-primary">{aiInsights.confidence_scores?.overall_accuracy}</span>
                    </p>
                    <p className="flex items-center justify-between mt-1">
                      <span>Last Updated:</span>
                      <span className="font-medium">{aiInsights.model_status?.last_trained}</span>
                    </p>
                  </div>
                </>
              ) : (
                // Fallback when ML service unavailable
                <div className="space-y-3">
                  <div className="p-4 bg-background/80 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">Demand Forecasting</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start ML service to view predictions
                    </p>
                    <p className="text-xs text-primary mt-2">Initializing...</p>
                  </div>
                  <div className="p-4 bg-background/80 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">No-Show Prediction</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start ML service to view risk analysis
                    </p>
                    <p className="text-xs text-primary mt-2">Initializing...</p>
                  </div>
                  <div className="p-4 bg-background/80 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">Staff Optimization</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start ML service for AI recommendations
                    </p>
                    <p className="text-xs text-primary mt-2">Initializing...</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => {
                      toast({
                        title: "ML Service",
                        description: "Run: cd ml-service && python app.py"
                      });
                    }}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    How to Enable AI Features
                  </Button>
                </div>
              )}
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

        {/* Priority Verification Queue */}
        <div className="mt-8">
          <PriorityVerificationQueue />
        </div>

        {/* Staff Requests Manager */}
        {userRecord?.id && <StaffRequestsManager adminId={userRecord.id} />}
      </div>
    </QueueLayout>
  );
};

export default AdminDashboard;
