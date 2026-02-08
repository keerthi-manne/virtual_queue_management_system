import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RescheduleRequest {
  id: string;
  request_status: string;
  requested_at: string;
  expires_at: string;
  tokens: {
    token_label: string;
    services: {
      name: string;
    };
  };
  users: {
    name: string;
    email: string;
  };
  new_token?: {
    token_label: string;
  };
}

export default function RescheduleConfirmation() {
  const { requestId } = useParams<{ requestId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RescheduleRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined' | 'expired' | null>(null);

  // Auto-action from URL params
  const autoAction = searchParams.get('action');

  useEffect(() => {
    fetchRescheduleRequest();
  }, [requestId]);

  useEffect(() => {
    if (request && autoAction && request.request_status === 'pending') {
      if (autoAction === 'accept') {
        handleAccept();
      } else if (autoAction === 'decline') {
        handleDecline();
      }
    }
  }, [request, autoAction]);

  const fetchRescheduleRequest = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reschedule/request/${requestId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reschedule request');
      }

      const data = await response.json();
      setRequest(data);
      setStatus(data.request_status);

      // Check if expired
      if (new Date(data.expires_at) < new Date() && data.request_status === 'pending') {
        setStatus('expired');
      }
    } catch (error) {
      console.error('Error fetching reschedule request:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reschedule request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!requestId) return;

    try {
      setProcessing(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reschedule/accept/${requestId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept reschedule');
      }

      const data = await response.json();
      
      // Update request with new token data
      setRequest(prev => prev ? {
        ...prev,
        request_status: 'accepted',
        new_token: data.newToken || data.new_token
      } : null);
      
      setStatus('accepted');
      
      toast({
        title: 'Success! 🎉',
        description: `Your new token is ${data.newToken?.token_label || data.new_token?.token_label}`,
      });
    } catch (error: any) {
      console.error('Error accepting reschedule:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!requestId) return;

    try {
      setProcessing(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reschedule/decline/${requestId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to decline reschedule');
      }

      setStatus('declined');
      
      toast({
        title: 'Request Declined',
        description: 'Your reschedule request has been declined',
      });
    } catch (error: any) {
      console.error('Error declining reschedule:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getTimeRemaining = () => {
    if (!request) return '';
    const now = new Date();
    const expiry = new Date(request.expires_at);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">Loading reschedule request...</p>
        </Card>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <XCircle className="w-16 h-16 mx-auto text-red-500" />
          <h2 className="text-2xl font-bold mt-4">Request Not Found</h2>
          <p className="text-gray-600 mt-2">This reschedule request doesn't exist or has been removed.</p>
          <Button className="mt-6" onClick={() => navigate('/')}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  // Render based on status
  if (status === 'accepted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8 text-center">
          <CheckCircle2 className="w-20 h-20 mx-auto text-green-500" />
          <h2 className="text-3xl font-bold mt-4 text-green-600">Reschedule Confirmed! ✅</h2>
          <p className="text-gray-600 mt-2">Your new token has been created</p>

          <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-8 rounded-xl mt-6">
            <p className="text-sm opacity-90">Your New Token</p>
            <p className="text-5xl font-bold mt-2">{request.new_token?.token_label || 'Loading...'}</p>
            <p className="text-lg mt-3">{request.tokens.services.name}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">📋 What's Next?</h3>
            <ol className="text-sm text-blue-800 space-y-2">
              <li>1. Please arrive at the facility</li>
              <li>2. Wait for your token to be called</li>
              <li>3. You'll receive a notification when it's your turn</li>
            </ol>
          </div>

          <Button 
            className="mt-6 w-full" 
            onClick={() => navigate(`/check-status?token=${request.new_token?.token_label}`)}
          >
            Check Queue Status
          </Button>
        </Card>
      </div>
    );
  }

  if (status === 'declined') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <XCircle className="w-16 h-16 mx-auto text-gray-500" />
          <h2 className="text-2xl font-bold mt-4">Request Declined</h2>
          <p className="text-gray-600 mt-2">You've declined the reschedule request.</p>
          <p className="text-sm text-gray-500 mt-4">
            If you change your mind, you can request a new token from the homepage.
          </p>
          <Button className="mt-6" onClick={() => navigate('/')}>
            Go to Homepage
          </Button>
        </Card>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-orange-500" />
          <h2 className="text-2xl font-bold mt-4">Request Expired</h2>
          <p className="text-gray-600 mt-2">This reschedule request has expired.</p>
          <p className="text-sm text-gray-500 mt-4">
            Please request a new token from the homepage if you still need service.
          </p>
          <Button className="mt-6" onClick={() => navigate('/')}>
            Request New Token
          </Button>
        </Card>
      </div>
    );
  }

  // Pending status - show decision options
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8">
        <div className="text-center mb-6">
          <Clock className="w-16 h-16 mx-auto text-blue-500" />
          <h2 className="text-3xl font-bold mt-4">Reschedule Your Token?</h2>
          <p className="text-gray-600 mt-2">We noticed you missed your appointment</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-900 mb-2">Original Token (No Show)</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Token Number</p>
              <p className="font-semibold text-gray-900">{request.tokens.token_label}</p>
            </div>
            <div>
              <p className="text-gray-600">Service</p>
              <p className="font-semibold text-gray-900">{request.tokens.services.name}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-900">Time Limited Offer</p>
            <p className="text-sm text-yellow-800">{getTimeRemaining()}</p>
            <p className="text-xs text-yellow-700 mt-1">
              Expires: {new Date(request.expires_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 What Happens if You Accept?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ A new token will be generated for you</li>
            <li>✓ You'll be added back to the queue</li>
            <li>✓ You'll receive a confirmation with your new token number</li>
            <li>✓ Please arrive at the facility and wait for your turn</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
            onClick={handleAccept}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Yes, Reschedule My Token
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full text-lg py-6"
            onClick={handleDecline}
            disabled={processing}
          >
            <XCircle className="w-5 h-5 mr-2" />
            No Thanks
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-6">
          Having trouble? Contact support for assistance.
        </p>
      </Card>
    </div>
  );
}
