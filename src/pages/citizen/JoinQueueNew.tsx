/**
 * Join Queue Page - Citizen Interface
 * Allows citizens to join a service queue and get a digital token
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { Ticket, User, Phone, Clock, AlertTriangle, Loader2, Users } from 'lucide-react';

const formSchema = z.object({
  serviceId: z.string().min(1, 'Please select a service'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().trim().regex(/^[0-9+\-\s()]*$/, 'Invalid phone number').max(20).optional().or(z.literal('')),
  priority: z.enum(['NORMAL', 'SENIOR', 'DISABLED', 'EMERGENCY'] as const),
});

type FormData = z.infer<typeof formSchema>;

interface Service {
  id: string;
  name: string;
  description?: string;
  average_service_time: number;
  is_active: boolean;
}

interface QueueStats {
  totalWaiting: number;
  totalServing: number;
  activeCounters: number;
  estimatedWaitTime: number;
}

export default function JoinQueueNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceStats, setSelectedServiceStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
      name: '',
      phone: '',
      priority: 'NORMAL',
    },
  });

  const selectedServiceId = form.watch('serviceId');

  // Load services
  useEffect(() => {
    loadServices();
  }, []);

  // Load queue stats for selected service
  useEffect(() => {
    if (selectedServiceId) {
      loadServiceStats(selectedServiceId);
    } else {
      setSelectedServiceStats(null);
    }
  }, [selectedServiceId]);

  const loadServices = async () => {
    try {
      const data = await apiService.getServices();
      setServices(data.services || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load services',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadServiceStats = async (serviceId: string) => {
    try {
      const data = await apiService.getQueueStats(serviceId);
      setSelectedServiceStats(data.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    
    try {
      // Get user ID from local storage or auth context
      const userId = localStorage.getItem('user_id');
      
      if (!userId) {
        toast({
          title: 'Error',
          description: 'Please log in to join a queue',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      const response = await apiService.joinQueue({
        userId,
        serviceId: data.serviceId,
        priority: data.priority,
        userInfo: {
          name: data.name,
          phone: data.phone,
        },
      });

      toast({
        title: 'Success!',
        description: `Token ${response.token.token_label} created successfully`,
        variant: 'default',
      });

      // Navigate to token tracking page
      navigate(`/queue/track/${response.token.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to join queue',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedService = services.find(s => s.id === selectedServiceId);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Ticket className="h-8 w-8" />
          Join Queue
        </h1>
        <p className="text-muted-foreground mt-2">
          Select a service and get your digital token
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Queue Information</CardTitle>
            <CardDescription>Fill in your details to join the queue</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Service Selection */}
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Ticket className="h-4 w-4" />
                        Select Service *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{service.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  Avg. time: {service.average_service_time} min
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name Input */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Your Name *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Input */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+91 1234567890" {...field} />
                      </FormControl>
                      <FormDescription>
                        We'll notify you when your turn is near
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority Selection */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Priority Type
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="normal" id="normal" />
                            <label htmlFor="normal" className="text-sm cursor-pointer">
                              Normal
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="senior" id="senior" />
                            <label htmlFor="senior" className="text-sm cursor-pointer">
                              Senior Citizen
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="disabled" id="disabled" />
                            <label htmlFor="disabled" className="text-sm cursor-pointer">
                              Disabled
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="emergency" id="emergency" />
                            <label htmlFor="emergency" className="text-sm cursor-pointer">
                              Emergency
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        Priority queue for senior citizens, disabled, and emergency cases
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining Queue...
                    </>
                  ) : (
                    <>
                      <Ticket className="mr-2 h-4 w-4" />
                      Get Token
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Queue Stats Sidebar */}
        <div className="space-y-4">
          {selectedService && selectedServiceStats && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Service Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold">{selectedService.name}</div>
                    {selectedService.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedService.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Avg. Time: {selectedService.average_service_time} min</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Current Queue Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Waiting</span>
                    <span className="text-2xl font-bold">{selectedServiceStats.totalWaiting}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Being Served</span>
                    <span className="text-2xl font-bold">{selectedServiceStats.totalServing}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Counters</span>
                    <span className="text-2xl font-bold">{selectedServiceStats.activeCounters}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      Estimated Wait Time
                    </div>
                    <div className="text-3xl font-bold text-primary mt-1">
                      {selectedServiceStats.estimatedWaitTime} min
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-medium mb-1">Please Note:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Wait times are estimates and may vary</li>
                        <li>Priority tokens are served first</li>
                        <li>Keep your phone nearby for notifications</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
