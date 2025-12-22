import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToken, useTokens, sortTokensByPriority } from '@/hooks/useQueueData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import QueueLayout from '@/components/queue/QueueLayout';
import LoadingState from '@/components/queue/LoadingState';
import EmptyState from '@/components/queue/EmptyState';
import PriorityBadge from '@/components/queue/PriorityBadge';
import StatusBadge from '@/components/queue/StatusBadge';
import { 
  Ticket, 
  Clock, 
  Users, 
  ArrowRight, 
  RefreshCw, 
  Search,
  Brain,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

const TokenStatus = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const [searchTokenId, setSearchTokenId] = useState('');
  
  const { token, loading, error, refetch } = useToken(tokenId);
  const { tokens: allWaitingTokens } = useTokens(token?.service_id, 'WAITING');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTokenId.trim()) {
      navigate(`/queue/status/${searchTokenId.trim()}`);
    }
  };

  // Calculate position in queue
  const getPositionInQueue = () => {
    if (!token || !allWaitingTokens.length) return null;
    
    const sortedTokens = sortTokensByPriority(allWaitingTokens);
    const position = sortedTokens.findIndex(t => t.id === token.id);
    return position >= 0 ? position + 1 : null;
  };

  const position = getPositionInQueue();

  // If no tokenId provided, show search form
  if (!tokenId) {
    return (
      <QueueLayout 
        title="Check Token Status" 
        subtitle="Enter your token ID to check your position in the queue"
      >
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Find Your Token
              </CardTitle>
              <CardDescription>
                Enter your token ID to see your queue status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tokenId">Token ID</Label>
                  <Input
                    id="tokenId"
                    placeholder="Enter your token ID"
                    value={searchTokenId}
                    onChange={(e) => setSearchTokenId(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Check Status
                </Button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">Don't have a token yet?</p>
                <Button variant="link" asChild>
                  <Link to="/queue/join">Join the Queue</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </QueueLayout>
    );
  }

  if (loading) {
    return (
      <QueueLayout title="Token Status">
        <LoadingState message="Fetching token status..." />
      </QueueLayout>
    );
  }

  if (error || !token) {
    return (
      <QueueLayout title="Token Status">
        <EmptyState
          icon={Ticket}
          title="Token Not Found"
          description="The token you're looking for doesn't exist or has been removed."
          action={
            <Button asChild>
              <Link to="/queue/join">Join Queue</Link>
            </Button>
          }
        />
      </QueueLayout>
    );
  }

  return (
    <QueueLayout 
      title="Token Status" 
      subtitle="Live updates every 5 seconds"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Token Card */}
        <Card className="border-2">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Ticket className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-4xl font-mono">{token.token_label}</CardTitle>
            <CardDescription>
              {token.citizen_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-4 mb-6">
              <StatusBadge status={token.status} />
              <PriorityBadge priority={token.priority} />
            </div>

            {/* Status-specific content */}
            {token.status === 'WAITING' && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-3xl font-bold text-foreground">{position || '--'}</p>
                    <p className="text-sm text-muted-foreground">Position in Queue</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-3xl font-bold text-foreground">
                      {token.estimated_wait_minutes || '--'}
                    </p>
                    <p className="text-sm text-muted-foreground">Est. Wait (mins)</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {token.status === 'CALLED' && (
              <div className="text-center py-4">
                <div className="animate-pulse">
                  <ArrowRight className="h-12 w-12 mx-auto text-primary" />
                </div>
                <p className="text-xl font-semibold mt-4 text-foreground">
                  Please proceed to the counter
                </p>
                <p className="text-muted-foreground">
                  Called at: {token.called_at ? format(new Date(token.called_at), 'hh:mm a') : '--'}
                </p>
              </div>
            )}

            {token.status === 'COMPLETED' && (
              <div className="text-center py-4">
                <p className="text-lg text-muted-foreground">
                  Service completed at: {token.completed_at ? format(new Date(token.completed_at), 'hh:mm a') : '--'}
                </p>
              </div>
            )}

            {/* AI Prediction Banner */}
            <Card className="mt-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI-Estimated Wait Time
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      ~{token.estimated_wait_minutes || 15} minutes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on historical patterns and current queue load
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timestamps */}
            <div className="mt-6 text-sm text-muted-foreground space-y-1">
              <p>Joined at: {format(new Date(token.joined_at), 'PPp')}</p>
              {token.called_at && <p>Called at: {format(new Date(token.called_at), 'PPp')}</p>}
              {token.completed_at && <p>Completed at: {format(new Date(token.completed_at), 'PPp')}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Refresh Button */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      </div>
    </QueueLayout>
  );
};

export default TokenStatus;
