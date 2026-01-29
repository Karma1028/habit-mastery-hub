import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { UserStats } from '@/hooks/useGamification';

interface SkillHexagonProps {
    stats: UserStats;
}

export function SkillHexagon({ stats }: SkillHexagonProps) {
    const data = [
        { subject: 'STR', A: stats.attributes.STR, fullMark: 100 },
        { subject: 'INT', A: stats.attributes.INT, fullMark: 100 },
        { subject: 'WIS', A: stats.attributes.WIS, fullMark: 100 },
        { subject: 'CHA', A: stats.attributes.CHA, fullMark: 100 },
        { subject: 'DIS', A: stats.attributes.DIS, fullMark: 100 },
    ];

    return (
        <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border p-4 shadow-xl flex flex-col items-center">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Attribute Matrix</h3>
            <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                        <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                        <Radar
                            name="My Stats"
                            dataKey="A"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="hsl(var(--primary))"
                            fillOpacity={0.4}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
