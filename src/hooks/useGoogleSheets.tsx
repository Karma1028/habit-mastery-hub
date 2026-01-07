import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface SheetInfo {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
}

interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSynced: Date | null;
  error: string | null;
  needsReauth: boolean;
}

export function useGoogleSheets() {
  const { session, user } = useAuth();
  const { toast } = useToast();
  
  const [sheetInfo, setSheetInfo] = useState<SheetInfo>({
    spreadsheetId: null,
    spreadsheetUrl: null,
  });
  
  const [status, setStatus] = useState<SyncStatus>({
    isConnected: false,
    isSyncing: false,
    lastSynced: null,
    error: null,
    needsReauth: false,
  });

  // Get Google access token from session
  const getAccessToken = useCallback(() => {
    return session?.provider_token || null;
  }, [session]);

  // Check if user has Google connection
  const hasGoogleConnection = useCallback(() => {
    const provider = user?.app_metadata?.provider;
    const providers = user?.app_metadata?.providers as string[] | undefined;
    return provider === 'google' || providers?.includes('google') || false;
  }, [user]);

  // Fetch existing sheet info
  const fetchSheetInfo = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const response = await supabase.functions.invoke('google-sheets-sync', {
        body: { action: 'get-info' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.data?.spreadsheetId) {
        setSheetInfo({
          spreadsheetId: response.data.spreadsheetId,
          spreadsheetUrl: response.data.spreadsheetUrl,
        });
        setStatus(prev => ({ ...prev, isConnected: true }));
      }
    } catch (error) {
      console.log('No existing sheet found');
    }
  }, [session]);

  // Create new spreadsheet
  const createSpreadsheet = useCallback(async () => {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      setStatus(prev => ({ 
        ...prev, 
        needsReauth: true, 
        error: 'Please sign in with Google to enable live sync' 
      }));
      return null;
    }

    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const response = await supabase.functions.invoke('google-sheets-sync', {
        body: { 
          action: 'create',
          accessToken 
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.data?.error) {
        if (response.data.needsReauth) {
          setStatus(prev => ({ 
            ...prev, 
            isSyncing: false, 
            needsReauth: true,
            error: response.data.message 
          }));
          return null;
        }
        throw new Error(response.data.error);
      }

      if (response.data?.spreadsheetId) {
        setSheetInfo({
          spreadsheetId: response.data.spreadsheetId,
          spreadsheetUrl: response.data.spreadsheetUrl,
        });
        setStatus(prev => ({ 
          ...prev, 
          isConnected: true, 
          isSyncing: false,
          error: null 
        }));
        
        toast({
          title: '🎉 Spreadsheet Created!',
          description: 'Your HabitMaster sheet is now live in Google Drive',
        });

        return response.data.spreadsheetId;
      }
    } catch (error: any) {
      setStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: error.message 
      }));
      toast({
        variant: 'destructive',
        title: 'Failed to create spreadsheet',
        description: error.message,
      });
    }
    
    return null;
  }, [getAccessToken, session, toast]);

  // Sync data to spreadsheet
  const syncData = useCallback(async (exportData: any) => {
    const accessToken = getAccessToken();
    let currentSheetId = sheetInfo.spreadsheetId;

    if (!accessToken) {
      setStatus(prev => ({ 
        ...prev, 
        needsReauth: true, 
        error: 'Google access token expired. Please sign in again.' 
      }));
      return false;
    }

    // Create sheet if doesn't exist
    if (!currentSheetId) {
      currentSheetId = await createSpreadsheet();
      if (!currentSheetId) return false;
    }

    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const response = await supabase.functions.invoke('google-sheets-sync', {
        body: {
          action: 'sync',
          accessToken,
          spreadsheetId: currentSheetId,
          data: exportData,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.data?.error) {
        if (response.data.needsReauth) {
          setStatus(prev => ({ 
            ...prev, 
            isSyncing: false, 
            needsReauth: true,
            error: response.data.message 
          }));
          return false;
        }
        throw new Error(response.data.error);
      }

      setStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        lastSynced: new Date(),
        error: null 
      }));

      return true;
    } catch (error: any) {
      setStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: error.message 
      }));
      return false;
    }
  }, [getAccessToken, sheetInfo.spreadsheetId, createSpreadsheet, session]);

  // Download as Excel (XLSX via CSV that Excel can open)
  const downloadAsExcel = useCallback((exportData: any) => {
    const { habits, completions, metrics, streak } = exportData;
    const today = new Date().toLocaleDateString();

    // Build comprehensive CSV
    let csv = '\ufeff'; // BOM for Excel UTF-8
    csv += 'HABITMASTER EXPORT\n';
    csv += `Generated on,${today}\n`;
    csv += `Current Streak,${streak.current} days\n`;
    csv += `Best Streak,${streak.best} days\n\n`;

    // Habits summary
    csv += 'HABITS SUMMARY\n';
    csv += 'Name,Goal %,Total Completions\n';
    habits.forEach((h: any) => {
      const count = completions.filter((c: any) => c.habit_id === h.id).length;
      csv += `"${h.name}",${h.goal},${count}\n`;
    });
    csv += '\n';

    // Daily completions grid
    csv += 'DAILY COMPLETIONS\n';
    csv += 'Date,' + habits.map((h: any) => `"${h.name}"`).join(',') + '\n';
    
    const dates = [...new Set(completions.map((c: any) => c.completion_date))]
      .sort()
      .reverse()
      .slice(0, 90);
    
    dates.forEach((date: string) => {
      const row = [date];
      habits.forEach((h: any) => {
        const done = completions.some(
          (c: any) => c.habit_id === h.id && c.completion_date === date
        );
        row.push(done ? '✓' : '');
      });
      csv += row.join(',') + '\n';
    });
    csv += '\n';

    // Wellness metrics
    csv += 'WELLNESS METRICS\n';
    csv += 'Date,Mood,Sleep (hours)\n';
    metrics
      .sort((a: any, b: any) => b.metric_date.localeCompare(a.metric_date))
      .slice(0, 90)
      .forEach((m: any) => {
        const moodEmoji = ['', '😤', '😔', '😐', '😊', '🤩'][m.mood] || '';
        csv += `${m.metric_date},${moodEmoji || m.mood || ''},${m.sleep_hours || ''}\n`;
      });

    // Trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HabitMaster_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: '📥 Download Complete',
      description: 'Open the CSV file with Excel or Google Sheets',
    });
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    if (hasGoogleConnection()) {
      fetchSheetInfo();
    }
  }, [hasGoogleConnection, fetchSheetInfo]);

  return {
    sheetInfo,
    status,
    hasGoogleConnection: hasGoogleConnection(),
    createSpreadsheet,
    syncData,
    downloadAsExcel,
    refreshSheetInfo: fetchSheetInfo,
  };
}
