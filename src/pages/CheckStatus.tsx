import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, ArrowLeft } from 'lucide-react';

export default function CheckStatus() {
  const [tokenNumber, setTokenNumber] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenNumber.trim()) {
      // Navigate to the public token status page
      navigate(`/status/${tokenNumber.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Queue Status Check
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your token number to check your queue status
          </p>
        </div>

        <Card className="shadow-xl border-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" />
              Check Your Token
            </CardTitle>
            <CardDescription>
              Enter the token number you received when joining the queue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tokenNumber">Token Number</Label>
                <Input
                  id="tokenNumber"
                  placeholder="e.g., A001, B042"
                  value={tokenNumber}
                  onChange={(e) => setTokenNumber(e.target.value.toUpperCase())}
                  className="text-lg text-center font-mono"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Your token number is printed on your ticket
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg">
                <Search className="mr-2 h-5 w-5" />
                Check Status
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Don't have a token yet?</p>
          <Button
            variant="link"
            className="text-primary"
            onClick={() => navigate('/auth')}
          >
            Sign in to join the queue
          </Button>
        </div>
      </div>
    </div>
  );
}
