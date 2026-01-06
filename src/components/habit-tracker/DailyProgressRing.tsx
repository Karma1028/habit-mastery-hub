import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DailyProgressRingProps {
  percentage: number;
}

export function DailyProgressRing({ percentage }: DailyProgressRingProps) {
  const data = [
    { name: 'Done', value: percentage },
    { name: 'Left', value: 100 - percentage }
  ];

  return (
    <div className="relative h-64 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={75}
            outerRadius={95}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
            cornerRadius={5}
            paddingAngle={2}
          >
            <Cell key="cell-0" fill="hsl(var(--primary))" />
            <Cell key="cell-1" fill="hsl(var(--muted))" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
        <span className="text-5xl font-bold text-foreground tracking-tight">{percentage}%</span>
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Done</span>
      </div>
    </div>
  );
}
