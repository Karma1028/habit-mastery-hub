import { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  CloudOff,
  Loader2,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
    createSpreadsheet,
    reAuthenticate,
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
    // If no sheet ID, try creating one first
    if (!sheetInfo.spreadsheetId && hasGoogleConnection) {
      if (!silent) {
        toast({ title: 'Setting up...', description: 'Creating your tracking sheet...' });
      }

      const url = await createSpreadsheet();
      // If creation failed (e.g. auth error), stop here.
      // createSpreadsheet handles setting status.error
      if (!url) return;
    }

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
    } else if (!silent) {
      // If sync failed despite having a sheet ID, it might be auth
      if (!hasGoogleConnection) {
        toast({
          variant: 'destructive',
          title: 'Sync Failed',
          description: 'Please click "Connect" or log in with Google again.',
        });
      }
    }
  }, [syncData, exportData, toast, sheetInfo.spreadsheetId, hasGoogleConnection, createSpreadsheet]);

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



  // If not connected with Google, we still want to show the specific Connect/Reconnect option
  // instead of just falling back to download only.

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
                  status.isSyncing && "animate-pulse",
                  !status.isConnected && "text-muted-foreground"
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
          <TooltipContent side="bottom" className={cn("max-w-xs", status.error && "bg-destructive text-destructive-foreground border-destructive")}>
            {status.error ? (
              <div className="flex flex-col gap-1">
                <span className="font-bold flex items-center gap-2">
                  <AlertTriangle size={12} /> Sync Error
                </span>
                <span className="text-xs">{status.error}</span>
                {!hasGoogleConnection && (
                  <span className="text-[10px] mt-1 opacity-90 underline">Click to reconnect</span>
                )}
              </div>
            ) : status.isConnected ? (
              <p>
                {status.lastSynced
                  ? `Last synced: ${status.lastSynced.toLocaleTimeString()}`
                  : 'Connected to Google Sheets'}
              </p>
            ) : (
              <p>Click to connect Google Sheets</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end" className="w-56">
        {(hasGoogleConnection && !status.needsReauth) ? (
          <DropdownMenuItem onClick={() => handleSync(false)} disabled={status.isSyncing}>
            <RefreshCw size={16} className={cn("mr-2", status.isSyncing && "animate-spin")} />
            {sheetInfo.spreadsheetUrl ? 'Sync Now' : 'Create & Sync Sheet'}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => reAuthenticate()}>
            <Cloud size={16} className="mr-2" />
            {(status.needsReauth || !hasGoogleConnection) ? 'Reconnect Google Drive' : 'Connect Google Drive'}
          </DropdownMenuItem>
        )}

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
