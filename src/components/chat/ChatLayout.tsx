
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { QuickPrompts } from "./QuickPrompts";
import type { Message } from "./ChatMessage";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DhiBotUserLogo } from '@/components/icons/DhiBotUserLogo';
import { useAuth } from "@/contexts/AuthContext";
import { addMessageToHistory, getChatHistory } from "@/services/firestoreService";


const initialWelcomeMessage: Message = {
  id: "welcome-message",
  role: "assistant",
  content: "Welcome! I’m Dhi-bot, dhiraj's own AI assistant. I’m here to guide you through dhiraj's journey – just ask.",
};

export function ChatLayout() {
  const [messages, setMessages] = useState<Message[]>([initialWelcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser, userProfile, incrementClientPromptsUsed } = useAuth(); 

  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (currentUser?.uid) {
      setIsLoading(true); 
      getChatHistory(currentUser.uid)
        .then(history => {
          if (history.length > 0) {
            setMessages(history);
          } else {
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
      setMessages([initialWelcomeMessage]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, toast]);


  const handleSendMessage = useCallback(async (inputText: string) => {
    if (!currentUser?.uid || !userProfile) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in and profile loaded to send messages.",
        });
        return;
    }
    
    const currentPromptLimit = typeof userProfile.promptLimit === 'number' ? userProfile.promptLimit : 10;
    const currentPromptsUsed = typeof userProfile.promptsUsed === 'number' ? userProfile.promptsUsed : 0;

    if (typeof userProfile.promptLimit !== 'number' || typeof userProfile.promptsUsed !== 'number') {
      console.warn("ChatLayout: promptLimit or promptsUsed is not a number in userProfile. Using defaults for check.", userProfile);
    }
    
    if (currentPromptsUsed >= currentPromptLimit) {
        toast({
            variant: "destructive",
            title: "Chat Limit Reached",
            description: `You have reached your ${currentPromptLimit} prompt limit.`,
        });
        return; 
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText,
      name: currentUser?.displayName || currentUser?.email || "User",
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    let idToken = '';
    try {
      idToken = await currentUser.getIdToken();
    } catch (tokenError) {
        console.error("Error getting ID token:", tokenError);
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Could not verify your session. Please try logging in again.",
        });
        setIsLoading(false);
        // Optionally remove the optimistic user message if token fails
        setMessages(prev => prev.filter(msg => msg.id !== newUserMessage.id));
        return;
    }

    try {
      await addMessageToHistory(currentUser.uid, newUserMessage);
      if (newUserMessage.role === 'user' && !newUserMessage.bypassLimitCheck) {
        incrementClientPromptsUsed(); // Update client-side count
      }
    } catch (error) {
      console.error("Failed to save user message to history:", error);
      toast({
        variant: "destructive",
        title: "History Save Error",
        description: "Could not save your message to history.",
      });
      // Continue even if saving fails, so chat is not interrupted
    }
    
    let assistantResponseAccumulator = ""; 
    const assistantMessageId = (Date.now() + 1).toString();
    let finalAssistantContentForHistory = ""; 

    // Add assistant message placeholder
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: assistantMessageId, role: "assistant", content: "" }, 
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ message: inputText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error occurred while parsing API error" }));
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
        assistantResponseAccumulator += chunk;
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantResponseAccumulator }
              : msg
          )
        );
      }
      finalAssistantContentForHistory = assistantResponseAccumulator; 

    } catch (error) {
      console.error("Error fetching AI response:", error);
      const errorMessageContent = error instanceof Error ? error.message : "An unexpected error occurred with the AI.";
      
      finalAssistantContentForHistory = `Sorry, I encountered an error: ${errorMessageContent}`; 
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: finalAssistantContentForHistory }
            : msg
        )
      );
      toast({
        variant: "destructive",
        title: "AI Response Error",
        description: `${errorMessageContent}`,
      });
    } finally {
      setIsLoading(false);
      
      const assistantMessageForHistory: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: finalAssistantContentForHistory, // Use the determined final content
      };
      
      if (currentUser?.uid && typeof assistantMessageForHistory.content === 'string') {
          addMessageToHistory(currentUser.uid, assistantMessageForHistory)
          .catch(saveError => {
              console.error("Failed to save assistant's final message to history:", saveError);
              toast({
              variant: "destructive",
              title: "History Save Error",
              description: "Could not save assistant's response to history.",
              });
          });
      } else if (currentUser?.uid) { 
          console.warn("Attempted to save assistant message with non-string content or missing UID. Message ID:", assistantMessageId, "Content:", assistantMessageForHistory.content);
      }
    }
  }, [toast, currentUser, userProfile, incrementClientPromptsUsed]); 


  const handlePromptClick = (promptText: string) => {
    if (!currentUser?.uid || !userProfile) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to use quick prompts.",
        });
        return;
    }
    const currentPromptLimit = typeof userProfile.promptLimit === 'number' ? userProfile.promptLimit : 10;
    const currentPromptsUsed = typeof userProfile.promptsUsed === 'number' ? userProfile.promptsUsed : 0;

    if (typeof userProfile.promptLimit !== 'number' || typeof userProfile.promptsUsed !== 'number') {
        console.warn("ChatLayout (QuickPrompts): promptLimit or promptsUsed is not a number in userProfile. Using defaults for check.", userProfile);
    }

    if (currentPromptsUsed >= currentPromptLimit) {
        toast({
            variant: "destructive",
            title: "Chat Limit Reached",
            description: `You have reached your ${currentPromptLimit} prompt limit. Cannot use quick prompt.`,
        });
        return;
    }
    handleSendMessage(promptText);
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto bg-background shadow-xl rounded-lg overflow-hidden">
      <CardHeader className="p-4 md:p-6 border-b">
         <div className="flex items-center space-x-3">
            <DhiBotUserLogo className="h-10 w-10 text-primary" width={40} height={40} />
            <div>
                <CardTitle className="text-2xl font-bold">Dhi-bot</CardTitle>
                <CardDescription>Dhiraj's Personal AI Assistant.</CardDescription>
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
