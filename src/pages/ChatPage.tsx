import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { ChatBubble } from '@/components/ChatBubble';
import { chatSuggestions } from '@/lib/data';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const initialMessages: Message[] = [
  { id: 'welcome', role: 'assistant', text: 'مرحباً! 👋 أنا مساعدك الذكي لإنتاج المحتوى. اسألني عن أفكار فيديو، نصائح إنتاج، أو أي شيء يخطر ببالك!' },
];

const replies = [
  'فكرة رائعة! 🎬 سأقترح لك هيكل فيديو من 3 مشاهد:\n\n1. مشهد افتتاحي جذاب (3 ثوانٍ)\n2. عرض المحتوى الرئيسي (7 ثوانٍ)\n3. خاتمة مع دعوة للتفاعل (5 ثوانٍ)',
  'لتحسين جودة الفيديو 📹:\n\n• اختر طابع سينمائي للإعلانات\n• استخدم إضاءة ديناميكية\n• أضف موسيقى خلفية مناسبة\n• اجعل النصوص واضحة وقصيرة',
  'إليك سكريبت قصير لفيديو إعلان:\n\n"هل تبحث عن الأفضل؟ 🌟\nمنتجنا يقدم لك تجربة فريدة...\nاكتشف الفرق بنفسك!\nاطلب الآن — التوصيل مجاني."',
  'نصيحة احترافية ✨: ابدأ فيديوك بسؤال مثير أو إحصائية مفاجئة خلال أول 3 ثوانٍ. هذا يضاعف نسبة المشاهدة بمقدار 2-3 مرات!',
  'للفيديو التحفيزي أنصحك بـ:\n\n🎯 طابع سينمائي + إضاءة دافئة\n🎵 موسيقى حماسية متصاعدة\n✍️ عبارات قصيرة ومؤثرة\n⏱️ إيقاع سريع بين المشاهد',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = (content: string) => {
    if (!content.trim() || typing) return;
    const userMsg: Message = { id: `${Date.now()}`, role: 'user', text: content };
    setMessages(prev => [...prev, userMsg]);
    setText('');
    setTyping(true);

    // Simulate typing delay
    const delay = 800 + Math.random() * 1200;
    setTimeout(() => {
      const reply: Message = {
        id: `${Date.now()}-r`,
        role: 'assistant',
        text: replies[Math.floor(Math.random() * replies.length)],
      };
      setMessages(prev => [...prev, reply]);
      setTyping(false);
    }, delay);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] px-5 pt-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-black text-foreground flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          المساعد الذكي
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">اسألني أي شيء عن إنتاج المحتوى — <span className="text-gradient font-bold">مجاني</span></p>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto pb-4 scrollbar-none">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} role={msg.role} text={msg.text} />
        ))}
        {typing && <ChatBubble role="assistant" text="" isTyping />}
      </div>

      {/* Suggestions */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none -mx-5 px-5 pb-1">
        {chatSuggestions.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={typing}
            className="whitespace-nowrap rounded-xl bg-card border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent hover:border-primary/20 transition-all disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 rounded-2xl bg-card border border-border p-2 mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(text)}
          placeholder="اكتب رسالتك..."
          disabled={typing}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none px-2 disabled:opacity-50"
        />
        <button
          onClick={() => send(text)}
          disabled={typing || !text.trim()}
          className="rounded-xl gradient-primary p-2.5 disabled:opacity-50 transition-all hover:scale-105"
        >
          <Send className="h-4 w-4 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}
