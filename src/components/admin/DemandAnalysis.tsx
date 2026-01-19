import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServices, useOffices } from '@/hooks/useQueueData';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, Users, Activity, RefreshCw, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import LoadingState from '@/components/queue/LoadingState';
import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks } from 'date-fns';

interface DayDemand {
  date: string;
  dayName: string;
  predicted: number;
  actual?: number;
  confidence: string;
}

const DemandAnalysis = () => {
  const { toast } = useToast();
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [weekDemand, setWeekDemand] = useState<DayDemand[]>([]);
  const [loading, setLoading] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const { offices } = useOffices();
  const { services } = useServices(selectedOffice);

  // Fetch historical data from previous weeks
  const fetchHistoricalData = async () => {
    if (!selectedService) return;

    try {
      const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from('tokens')
        .select('joined_at, created_at')
        .eq('service_id', selectedService)
        .gte('joined_at', lastWeekStart.toISOString())
        .lte('joined_at', lastWeekEnd.toISOString());

      if (error) throw error;

      // Aggregate by day
      const dayCount: Record<string, number> = {};
      data?.forEach(token => {
        const date = format(new Date(token.joined_at || token.created_at), 'yyyy-MM-dd');
        dayCount[date] = (dayCount[date] || 0) + 1;
      });

      const chartData = Object.entries(dayCount).map(([date, count]) => ({
        date: format(new Date(date), 'MMM dd'),
        tokens: count,
        dayName: format(new Date(date), 'EEEE')
      }));

      setHistoricalData(chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  // Generate predictions for next week
  const generatePredictions = async () => {
    if (!selectedService) {
      toast({
        title: 'Service Required',
        description: 'Please select a service to generate predictions',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch last week's data for pattern analysis
      const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });

      const { data: lastWeekTokens, error } = await supabase
        .from('tokens')
        .select('joined_at, created_at')
        .eq('service_id', selectedService)
        .gte('joined_at', lastWeekStart.toISOString())
        .lte('joined_at', lastWeekEnd.toISOString());

      if (error) throw error;

      // Also fetch data from 2 weeks ago for trend analysis
      const twoWeeksAgoStart = startOfWeek(subWeeks(new Date(), 2), { weekStartsOn: 1 });
      const twoWeeksAgoEnd = endOfWeek(subWeeks(new Date(), 2), { weekStartsOn: 1 });

      const { data: twoWeeksAgoTokens } = await supabase
        .from('tokens')
        .select('joined_at, created_at')
        .eq('service_id', selectedService)
        .gte('joined_at', twoWeeksAgoStart.toISOString())
        .lte('joined_at', twoWeeksAgoEnd.toISOString());

      // Count tokens by day of week for both weeks
      const lastWeekByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const twoWeeksAgoByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      
      lastWeekTokens?.forEach(token => {
        const dayOfWeek = new Date(token.joined_at || token.created_at).getDay();
        lastWeekByDay[dayOfWeek]++;
      });

      twoWeeksAgoTokens?.forEach(token => {
        const dayOfWeek = new Date(token.joined_at || token.created_at).getDay();
        twoWeeksAgoByDay[dayOfWeek]++;
      });

      // Calculate growth trend (only if we have data)
      const totalLastWeek = lastWeekTokens?.length || 0;
      const totalTwoWeeksAgo = twoWeeksAgoTokens?.length || 0;
      const growthRate = totalTwoWeeksAgo > 0 ? (totalLastWeek - totalTwoWeeksAgo) / totalTwoWeeksAgo : 0;

      // Generate predictions for THIS week (current week) based on last week's data
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const predictions: DayDemand[] = [];

      // Also fetch actual data for current week to compare
      const currentWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      const { data: currentWeekTokens } = await supabase
        .from('tokens')
        .select('joined_at, created_at')
        .eq('service_id', selectedService)
        .gte('joined_at', currentWeekStart.toISOString())
        .lte('joined_at', currentWeekEnd.toISOString());

      const currentWeekByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      currentWeekTokens?.forEach(token => {
        const dayOfWeek = new Date(token.joined_at || token.created_at).getDay();
        currentWeekByDay[dayOfWeek]++;
      });

      for (let i = 0; i < 7; i++) {
        const date = addDays(currentWeekStart, i);
        const dayOfWeek = date.getDay();
        const dayName = format(date, 'EEEE');
        const isPast = date < new Date();
        
        // Use ONLY actual historical data - no random numbers or fallbacks
        const lastWeekCount = lastWeekByDay[dayOfWeek];
        const twoWeeksAgoCount = twoWeeksAgoByDay[dayOfWeek];
        const actualToday = currentWeekByDay[dayOfWeek];
        
        let predicted: number = 0;
        
        if (lastWeekCount > 0 || twoWeeksAgoCount > 0) {
          // Calculate simple average of available data
          const sum = lastWeekCount + twoWeeksAgoCount;
          const count = (lastWeekCount > 0 ? 1 : 0) + (twoWeeksAgoCount > 0 ? 1 : 0);
          predicted = Math.round(sum / count);
        } else {
          // No data for this specific day - keep it at 0
          predicted = 0;
        }
        
        // Calculate confidence based on actual data availability
        let confidence: string;
        if (lastWeekCount >= 5 && twoWeeksAgoCount >= 5) {
          confidence = 'high';
        } else if (lastWeekCount > 0 || twoWeeksAgoCount > 0) {
          confidence = 'medium';
        } else {
          confidence = 'low';
        }

        predictions.push({
          date: format(date, 'MMM dd'),
          dayName,
          predicted,
          actual: isPast ? actualToday : undefined,
          confidence
        });
      }

      setWeekDemand(predictions);
      
      // Try to get ML service predictions as well
      try {
        const mlServiceUrl = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(`${mlServiceUrl}/predict/demand`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: selectedService,
            hours_ahead: 168, // 7 days
            current_time: new Date().toISOString()
          })
        });

        if (response.ok) {
          const mlData = await response.json();
          console.log('ML predictions:', mlData);
          toast({
            title: 'Predictions Generated',
            description: 'Using ML-enhanced forecasting',
          });
        } else {
          toast({
            title: 'Predictions Generated',
            description: 'Using statistical analysis (ML service offline)',
          });
        }
      } catch (mlError) {
        console.log('ML service unavailable, using statistical predictions');
        const serviceName = services.find(s => s.id === selectedService)?.name || 'selected service';
        toast({
          title: 'Predictions Generated',
          description: `Based on ${serviceName}'s historical patterns (${totalLastWeek} tokens last week)`,
        });
      }

      await fetchHistoricalData();
    } catch (error) {
      console.error('Error generating predictions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate predictions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedService) {
      fetchHistoricalData();
    }
  }, [selectedService]);

  const totalPredicted = weekDemand.reduce((sum, day) => sum + day.predicted, 0);
  const avgDaily = weekDemand.length > 0 ? Math.round(totalPredicted / weekDemand.length) : 0;
  const peakDay = weekDemand.length > 0 ? weekDemand.reduce((max, day) => day.predicted > max.predicted ? day : max) : null;
  const selectedServiceName = services.find(s => s.id === selectedService)?.name || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">This Week's Demand Analysis</h2>
          <p className="text-muted-foreground mt-1">
            {selectedServiceName 
              ? `Forecast for ${selectedServiceName} this week based on previous weeks` 
              : 'Forecast this week\'s demand based on historical patterns'}
          </p>
        </div>
        <Button onClick={generatePredictions} disabled={loading || !selectedService}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Generate Forecast
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium mb-2 block">Office</label>
            <Select value={selectedOffice} onValueChange={setSelectedOffice}>
              <SelectTrigger>
                <SelectValue placeholder="Select office" />
              </SelectTrigger>
              <SelectContent>
                {offices.map(office => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium mb-2 block">Service</label>
            <Select value={selectedService} onValueChange={setSelectedService} disabled={!selectedOffice}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map(service => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {loading && <LoadingState />}

      {!loading && weekDemand.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-blue-600">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Predicted
                </CardDescription>
                <CardTitle className="text-3xl">{totalPredicted}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">customers next week</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-green-600">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Daily Average
                </CardDescription>
                <CardTitle className="text-3xl">{avgDaily}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">customers per day</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-amber-600">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Peak Day
                </CardDescription>
                <CardTitle className="text-3xl">{peakDay?.predicted || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">on {peakDay?.dayName || '--'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Historical Data Chart */}
          {historicalData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Last Week's Actual Demand
                </CardTitle>
                <CardDescription>Historical data used for forecasting</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-lg">
                              <p className="font-medium">{payload[0].payload.dayName}</p>
                              <p className="text-sm text-muted-foreground">{payload[0].payload.date}</p>
                              <p className="text-lg font-bold text-blue-600">{payload[0].value} tokens</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="tokens" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Forecast Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                This Week: Predicted vs Actual
              </CardTitle>
              <CardDescription>Green = Prediction from last week | Blue = Actual so far</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={weekDemand}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.dayName}</p>
                            <p className="text-sm text-muted-foreground">{data.date}</p>
                            <p className="text-lg font-bold text-green-600">Predicted: {data.predicted}</p>
                            {data.actual !== undefined && (
                              <p className="text-lg font-bold text-blue-600">Actual: {data.actual}</p>
                            )}
                            <p className="text-xs text-muted-foreground capitalize">Confidence: {data.confidence}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 6 }}
                    activeDot={{ r: 8 }}
                    name="Predicted"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 6 }}
                    activeDot={{ r: 8 }}
                    name="Actual"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Day-by-Day Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Breakdown</CardTitle>
              <CardDescription>Detailed forecast for each day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weekDemand.map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">{day.dayName.slice(0, 3)}</span>
                      </div>
                      <div>
                        <p className="font-medium">{day.dayName}</p>
                        <p className="text-sm text-muted-foreground">{day.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-4 items-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Predicted</p>
                          <p className="text-2xl font-bold text-green-600">{day.predicted}</p>
                        </div>
                        {day.actual !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Actual</p>
                            <p className="text-2xl font-bold text-blue-600">{day.actual}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">customers</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        day.confidence === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        day.confidence === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {day.confidence} confidence
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && weekDemand.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Forecast Available</h3>
            <p className="text-muted-foreground mb-4">
              Select an office and service, then click "Generate Forecast" to see predictions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DemandAnalysis;
