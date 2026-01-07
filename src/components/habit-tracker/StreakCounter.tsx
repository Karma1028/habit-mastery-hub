import { Flame, Trophy } from 'lucide-react';

interface StreakCounterProps {
  current: number;
  best: number;
}

export function StreakCounter({ current, best }: StreakCounterProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full border border-primary/20">
        <Flame size={16} className="text-primary fill-primary" />
        <span className="text-sm font-bold text-primary">{current}</span>
        <span className="text-xs text-muted-foreground">day streak</span>
      </div>
      {best > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Trophy size={12} />
          <span>Best: {best}</span>
        </div>
      )}
    </div>
  );
}
