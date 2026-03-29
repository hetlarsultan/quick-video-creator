import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { ChatBubble } from '@/components/ChatBubble';
import { chatSuggestions } from '@/lib/data';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const initialMessages: Message[] = [
  { id: 'welcome', role: 'assistant', text: 'مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك في مشروعك؟' },
];

const replies = [
  'فكرة رائعة! سأقترح لك هيكل فيديو من 3 مشاهد مع موسيقى هادئة.',
  'لتحسين الجودة اختر طابع سينمائي وأضف إضاءة ديناميكية.',
  'يمكنك جعل البداية جذابة مع نص قوي وانتقال سلس بين اللقطات.',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = (content: string) => {
    if (!content.trim()) return;
    const userMsg: Message = { id: `${Date.now()}`, role: 'user', text: content };
    const reply: Message = { id: `${Date.now()}-r`, role: 'assistant', text: replies[Math.floor(Math.random() * replies.length)] };
    setMessages((prev) => [...prev, userMsg, reply]);
    setText('');
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] px-5 pt-8">
      <div ref={listRef} className="flex-1 overflow-y-auto pb-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} role={msg.role} text={msg.text} />
        ))}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {chatSuggestions.map((s) => (
          <button key={s} onClick={() => send(s)} className="rounded-xl bg-card border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors">
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-card border border-border p-2 mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(text)}
          placeholder="اكتب رسالتك"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none px-2"
        />
        <button onClick={() => send(text)} className="rounded-xl gradient-primary p-2.5">
          <Send className="h-4 w-4 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}
