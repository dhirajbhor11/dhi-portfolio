
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User, Loader2 } from "lucide-react"; // Using Lucide Bot icon
import { BotIcon } from "@/components/icons/BotIcon";


export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  name?: string; // Optional name for avatar fallback
  bypassLimitCheck?: boolean; // Internal flag, not for UI
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (message.role === 'assistant' && message.content === '') {
    // This is an assistant message placeholder while loading
    return (
      <div
        className={cn(
          "flex items-start gap-3 py-3 px-2 md:px-4 rounded-lg shadow-sm justify-start",
          "bg-secondary"
        )}
      >
        <Avatar className="h-8 w-8 shrink-0">
          <BotIcon className="h-full w-full p-1.5 text-primary" />
        </Avatar>
        <div
          className={cn(
            "prose prose-sm max-w-none rounded-md p-3 text-sm flex items-center justify-center min-h-[calc(2rem+1.5rem)]", // Adjusted min-height to roughly match text line + padding
            "bg-card text-card-foreground"
          )}
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3 px-2 md:px-4 rounded-lg shadow-sm",
        isUser ? "justify-end" : "justify-start",
        isUser ? "bg-primary/10" : "bg-secondary"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <BotIcon className="h-full w-full p-1.5 text-primary" />
        </Avatar>
      )}
      <div
        className={cn(
          "prose prose-sm max-w-none rounded-md p-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground"
        )}
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {message.content}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {message.name ? message.name.charAt(0).toUpperCase() : <User size={20} />}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

