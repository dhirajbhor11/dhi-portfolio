
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
  const { currentUser, userProfile } = useAuth(); 

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
      // If no user, reset to welcome message (e.g., after logout)
      setMessages([initialWelcomeMessage]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]); // Dependency only on currentUser.uid


  const handleSendMessage = useCallback(async (inputText: string) => {
    if (!currentUser?.uid || !userProfile) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in and profile loaded to send messages.",
        });
        return;
    }

    // Use promptLimit and promptsUsed from userProfile.
    // These values are from Firestore, reflecting the state *before* this current prompt.
    const { promptLimit = 10, promptsUsed = 0 } = userProfile;


    if (promptsUsed >= promptLimit) {
        toast({
            variant: "destructive",
            title: "Chat Limit Reached",
            description: `You have reached your ${promptLimit} prompt limit.`,
        });
        return; // Stop processing if limit is reached
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText,
      name: currentUser?.displayName || currentUser?.email || "User",
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    try {
      // Saving user message will also increment promptsUsed in Firestore via addMessageToHistory
      await addMessageToHistory(currentUser.uid, newUserMessage);
      // Note: userProfile in AuthContext might be stale regarding promptsUsed immediately after this.
      // For subsequent checks within the same session, this is fine as it re-reads userProfile.
      // For a more real-time update of promptsUsed in the UI (not the check itself), AuthContext would need to update.
    } catch (error) {
      console.error("Failed to save user message to history:", error);
      toast({
        variant: "destructive",
        title: "History Save Error",
        description: "Could not save your message to history.",
      });
      // Optionally revert the UI message addition or handle differently
    }
    

    let assistantResponse = ""; 
    const assistantMessageId = (Date.now() + 1).toString();
    let finalAssistantContentForHistory = ""; // To store the complete response or error

    // Add a placeholder for the assistant's message for streaming
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
        assistantResponse += chunk;
        // Update the content of the assistant's message placeholder
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantResponse }
              : msg
          )
        );
      }
      finalAssistantContentForHistory = assistantResponse; 

    } catch (error) {
      console.error("Error fetching AI response:", error);
      const errorMessageContent = error instanceof Error ? error.message : "An unexpected error occurred with the AI.";
      
      // Update the assistant's message placeholder with the error
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: `Sorry, I encountered an error: ${errorMessageContent}` }
            : msg
        )
      );
      finalAssistantContentForHistory = `Sorry, I encountered an error: ${errorMessageContent}`; 

      toast({
        variant: "destructive",
        title: "AI Response Error",
        description: `${errorMessageContent}`,
      });
    } finally {
      setIsLoading(false);
      
      // Construct the final assistant message object for history
      const assistantMessageForHistory: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: finalAssistantContentForHistory, 
      };
      
      // Save the assistant's complete message (or error message) to history
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
      } else if (currentUser?.uid) { // Content might be empty string, which is fine.
          console.warn("Attempted to save assistant message with non-string content or missing UID. Message ID:", assistantMessageId, "Content:", assistantMessageForHistory.content);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, currentUser, userProfile]); // userProfile is a dependency for prompt limits


  const handlePromptClick = (promptText: string) => {
    // Check prompt limit before processing the quick prompt
    if (!currentUser?.uid || !userProfile) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to use quick prompts.",
        });
        return;
    }
    const { promptLimit = 10, promptsUsed = 0 } = userProfile;
    if (promptsUsed >= promptLimit) {
        toast({
            variant: "destructive",
            title: "Chat Limit Reached",
            description: `You have reached your ${promptLimit} prompt limit. Cannot use quick prompt.`,
        });
        return;
    }
    handleSendMessage(promptText);
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
