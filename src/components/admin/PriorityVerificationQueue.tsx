import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  AlertTriangle, 
  User,
  Calendar,
  Phone,
  Mail,
  Download,
  Eye,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VerificationRequest {
  id: string;
  token_id: string;
  user_id: string;
  priority_type: 'SENIOR' | 'DISABLED' | 'EMERGENCY';
  reason?: string;
  ai_classification?: 'genuine' | 'suspicious' | 'false';
  ai_confidence?: number;
  ai_reasoning?: string;
  requires_admin_review: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  user_name?: string;
  user_phone?: string;
  user_email?: string;
  token_label?: string;
  documents?: Array<{
    id: string;
    document_type: string;
    file_url: string;
    verification_status: string;
  }>;
}

export default function PriorityVerificationQueue() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchVerificationRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('verification_requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'priority_verification_requests'
      }, () => {
        fetchVerificationRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVerificationRequests = async () => {
    try {
      // Fetch verification requests with related data
      const { data: requestsData, error } = await supabase
        .from('priority_verification_requests')
        .select(`
          *,
          tokens (
            token_label,
            service_id,
            services (
              name
            )
          ),
          users (
            name,
            phone,
            email
          )
        `)
        .in('status', ['PENDING', 'APPROVED', 'REJECTED'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch documents for each request
      const requestsWithDocs = await Promise.all(
        (requestsData || []).map(async (request) => {
          const { data: docs } = await supabase
            .from('uploaded_documents')
            .select('*')
            .eq('token_id', request.token_id)
            .order('uploaded_at', { ascending: false });

          return {
            ...request,
            user_name: request.users?.name,
            user_phone: request.users?.phone,
            user_email: request.users?.email,
            token_label: request.tokens?.token_label,
            documents: docs || []
          };
        })
      );

      setRequests(requestsWithDocs);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load verification requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!reviewNotes.trim()) {
      toast({
        title: 'Review notes required',
        description: 'Please provide notes for approval',
        variant: 'destructive'
      });
      return;
    }

    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('priority_verification_requests')
        .update({
          status: 'APPROVED',
          reviewed_at: new Date().toISOString(),
          admin_notes: reviewNotes
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Priority Approved',
        description: 'Citizen will be notified via email/SMS',
      });

      setReviewNotes('');
      setSelectedRequest(null);
      fetchVerificationRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!reviewNotes.trim()) {
      toast({
        title: 'Review notes required',
        description: 'Please provide reason for rejection',
        variant: 'destructive'
      });
      return;
    }

    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('priority_verification_requests')
        .update({
          status: 'REJECTED',
          reviewed_at: new Date().toISOString(),
          admin_notes: reviewNotes
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Priority Rejected',
        description: 'Citizen will be notified',
      });

      setReviewNotes('');
      setSelectedRequest(null);
      fetchVerificationRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getClassificationColor = (classification?: string) => {
    switch (classification) {
      case 'genuine': return 'bg-green-500';
      case 'suspicious': return 'bg-yellow-500';
      case 'false': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (type: string) => {
    switch (type) {
      case 'EMERGENCY': return 'bg-red-100 text-red-800 border-red-300';
      case 'SENIOR': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'DISABLED': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const processedRequests = requests.filter(r => r.status !== 'PENDING');

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading verification requests...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="stat-card border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingRequests.length}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved Today</p>
                <p className="text-3xl font-bold text-green-600">
                  {processedRequests.filter(r => r.status === 'APPROVED').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected Today</p>
                <p className="text-3xl font-bold text-red-600">
                  {processedRequests.filter(r => r.status === 'REJECTED').length}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl gradient-text">Pending Verification</CardTitle>
              <CardDescription>Review priority claims requiring manual verification</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {pendingRequests.length} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No pending verification requests</p>
              <p className="text-gray-400 text-sm">All priority claims have been reviewed</p>
            </div>
          ) : (
            pendingRequests.map((request) => (
              <Card 
                key={request.id} 
                className={`hover-lift cursor-pointer transition-all ${
                  selectedRequest?.id === request.id ? 'ring-2 ring-indigo-500 shadow-lg' : ''
                }`}
                onClick={() => setSelectedRequest(request)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getPriorityColor(request.priority_type)}>
                          {request.priority_type}
                        </Badge>
                        <span className="font-semibold text-lg">{request.token_label}</span>
                        {request.ai_classification && (
                          <Badge 
                            variant="outline" 
                            className={`${getClassificationColor(request.ai_classification)} text-white border-0`}
                          >
                            AI: {request.ai_classification} ({Math.round((request.ai_confidence || 0) * 100)}%)
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {request.user_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {request.user_phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {request.user_email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(request.created_at).toLocaleString()}
                        </div>
                      </div>

                      {request.reason && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Reason:</p>
                          <p className="text-sm text-gray-600">{request.reason}</p>
                        </div>
                      )}

                      {request.ai_reasoning && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-3">
                          <p className="text-sm font-semibold text-blue-700 mb-1 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            AI Analysis:
                          </p>
                          <p className="text-sm text-blue-600">{request.ai_reasoning}</p>
                        </div>
                      )}

                      {request.documents && request.documents.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          <p className="text-sm font-semibold text-gray-700 w-full">Uploaded Documents:</p>
                          {request.documents.map((doc) => (
                            <Button
                              key={doc.id}
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(doc.file_url, '_blank');
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              {doc.document_type}
                              <Download className="h-3 w-3 ml-2" />
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRequest?.id === request.id && (
                    <div className="border-t pt-4 mt-4 space-y-4 animate-in slide-in-from-top">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Review Notes (Required)
                        </label>
                        <Textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Provide detailed notes for your decision..."
                          rows={4}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          disabled={processingId === request.id || !reviewNotes.trim()}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve Priority
                        </Button>
                        
                        <Button
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id || !reviewNotes.trim()}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Priority
                        </Button>
                        
                        <Button
                          onClick={() => {
                            setSelectedRequest(null);
                            setReviewNotes('');
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recently Processed */}
      {processedRequests.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-xl">Recently Processed</CardTitle>
            <CardDescription>Latest verification decisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      request.status === 'APPROVED' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {request.status === 'APPROVED' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{request.token_label} - {request.user_name}</p>
                      <p className="text-sm text-gray-600">
                        {request.priority_type} • {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={request.status === 'APPROVED' ? 'default' : 'destructive'}>
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
