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
import { Phone, CheckCircle, Users, Clock, BarChart3, LogOut, XCircle } from 'lucide-react';
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

  const { offices, loading: officesLoading } = useOffices();
  const { services } = useServices(selectedOffice);
  const { counters } = useCounters(selectedOffice);
  const { tokens: waitingTokens, loading: tokensLoading, refetch } = useTokens(selectedService, 'WAITING');
  const { tokens: calledTokens, refetch: refetchCalled } = useTokens(selectedService, 'CALLED');

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
    const { error } = await supabase
      .from('tokens')
      .update({ 
        status: 'CALLED', 
        counter_id: selectedCounter, 
        called_at: new Date().toISOString() 
      })
      .eq('id', nextToken.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to call token', variant: 'destructive' });
    } else {
      toast({ title: 'Token Called', description: `Calling ${nextToken.token_label} - ${nextToken.citizen_name}` });
      refetch();
      refetchCalled();
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
    await signOut();
    navigate('/auth');
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
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>

      <div className="space-y-6">
        {/* Filters */}
        <Card>
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
              <Select value={selectedCounter} onValueChange={setSelectedCounter} disabled={!selectedOffice}>
                <SelectTrigger><SelectValue placeholder="Select Your Counter" /></SelectTrigger>
                <SelectContent>
                  {counters.filter(c => c.is_active).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{sortedTokens.length}</p>
              <p className="text-muted-foreground">Waiting</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{avgHandleTime || '--'} min</p>
              <p className="text-muted-foreground">Avg Handle Time</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{servedCount}</p>
              <p className="text-muted-foreground">Served This Session</p>
            </CardContent>
          </Card>
        </div>

        {/* Currently Serving */}
        {myCalledTokens.length > 0 && (
          <Card className="border-primary border-2">
            <CardHeader>
              <CardTitle className="text-primary">Currently Serving</CardTitle>
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
                      <Button size="sm" variant="destructive" onClick={() => handleNoShow(token)}>
                        <XCircle className="h-4 w-4 mr-1" /> No Show
                      </Button>
                      <Button size="sm" onClick={() => handleComplete(token)}>
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
        <Card>
          <CardHeader>
            <CardTitle>Waiting Queue</CardTitle>
            <CardDescription>Ordered by priority (Emergency → Disabled → Senior → Normal) then join time</CardDescription>
          </CardHeader>
          <CardContent>
            {tokensLoading ? <LoadingState /> : !sortedTokens.length ? (
              <EmptyState icon={Users} title="No tokens waiting" description="The queue is empty" />
            ) : (
              <div className="space-y-3">
                {sortedTokens.map((token, idx) => (
                  <div key={token.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-muted-foreground w-10">#{idx + 1}</span>
                      <div>
                        <p className="font-mono font-bold">{token.token_label}</p>
                        <p className="text-sm text-muted-foreground">{token.citizen_name}</p>
                      </div>
                      <PriorityBadge priority={token.priority} />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Joined {format(new Date(token.joined_at), 'HH:mm')}
                      </span>
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
