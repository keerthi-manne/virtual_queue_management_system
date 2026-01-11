import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, User, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import PriorityBadge from '@/components/queue/PriorityBadge';

interface StaffRequest {
  id: string;
  staff_id: string;
  token_id: string;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  reviewed_at?: string;
  admin_notes?: string;
  staff: {
    id: string;
    name: string;
    email: string;
  };
  tokens: {
    id: string;
    token_label: string;
    citizen_name: string;
    citizen_phone?: string;
    priority: string;
    status: string;
    services: {
      name: string;
    };
  };
}

interface StaffRequestsManagerProps {
  adminId: string;
}

export default function StaffRequestsManager({ adminId }: StaffRequestsManagerProps) {
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<StaffRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/staff-requests?status=PENDING`);
      
      // Silently handle 404 - no pending requests or endpoint not available
      if (response.status === 404) {
        setRequests([]);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }
      
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      // Don't show error toast - fails silently in background
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);
    try {
      const endpoint = actionType === 'approve' 
        ? `/staff-requests/${selectedRequest.id}/approve`
        : `/staff-requests/${selectedRequest.id}/reject`;

      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId,
          notes: notes || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error || `Failed to ${actionType} request`);
      }

      toast({
        title: actionType === 'approve' ? '✅ Request Approved' : '❌ Request Rejected',
        description: actionType === 'approve' 
          ? `${selectedRequest.tokens.token_label} has been assigned and called. ${selectedRequest.staff.name} can now serve this customer.`
          : 'The request has been rejected'
      });

      fetchRequests();
      setSelectedRequest(null);
      setActionType(null);
      setNotes('');
    } catch (error: any) {
      console.error(`Error ${actionType}ing request:`, error);
      toast({
        title: 'Error',
        description: error.message || `Failed to ${actionType} request`,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading requests...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Staff Service Requests
            {requests.length > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {requests.length} Pending
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review and approve staff requests to serve specific queue members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <User className="h-3 w-3 mr-1" />
                          {request.staff.name}
                        </Badge>
                        <span className="text-muted-foreground text-sm">wants to serve</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-bold text-lg">{request.tokens.token_label}</span>
                        <PriorityBadge priority={request.tokens.priority as any} />
                      </div>
                      
                      <div className="text-sm space-y-1">
                        <p><strong>Citizen:</strong> {request.tokens.citizen_name}</p>
                        <p><strong>Service:</strong> {request.tokens.services.name}</p>
                        {request.reason && (
                          <p className="text-muted-foreground"><strong>Reason:</strong> {request.reason}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Requested {format(new Date(request.created_at), 'MMM dd, HH:mm')}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setActionType('approve');
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedRequest(request);
                          setActionType('reject');
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setNotes('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Assign ${selectedRequest?.tokens.token_label} to ${selectedRequest?.staff.name}?`
                : `Reject ${selectedRequest?.staff.name}'s request to serve ${selectedRequest?.tokens.token_label}?`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder={actionType === 'approve' ? 'Add notes (optional)' : 'Reason for rejection (optional)'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setActionType(null);
                setNotes('');
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
