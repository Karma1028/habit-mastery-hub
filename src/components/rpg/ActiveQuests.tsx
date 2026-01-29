import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Loader2, Sparkles } from 'lucide-react';
import { Habit } from '@/hooks/useHabits';
import { useHabits } from '@/hooks/useHabits';
import { analyzeQuestWithAI } from '@/utils/ai-game-master';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function ActiveQuests() {
    const { habits, isHabitCompleted, toggleHabit, addHabit } = useHabits();
    const { toast } = useToast();
    const [newQuest, setNewQuest] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAddQuest = async () => {
        if (!newQuest.trim()) return;
        setIsAnalyzing(true);

        // AI Analysis
        const analysis = await analyzeQuestWithAI(newQuest);

        // Create the habit (We need to update addHabit in useHabits to accept custom props or we handle it here?)
        // Actually, useHabits addHabit currently defaults to 10/DIS inside the hook.
        // Ideally we should pass these values.
        // For now, let's just add it and rely on the hook's default, OR better:
        // Update useHabits to accept overrides (I might need to quick-fix useHabits again if I want AI attributes to stick)
        // WAIT: I can just update the habit AFTER adding it? No, that's slow.
        // I will call addHabit, but I need to modify it to accept params.
        // Let's assume for this step I'll just call addHabit and maybe later I fix the hook to accept options.
        // Wait, the hook definitely hardcodes it. 
        // I will update the hook in the next step to accept options.

        await addHabit(newQuest, analysis);

        toast({
            title: "Quest Accepted!",
            description: `+${analysis.xp} XP | Type: ${analysis.attribute} (${analysis.reasoning})`,
            className: "bg-primary text-primary-foreground"
        });

        setNewQuest('');
        setIsAnalyzing(false);
    };

    const today = new Date();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-black text-xl text-foreground">Active Quests</h3>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full">{habits.length} Available</span>
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
                <Input
                    value={newQuest}
                    onChange={(e) => setNewQuest(e.target.value)}
                    placeholder="Type a new quest (e.g. 'Read 10 pages')..."
                    className="bg-card/50 backdrop-blur border-border"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddQuest()}
                />
                <Button onClick={handleAddQuest} disabled={isAnalyzing || !newQuest.trim()}>
                    {isAnalyzing ? <Loader2 className="animate-spin" /> : <Plus />}
                </Button>
            </div>

            {/* Quest List */}
            <div className="grid gap-3">
                <AnimatePresence>
                    {habits.map((habit) => {
                        const isDone = isHabitCompleted(habit.id, today);
                        return (
                            <motion.div
                                key={habit.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`
                                relative overflow-hidden rounded-xl border p-4 cursor-pointer transition-all
                                ${isDone
                                        ? 'bg-secondary/20 border-secondary/50'
                                        : 'bg-card border-border hover:border-primary/50'}
                            `}
                                onClick={() => toggleHabit(habit.id, today)}
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                                        ${isDone ? 'bg-secondary border-secondary text-secondary-foreground' : 'border-muted-foreground/30 text-transparent'}
                                    `}>
                                            <Check size={14} strokeWidth={4} />
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                {habit.name}
                                            </h4>
                                            <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                                                <span className="text-secondary-foreground bg-secondary/20 px-1.5 py-0.5 rounded">
                                                    +{habit.xpReward || 10} XP
                                                </span>
                                                <span className="border border-border px-1.5 py-0.5 rounded">
                                                    {habit.attribute || 'DIS'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {isDone && <Sparkles className="text-yellow-500 animate-pulse" size={16} />}
                                </div>

                                {/* Progress Fill Animation */}
                                {isDone && (
                                    <motion.div
                                        layoutId={`fill-${habit.id}`}
                                        className="absolute inset-0 bg-secondary/10"
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ duration: 0.3 }}
                                        style={{ originX: 0 }}
                                    />
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
