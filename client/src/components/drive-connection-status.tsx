import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, CloudOff, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

interface DriveStatus {
  connected: boolean;
  reason?: string;
  message?: string;
  email?: string;
  name?: string;
}

export function DriveConnectionStatus() {
  const { signIn } = useAuth();

  const { data: status, isLoading, error, refetch } = useQuery<DriveStatus>({
    queryKey: ["/api/auth/drive-status"],
    refetchInterval: false,
  });

  const handleReconnect = async () => {
    await signIn();
  };

  if (isLoading) {
    return null;
  }

  if (error || !status) {
    return null;
  }

  if (status.connected) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <CloudOff className="h-4 w-4" />
      <AlertTitle>جوجل درايف غير متصل</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{status.message}</span>
        <div className="flex gap-2 flex-wrap">
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleReconnect}
            data-testid="button-reconnect-drive"
          >
            <RefreshCw className="h-4 w-4 me-2" />
            إعادة الاتصال
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            data-testid="button-retry-drive-check"
          >
            إعادة المحاولة
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function DriveConnectionBadge() {
  const { data: status, isLoading } = useQuery<DriveStatus>({
    queryKey: ["/api/auth/drive-status"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <RefreshCw className="h-3 w-3 animate-spin" />
        جاري التحقق...
      </span>
    );
  }

  if (status?.connected) {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1" data-testid="badge-drive-connected">
        <CheckCircle className="h-3 w-3" />
        متصل بجوجل درايف
      </span>
    );
  }

  return (
    <span className="text-xs text-destructive flex items-center gap-1" data-testid="badge-drive-disconnected">
      <AlertCircle className="h-3 w-3" />
      غير متصل
    </span>
  );
}
