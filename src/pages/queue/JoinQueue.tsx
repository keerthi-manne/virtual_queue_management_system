import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useOffices, useServices } from '@/hooks/useQueueData';
import { Priority } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import QueueLayout from '@/components/queue/QueueLayout';
import LoadingState from '@/components/queue/LoadingState';
import { Ticket, User, Phone, Building, FileText, AlertTriangle } from 'lucide-react';

const formSchema = z.object({
  office_id: z.string().min(1, 'Please select an office'),
  service_id: z.string().min(1, 'Please select a service'),
  citizen_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  citizen_phone: z.string().trim().regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format').max(20, 'Phone number is too long').optional().or(z.literal('')),
  priority: z.enum(['NORMAL', 'SENIOR', 'DISABLED', 'EMERGENCY'] as const),
});

type FormData = z.infer<typeof formSchema>;

const JoinQueue = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { offices, loading: officesLoading } = useOffices();
  const { services, loading: servicesLoading } = useServices(selectedOffice);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      office_id: '',
      service_id: '',
      citizen_name: '',
      citizen_phone: '',
      priority: 'NORMAL',
    },
  });

  const generateTokenLabel = () => {
    const prefix = 'TKN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
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
      const estimatedWait = await calculateEstimatedWait(data.service_id);
      const tokenLabel = generateTokenLabel();

      const { data: newToken, error } = await supabase
        .from('tokens')
        .insert({
          token_label: tokenLabel,
          service_id: data.service_id,
          citizen_name: data.citizen_name,
          citizen_phone: data.citizen_phone || null,
          priority: data.priority,
          status: 'WAITING',
          joined_at: new Date().toISOString(),
          estimated_wait_minutes: estimatedWait,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Successfully joined the queue!',
        description: `Your token number is ${tokenLabel}`,
      });

      if (newToken) {
        navigate(`/queue/status/${newToken.id}`);
      }
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

  if (officesLoading) {
    return (
      <QueueLayout title="Join Queue">
        <LoadingState message="Loading offices..." />
      </QueueLayout>
    );
  }

  return (
    <QueueLayout 
      title="Join Queue" 
      subtitle="Select your service and get a token number"
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Get Your Queue Token
            </CardTitle>
            <CardDescription>
              Fill in the details below to join the queue. You'll receive a token number to track your position.
            </CardDescription>
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
                      <FormLabel className="flex items-center gap-2">
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
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an office" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {offices.map((office) => (
                            <SelectItem key={office.id} value={office.id}>
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
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Select Service
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedOffice || servicesLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={servicesLoading ? 'Loading services...' : 'Choose a service'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                              {service.description && (
                                <span className="text-muted-foreground ml-2">- {service.description}</span>
                              )}
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
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Your Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
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
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority Selection */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Priority Category
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="NORMAL" id="normal" />
                            <Label htmlFor="normal" className="cursor-pointer">Normal</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="SENIOR" id="senior" />
                            <Label htmlFor="senior" className="cursor-pointer">Senior Citizen</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="DISABLED" id="disabled" />
                            <Label htmlFor="disabled" className="cursor-pointer">Disabled</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="EMERGENCY" id="emergency" />
                            <Label htmlFor="emergency" className="cursor-pointer">Emergency</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Joining Queue...' : 'Get Token & Join Queue'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </QueueLayout>
  );
};

export default JoinQueue;
