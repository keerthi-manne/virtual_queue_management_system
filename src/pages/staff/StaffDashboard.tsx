import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOffices, useServices, useTokens, useCounters, sortTokensByPriority } from '@/hooks/useQueueData';
import { Token } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import QueueLayout from '@/components/queue/QueueLayout';
import LoadingState from '@/components/queue/LoadingState';
import EmptyState from '@/components/queue/EmptyState';
import PriorityBadge from '@/components/queue/PriorityBadge';
import StatusBadge from '@/components/queue/StatusBadge';
import { Phone, CheckCircle, Users, Clock, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

const StaffDashboard = () => {
  const { toast } = useToast();
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedCounter, setSelectedCounter] = useState<string>('');

  const { offices, loading: officesLoading } = useOffices();
  const { services } = useServices(selectedOffice);
  const { counters } = useCounters(selectedOffice);
  const { tokens, loading: tokensLoading, refetch } = useTokens(selectedService, 'WAITING');

  const sortedTokens = sortTokensByPriority(tokens);

  const handleCallNext = async () => {
    if (!sortedTokens.length || !selectedCounter) {
      toast({ title: 'Error', description: 'No tokens in queue or counter not selected', variant: 'destructive' });
      return;
    }

    const nextToken = sortedTokens[0];
    const { error } = await supabase
      .from('tokens')
      .update({ status: 'CALLED', counter_id: selectedCounter, called_at: new Date().toISOString() })
      .eq('id', nextToken.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to call token', variant: 'destructive' });
    } else {
      toast({ title: 'Token Called', description: `Calling ${nextToken.token_label}` });
      refetch();
    }
  };

  const handleComplete = async (token: Token) => {
    const { error } = await supabase
      .from('tokens')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
      .eq('id', token.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to complete token', variant: 'destructive' });
    } else {
      toast({ title: 'Completed', description: `Token ${token.token_label} marked as completed` });
      refetch();
    }
  };

  if (officesLoading) {
    return <QueueLayout title="Staff Dashboard"><LoadingState /></QueueLayout>;
  }

  return (
    <QueueLayout title="Staff Dashboard" subtitle="Manage queue and serve customers">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedOffice} onValueChange={(v) => { setSelectedOffice(v); setSelectedService(''); }}>
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
                <SelectTrigger><SelectValue placeholder="Select Counter" /></SelectTrigger>
                <SelectContent>
                  {counters.filter(c => c.is_active).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 text-center"><Users className="h-8 w-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">{sortedTokens.length}</p><p className="text-muted-foreground">Waiting</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><Clock className="h-8 w-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">--</p><p className="text-muted-foreground">Avg Handle Time</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">--</p><p className="text-muted-foreground">Served Today</p></CardContent></Card>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={handleCallNext} disabled={!sortedTokens.length || !selectedCounter} size="lg">
            <Phone className="h-4 w-4 mr-2" /> Call Next Token
          </Button>
        </div>

        {/* Queue */}
        <Card>
          <CardHeader><CardTitle>Waiting Queue</CardTitle><CardDescription>Ordered by priority and join time</CardDescription></CardHeader>
          <CardContent>
            {tokensLoading ? <LoadingState /> : !sortedTokens.length ? (
              <EmptyState icon={Users} title="No tokens waiting" description="Queue is empty" />
            ) : (
              <div className="space-y-3">
                {sortedTokens.map((token, idx) => (
                  <div key={token.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-muted-foreground">#{idx + 1}</span>
                      <div>
                        <p className="font-mono font-bold">{token.token_label}</p>
                        <p className="text-sm text-muted-foreground">{token.citizen_name}</p>
                      </div>
                      <PriorityBadge priority={token.priority} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{format(new Date(token.joined_at), 'HH:mm')}</span>
                      <Button size="sm" variant="outline" onClick={() => handleComplete(token)}><CheckCircle className="h-4 w-4" /></Button>
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
