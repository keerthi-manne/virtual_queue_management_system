import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import PriorityBadge from '@/components/queue/PriorityBadge';
import StatusBadge from '@/components/queue/StatusBadge';
import { 
  Ticket, 
  Clock, 
  Users, 
  RefreshCw, 
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import apiService from '@/services/api';
import { socketService } from '@/services/socket';

export default function PublicTokenStatus() {
  const { tokenNumber } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTokenStatus = async () => {
    if (!tokenNumber) return;
    
    setRefreshing(true);
    setError(null);
    
    try {
      const response = await apiService.getTokenByNumber(tokenNumber);
      setToken(response);
    } catch (err: any) {
      console.error('Error fetching token:', err);
      setError(err.response?.data?.error || 'Token not found. Please check your token number.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTokenStatus();

    // Setup socket connection for real-time updates
    if (tokenNumber) {
      socketService.connect();
      
      // Listen for token updates
      socketService.onTokenUpdate((updatedToken) => {
        if (updatedToken.token_label === tokenNumber) {
          setToken(updatedToken);
        }
      });

      socketService.onQueueUpdate((update) => {
        // Refresh if queue changes
        if (token && update.serviceId === token.service_id) {
          fetchTokenStatus();
        }
      });
    }

    return () => {
      socketService.disconnect();
    };
  }, [tokenNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading token status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Token Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/check-status')} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try Another Token
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) return null;

  const getStatusIcon = () => {
    switch (token.status) {
      case 'WAITING': return <Clock className="h-6 w-6 text-blue-500" />;
      case 'CALLED': return <AlertCircle className="h-6 w-6 text-orange-500 animate-pulse" />;
      case 'SERVING': return <Users className="h-6 w-6 text-green-500" />;
      case 'COMPLETED': return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'NO_SHOW': return <XCircle className="h-6 w-6 text-red-500" />;
      case 'CANCELLED': return <XCircle className="h-6 w-6 text-gray-500" />;
      default: return <Ticket className="h-6 w-6" />;
    }
  };

  const getStatusMessage = () => {
    switch (token.status) {
      case 'WAITING': 
        return 'Please wait for your turn. You will be notified when called.';
      case 'CALLED': 
        return '🔔 Your token has been called! Please proceed to the counter immediately.';
      case 'SERVING': 
        return 'You are currently being served.';
      case 'COMPLETED': 
        return 'Service completed. Thank you!';
      case 'NO_SHOW': 
        return 'Token expired due to no-show. Please visit the counter for assistance.';
      case 'CANCELLED': 
        return 'Token has been cancelled.';
      default: 
        return 'Status unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/check-status')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Check Another Token
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchTokenStatus}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Main Status Card */}
        <Card className="mb-6 shadow-xl border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <CardTitle className="text-3xl">
                    Token {token.token_label}
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    {token.services?.name || 'Service'}
                  </CardDescription>
                </div>
              </div>
              <StatusBadge status={token.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className={token.status === 'called' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' : ''}>
              <AlertDescription className="text-base font-medium">
                {getStatusMessage()}
              </AlertDescription>
            </Alert>

            {/* Token Details Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Priority</div>
                <PriorityBadge priority={token.priority} />
              </div>

              {token.counter_number && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Counter Number</div>
                  <div className="text-2xl font-bold">{token.counter_number}</div>
                </div>
              )}

              {token.estimated_wait_time && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Estimated Wait Time
                  </div>
                  <div className="text-2xl font-bold">{token.estimated_wait_time} min</div>
                </div>
              )}

              {token.position_in_queue && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Position in Queue
                  </div>
                  <div className="text-2xl font-bold">#{token.position_in_queue}</div>
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Issued At</div>
                <div className="font-medium">
                  {format(new Date(token.created_at), 'PPp')}
                </div>
              </div>

              {token.called_at && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Called At</div>
                  <div className="font-medium">
                    {format(new Date(token.called_at), 'PPp')}
                  </div>
                </div>
              )}
            </div>

            {/* Live Updates Indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4 border-t">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Live updates enabled - Status will update automatically
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Keep this page open to receive real-time updates</p>
            <p>• When your token is called, please proceed to the counter immediately</p>
            <p>• If you miss your call, please visit the help desk</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
