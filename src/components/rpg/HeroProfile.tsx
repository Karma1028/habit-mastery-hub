import { motion } from 'framer-motion';
import { UserStats } from '@/hooks/useGamification';
import { Trophy, Star, Shield, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface HeroProfileProps {
    stats: UserStats;
}

export function HeroProfile({ stats }: HeroProfileProps) {
    const progress = (stats.currentXp / stats.nextLevelXp) * 100;

    return (
        <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border p-6 shadow-xl relative overflow-hidden">
            {/* Background decorative glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" />

            <div className="flex flex-col items-center text-center relative z-10">
                {/* Avatar / Badge */}
                <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg border-4 border-background">
                        <Trophy size={40} className="text-white" />
                    </div>
                    <div className="absolute -bottom-2 bg-foreground text-background font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest border-2 border-background">
                        Level {stats.level}
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-black text-foreground mb-1">Habit Hero</h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-6">Novice Adventurer</p>

                {/* XP Bar */}
                <div className="w-full space-y-2 mb-6">
                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                        <span>XP</span>
                        <span>{stats.currentXp} / {stats.nextLevelXp}</span>
                    </div>
                    <div className="relative h-4 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                        />
                    </div>
                </div>

                {/* Quick Stats Summary */}
                <div className="grid grid-cols-3 gap-2 w-full">
                    <div className="bg-background/50 p-2 rounded-xl flex flex-col items-center border border-border/50">
                        <Star size={14} className="text-yellow-500 mb-1" />
                        <span className="font-bold text-sm">{stats.attributes.INT}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">INT</span>
                    </div>
                    <div className="bg-background/50 p-2 rounded-xl flex flex-col items-center border border-border/50">
                        <Shield size={14} className="text-blue-500 mb-1" />
                        <span className="font-bold text-sm">{stats.attributes.DIS}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">DIS</span>
                    </div>
                    <div className="bg-background/50 p-2 rounded-xl flex flex-col items-center border border-border/50">
                        <Zap size={14} className="text-green-500 mb-1" />
                        <span className="font-bold text-sm">{stats.attributes.STR}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">STR</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
