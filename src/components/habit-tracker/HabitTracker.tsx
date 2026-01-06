import { useState } from 'react';
import { 
  Trophy, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  LogOut, 
  ListTodo, 
  LayoutDashboard, 
  Grid3X3,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { TodayView } from './TodayView';
import { DashboardView } from './DashboardView';
import { TrackerView } from './TrackerView';

type TabType = 'today' | 'dashboard' | 'tracker';

export function HabitTracker() {
  const { signOut } = useAuth();
  const { habits, loading } = useHabits();
  
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [syncing, setSyncing] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const handleBackup = () => {
    setSyncing(true);
    setTimeout(() => {
      const exportData = { habits, exportedAt: new Date().toISOString() };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "habit_tracker_backup.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      setSyncing(false);
    }, 500);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* Top Bar */}
      <header className="bg-card border-b border-border h-14 flex items-center justify-between px-4 shadow-sm z-20">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm">
            <Trophy size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground hidden sm:inline-block">
            Habit<span className="text-primary">Master</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== 'today' && (
            <div className="flex items-center bg-muted rounded-lg border border-border px-1 py-1 mr-2">
              <button 
                onClick={() => setCurrentDate(new Date(year, month - 1))} 
                className="p-1 hover:bg-card hover:shadow-sm rounded transition text-muted-foreground"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="w-24 sm:w-32 text-center text-sm font-bold text-foreground">{monthName} {year}</span>
              <button 
                onClick={() => setCurrentDate(new Date(year, month + 1))} 
                className="p-1 hover:bg-card hover:shadow-sm rounded transition text-muted-foreground"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <button 
            onClick={handleBackup} 
            disabled={syncing} 
            className={`p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition-colors ${syncing ? 'animate-pulse' : ''}`}
          >
            <Save size={20} />
          </button>
          <button 
            onClick={signOut} 
            className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'today' && <TodayView />}
        {activeTab === 'dashboard' && <DashboardView currentDate={currentDate} />}
        {activeTab === 'tracker' && <TrackerView currentDate={currentDate} />}
      </main>

      {/* App Navigation */}
      <nav className="bg-card border-t border-border h-16 flex items-center justify-around pb-2 safe-area-bottom shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-30">
        <button 
          onClick={() => setActiveTab('today')} 
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            activeTab === 'today' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'today' ? 'bg-secondary' : ''}`}>
            <ListTodo size={24} strokeWidth={activeTab === 'today' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold">Today</span>
        </button>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'dashboard' ? 'bg-secondary' : ''}`}>
            <LayoutDashboard size={24} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('tracker')} 
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            activeTab === 'tracker' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'tracker' ? 'bg-secondary' : ''}`}>
            <Grid3X3 size={24} strokeWidth={activeTab === 'tracker' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold">Tracker</span>
        </button>
      </nav>
    </div>
  );
}
