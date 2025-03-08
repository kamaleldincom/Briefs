// src/components/shared/ApiStatusBanner.tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiStatus {
  success: boolean;
  message?: string | null;
}

interface ApiStatusBannerProps {
  apiStatus: ApiStatus;
  onRefresh?: () => void;
  className?: string;
}

/**
 * A banner that shows NewsAPI status information
 * Displays when rate limits are hit or other API errors occur
 */
export function ApiStatusBanner({ apiStatus, onRefresh, className }: ApiStatusBannerProps) {
  // If API is successful, don't show anything
  if (apiStatus.success) {
    return null;
  }

  // Check if this is a rate limit error
  const isRateLimit = apiStatus.message?.includes('429') || 
                      apiStatus.message?.toLowerCase().includes('rate limit');

  return (
    <Alert 
      variant="warning" 
      className={`mb-4 border-amber-300 bg-amber-50 text-amber-900 ${className || ''}`}
    >
      <AlertCircle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 flex items-center gap-2">
        {isRateLimit ? (
          <>
            <Clock className="h-4 w-4" />
            NewsAPI Rate Limit Exceeded
          </>
        ) : (
          'NewsAPI Connection Issue'
        )}
      </AlertTitle>
      <AlertDescription className="text-amber-700">
        <p className="mb-2">
          {isRateLimit
            ? "We've reached the API rate limit. Showing stories from our database."
            : "Couldn't connect to NewsAPI. Showing available stories from our database."}
        </p>
        
        {isRateLimit && (
          <p className="text-xs text-amber-600 mb-2">
            The free tier of NewsAPI has strict rate limits. We'll automatically resume 
            fetching new stories when the rate limit expires.
          </p>
        )}
        
        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            className="mt-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try Again Later
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}