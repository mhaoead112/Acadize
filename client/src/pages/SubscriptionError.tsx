import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

/**
 * Error page shown when subscription service is unavailable
 * This prevents fail-open security bypasses
 */
export default function SubscriptionError() {
  const [, setLocation] = useLocation();

  const handleRetry = () => {
    // Reload the page to retry
    window.location.reload();
  };

  const handleGoHome = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-950 p-4">
      <Card className="w-full max-w-md dark:bg-navy-800 dark:border-navy-700">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <CardTitle className="text-center text-gray-900 dark:text-white">
            Service Temporarily Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600 dark:text-gray-300">
            We're having trouble verifying your subscription status. This is usually temporary.
          </p>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Please try again in a moment. If the problem persists, contact support.
          </p>
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              onClick={handleRetry}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={handleGoHome}
              className="w-full"
              variant="outline"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
