"use client";

import { Button } from "@/components/ui/button";

interface QuickPromptsProps {
  onPromptClick: (prompt: string) => void;
}

const prompts = [
  "Tell me about your experience.",
  "What are your key skills?",
  "What projects have you worked on?",
  "Summarize your professional background.",
];

export function QuickPrompts({ onPromptClick }: QuickPromptsProps) {
  return (
    <div className="p-4 flex flex-wrap gap-2 justify-center">
      {prompts.map((prompt) => (
        <Button
          key={prompt}
          variant="outline"
          size="sm"
          className="text-xs md:text-sm"
          onClick={() => onPromptClick(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}
