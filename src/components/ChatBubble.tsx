interface ChatBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  isTyping?: boolean;
}

export function ChatBubble({ role, text, isTyping }: ChatBubbleProps) {
  const isUser = role === 'user';
  return (
    <div className={`max-w-[80%] rounded-2xl px-4 py-3 mb-3 animate-scale-in ${isUser ? 'mr-0 ml-auto gradient-primary text-primary-foreground' : 'ml-0 mr-auto bg-card text-foreground border border-border'}`}>
      {isTyping ? (
        <div className="flex gap-1 py-1 px-2">
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
        </div>
      ) : (
        <p className="text-sm leading-relaxed">{text}</p>
      )}
    </div>
  );
}
