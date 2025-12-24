import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Users, Shield, UserCircle, ArrowLeft } from 'lucide-react';
import type { UserRole } from '@/types/database';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  name: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s()]*$/, 'Invalid phone number').optional(),
});

type RoleOption = 'citizen' | 'staff' | 'admin';

const roleConfig: Record<RoleOption, { 
  title: string; 
  icon: React.ElementType; 
  description: string; 
  allowSignUp: boolean;
  dbRole: UserRole;
  redirectPath: string;
}> = {
  citizen: {
    title: 'Citizen Portal',
    icon: UserCircle,
    description: 'Join queues and track your token status',
    allowSignUp: true,
    dbRole: 'USER',
    redirectPath: '/citizen',
  },
  staff: {
    title: 'Staff Portal',
    icon: Users,
    description: 'Manage queues and serve customers',
    allowSignUp: false,
    dbRole: 'STAFF',
    redirectPath: '/staff',
  },
  admin: {
    title: 'Admin Portal',
    icon: Shield,
    description: 'Monitor operations and view analytics',
    allowSignUp: false,
    dbRole: 'ADMIN',
    redirectPath: '/admin',
  },
};

const RoleBasedAuth = () => {
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect only after successful login - not auto-redirect on page load

  const validateForm = () => {
    const dataToValidate: Record<string, string> = { email, password };
    if (isSignUp && selectedRole === 'citizen') {
      dataToValidate.name = name;
      if (phone) dataToValidate.phone = phone;
    }

    const result = authSchema.safeParse(dataToValidate);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !validateForm()) return;

    setLoading(true);
    const config = roleConfig[selectedRole];

    try {
      if (isSignUp && config.allowSignUp) {
        // Sign up flow for citizens
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive"
            });
          } else {
            toast({ title: "Sign up failed", description: signUpError.message, variant: "destructive" });
          }
          return;
        }

        // Get the newly created auth user
        const { data: { user: newAuthUser } } = await supabase.auth.getUser();
        if (!newAuthUser) {
          toast({ title: "Error", description: "Failed to get user after sign up", variant: "destructive" });
          return;
        }

        // Insert user record
        const { error: insertError } = await supabase.from('users').insert({
          auth_user_id: newAuthUser.id,
          email: email,
          name: name,
          phone: phone || null,
          role: config.dbRole,
        });

        if (insertError) {
          toast({ title: "Error", description: "Account created but failed to save profile. Please contact support.", variant: "destructive" });
          return;
        }

        toast({ title: "Account created!", description: "Welcome to the Queue Management System." });
        navigate(config.redirectPath);
      } else {
        // Sign in flow
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          toast({ title: "Sign in failed", description: signInError.message, variant: "destructive" });
          return;
        }

        // Verify role
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          toast({ title: "Error", description: "Authentication failed", variant: "destructive" });
          return;
        }

        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .single();

        if (userError || !userRecord) {
          await supabase.auth.signOut();
          toast({ 
            title: "Access Denied", 
            description: "No user record found. Please contact an administrator.", 
            variant: "destructive" 
          });
          return;
        }

        // Allow STAFF and ADMIN roles to access staff portal
        if (selectedRole === 'staff') {
          if (!['STAFF', 'ADMIN'].includes(userRecord.role)) {
            await supabase.auth.signOut();
            toast({ 
              title: "Access Denied", 
              description: `This account does not have staff access. Your role is ${userRecord.role}.`, 
              variant: "destructive" 
            });
            return;
          }
        } else if (userRecord.role !== config.dbRole) {
          await supabase.auth.signOut();
          toast({ 
            title: "Access Denied", 
            description: `This account does not have ${selectedRole} access. Please use the correct login option.`, 
            variant: "destructive" 
          });
          return;
        }

        toast({ title: "Welcome back!", description: `Signed in successfully.` });
        navigate(config.redirectPath);
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Role selection screen
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        {/* Header */}
        <header className="bg-background border-b py-4">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Queue Management System</h1>
                <p className="text-sm text-muted-foreground">Municipal Services Portal</p>
              </div>
            </div>
            {user && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  await signOut();
                  setSelectedRole(null);
                  toast({ title: "Signed out", description: "Please sign in to continue" });
                }}
              >
                Sign Out
              </Button>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Welcome</h2>
              <p className="text-muted-foreground text-lg">Select your portal to continue</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(Object.entries(roleConfig) as [RoleOption, typeof roleConfig[RoleOption]][]).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Card 
                    key={key}
                    className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 group"
                    onClick={() => {
                      setSelectedRole(key);
                      setIsSignUp(key === 'citizen');
                    }}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle>{config.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-muted-foreground text-sm">{config.description}</p>
                    </CardContent>
                    <CardFooter className="justify-center">
                      <Button variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {config.allowSignUp ? 'Sign Up / Sign In' : 'Sign In'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-background border-t py-4">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Municipal Services. All rights reserved.
          </div>
        </footer>
      </div>
    );
  }

  const config = roleConfig[selectedRole];
  const Icon = config.icon;

  // Auth form
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute left-4 top-4"
            onClick={() => {
              setSelectedRole(null);
              setErrors({});
              setEmail('');
              setPassword('');
              setName('');
              setPhone('');
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{config.title}</CardTitle>
          <CardDescription>
            {isSignUp ? 'Create your account to get started' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {isSignUp && config.allowSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>

            {config.allowSignUp && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrors({});
                }}
                disabled={loading}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default RoleBasedAuth;
