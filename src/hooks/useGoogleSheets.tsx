import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { createSpreadsheet, appendData, getSpreadsheet } from '@/utils/google-sheets';
import { db } from '@/integrations/firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  const userAuth = useAuth();
  const { user } = userAuth;
  const { toast } = useToast();
  const [sheetInfo, setSheetInfo] = useState<SheetInfo>({ spreadsheetId: null, spreadsheetUrl: null });
  const [status, setStatus] = useState<SyncStatus>({
    isConnected: false,
    isSyncing: false,
    lastSynced: null,
    error: null,
    needsReauth: false,
  });

  const getToken = () => sessionStorage.getItem('google_access_token');

  // Check for existing sheet ID in user profile
  useEffect(() => {
    if (!user) return;

    const checkUserProfile = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().spreadsheetId) {
          const id = userSnap.data().spreadsheetId;
          setSheetInfo({
            spreadsheetId: id,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}`
          });
          setStatus(prev => ({ ...prev, isConnected: true }));
        }
      } catch (err) {
        console.error('[useGoogleSheets] Error checking user profile:', err);
      }
    };

    checkUserProfile();
  }, [user]);

  const refreshSheetInfo = async () => {
    const token = getToken();
    const id = sheetInfo.spreadsheetId;

    if (!token || !id) return;

    try {
      const sheet = await getSpreadsheet(id, token);
      if (!sheet) {
        setStatus(prev => ({ ...prev, isConnected: false, error: 'Sheet not found' }));
      } else {
        setStatus(prev => ({ ...prev, isConnected: true, error: null }));
      }
    } catch (e) {
      console.error('[useGoogleSheets] Check sheet error:', e);
      setStatus(prev => ({ ...prev, needsReauth: true }));
    }
  };

  const createSheet = async () => {
    const token = getToken();
    console.log('[useGoogleSheets] createSheet called. Token exists:', !!token, 'User:', user?.uid);

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Logged In',
        description: 'Please log in first.',
      });
      return null;
    }

    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Google Not Connected',
        description: 'Click "Connect Google Drive" to authorize.',
      });
      setStatus(prev => ({ ...prev, needsReauth: true }));
      return null;
    }

    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      console.log('[useGoogleSheets] Creating spreadsheet...');
      const sheet = await createSpreadsheet('HabitMaster Tracker', token);
      console.log('[useGoogleSheets] Spreadsheet created:', sheet);

      const spreadsheetId = sheet.spreadsheetId;
      const spreadsheetUrl = sheet.spreadsheetUrl;

      // Initialize headers
      console.log('[useGoogleSheets] Adding headers...');
      await appendData(spreadsheetId, 'A1:E1', [[
        'Date', 'Action', 'Habit Name', 'Value', 'Timestamp'
      ]], token);

      // Save ID to user profile
      console.log('[useGoogleSheets] Saving to Firestore...');
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { spreadsheetId }, { merge: true });

      setSheetInfo({ spreadsheetId, spreadsheetUrl });
      setStatus(prev => ({ ...prev, isConnected: true, isSyncing: false, error: null }));

      toast({
        title: '✅ Spreadsheet Created!',
        description: 'Check your Google Drive for "HabitMaster Tracker".',
      });

      return spreadsheetUrl;
    } catch (error: any) {
      console.error('[useGoogleSheets] Create sheet error:', error);

      let errorMsg = error.message || 'Failed to create sheet';
      if (errorMsg.includes('401') || errorMsg.includes('403')) {
        errorMsg = 'Permission denied. Please reconnect Google Drive.';
        setStatus(prev => ({ ...prev, needsReauth: true }));
      }

      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: errorMsg,
      });

      setStatus(prev => ({ ...prev, isSyncing: false, error: errorMsg }));
      return null;
    }
  };

  const syncData = async (exportData: any) => {
    const token = getToken();
    console.log('[useGoogleSheets] syncData called. SheetId:', sheetInfo.spreadsheetId, 'Token:', !!token);

    if (!sheetInfo.spreadsheetId || !token) {
      console.log('[useGoogleSheets] Cannot sync - missing sheet or token');
      return false;
    }

    setStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      const now = new Date();
      const rows = [
        [
          now.toLocaleDateString(),
          'SYNC',
          'Daily Update',
          `Streak: ${exportData.streak.current}`,
          now.toISOString()
        ]
      ];

      await appendData(sheetInfo.spreadsheetId, 'Sheet1', rows, token);

      setStatus(prev => ({ ...prev, isSyncing: false, lastSynced: new Date() }));
      return true;
    } catch (error: any) {
      console.error('[useGoogleSheets] Sync error:', error);

      if (error.message?.includes('401') || error.message?.includes('403')) {
        setStatus(prev => ({ ...prev, needsReauth: true }));
      }

      setStatus(prev => ({ ...prev, isSyncing: false, error: 'Failed to sync' }));
      return false;
    }
  };

  const downloadAsExcel = (data: any) => {
    // Generate CSV for download
    const habits = data.habits || [];
    const completions = data.completions || [];

    let csv = 'Habit Name,Goal,Completions\n';
    habits.forEach((h: any) => {
      const count = completions.filter((c: any) => c.habit_id === h.id).length;
      csv += `"${h.name}",${h.goal},${count}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habits_export.csv';
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Downloaded', description: 'CSV file saved.' });
  };

  const reAuthenticate = async () => {
    console.log('[useGoogleSheets] reAuthenticate called');
    const result = await userAuth.reauthenticateWithGoogle();

    // Small delay to let sessionStorage update
    await new Promise(r => setTimeout(r, 500));

    const token = getToken();
    console.log('[useGoogleSheets] After reauth, token exists:', !!token);

    if (token) {
      setStatus(prev => ({ ...prev, needsReauth: false, error: null }));
      toast({ title: 'Connected!', description: 'Google Drive connected successfully.' });
      return true;
    } else {
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: 'Could not get access token. Try again.'
      });
      return false;
    }
  };

  return {
    sheetInfo,
    status,
    hasGoogleConnection: !!getToken(),
    createSpreadsheet: createSheet,
    syncData,
    downloadAsExcel,
    refreshSheetInfo,
    reAuthenticate
  };
}
