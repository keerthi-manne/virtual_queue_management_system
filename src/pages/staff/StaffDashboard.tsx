import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOffices, useServices, useTokens, useCounters, sortTokensByPriority } from '@/hooks/useQueueData';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { Token } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import QueueLayout from '@/components/queue/QueueLayout';
import LoadingState from '@/components/queue/LoadingState';
import EmptyState from '@/components/queue/EmptyState';
import PriorityBadge from '@/components/queue/PriorityBadge';
import { Phone, CheckCircle, Users, Clock, BarChart3, LogOut, XCircle, Send } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

const StaffDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { userRecord, loading: userLoading } = useUserRole();
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedCounter, setSelectedCounter] = useState<string>('');
  const [servedCount, setServedCount] = useState(0);
  const [totalHandleTime, setTotalHandleTime] = useState(0);
  const [requestingTokenId, setRequestingTokenId] = useState<string | null>(null);

  const { offices, loading: officesLoading } = useOffices();
  const { services } = useServices(selectedOffice);
  const { counters } = useCounters(selectedOffice);
  const { tokens: waitingTokens, loading: tokensLoading, refetch } = useTokens(selectedService, 'WAITING');
  const { tokens: calledTokens, refetch: refetchCalled } = useTokens(selectedService, 'CALLED');

  // Filter counters by selected service
  const serviceCounters = selectedService 
    ? counters.filter(c => c.service_id === selectedService)
    : counters;

  // Filter called tokens for this counter
  const myCalledTokens = calledTokens.filter(t => t.counter_id === selectedCounter);
  
  const sortedTokens = sortTokensByPriority(waitingTokens);

  // Auto-select office if user has one assigned
  useEffect(() => {
    if (userRecord?.office_id && !selectedOffice) {
      setSelectedOffice(userRecord.office_id);
    }
  }, [userRecord, selectedOffice]);

  const handleCallNext = async () => {
    if (!sortedTokens.length || !selectedCounter) {
      toast({ title: 'Error', description: 'No tokens in queue or counter not selected', variant: 'destructive' });
      return;
    }

    const nextToken = sortedTokens[0];
    
    try {
      // Update token status
      const { error } = await supabase
        .from('tokens')
        .update({ 
          status: 'CALLED', 
          counter_id: selectedCounter, 
          called_at: new Date().toISOString() 
        })
        .eq('id', nextToken.id);

      if (error) throw error;

      // Send notifications (SMS, WhatsApp, Email)
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/notifications/token-called`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenId: nextToken.id,
            counterId: selectedCounter
          })
        });
        
        if (!response.ok) {
          console.error('Failed to send notifications');
        }
      } catch (notifError) {
        console.error('Notification error:', notifError);
        // Don't fail the whole operation if notifications fail
      }

      toast({ 
        title: 'Token Called', 
        description: `Calling ${nextToken.token_label} - ${nextToken.citizen_name}. Notifications sent!` 
      });
      
      refetch();
      refetchCalled();
    } catch (error) {
      console.error('Error calling token:', error);
      toast({ title: 'Error', description: 'Failed to call token', variant: 'destructive' });
    }
  };

  const handleComplete = async (token: Token) => {
    const { error } = await supabase
      .from('tokens')
      .update({ 
        status: 'COMPLETED', 
        completed_at: new Date().toISOString() 
      })
      .eq('id', token.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to complete token', variant: 'destructive' });
    } else {
      // Calculate handle time
      if (token.called_at) {
        const handleTime = differenceInMinutes(new Date(), new Date(token.called_at));
        setTotalHandleTime(prev => prev + handleTime);
      }
      setServedCount(prev => prev + 1);
      
      toast({ title: 'Completed', description: `Token ${token.token_label} marked as completed` });
      refetch();
      refetchCalled();
    }
  };

  const handleNoShow = async (token: Token) => {
    const { error } = await supabase
      .from('tokens')
      .update({ 
        status: 'NO_SHOW', 
        completed_at: new Date().toISOString() 
      })
      .eq('id', token.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to mark as no-show', variant: 'destructive' });
    } else {
      toast({ title: 'No Show', description: `Token ${token.token_label} marked as no-show` });
      refetch();
      refetchCalled();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({ title: 'Error', description: 'Failed to sign out', variant: 'destructive' });
    }
  };

  const handleRequestToServe = async (token: Token) => {
    if (!userRecord?.id) {
      toast({ title: 'Error', description: 'User ID not found', variant: 'destructive' });
      return;
    }

    if (!selectedCounter) {
      toast({ title: 'Error', description: 'Please select a counter first', variant: 'destructive' });
      return;
    }

    setRequestingTokenId(token.id);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/staff-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: userRecord.id,
          tokenId: token.id,
          counterId: selectedCounter,
          reason: `Request to serve ${token.citizen_name} - Priority: ${token.priority}`
        })
      });

      if (!response.ok) throw new Error('Failed to create request');

      toast({
        title: 'Request Sent',
        description: `Your request to serve ${token.token_label} has been sent to admin for approval.`,
      });
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setRequestingTokenId(null);
    }
  };

  const avgHandleTime = servedCount > 0 ? Math.round(totalHandleTime / servedCount) : 0;

  if (officesLoading || userLoading) {
    return <QueueLayout title="Staff Dashboard"><LoadingState /></QueueLayout>;
  }

  return (
    <QueueLayout 
      title="Staff Dashboard" 
      subtitle={`Welcome, ${userRecord?.name || 'Staff'}`}
    >
      <div className="flex justify-end mb-6">
        <Button variant="outline" size="sm" onClick={handleSignOut} className="hover-lift">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>

      <div className="space-y-6">
        {/* Filters */}
        <Card className="glass-card animate-fade-in hover-lift">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedOffice} onValueChange={(v) => { setSelectedOffice(v); setSelectedService(''); setSelectedCounter(''); }}>
                <SelectTrigger><SelectValue placeholder="Select Office" /></SelectTrigger>
                <SelectContent>
                  {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedService} onValueChange={setSelectedService} disabled={!selectedOffice}>
                <SelectTrigger><SelectValue placeholder="Select Service" /></SelectTrigger>
                <SelectContent>
                  {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedCounter} onValueChange={setSelectedCounter} disabled={!selectedService}>
                <SelectTrigger><SelectValue placeholder="Select Your Counter" /></SelectTrigger>
                <SelectContent>
                  {serviceCounters.map(c => <SelectItem key={c.id} value={c.id}>Counter {c.counter_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="stat-card hover-lift animate-fade-in bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-950/30 border-l-4 border-blue-600 shadow-elegant hover:shadow-elegant-lg">
            <CardContent className="pt-8 pb-6">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">Queue</span>
              </div>
              <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1">{sortedTokens.length}</p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">People Waiting</p>
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
              <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-1">{avgHandleTime || '--'} <span className="text-2xl">min</span></p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Handle Time</p>
            </CardContent>
          </Card>
          <Card className="stat-card hover-lift animate-fade-in bg-gradient-to-br from-green-50 via-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30 border-l-4 border-green-600 shadow-elegant hover:shadow-elegant-lg" style={{animationDelay: '0.2s'}}>
            <CardContent className="pt-8 pb-6">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-green-600 rounded-xl shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">Session</span>
              </div>
              <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1">{servedCount}</p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Tokens Served</p>
            </CardContent>
          </Card>
        </div>

        {/* Currently Serving */}
        {myCalledTokens.length > 0 && (
          <Card className="border-4 border-purple-500 dark:border-purple-600 animate-pulse-glow animate-fade-in shadow-elegant-lg relative overflow-hidden" style={{animationDelay: '0.3s'}}>
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 animate-pulse" />
            <CardHeader className="bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 dark:from-purple-950/30 dark:to-pink-950/30 border-b-2 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-lg animate-pulse">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-700 to-pink-700 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">Currently Serving</CardTitle>
                <span className="ml-auto bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">ACTIVE</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myCalledTokens.map(token => (
                  <div key={token.id} className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-mono font-bold">{token.token_label}</span>
                      <div>
                        <p className="font-medium">{token.citizen_name}</p>
                        {token.citizen_phone && (
                          <p className="text-sm text-muted-foreground">{token.citizen_phone}</p>
                        )}
                      </div>
                      <PriorityBadge priority={token.priority} />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleNoShow(token)}
                        className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
                      >
                        <XCircle className="h-4 w-4 mr-1" /> No Show
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleComplete(token)}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Complete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button 
            onClick={handleCallNext} 
            disabled={!sortedTokens.length || !selectedCounter || myCalledTokens.length > 0} 
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Phone className="h-4 w-4 mr-2" /> Call Next Token
          </Button>
          {myCalledTokens.length > 0 && (
            <p className="text-sm text-muted-foreground self-center">
              Complete current token before calling next
            </p>
          )}
        </div>

        {/* Queue */}
        <Card className="glass-card hover-lift animate-fade-in" style={{animationDelay: '0.4s'}}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="gradient-text">Waiting Queue</span>
            </CardTitle>
            <CardDescription>Ordered by priority (Emergency → Disabled → Senior → Normal) then join time</CardDescription>
          </CardHeader>
          <CardContent>
            {tokensLoading ? <LoadingState /> : !sortedTokens.length ? (
              <EmptyState icon={Users} title="No tokens waiting" description="The queue is empty" />
            ) : (
              <div className="space-y-3">
                {sortedTokens.map((token, idx) => (
                  <div key={token.id} className="group relative flex items-center justify-between p-5 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-400 dark:hover:border-blue-600 bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 hover:shadow-lg transition-all duration-300">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-muted-foreground font-medium uppercase">Position</span>
                        <span className="text-3xl font-extrabold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">#{idx + 1}</span>
                      </div>
                      <div className="h-12 w-px bg-slate-200 dark:bg-slate-700" />
                      <div>
                        <p className="font-mono text-xl font-bold text-slate-900 dark:text-slate-100">{token.token_label}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{token.citizen_name}</p>
                      </div>
                      <PriorityBadge priority={token.priority} />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Joined {format(new Date(token.joined_at), 'HH:mm')}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestToServe(token)}
                        disabled={requestingTokenId === token.id}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {requestingTokenId === token.id ? 'Requesting...' : 'Request to Serve'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </QueueLayout>
  );
};

export default StaffDashboard;
