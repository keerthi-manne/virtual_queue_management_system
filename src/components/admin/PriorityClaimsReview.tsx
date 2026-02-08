/**
 * Priority Claims Review Component - Admin Panel
 * Shows pending Aadhaar, Disability, and Emergency claims for approval
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Phone, 
  Mail,
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Claim {
  id: string;
  user_id: string;
  claim_type: string;
  status: string;
  auto_verified: boolean;
  verification_data: any;
  reason: string;
  document_path: string;
  document_name: string;
  submitted_at: string;
  users: {
    name: string;
    email: string;
    phone: string;
  };
}

export default function PriorityClaimsReview() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const fetchPendingClaims = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/claim/pending`);
      const data = await response.json();
      
      if (data.success) {
        setClaims(data.claims || []);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending claims',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/services`);
      const data = await response.json();
      if (data.success && data.services) {
        setServices(data.services);
        // Set first service as default for each claim
        const defaultServices: { [key: string]: string } = {};
        claims.forEach(claim => {
          defaultServices[claim.id] = data.services[0]?.id || '';
        });
        setSelectedService(prev => ({ ...prev, ...defaultServices }));
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  useEffect(() => {
    fetchPendingClaims();
    fetchServices();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingClaims, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (claimId: string) => {
    setProcessingId(claimId);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/claim/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId,
          adminNotes: adminNotes[claimId] || 'Approved by admin'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '✅ Claim Approved',
          description: `Priority token ${data.token?.token_number} generated and sent to user`,
        });
        fetchPendingClaims();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve claim',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (claimId: string) => {
    const notes = adminNotes[claimId];
    if (!notes?.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      });
      return;
    }

    setProcessingId(claimId);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/claim/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId,
          adminNotes: notes
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '❌ Claim Rejected',
          description: `Normal token ${data.token?.token_number} generated and sent to user`,
        });
        fetchPendingClaims();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject claim',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getClaimTypeBadge = (type: string) => {
    const colors = {
      SENIOR: 'bg-blue-100 text-blue-800',
      DISABLED: 'bg-purple-100 text-purple-800',
      EMERGENCY: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100'}>{type}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (claims.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Priority Claims Review
          </CardTitle>
          <CardDescription>Review and approve priority claims</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No pending claims. All caught up! 🎉
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Priority Claims Review
          <Badge variant="secondary">{claims.length} Pending</Badge>
        </CardTitle>
        <CardDescription>Review documents and approve/reject priority claims</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {claims.map((claim) => (
          <Card key={claim.id} className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getClaimTypeBadge(claim.claim_type)}
                    {claim.auto_verified && (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        ✓ Auto-verified
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{claim.users?.name || 'Unknown User'}</CardTitle>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(claim.submitted_at), 'MMM dd, h:mm a')}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{claim.users?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{claim.users?.phone || 'N/A'}</span>
                </div>
              </div>

              {/* Verification Data */}
              {claim.verification_data?.ocrSuccess && (
                <Alert className={claim.auto_verified ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}>
                  <AlertCircle className={claim.auto_verified ? "h-4 w-4 text-blue-600" : "h-4 w-4 text-red-600"} />
                  <AlertDescription>
                    <div className="text-sm space-y-1">
                      {claim.auto_verified ? (
                        <strong className="text-blue-800">✓ OCR Auto-Verified - Eligible</strong>
                      ) : (
                        <strong className="text-red-800">❌ OCR Verified - NOT Eligible</strong>
                      )}
                      
                      {claim.verification_data.age !== undefined && (
                        <div>
                          Age: <strong>{claim.verification_data.age} years</strong>
                          {claim.verification_data.dob && ` (Born: ${claim.verification_data.dob})`}
                          {claim.verification_data.isSenior ? (
                            <span className="text-green-700 font-semibold"> ✅ Age 60+ - Eligible for Senior</span>
                          ) : (
                            <span className="text-red-700 font-semibold"> ❌ Age under 60 - NOT Eligible</span>
                          )}
                        </div>
                      )}
                      
                      {claim.verification_data.keywords && (
                        <div>
                          Keywords: <strong>{claim.verification_data.keywords.join(', ')}</strong>
                          {claim.verification_data.valid ? (
                            <span className="text-green-700 font-semibold"> ✅ Valid Certificate</span>
                          ) : (
                            <span className="text-red-700 font-semibold"> ❌ Invalid Certificate</span>
                          )}
                        </div>
                      )}
                      
                      {!claim.auto_verified && (
                        <div className="mt-2 text-xs text-red-600 font-medium">
                          ⚠️ Admin can still manually approve if there's a valid reason or mistake.
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {!claim.verification_data?.ocrSuccess && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-sm">
                    <strong className="text-yellow-800">⚠️ OCR Not Run:</strong> OCR extraction failed or document quality is poor. Please review the document manually below.
                  </AlertDescription>
                </Alert>
              )}

              {/* Emergency Reason */}
              {claim.claim_type === 'EMERGENCY' && claim.reason && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Emergency Reason:</strong> {claim.reason}
                  </AlertDescription>
                </Alert>
              )}

              {/* Document Info */}
              {claim.document_name && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{claim.document_name}</span>
                  </div>
                  
                  {/* Document Preview */}
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/claim/document/${claim.document_path.split(/[/\\]/).pop()}`}
                      alt="Uploaded document"
                      className="w-full max-h-96 object-contain bg-gray-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-medium mb-1 block">Admin Notes</label>
                <Textarea
                  placeholder="Add notes or reason for rejection..."
                  value={adminNotes[claim.id] || ''}
                  onChange={(e) => setAdminNotes({ ...adminNotes, [claim.id]: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(claim.id)}
                  disabled={processingId === claim.id}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {processingId === claim.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleReject(claim.id)}
                  disabled={processingId === claim.id}
                  variant="destructive"
                  className="flex-1"
                >
                  {processingId === claim.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
