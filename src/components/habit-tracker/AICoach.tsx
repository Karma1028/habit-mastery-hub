import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  X,
  Loader2,
  Lightbulb,
  TrendingUp,
  Heart,
  RefreshCw
} from 'lucide-react';
import { useHabits } from '@/hooks/useHabits';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const QUICK_PROMPTS = [
  { icon: TrendingUp, text: "How am I doing this week?", color: "text-primary" },
  { icon: Lightbulb, text: "Give me tips to improve", color: "text-warning" },
  { icon: Heart, text: "What habits should I focus on?", color: "text-destructive" },
  { icon: RefreshCw, text: "Analyze my patterns", color: "text-info" },
];

export function AICoach() {
  const { habits, streak, completionsMap, metricsMap } = useHabits();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Build habit data context
  const habitData = useMemo(() => {
    const today = new Date();
    const last7Days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7Days.push(d);
    }

    const last30Days: Date[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last30Days.push(d);
    }

    // Recent completions
    let recentCompletions = 0;
    last7Days.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      habits.forEach(h => {
        if (completionsMap[h.id]?.has(dateKey)) recentCompletions++;
      });
    });

    // Weekly rate
    const weeklyTotal = habits.length * 7;
    const weeklyRate = weeklyTotal > 0 ? Math.round((recentCompletions / weeklyTotal) * 100) : 0;

    // Monthly rate
    let monthlyCompletions = 0;
    last30Days.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      habits.forEach(h => {
        if (completionsMap[h.id]?.has(dateKey)) monthlyCompletions++;
      });
    });
    const monthlyTotal = habits.length * 30;
    const monthlyRate = monthlyTotal > 0 ? Math.round((monthlyCompletions / monthlyTotal) * 100) : 0;

    // Avg mood and sleep
    let moodSum = 0, moodCount = 0, sleepSum = 0, sleepCount = 0;
    last7Days.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const metric = metricsMap[dateKey];
      if (metric?.mood) { moodSum += metric.mood; moodCount++; }
      if (metric?.sleep_hours) { sleepSum += metric.sleep_hours; sleepCount++; }
    });

    // Best and worst habits
    const habitRates = habits.map(h => {
      let count = 0;
      last30Days.forEach(d => {
        if (completionsMap[h.id]?.has(d.toISOString().split('T')[0])) count++;
      });
      return { name: h.name, rate: count / 30 };
    }).sort((a, b) => b.rate - a.rate);

    return {
      habits: habits.map(h => ({ id: h.id, name: h.name })),
      streak,
      recentCompletions,
      weeklyRate,
      monthlyRate,
      avgMood: moodCount > 0 ? (moodSum / moodCount).toFixed(1) : null,
      avgSleep: sleepCount > 0 ? (sleepSum / sleepCount).toFixed(1) : null,
      bestHabit: habitRates[0]?.name || null,
      worstHabit: habitRates[habitRates.length - 1]?.name || null
    };
  }, [habits, streak, completionsMap, metricsMap]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          habitData
        }),
      });

      if (response.status === 429) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'm getting a lot of requests right now! Please try again in a moment. 🙏" 
        }]);
        setIsLoading(false);
        return;
      }

      if (response.status === 402) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "The AI service needs more credits. Please contact the app administrator." 
        }]);
        setIsLoading(false);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Add empty assistant message to start streaming into
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === 'assistant') {
                  lastMessage.content = assistantContent;
                }
                return newMessages;
              });
            }
          } catch {
            // Incomplete JSON, wait for more data
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('AI Coach error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I couldn't process that request. Please try again! 🤔" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-emerald transition-shadow ${isOpen ? 'hidden' : ''}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles size={24} />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed inset-x-4 bottom-20 top-16 z-50 md:inset-auto md:right-4 md:bottom-24 md:w-96 md:h-[500px] bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold">AI Coach</h3>
                  <p className="text-xs opacity-80">Your personal habit advisor</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-primary-foreground/10 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h4 className="font-bold text-foreground mb-2">Hi! I'm your AI Coach 👋</h4>
                  <p className="text-sm text-muted-foreground mb-6">
                    I can analyze your habits and help you improve!
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt.text)}
                        className="p-3 bg-muted rounded-lg text-left hover:bg-accent transition text-sm"
                      >
                        <prompt.icon size={16} className={`${prompt.color} mb-1`} />
                        <span className="text-foreground text-xs font-medium">{prompt.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-primary'
                  }`}>
                    {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content || '...'}</p>
                  </div>
                </motion.div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md p-3">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your habits..."
                  className="flex-1 bg-muted border border-border rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
