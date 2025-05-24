
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
// import { TypingIndicator } from "./TypingIndicator"; // Removed as per request
import { QuickPrompts } from "./QuickPrompts";
import type { Message } from "./ChatMessage";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BotIcon } from "@/components/icons/BotIcon";

const initialWelcomeMessage: Message = {
  id: "welcome-message",
  role: "assistant",
  content: "Hello! I'm PersonaLink AI, your guide to this portfolio. Feel free to ask me anything about the owner's skills, experience, or projects. How can I help you today?",
};

export function ChatLayout() {
  const [messages, setMessages] = useState<Message[]>([initialWelcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load messages from sessionStorage on mount
  useEffect(() => {
    try {
      const storedMessages = sessionStorage.getItem("chatMessages");
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages);
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages);
        }
      }
    } catch (error) {
      console.error("Failed to load messages from session storage:", error);
      // Fallback to initial message if loading fails or no messages
      if(messages.length === 0) {
         setMessages([initialWelcomeMessage]);
      }
    }
  }, []);

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem("chatMessages", JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save messages to session storage:", error);
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (inputText: string) => {
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText,
      name: "User",
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    let assistantResponse = "";
    const assistantMessageId = (Date.now() + 1).toString();

    // Add a placeholder for the assistant's message
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error occurred" }));
        throw new Error(errorData.detail || `API Error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader.");
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantResponse += chunk;
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantResponse }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error fetching AI response:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: `Sorry, I encountered an error: ${errorMessage}` }
            : msg
        )
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to get response: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto bg-background shadow-xl rounded-lg overflow-hidden">
      <CardHeader className="p-4 md:p-6 border-b">
         <div className="flex items-center space-x-3">
            <BotIcon className="h-10 w-10 text-primary" />
            <div>
                <CardTitle className="text-2xl font-bold">PersonaLink AI</CardTitle>
                <CardDescription>Your interactive guide to this portfolio.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <ChatMessages messages={messages} isLoading={isLoading} />
      {/* {isLoading && <TypingIndicator />} Removed as per request */}
      {!isLoading && messages.length <= 1 && ( /* Show prompts if only welcome message or empty */
        <QuickPrompts onPromptClick={handlePromptClick} />
      )}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
