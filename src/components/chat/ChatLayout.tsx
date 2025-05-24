
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { QuickPrompts } from "./QuickPrompts";
import type { Message } from "./ChatMessage";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BotIcon } from "@/components/icons/BotIcon";
import { useAuth } from "@/contexts/AuthContext";
import { addMessageToHistory, getChatHistory } from "@/services/firestoreService";


const initialWelcomeMessage: Message = {
  id: "welcome-message",
  role: "assistant",
  content: "Hello! I'm PersonaLink AI, your guide to this portfolio. Feel free to ask me anything about the owner's skills, experience, or projects. How can I help you today?",
};

export function ChatLayout() {
  const [messages, setMessages] = useState<Message[]>([initialWelcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth(); 

  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load chat history from Firestore on mount or when user changes
  useEffect(() => {
    if (currentUser?.uid) {
      setIsLoading(true); 
      getChatHistory(currentUser.uid)
        .then(history => {
          if (history.length > 0) {
            setMessages(history);
          } else {
            // If no history, or an empty history array was returned, start with welcome.
            setMessages([initialWelcomeMessage]);
          }
        })
        .catch(error => {
          console.error("Failed to load chat history:", error);
          setMessages([initialWelcomeMessage]); 
          toast({
            variant: "destructive",
            title: "Error Loading History",
            description: "Could not load previous chat history.",
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // No current user, reset to initial welcome message.
      setMessages([initialWelcomeMessage]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, toast]); 


  const handleSendMessage = useCallback(async (inputText: string) => {
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText,
      name: currentUser?.displayName || currentUser?.email || "User",
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    if (currentUser?.uid) {
      try {
        await addMessageToHistory(currentUser.uid, newUserMessage);
      } catch (error) {
        console.error("Failed to save user message to history:", error);
        toast({
          variant: "destructive",
          title: "History Save Error",
          description: "Could not save your message to history.",
        });
        // Non-critical for chat flow, but user should be aware.
      }
    }

    let assistantResponse = "";
    const assistantMessageId = (Date.now() + 1).toString();

    // Add placeholder for assistant's message
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
      // eslint-disable-next-line no-constant-condition
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
      const errorMessageContent = error instanceof Error ? error.message : "An unexpected error occurred.";
      // Update the placeholder with the error message
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: `Sorry, I encountered an error: ${errorMessageContent}` }
            : msg
        )
      );
      toast({
        variant: "destructive",
        title: "AI Response Error",
        description: `Failed to get response: ${errorMessageContent}`,
      });
    } finally {
      setIsLoading(false);
      // Save the final assistant message (which might be an error message from the catch block)
      const finalAssistantMessageInState = messagesRef.current.find(msg => msg.id === assistantMessageId);
      if (currentUser?.uid && finalAssistantMessageInState && finalAssistantMessageInState.content) {
        addMessageToHistory(currentUser.uid, finalAssistantMessageInState)
          .catch(saveError => {
            console.error("Failed to save assistant's final message to history:", saveError);
            toast({
              variant: "destructive",
              title: "History Save Error",
              description: "Could not save assistant's response to history.",
            });
          });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, currentUser]); 


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
      <ChatMessages messages={messages} isLoading={isLoading && messages.length === 0 && !!currentUser?.uid} />
      {!isLoading && messages.length <= 1 && !!currentUser?.uid && ( 
        <QuickPrompts onPromptClick={handlePromptClick} />
      )}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}

