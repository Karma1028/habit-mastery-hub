import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Youtube, Lightbulb, Quote, Globe, Music } from 'lucide-react';
import { generateHeroPlan, HeroPlan } from '@/utils/ai-game-master';
import { motion } from 'framer-motion';

export function AIContentWidget() {
    const [plan, setPlan] = useState<HeroPlan | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check for pending profile to process
        const pending = localStorage.getItem('hero_profile_pending');
        if (pending) {
            setLoading(true);
            const profile = JSON.parse(pending);

            // Run AI
            generateHeroPlan(profile).then(res => {
                setPlan(res);
                localStorage.setItem('hero_daily_plan', JSON.stringify(res));
                localStorage.removeItem('hero_profile_pending'); // Clear trigger
                setLoading(false);
            });
        } else {
            // Load existing
            const existing = localStorage.getItem('hero_daily_plan');
            if (existing) setPlan(JSON.parse(existing));
        }
    }, []);

    if (loading) {
        return (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 animate-pulse flex items-center gap-4">
                <Lightbulb className="animate-bounce text-primary" />
                <span className="text-sm font-bold text-primary">The Game Master is updating your strategy...</span>
            </div>
        )
    }

    if (!plan) return null;


    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* 1. HERO HEADER: Quote */}
            <div className="relative bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary p-6 rounded-r-xl overflow-hidden">
                <Quote className="absolute top-2 right-4 text-primary/10 h-24 w-24 -rotate-12" />
                <p className="relative z-10 italic text-xl font-serif text-foreground/90">"{plan.quote.text}"</p>
                <p className="relative z-10 text-xs font-bold text-primary mt-3 uppercase tracking-widest">— {plan.quote.author}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 2. LEFT COL: Missions & Roadmap */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Short Term Goals */}
                    <Card className="p-6 bg-card/80 border-secondary/20 shadow-sm">
                        <h4 className="flex items-center gap-2 font-black text-secondary uppercase tracking-tight mb-4">
                            <Lightbulb size={18} /> Immediate Directives
                        </h4>
                        <div className="space-y-3">
                            {plan.short_term_goals.map((goal, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/5 border border-secondary/10">
                                    <div className="h-2 w-2 rounded-full bg-secondary" />
                                    <span className="font-medium text-sm">{goal}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Roadmap Timeline */}
                    <Card className="p-6 bg-card/80 border-primary/20 shadow-sm">
                        <h4 className="flex items-center gap-2 font-black text-primary uppercase tracking-tight mb-4">
                            <Lightbulb size={18} /> Operations Roadmap
                        </h4>
                        <div className="space-y-0">
                            {plan.roadmap.map((step, i) => (
                                <div key={i} className="flex gap-4 relative">
                                    {/* Timeline Line */}
                                    {i !== plan.roadmap.length - 1 && (
                                        <div className="absolute left-[19px] top-8 bottom-0 w-0.5 bg-border" />
                                    )}

                                    <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 text-xs font-bold text-primary">
                                        W{i + 1}
                                    </div>
                                    <div className="pb-8">
                                        <h5 className="font-bold text-sm text-foreground/90">{step.week}</h5>
                                        <p className="text-sm text-muted-foreground">{step.focus}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* 3. RIGHT COL: Intel (Media) */}
                <div className="space-y-6">
                    {/* Strategy Advice */}
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                        <h5 className="font-bold text-orange-500 text-xs uppercase mb-1">Game Master's Tip</h5>
                        <p className="text-sm font-medium leading-relaxed">{plan.advice}</p>
                    </div>

                    {/* YouTube */}
                    <Card className="p-5 bg-card/80 border-red-500/20">
                        <h4 className="flex items-center gap-2 font-bold text-red-500 mb-3 text-sm uppercase">
                            <Youtube size={16} /> Briefing Materials
                        </h4>
                        <div className="space-y-2">
                            {plan.youtube_queries.map((q, i) => (
                                <a
                                    key={i}
                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-xs bg-muted/50 p-2 rounded hover:bg-red-500/10 transition-colors truncate"
                                >
                                    ▶ {q}
                                </a>
                            ))}
                        </div>
                    </Card>

                    {/* Music */}
                    <Card className="p-5 bg-card/80 border-violet-500/20">
                        <h4 className="flex items-center gap-2 font-bold text-violet-500 mb-3 text-sm uppercase">
                            <Music size={16} /> Soundtrack
                        </h4>
                        <div className="space-y-2">
                            {plan.music_recommendations.map((m, i) => (
                                <a
                                    key={i}
                                    href={`https://open.spotify.com/search/${encodeURIComponent(m)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-xs bg-muted/50 p-2 rounded hover:bg-violet-500/10 transition-colors truncate"
                                >
                                    🎵 {m}
                                </a>
                            ))}
                        </div>
                    </Card>

                    {/* News */}
                    <Card className="p-5 bg-card/80 border-blue-500/20">
                        <h4 className="flex items-center gap-2 font-bold text-blue-500 mb-3 text-sm uppercase">
                            <Globe size={16} /> Intel Feed
                        </h4>
                        <div className="space-y-2">
                            {plan.news_topics.map((t, i) => (
                                <a
                                    key={i}
                                    href={`https://news.google.com/search?q=${encodeURIComponent(t)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-xs bg-muted/50 p-2 rounded hover:bg-blue-500/10 transition-colors truncate"
                                >
                                    📰 {t}
                                </a>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
};
