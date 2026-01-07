import { useState } from 'react';
import { Sheet, Loader2, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const { toast } = useToast();

  const generateCSV = () => {
    // Generate habits sheet data
    const habitsData = exportData.habits.map(h => ({
      Name: h.name,
      Goal: h.goal,
      Completions: exportData.completions.filter(c => c.habit_id === h.id).length
    }));

    // Generate completions timeline
    const completionsByDate: Record<string, Record<string, boolean>> = {};
    exportData.completions.forEach(c => {
      if (!completionsByDate[c.completion_date]) {
        completionsByDate[c.completion_date] = {};
      }
      const habit = exportData.habits.find(h => h.id === c.habit_id);
      if (habit) {
        completionsByDate[c.completion_date][habit.name] = true;
      }
    });

    // Create CSV content
    let csv = 'HabitMaster Export\n';
    csv += `Exported: ${new Date(exportData.exportedAt).toLocaleString()}\n`;
    csv += `Current Streak: ${exportData.streak.current} days\n`;
    csv += `Best Streak: ${exportData.streak.best} days\n\n`;
    
    csv += 'HABITS SUMMARY\n';
    csv += 'Name,Goal,Total Completions\n';
    habitsData.forEach(h => {
      csv += `"${h.Name}",${h.Goal},${h.Completions}\n`;
    });
    
    csv += '\nDAILY COMPLETIONS\n';
    csv += 'Date,' + exportData.habits.map(h => `"${h.name}"`).join(',') + '\n';
    
    const dates = [...new Set(exportData.completions.map(c => c.completion_date))].sort();
    dates.forEach(date => {
      const row = [date];
      exportData.habits.forEach(h => {
        row.push(completionsByDate[date]?.[h.name] ? '✓' : '');
      });
      csv += row.join(',') + '\n';
    });

    csv += '\nWELLNESS METRICS\n';
    csv += 'Date,Mood (1-5),Sleep Hours\n';
    exportData.metrics.forEach(m => {
      csv += `${m.metric_date},${m.mood || ''},${m.sleep_hours || ''}\n`;
    });

    return csv;
  };

  const handleSync = async () => {
    setSyncing(true);
    
    // Simulate sync delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `habitmaster_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSyncing(false);
    setSynced(true);
    
    toast({
      title: 'Export Complete',
      description: 'Your data has been exported. Import this CSV to Google Sheets via File → Import.'
    });

    setTimeout(() => setSynced(false), 3000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-2"
    >
      {syncing ? (
        <Loader2 size={16} className="animate-spin" />
      ) : synced ? (
        <Check size={16} className="text-primary" />
      ) : (
        <Sheet size={16} />
      )}
      <span className="hidden sm:inline">
        {syncing ? 'Exporting...' : synced ? 'Exported!' : 'Export to Sheets'}
      </span>
      <Download size={14} className="sm:hidden" />
    </Button>
  );
}
