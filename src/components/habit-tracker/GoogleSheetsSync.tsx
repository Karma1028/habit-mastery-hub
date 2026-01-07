import { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, 
  CloudOff, 
  Loader2, 
  Check, 
  Download, 
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface GoogleSheetsSyncProps {
  exportData: {
    habits: { id: string; name: string; goal: number }[];
    completions: { habit_id: string; completion_date: string }[];
    metrics: { metric_date: string; mood: number | null; sleep_hours: number | null }[];
    streak: { current: number; best: number };
    exportedAt: string;
  };
}

export function GoogleSheetsSync({ exportData }: GoogleSheetsSyncProps) {
  const { toast } = useToast();
  const {
    sheetInfo,
    status,
    hasGoogleConnection,
    syncData,
    downloadAsExcel,
  } = useGoogleSheets();

  const [justSynced, setJustSynced] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Auto-sync when data changes (debounced)
  useEffect(() => {
    if (!autoSyncEnabled || !hasGoogleConnection || status.isSyncing) return;

    const timer = setTimeout(() => {
      if (sheetInfo.spreadsheetId && exportData.habits.length > 0) {
        handleSync(true);
      }
    }, 5000); // 5 second debounce for auto-sync

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportData.completions.length, exportData.metrics.length]);

  const handleSync = useCallback(async (silent = false) => {
    const success = await syncData(exportData);
    
    if (success) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
      
      if (!silent) {
        toast({
          title: '✅ Synced to Google Sheets',
          description: 'Your data is up to date',
        });
      }
    }
  }, [syncData, exportData, toast]);

  const handleDownload = useCallback(() => {
    downloadAsExcel(exportData);
  }, [downloadAsExcel, exportData]);

  const openSheet = useCallback(() => {
    if (sheetInfo.spreadsheetUrl) {
      window.open(sheetInfo.spreadsheetUrl, '_blank');
    }
  }, [sheetInfo.spreadsheetUrl]);

  // Render sync status indicator
  const renderStatusIcon = () => {
    if (status.isSyncing) {
      return <Loader2 size={16} className="animate-spin" />;
    }
    if (justSynced) {
      return <Check size={16} className="text-primary" />;
    }
    if (status.error || status.needsReauth) {
      return <AlertCircle size={16} className="text-destructive" />;
    }
    if (status.isConnected) {
      return <Cloud size={16} className="text-primary" />;
    }
    return <CloudOff size={16} className="text-muted-foreground" />;
  };

  // Show re-auth message if needed
  if (status.needsReauth) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-destructive/50 text-destructive"
              onClick={() => {
                toast({
                  title: 'Re-authentication Required',
                  description: 'Please sign out and sign in with Google again to restore sync.',
                });
              }}
            >
              <AlertCircle size={16} />
              <span className="hidden sm:inline">Reconnect</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Google session expired. Sign in again to sync.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // If not connected with Google, show simple download button
  if (!hasGoogleConnection) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="flex items-center gap-2"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Download</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex items-center gap-2 transition-all",
                  status.isConnected && "border-primary/30",
                  status.isSyncing && "animate-pulse"
                )}
              >
                {renderStatusIcon()}
                <span className="hidden sm:inline">
                  {status.isSyncing 
                    ? 'Syncing...' 
                    : justSynced 
                    ? 'Synced!' 
                    : status.isConnected 
                    ? 'Live Sync' 
                    : 'Connect'}
                </span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {status.isConnected ? (
              <p>
                {status.lastSynced 
                  ? `Last synced: ${status.lastSynced.toLocaleTimeString()}`
                  : 'Connected to Google Sheets'}
              </p>
            ) : (
              <p>Click to sync with Google Sheets</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleSync(false)} disabled={status.isSyncing}>
          <RefreshCw size={16} className={cn("mr-2", status.isSyncing && "animate-spin")} />
          {status.isConnected ? 'Sync Now' : 'Create & Sync Sheet'}
        </DropdownMenuItem>

        {status.isConnected && sheetInfo.spreadsheetUrl && (
          <DropdownMenuItem onClick={openSheet}>
            <ExternalLink size={16} className="mr-2" />
            Open in Google Sheets
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleDownload}>
          <Download size={16} className="mr-2" />
          Download as Excel
        </DropdownMenuItem>

        {status.isConnected && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
              className="text-muted-foreground"
            >
              <div className={cn(
                "w-3 h-3 rounded-full mr-2",
                autoSyncEnabled ? "bg-primary" : "bg-muted"
              )} />
              Auto-sync {autoSyncEnabled ? 'On' : 'Off'}
            </DropdownMenuItem>
          </>
        )}

        {status.lastSynced && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Last synced: {status.lastSynced.toLocaleTimeString()}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
