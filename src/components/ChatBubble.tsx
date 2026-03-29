interface ChatBubbleProps {
  role: 'user' | 'assistant';
  text: string;
}

export function ChatBubble({ role, text }: ChatBubbleProps) {
  const isUser = role === 'user';
  return (
    <div className={`max-w-[80%] rounded-2xl px-4 py-3 mb-3 ${isUser ? 'mr-0 ml-auto gradient-primary text-primary-foreground' : 'ml-0 mr-auto bg-card text-foreground border border-border'}`}>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}
