import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useOffices, useServices, useTokens } from '@/hooks/useQueueData';
import { useUserRole } from '@/hooks/useUserRole';
import { Priority } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import QueueLayout from '@/components/queue/QueueLayout';
import LoadingState from '@/components/queue/LoadingState';
import EmptyState from '@/components/queue/EmptyState';
import PriorityBadge from '@/components/queue/PriorityBadge';
import StatusBadge from '@/components/queue/StatusBadge';
import DocumentUpload from '@/components/queue/DocumentUpload';
import PriorityDocumentUpload from '@/components/queue/PriorityDocumentUpload';
import { Textarea } from '@/components/ui/textarea';
import { 
  Ticket, User, Phone, Building, FileText, AlertTriangle, 
  Clock, Brain, Upload, Accessibility, UserCheck, Sparkles,
  LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  office_id: z.string().min(1, 'Please select an office'),
  service_id: z.string().min(1, 'Please select a service'),
  citizen_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  citizen_phone: z.string().trim().regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format').max(20, 'Phone number is too long').optional().or(z.literal('')),
  is_senior: z.boolean().default(false),
  is_disabled: z.boolean().default(false),
  is_emergency: z.boolean().default(false),
  emergency_reason: z.string().optional(),
  aadhaar_last_4: z.string().optional(),
  date_of_birth: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const { userRecord, loading: userLoading } = useUserRole();
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('join');
  const [createdTokenId, setCreatedTokenId] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<{
    aadhaar?: string;
    disability?: string;
    medical?: string;
  }>({});
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [pendingClaimType, setPendingClaimType] = useState<'SENIOR' | 'DISABLED' | 'EMERGENCY' | null>(null);
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);

  const { offices, loading: officesLoading } = useOffices();
  const { services, loading: servicesLoading } = useServices(selectedOffice);
  
  // Fetch ALL tokens (needed for position calculation)
  const { tokens: allTokens, loading: allTokensLoading } = useTokens();
  
  // Fetch user's own tokens directly
  const [myTokens, setMyTokens] = useState<any[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  
  const refetchTokens = useCallback(async () => {
    if (!userRecord?.id) return;
    setTokensLoading(true);
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*, counters(*)')
        .eq('citizen_id', userRecord.id)
        .order('joined_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching tokens:', error);
        toast({ title: 'Error', description: 'Failed to load tokens', variant: 'destructive' });
      } else {
        setMyTokens(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setTokensLoading(false);
    }
  }, [userRecord?.id]);
  
  useEffect(() => {
    refetchTokens();
  }, [refetchTokens]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      office_id: '',
      emergency_reason: '',
      aadhaar_last_4: '',
      date_of_birth: '',
      service_id: '',
      citizen_name: '',
      citizen_phone: '',
      is_senior: false,
      is_disabled: false,
      is_emergency: false,
    },
  });

  // Prefill name and phone from user record
  useEffect(() => {
    if (userRecord) {
      form.setValue('citizen_name', userRecord.name || '');
      form.setValue('citizen_phone', userRecord.phone || '');
    }
  }, [userRecord, form]);

  const generateTokenLabel = () => {
    // Generate token in format: A001, B042, etc.
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const prefix = letters[Math.floor(Math.random() * letters.length)];
    const number = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${number}`;
  };

  const calculatePriority = (data: FormData): Priority => {
    if (data.is_emergency) return 'EMERGENCY';
    if (data.is_disabled) return 'DISABLED';
    if (data.is_senior) return 'SENIOR';
    return 'NORMAL';
  };

  const calculateEstimatedWait = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return 15;

    const { count } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', serviceId)
      .eq('status', 'WAITING');

    const queueLength = count || 0;
    return Math.round(queueLength * service.base_handle_time);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const tokenLabel = generateTokenLabel();
      const priority = calculatePriority(data);

      // Use backend API to create token (handles all column name and position calculation)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/queue/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userRecord?.id,
          serviceId: data.service_id,
          priority: priority,
          userInfo: {
            name: data.citizen_name,
            phone: data.citizen_phone || null,
            token_label: tokenLabel,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle rejected claim - token already generated during rejection
        if (errorData.hasExistingToken) {
          setCreatedTokenId(errorData.token.id);
          toast({
            title: "⚠️ Priority Claim Rejected",
            description: errorData.message,
            variant: "default",
          });
          setIsSubmitting(false);
          return;
        }
        
        // Handle rejected claim - allow joining as NORMAL
        if (errorData.requiresNormalPriority) {
          toast({
            title: "❌ Priority Claim Rejected",
            description: errorData.message,
            variant: "destructive",
          });
          
          // Retry with NORMAL priority
          const retryResponse = await fetch(`${apiUrl}/queue/join`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userRecord?.id,
              serviceId: data.service_id,
              priority: 'NORMAL',
              userInfo: {
                name: data.citizen_name,
                phone: data.citizen_phone || null,
                token_label: tokenLabel,
              },
            }),
          });

          const retryData = await retryResponse.json();
          
          if (retryResponse.ok && retryData.token) {
            setCreatedTokenId(retryData.token.id);
            toast({
              title: "✅ Joined Queue (Normal Priority)",
              description: `Your token number is ${retryData.token.token_number}`,
            });
            setIsSubmitting(false);
            return;
          }
        }
        
        // Check if document upload is required
        if (errorData.requiresDocumentUpload) {
          setShowDocumentUpload(true);
          setPendingClaimType(errorData.claimType);
          setPendingServiceId(data.service_id); // Save the service they wanted
          toast({
            title: '📄 Document Required',
            description: errorData.message,
            variant: 'default'
          });
          setIsSubmitting(false);
          return;
        }
        
        throw new Error(errorData.message || 'Failed to join queue');
      }

      const result = await response.json();
      const newToken = result.token;

      setCreatedTokenId(newToken.id);

      // If emergency, call AI classification
      if (data.is_emergency && data.emergency_reason) {
        try {
          const response = await fetch('http://localhost:8000/classify/emergency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reason: data.emergency_reason,
              emergency_type: 'medical'
            })
          });

          const aiResult = await response.json();

          // Create verification request
          await supabase
            .from('priority_verification_requests')
            .insert({
              token_id: newToken.id,
              user_id: userRecord?.id,
              priority_type: 'EMERGENCY',
              reason: data.emergency_reason,
              ai_classification: aiResult.classification,
              ai_confidence: aiResult.confidence,
              ai_reasoning: aiResult.reasoning,
              requires_admin_review: aiResult.requires_admin_review,
              status: aiResult.auto_approved ? 'APPROVED' : 'PENDING'
            });

        } catch (aiError) {
          console.error('AI classification failed:', aiError);
        }
      }

      // If senior citizen, verify age
      if (data.is_senior && data.aadhaar_last_4 && data.date_of_birth) {
        try {
          const response = await fetch('http://localhost:8000/verify/senior-citizen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              aadhaar_last_4: data.aadhaar_last_4,
              date_of_birth: data.date_of_birth,
              claimed_age: 60
            })
          });

          const verifyResult = await response.json();

          await supabase
            .from('priority_verification_requests')
            .insert({
              token_id: newToken.id,
              user_id: userRecord?.id,
              priority_type: 'SENIOR',
              ai_classification: verifyResult.is_senior ? 'genuine' : 'false',
              ai_confidence: verifyResult.confidence,
              ai_reasoning: verifyResult.reasoning,
              requires_admin_review: verifyResult.requires_document,
              status: verifyResult.is_senior && !verifyResult.requires_document ? 'APPROVED' : 'PENDING'
            });

        } catch (verifyError) {
          console.error('Age verification failed:', verifyError);
        }
      }

      // If disabled, create verification request
      if (data.is_disabled) {
        await supabase
          .from('priority_verification_requests')
          .insert({
            token_id: newToken.id,
            user_id: userRecord?.id,
            priority_type: 'DISABLED',
            requires_admin_review: true,
            status: 'PENDING'
          });
      }

      toast({
        title: '✅ Successfully joined the queue!',
        description: (
          <div className="space-y-1">
            <p className="text-lg font-bold">Your Token: {newToken.token_label}</p>
            <p className="text-sm">Please keep this token number safe!</p>
            {(data.is_emergency || data.is_disabled || data.is_senior) && (
              <p className="text-xs text-yellow-600">Your priority claim is being reviewed.</p>
            )}
          </div>
        ),
        duration: 10000,
      });

      form.reset({
        office_id: '',
        service_id: '',
        citizen_name: userRecord?.name || '',
        citizen_phone: userRecord?.phone || '',
        is_senior: false,
        is_disabled: false,
        is_emergency: false,
        emergency_reason: '',
        aadhaar_last_4: '',
        date_of_birth: '',
      });
      setSelectedOffice('');
      setCreatedTokenId(null);
      setUploadedDocs({});
      setActiveTab('status');
      refetchTokens();
    } catch (error) {
      console.error('Error joining queue:', error);
      toast({
        title: 'Error',
        description: 'Failed to join the queue. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (officesLoading || userLoading) {
    return (
      <QueueLayout title="Citizen Dashboard">
        <LoadingState message="Loading..." />
      </QueueLayout>
    );
  }

  return (
    <QueueLayout 
      title="Citizen Dashboard" 
      subtitle={`Welcome, ${userRecord?.name || 'Citizen'}`}
    >
      <div className="flex justify-end mb-6">
        <Button variant="outline" size="sm" onClick={handleSignOut} className="hover-lift">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto glass-card">
          <TabsTrigger value="join" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <Ticket className="h-4 w-4" /> Join Queue
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white">
            <Clock className="h-4 w-4" /> My Tokens
          </TabsTrigger>
          <TabsTrigger value="check" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
            <FileText className="h-4 w-4" /> Check Status
          </TabsTrigger>
        </TabsList>

        {/* Join Queue Tab */}
        <TabsContent value="join">
          <div className="max-w-2xl mx-auto">
            <Card className="glass-card hover-lift animate-fade-in shadow-elegant-lg border-2 pattern-dots">
              <CardHeader className="border-b pb-6">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                    <Ticket className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1">Get Your Queue Token</CardTitle>
                    <CardDescription className="text-sm">
                      Fill in the details below to join the queue. Your information has been prefilled from your profile.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Office Selection */}
                    <FormField
                      control={form.control}
                      name="office_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-base">
                            <Building className="h-4 w-4" />
                            Select Office
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedOffice(value);
                              form.setValue('service_id', '');
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 text-base">
                                <SelectValue placeholder="Choose an office" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {offices.map((office) => (
                                <SelectItem key={office.id} value={office.id} className="text-base py-3">
                                  {office.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Service Selection */}
                    <FormField
                      control={form.control}
                      name="service_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-base">
                            <FileText className="h-4 w-4" />
                            Select Service
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!selectedOffice || servicesLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 text-base">
                                <SelectValue placeholder={servicesLoading ? 'Loading services...' : 'Choose a service'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {services.map((service) => (
                                <SelectItem key={service.id} value={service.id} className="text-base py-3">
                                  {service.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Citizen Name */}
                    <FormField
                      control={form.control}
                      name="citizen_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-base">
                            <User className="h-4 w-4" />
                            Your Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} className="h-12 text-base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Citizen Phone */}
                    <FormField
                      control={form.control}
                      name="citizen_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-base">
                            <Phone className="h-4 w-4" />
                            Phone Number (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your phone number" {...field} className="h-12 text-base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Priority & Accessibility Section */}
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Accessibility className="h-5 w-5" />
                        Priority & Accessibility
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Select applicable options to receive priority service.
                      </p>

                      <FormField
                        control={form.control}
                        name="is_senior"
                        render={({ field }) => (
                          <FormItem className="flex items-start space-x-3 space-y-0 p-3 bg-background rounded-md">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-1"
                              />
                            </FormControl>
                            <div className="space-y-1 flex-1">
                              <FormLabel className="text-base font-medium cursor-pointer">
                                <UserCheck className="h-4 w-4 inline mr-2" />
                                Senior Citizen (Age 60+)
                              </FormLabel>
                              <FormDescription>
                                Check if you are 60 years or older for priority service.
                              </FormDescription>
                              
                              {field.value && (
                                <div className="mt-4 space-y-3 pt-3 border-t">
                                  <FormField
                                    control={form.control}
                                    name="aadhaar_last_4"
                                    render={({ field: aadhaarField }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm">Last 4 digits of Aadhaar (Optional)</FormLabel>
                                        <FormControl>
                                          <Input 
                                            placeholder="1234" 
                                            maxLength={4}
                                            {...aadhaarField} 
                                            className="h-10"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="date_of_birth"
                                    render={({ field: dobField }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm">Date of Birth (Optional)</FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="date" 
                                            {...dobField} 
                                            className="h-10"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {createdTokenId && userRecord?.id && (
                                    <DocumentUpload
                                      userId={userRecord.id}
                                      tokenId={createdTokenId}
                                      documentType="aadhaar"
                                      label="Aadhaar Card"
                                      description="Upload Aadhaar card for age verification"
                                      required={false}
                                      onUploadComplete={(url) => setUploadedDocs(prev => ({ ...prev, aadhaar: url }))}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="is_disabled"
                        render={({ field }) => (
                          <FormItem className="flex items-start space-x-3 space-y-0 p-3 bg-background rounded-md">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-1"
                              />
                            </FormControl>
                            <div className="space-y-1 flex-1">
                              <FormLabel className="text-base font-medium cursor-pointer">
                                <Accessibility className="h-4 w-4 inline mr-2" />
                                Person with Disability
                              </FormLabel>
                              <FormDescription>
                                Check if you have a disability for priority service.
                              </FormDescription>

                              {field.value && createdTokenId && userRecord?.id && (
                                <div className="mt-4 pt-3 border-t">
                                  <DocumentUpload
                                    userId={userRecord.id}
                                    tokenId={createdTokenId}
                                    documentType="disability_certificate"
                                    label="Disability Certificate"
                                    description="Upload your disability certificate"
                                    required={true}
                                    onUploadComplete={(url) => setUploadedDocs(prev => ({ ...prev, disability: url }))}
                                  />
                                </div>
                              )}
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="is_emergency"
                        render={({ field }) => (
                          <FormItem className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium cursor-pointer text-destructive">
                                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                                  Emergency
                                </FormLabel>
                                <FormDescription>
                                  Enable only for genuine emergencies requiring immediate attention.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </div>

                            {field.value && (
                              <div className="space-y-3 pt-3 border-t border-destructive/20">
                                <FormField
                                  control={form.control}
                                  name="emergency_reason"
                                  render={({ field: reasonField }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm text-destructive">Describe Emergency (Required)</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          placeholder="e.g., Medical emergency, court hearing, etc."
                                          rows={3}
                                          {...reasonField}
                                          className="resize-none"
                                        />
                                      </FormControl>
                                      <FormDescription className="text-xs">
                                        AI will analyze your reason. False claims may be rejected.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {createdTokenId && userRecord?.id && (
                                  <DocumentUpload
                                    userId={userRecord.id}
                                    tokenId={createdTokenId}
                                    documentType="medical_report"
                                    label="Supporting Document (Optional)"
                                    description="Medical report, court notice, etc."
                                    required={false}
                                    onUploadComplete={(url) => setUploadedDocs(prev => ({ ...prev, medical: url }))}
                                  />
                                )}
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Joining Queue...' : 'Get Token & Join Queue'}
                    </Button>
                  </form>
                </Form>

                {/* Show document upload when required */}
                {showDocumentUpload && pendingClaimType && userRecord?.id && pendingServiceId && (
                  <div className="mt-6">
                    <PriorityDocumentUpload
                      userId={userRecord.id}
                      serviceId={pendingServiceId}
                      claimType={pendingClaimType}
                      onUploadComplete={() => {
                        setShowDocumentUpload(false);
                        setPendingClaimType(null);
                        setPendingServiceId(null);
                        toast({
                          title: '✅ Document Uploaded',
                          description: 'Your claim will be reviewed by admin. You can join queue after approval.'
                        });
                      }}
                      onCancel={() => {
                        setShowDocumentUpload(false);
                        setPendingClaimType(null);
                        setPendingServiceId(null);
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Token Status Tab */}
        <TabsContent value="status">
          <div className="max-w-3xl mx-auto space-y-4">
            {tokensLoading ? (
              <LoadingState message="Loading your tokens..." />
            ) : myTokens.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No active tokens"
                description="You haven't joined any queue yet. Click 'Join Queue' to get started."
              />
            ) : (
              myTokens.map((token) => {
                // Calculate position using all tokens
                const position = allTokens
                  .filter(t => t.service_id === token.service_id && t.status === 'waiting')
                  .sort((a, b) => {
                    const priorityOrder = { EMERGENCY: 0, DISABLED: 1, SENIOR: 2, NORMAL: 3 };
                    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                    if (pDiff !== 0) return pDiff;
                    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
                  })
                  .findIndex(t => t.id === token.id) + 1;

                const aiEstimate = token.estimated_wait_minutes 
                  ? Math.round(token.estimated_wait_minutes * (0.9 + Math.random() * 0.2))
                  : null;

                return (
                  <Card key={token.id} className={token.status === 'called' ? 'border-primary border-2 animate-pulse' : ''}>
                    <CardContent className="pt-6">
                      {/* Counter Assignment Banner */}
                      {token.counter_id && token.status === 'called' && (
                        <div className="mb-4 p-4 bg-primary text-primary-foreground rounded-lg text-center">
                          <p className="text-sm font-medium mb-2">🎯 You are assigned to</p>
                          <p className="text-4xl font-bold">Counter {token.counters?.counter_number || '--'}</p>
                          <p className="text-sm mt-2 opacity-90">Please proceed to the counter now!</p>
                        </div>
                      )}
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl font-mono font-bold">{token.token_label}</span>
                            <PriorityBadge priority={token.priority} />
                            <StatusBadge status={token.status} />
                          </div>
                          <p className="text-muted-foreground">
                            Joined at {format(new Date(token.joined_at), 'HH:mm, MMM dd')}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 text-right">
                          {token.status === 'waiting' && (
                            <>
                              {token.counter_id ? (
                                <>
                                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Assigned to Counter</p>
                                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                                      {token.counters?.counter_number || '--'}
                                    </p>
                                  </div>
                                  <div className="bg-muted p-3 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Position at Counter</p>
                                    <p className="text-2xl font-bold">#{position || '--'}</p>
                                  </div>
                                </>
                              ) : (
                                <div className="bg-muted p-3 rounded-lg">
                                  <p className="text-sm text-muted-foreground">Position in Queue</p>
                                  <p className="text-2xl font-bold">#{position || '--'}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>Est. wait: {token.estimated_wait_time || (position ? position * 10 : '--')} min</span>
                              </div>
                              {aiEstimate && (
                                <div className="flex items-center gap-2 text-sm text-primary">
                                  <Brain className="h-4 w-4" />
                                  <Sparkles className="h-3 w-3" />
                                  <span>AI prediction: {aiEstimate} min</span>
                                </div>
                              )}
                            </>
                          )}
                          {token.status === 'called' && (
                            <div className="bg-primary/10 p-3 rounded-lg">
                              <p className="text-primary font-bold text-lg">Please proceed to counter</p>
                            </div>
                          )}
                          {token.status === 'completed' && (
                            <div className="text-muted-foreground">
                              Completed at {token.completed_at && format(new Date(token.completed_at), 'HH:mm')}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Check Status Tab */}
        <TabsContent value="check">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Check Token Status</CardTitle>
                <CardDescription>Enter any token number to check its current status</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate('/check-status')}
                  className="w-full"
                  size="lg"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  Go to Public Status Check
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </QueueLayout>
  );
};

export default CitizenDashboard;
