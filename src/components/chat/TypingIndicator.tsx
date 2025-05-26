
"use client";

import { Avatar } from "@/components/ui/avatar";
import { DhiBotUserLogo } from "@/components/icons/DhiBotUserLogo";

export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2 p-4">
      <Avatar className="h-8 w-8 shrink-0">
        <DhiBotUserLogo className="h-full w-full p-1.5 text-primary" width={32} height={32} />
      </Avatar>
      <div className="flex space-x-1">
        <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground"></div>
      </div>
    </div>
  );
}
