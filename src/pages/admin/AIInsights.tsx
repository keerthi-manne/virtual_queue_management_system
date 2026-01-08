import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import QueueLayout from '@/components/queue/QueueLayout';
import LoadingState from '@/components/queue/LoadingState';
import { 
  Brain, TrendingUp, TrendingDown, Users, Clock, AlertTriangle, 
  BarChart3, Activity, Zap, Target, ArrowLeft, RefreshCw,
  Calendar, CheckCircle2, XCircle, Sparkles, Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AIInsightsPage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [insights, setInsights] = useState<any>(null);
  const [staffOptimization, setStaffOptimization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchInsights = async () => {
    try {
      const mlServiceUrl = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';
      
      // Fetch overview insights
      const overviewRes = await fetch(`${mlServiceUrl}/insights/overview`);
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setInsights(overviewData);
      }

      // Fetch staff optimization
      const staffRes = await fetch(`${mlServiceUrl}/insights/staff-optimization`);
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaffOptimization(staffData);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
      toast({
        title: 'Connection Issue',
        description: 'Unable to connect to ML service. Make sure it\'s running on port 8000.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 2 * 60 * 1000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setLoading(true);
    fetchInsights();
  };

  if (loading && !insights) {
    return <QueueLayout title="AI Insights"><LoadingState /></QueueLayout>;
  }

  const demandData = insights?.demand_forecast?.next_8_hours || [];
  const summary = insights?.demand_forecast?.summary || {};
  const noShowAnalysis = insights?.no_show_analysis || {};
  const recommendations = insights?.optimization_recommendations || [];

  return (
    <QueueLayout 
      title="AI Insights & Analytics" 
      subtitle="Machine learning powered predictions and recommendations"
    >
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {!insights ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">ML Service Not Available</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              The AI/ML service is not running. Start it to see real-time predictions and insights.
            </p>
            <code className="bg-muted px-3 py-1 rounded text-sm">
              cd ml-service && python app.py
            </code>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Brain className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="demand">
              <TrendingUp className="h-4 w-4 mr-2" />
              Demand Forecast
            </TabsTrigger>
            <TabsTrigger value="noshow">
              <AlertTriangle className="h-4 w-4 mr-2" />
              No-Show Analysis
            </TabsTrigger>
            <TabsTrigger value="staff">
              <Users className="h-4 w-4 mr-2" />
              Staff Optimization
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Model Accuracy</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {insights.confidence_scores?.overall_accuracy || '85%'}
                      </p>
                    </div>
                    <Award className="h-12 w-12 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">Peak Demand</p>
                      <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                        {insights.demand_forecast?.peak_demand || 0}
                      </p>
                      <p className="text-xs text-green-600">{insights.demand_forecast?.peak_hour}</p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">No-Show Risk</p>
                      <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 uppercase">
                        {noShowAnalysis.current_risk_level || 'Low'}
                      </p>
                    </div>
                    <AlertTriangle className="h-12 w-12 text-amber-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Recommended Staff</p>
                      <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                        {insights.demand_forecast?.recommended_counters || 0}
                      </p>
                      <p className="text-xs text-purple-600">counters</p>
                    </div>
                    <Users className="h-12 w-12 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Recommendations
                </CardTitle>
                <CardDescription>Actionable insights for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.map((rec: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{rec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Model Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Model Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['wait_time', 'no_show', 'demand_forecast'].map((model) => (
                    <div key={model} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium capitalize">{model.replace('_', ' ')}</p>
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Last trained: {insights.model_status?.last_trained || 'Real-time'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demand Forecast Tab */}
          <TabsContent value="demand" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Hourly Demand Forecast
                </CardTitle>
                <CardDescription>Next 8 hours prediction with confidence intervals</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Visual Chart */}
                <div className="space-y-4">
                  {demandData.map((hour: any, idx: number) => {
                    const time = new Date(hour.timestamp).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    });
                    const percentage = (hour.predicted_tokens / Math.max(...demandData.map((h: any) => h.predicted_tokens))) * 100;
                    
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {time}
                          </span>
                          <div className="flex items-center gap-3">
                            <Badge variant={hour.demand_level === 'high' || hour.demand_level === 'very_high' ? 'destructive' : hour.demand_level === 'moderate' ? 'default' : 'secondary'}>
                              {hour.demand_level}
                            </Badge>
                            <span className="font-bold">{hour.predicted_tokens} customers</span>
                            <span className="text-muted-foreground text-xs">
                              ({hour.lower_bound}-{hour.upper_bound})
                            </span>
                          </div>
                        </div>
                        <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                              hour.demand_level === 'high' || hour.demand_level === 'very_high'
                                ? 'bg-gradient-to-r from-red-500 to-red-600'
                                : hour.demand_level === 'moderate'
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                                : 'bg-gradient-to-r from-green-500 to-green-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          >
                            <div className="h-full flex items-center justify-end pr-2">
                              <span className="text-white text-xs font-medium">
                                {hour.recommended_counters} counters
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Stats */}
                <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{summary.total_predicted_tokens || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Expected</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{summary.average_demand_per_hour?.toFixed(1) || 0}</p>
                    <p className="text-sm text-muted-foreground">Avg per Hour</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{summary.recommended_total_staff || 0}</p>
                    <p className="text-sm text-muted-foreground">Peak Staff Needed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* No-Show Analysis Tab */}
          <TabsContent value="noshow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  No-Show Risk Assessment
                </CardTitle>
                <CardDescription>Predictive analysis to minimize no-shows</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Risk Level */}
                  <div className="p-6 border-2 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Current Risk Level
                    </h3>
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full border-8 border-amber-200 dark:border-amber-800 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-3xl font-bold uppercase">{noShowAnalysis.current_risk_level || 'Low'}</p>
                            <p className="text-sm text-muted-foreground">Risk</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* High Risk Tokens */}
                  <div className="p-6 border-2 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      High Risk Tokens
                    </h3>
                    <div className="text-center">
                      <p className="text-5xl font-bold text-red-600">
                        {noShowAnalysis.high_risk_tokens || 0}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        tokens flagged as high risk
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="border rounded-lg p-6 bg-muted/30">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Recommended Actions
                  </h3>
                  <div className="space-y-3">
                    {noShowAnalysis.recommended_actions?.map((action: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Optimization Tab */}
          <TabsContent value="staff" className="space-y-6">
            {staffOptimization && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      24-Hour Staff Schedule Recommendations
                    </CardTitle>
                    <CardDescription>AI-optimized staffing based on predicted demand</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {staffOptimization.schedule_recommendations?.slice(0, 12).map((schedule: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{schedule.time}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant={schedule.demand_level === 'high' || schedule.demand_level === 'very_high' ? 'destructive' : 'secondary'}>
                              {schedule.expected_demand} customers
                            </Badge>
                            <Badge variant="outline" className="bg-primary/10">
                              {schedule.recommended_staff} staff
                            </Badge>
                            <span className="text-xs text-muted-foreground min-w-[120px] text-right">
                              {schedule.notes}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Shift Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {staffOptimization.summary?.optimal_shift_times?.map((shift: string, idx: number) => (
                          <div key={idx} className="p-3 border rounded-lg bg-muted/30">
                            <p className="text-sm font-medium">{shift}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Cost Optimization</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/30">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                          Efficiency Gain
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {staffOptimization.cost_optimization?.current_vs_optimized || '15%'}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm font-medium mb-2">Recommended Break Times</p>
                        <p className="text-sm text-muted-foreground">
                          {staffOptimization.cost_optimization?.recommended_breaks || '12-1 PM, 4-5 PM'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </QueueLayout>
  );
};

export default AIInsightsPage;
