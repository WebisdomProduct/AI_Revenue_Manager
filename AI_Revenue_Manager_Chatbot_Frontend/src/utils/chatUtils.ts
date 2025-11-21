export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

export interface ClientInfo {
  name: string;
  email: string;
  phone: string;
}

export interface ChatSession {
  clientId: string;
  chatId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  date: string;
  time: string;
  transcriptText: string;
}

export function generateClientId(): string {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CLIENT-${randomStr}`;
}

export function generateChatId(): string {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CHAT-${randomStr}`;
}

export function formatTranscript(messages: ChatMessage[], clientName: string): string {
  return messages
    .map(msg => {
      const sender = msg.role === 'ai' ? 'AI' : clientName || "Client";
      return `${sender}: ${msg.content}`;
    })
    .join('\n');
}

export function createSessionObject(
  messages: ChatMessage[],
  clientInfo: ClientInfo,
  sessionStartTime: Date
): ChatSession {
  const clientId = generateClientId();
  const chatId = generateChatId();

  const date = sessionStartTime.toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const time = sessionStartTime.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const transcriptText = formatTranscript(messages, clientInfo.name);

  return {
    clientId,
    chatId,
    clientName: clientInfo.name || "",
    clientEmail: clientInfo.email || "",
    clientPhone: clientInfo.phone || "",
    date,
    time,
    transcriptText
  };
}

// Backend-ready: logs for now, can be replaced with real fetch
export async function saveChatToBackend(sessionObject: ChatSession): Promise<void> {
  console.log("saveChatToBackend called", sessionObject);
  
  try {
    const VITE_APPS_SCRIPT_URL  = import.meta.env.VITE_APPS_SCRIPT_URL;
    // https://script.google.com/macros/s/AKfycbxJHtY72haw0rEzp3iugWBp2TpyDbYXobr-hmVz2ofnr9pJcEIh02GfP1De9uUan-JX/exec
    const response = await fetch(VITE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // body: JSON.stringify(sessionObject)
      body: JSON.stringify({
        type: "chat_transcript", // distinguishes this request
        data: sessionObject
      })
    });

    const data = await response.json();

    if (data.status !== "ok") {
      console.warn("Failed to save session:", data.message);
    } else {
      console.log("✅ Chat session saved successfully:", sessionObject.chatId);
    }
  } catch (error) {
    console.error("Error saving chat to backend:", error);
    // Do not throw to avoid blocking the user
  }

  console.log("Payload being sent to Apps Script:", {
    type: "chat_transcript",
    data: sessionObject
  });

}

export function downloadTranscript(sessionObject: ChatSession): void {
  const content = `Chat Transcript
================
Client ID: ${sessionObject.clientId}
Chat ID: ${sessionObject.chatId}
Client: ${sessionObject.clientName}
Email: ${sessionObject.clientEmail}
Phone: ${sessionObject.clientPhone}
Date: ${sessionObject.date}
Time: ${sessionObject.time}

Transcript:
-----------
${sessionObject.transcriptText}
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-${sessionObject.chatId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
