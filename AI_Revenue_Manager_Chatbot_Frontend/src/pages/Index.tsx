import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { SessionControls } from "@/components/SessionControls";
import { TranscriptModal } from "@/components/TranscriptModal";
import {
  ChatMessage as ChatMessageType,
  ClientInfo,
  ChatSession,
  createSessionObject,
  saveChatToBackend,
  downloadTranscript
} from "@/utils/chatUtils";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";

const Index = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({ name: "", email: "", phone: "" });
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Regex patterns
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?){1,2}\d{3,4}/g;

  // Initialize chat
  useEffect(() => {
    const greeting: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: 'ai',
      content: `Hello! Welcome to our hotel concierge. Please provide your Name, Email, and Phone so we can assist you better.`,
      timestamp: new Date()
    };
    setMessages([greeting]);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const extractClientInfo = (content: string) => {
    setClientInfo(prev => {
      const updated = { ...prev };

      // Extract email
      if (!prev.email) {
        const emailMatch = content.match(emailRegex);
        if (emailMatch) updated.email = emailMatch[0];
      }

      // Extract phone
      if (!prev.phone) {
        const phoneMatch = content.match(phoneRegex);
        if (phoneMatch?.length) updated.phone = phoneMatch[0];
      }

      // Extract name: first 1-2 capitalized words if name not set
      if (!prev.name) {
        const nameMatch = content.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/);
        if (nameMatch) updated.name = nameMatch[0];
      }

      return updated;
    });
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Extract client info automatically
    extractClientInfo(content);

    // Send message to backend
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL;

      const response = await fetch(`${API_URL}/llm-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatHistory: messages.map(msg => ({ role: msg.role, text: msg.content })),
          userMessage: content,
          clientName: clientInfo.name || "Guest"
        })
      });

      if (!response.ok) throw new Error("Failed AI response");

      const data = await response.json();
      const aiMessage: ChatMessageType = {
        id: `msg-${Date.now()}`,
        role: 'ai',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "AI could not respond",
        variant: "destructive"
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = () => {
    if (messages.length > 1) {
      if (!window.confirm("Start new chat? The current session will be lost.")) return;
    }

    setMessages([{
      id: `msg-${Date.now()}`,
      role: 'ai',
      content: `Hello! Welcome to our hotel concierge. Please provide your Name, Email, and Phone so we can assist you better.`,
      timestamp: new Date()
    }]);

    setClientInfo({ name: "", email: "", phone: "" });
    setSessionStartTime(new Date());

    toast({ title: "New chat started" });
  };

  const handleEndChat = () => {
    saveSession();
  };

  const saveSession = async () => {
    try {
      // If clientInfo fields are missing, just use empty strings
      const session = createSessionObject(messages, {
        name: clientInfo.name,
        email: clientInfo.email,
        phone: clientInfo.phone
      }, sessionStartTime);

      await saveChatToBackend(session);

      setCurrentSession(session);
      setIsModalOpen(true);

      toast({
        title: "Chat saved",
        description: "Session stored in backend"
      });
    } catch (error) {
      toast({
        title: "Error saving chat",
        variant: "destructive"
      });
    }
  };

  const handleDownloadTranscript = () => {
    if (currentSession) {
      downloadTranscript(currentSession);
      toast({
        title: "Transcript downloaded",
        description: `File: chat-${currentSession.chatId}.txt`
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    handleStartNew();
  };

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* HEADER */}
      <div className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">AI Chat Assistant</h1>
              <p className="text-sm text-muted-foreground">Backend Integrated</p>
            </div>
          </div>
        </div>
      </div>

      {/* SESSION CONTROLS */}
      <div className="container mx-auto px-4">
        <SessionControls
          onStartNew={handleStartNew}
          onEndChat={handleEndChat}
          hasMessages={messages.length > 1}
        />
      </div>

      {/* CHAT MESSAGES */}
      <div className="flex-1 overflow-y-auto container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* CHAT INPUT */}
      <div className="container mx-auto px-4 pb-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSendMessage} disabled={loading} />
        </div>
      </div>

      {/* TRANSCRIPT MODAL */}
      <TranscriptModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        session={currentSession}
        onDownload={handleDownloadTranscript}
      />
    </div>
  );
};

export default Index;
