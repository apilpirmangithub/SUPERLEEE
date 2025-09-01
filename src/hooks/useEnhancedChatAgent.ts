import { useState, useCallback, useEffect, useRef } from "react";
import { superleeEngine } from "@/lib/agent/superlee";
import { ChatCommandProcessor, ChatMessage, CommandResult } from "@/lib/chat/command-processor";
import { ChatSessionManager } from "@/lib/chat/session-manager";
import { ChatIPFSService } from "@/lib/chat/ipfs-service";
import type { Message, Plan } from "@/types/agents";

// Convert between legacy Message type and new ChatMessage type
function toChatMessage(msg: Message): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: msg.role === "you" ? "user" : (msg.role === "agent" ? "assistant" : "system"),
    content: msg.text || "",
    timestamp: new Date(msg.ts || Date.now()).toISOString(),
    buttons: msg.buttons,
    image: msg.image,
    links: msg.links,
    isLoading: msg.isLoading
  };
}

function toLegacyMessage(msg: ChatMessage): Message {
  return {
    role: msg.role === "user" ? "you" : (msg.role === "assistant" ? "agent" : msg.role),
    text: msg.content,
    ts: new Date(msg.timestamp).getTime(),
    buttons: msg.buttons,
    image: msg.image,
    links: msg.links,
    isLoading: msg.isLoading
  };
}

export function useEnhancedChatAgent() {
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [status, setStatus] = useState<string>("");
  const [awaitingFile, setAwaitingFile] = useState<boolean>(false);
  const [awaitingInput, setAwaitingInput] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [history, setHistory] = useState<Array<{ id: string; title: string; lastMessage: string; timestamp: number; messageCount: number; messages: Message[] }>>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Session manager for enhanced message handling
  const sessionManagerRef = useRef<ChatSessionManager | null>(null);

  // Initialize session manager
  useEffect(() => {
    sessionManagerRef.current = new ChatSessionManager(
      {
        maxMessages: 20,
        autoSaveInterval: 30000,
        enableAutoArchive: true,
        storageKey: 'superlee_enhanced_chat_session'
      },
      (session) => {
        // Notify when session updates (optional callback)
        console.log('Session updated:', session.sessionId);
      }
    );

    return () => {
      sessionManagerRef.current?.destroy();
    };
  }, []);

  // Get current messages from session manager
  const messages: Message[] = sessionManagerRef.current
    ? sessionManagerRef.current.getMessages().map(toLegacyMessage)
    : [];

  // Show notification helper
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Load legacy history on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("superleeHistory");
      if (savedHistory) {
        const loadedHistory = JSON.parse(savedHistory);
        if (Array.isArray(loadedHistory)) setHistory(loadedHistory);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Show greeting automatically when there's no prior chat
  useEffect(() => {
    if (messages.length === 0 && sessionManagerRef.current) {
      showGreeting();
    }
  }, [messages.length]);

  // Helper to persist history
  const persistHistory = useCallback((items: typeof history) => {
    try {
      localStorage.setItem("superleeHistory", JSON.stringify(items));
    } catch {}
  }, []);

  const showGreeting = useCallback(async () => {
    if (!sessionManagerRef.current) return;
    
    const greeting = await superleeEngine.getGreeting();
    if (greeting.type === "message") {
      const greetingMessage = ChatCommandProcessor.createMessage(
        "assistant",
        greeting.text,
        { buttons: greeting.buttons }
      );
      sessionManagerRef.current.addMessage(greetingMessage);
    }
  }, []);

  const addMessage = useCallback((role: Message["role"], text: string, buttons?: string[]) => {
    if (!sessionManagerRef.current) return;
    
    const message = ChatCommandProcessor.createMessage(
      role === "you" ? "user" : (role === "agent" ? "assistant" : "system"),
      text,
      { buttons }
    );
    sessionManagerRef.current.addMessage(message);
  }, []);

  const addCompleteMessage = useCallback((message: Message) => {
    if (!sessionManagerRef.current) return;
    
    const chatMessage = toChatMessage(message);
    sessionManagerRef.current.addMessage(chatMessage);
  }, []);

  const updateLastMessage = useCallback((updates: Partial<Message>) => {
    if (!sessionManagerRef.current) return;
    
    const currentMessages = sessionManagerRef.current.getMessages();
    if (currentMessages.length === 0) return;
    
    const lastMessage = currentMessages[currentMessages.length - 1];
    const updatedMessage: Partial<ChatMessage> = {};
    
    if (updates.text !== undefined) updatedMessage.content = updates.text;
    if (updates.buttons !== undefined) updatedMessage.buttons = updates.buttons;
    if (updates.image !== undefined) updatedMessage.image = updates.image;
    if (updates.links !== undefined) updatedMessage.links = updates.links;
    if (updates.isLoading !== undefined) updatedMessage.isLoading = updates.isLoading;
    
    sessionManagerRef.current.updateMessage(lastMessage.id, updatedMessage);
  }, []);

  const simulateTyping = useCallback((callback: () => Promise<void> | void, delay = 500) => {
    setIsTyping(true);
    setTimeout(async () => {
      try {
        await callback();
      } finally {
        setIsTyping(false);
      }
    }, delay);
  }, []);

  const processPrompt = useCallback(async (prompt: string, file?: File) => {
    if (!sessionManagerRef.current) return;
    
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    try {
      // Process command first
      const commandResult: CommandResult = await ChatCommandProcessor.processMessage(
        trimmedPrompt,
        sessionManagerRef.current.getMessages(),
        (messages) => sessionManagerRef.current?.setMessages(messages),
        showNotification
      );

      // Handle command responses
      if (commandResult.type === 'command') {
        if (commandResult.message) {
          const responseMessage = ChatCommandProcessor.createMessage(
            "assistant",
            commandResult.message
          );
          sessionManagerRef.current.addMessage(responseMessage);
        }

        // For /fill and /lagi commands, continue processing the new content
        if (commandResult.shouldProcess && commandResult.data?.content) {
          // Process the new content with the AI engine
          await processWithEngine(commandResult.data.content, file);
        } else if (commandResult.shouldProcess && commandResult.data?.newContent) {
          // Process the filled content with the AI engine
          await processWithEngine(commandResult.data.newContent, file);
        }

        return;
      }

      // If not a command, add user message and process normally
      if (commandResult.shouldProcess !== false) {
        const userMessage = ChatCommandProcessor.createMessage("user", trimmedPrompt);
        sessionManagerRef.current.addMessage(userMessage);
        
        await processWithEngine(trimmedPrompt, file);
      }

    } catch (error) {
      console.error('Process prompt failed:', error);
      const errorMessage = ChatCommandProcessor.createMessage(
        "assistant",
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      );
      sessionManagerRef.current.addMessage(errorMessage);
    }
  }, [showNotification]);

  const processWithEngine = useCallback(async (prompt: string, file?: File) => {
    if (!sessionManagerRef.current) return;
    
    setStatus("");
    setAwaitingFile(false);
    setAwaitingInput(null);

    // Simulate typing and then process
    simulateTyping(async () => {
      // Process with Superlee engine
      const response = await superleeEngine.processMessage(prompt, file);

      if (response.type === "message") {
        // Only add message if text is not empty
        if (response.text.trim()) {
          const responseMessage = ChatCommandProcessor.createMessage(
            "assistant",
            response.text,
            {
              buttons: response.buttons,
              image: response.image,
              links: response.links
            }
          );
          sessionManagerRef.current?.addMessage(responseMessage);
        }
        setCurrentPlan(null);
        return;
      }

      if (response.type === "awaiting_file") {
        setAwaitingFile(true);
        const fileMessage = ChatCommandProcessor.createMessage(
          "assistant",
          "Please upload your file to continue."
        );
        sessionManagerRef.current?.addMessage(fileMessage);
        return;
      }

      if (response.type === "awaiting_input") {
        setAwaitingInput(response.prompt);
        const inputMessage = ChatCommandProcessor.createMessage(
          "assistant",
          response.prompt
        );
        sessionManagerRef.current?.addMessage(inputMessage);
        return;
      }

      if (response.type === "plan") {
        // AI has a plan
        setCurrentPlan({
          type: response.intent.kind as "swap" | "register",
          steps: response.plan,
          intent: response.intent,
        });
      }
    });
  }, [simulateTyping]);

  const clearPlan = useCallback(() => {
    setCurrentPlan(null);
    setStatus("");
  }, []);

  const updateStatus = useCallback((newStatus: string) => {
    setStatus(newStatus);
    simulateTyping(() => {
      const statusMessage = ChatCommandProcessor.createMessage(
        "assistant",
        `ℹ️ ${newStatus}`
      );
      sessionManagerRef.current?.addMessage(statusMessage);
    }, 400);
  }, [simulateTyping]);

  const newChat = useCallback(() => {
    if (!sessionManagerRef.current) return;
    
    // Snapshot current session into legacy history format
    try {
      const currentMessages = sessionManagerRef.current.getMessages();
      if (currentMessages.length > 0) {
        const legacyMessages = currentMessages.map(toLegacyMessage);
        const userMsgs = legacyMessages.filter(m => m.role === "you");
        
        if (userMsgs.length > 0) {
          const firstUser = userMsgs[0];
          const lastMsg = legacyMessages[legacyMessages.length - 1];
          const item = {
            id: `sess-${Date.now()}`,
            title: (firstUser.text || "Session").slice(0, 30),
            lastMessage: (lastMsg.text || "").slice(0, 80),
            timestamp: firstUser.ts || Date.now(),
            messageCount: legacyMessages.length,
            messages: legacyMessages,
          };
          const newHistory = [item, ...history].slice(0, 50);
          setHistory(newHistory);
          persistHistory(newHistory);
        }
      }
    } catch {}

    // Clear current session
    superleeEngine.reset();
    sessionManagerRef.current.clearSession();
    setCurrentPlan(null);
    setStatus("");
    setAwaitingFile(false);
    setAwaitingInput(null);
    setIsTyping(false);
  }, [history, persistHistory]);

  const getEngineFile = useCallback(() => {
    return superleeEngine.getContext().registerData?.file;
  }, []);

  const openSession = useCallback((id: string) => {
    if (!sessionManagerRef.current) return;
    
    const sess = history.find(h => h.id === id);
    if (!sess) return;
    
    superleeEngine.reset();
    
    // Convert legacy messages to chat messages
    const chatMessages = sess.messages.map(toChatMessage);
    sessionManagerRef.current.setMessages(chatMessages);
    
    setCurrentPlan(null);
    setStatus("");
    setAwaitingFile(false);
    setAwaitingInput(null);
    setIsTyping(false);
  }, [history]);

  // Load session from IPFS (enhanced feature)
  const loadSessionFromIPFS = useCallback(async (cid: string) => {
    if (!sessionManagerRef.current) return;
    
    try {
      showNotification('📥 Loading session from IPFS...', 'info');
      
      const result = await ChatIPFSService.loadSession(cid);
      sessionManagerRef.current.loadSession(result.session);
      
      showNotification(`✅ Session loaded successfully (${result.session.messages.length} messages)`, 'success');
    } catch (error) {
      console.error('Load session failed:', error);
      showNotification(`❌ Failed to load session: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [showNotification]);

  // Auto-load session from URL parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const loadCid = urlParams.get('load');
      
      if (loadCid && ChatIPFSService.isValidCid(loadCid)) {
        loadSessionFromIPFS(loadCid);
      }
    }
  }, [loadSessionFromIPFS]);

  // Get session stats (enhanced feature)
  const getSessionStats = useCallback(() => {
    return sessionManagerRef.current?.getStats() || {
      currentMessages: 0,
      archivedSessions: 0,
      totalArchivedMessages: 0
    };
  }, []);

  // Search messages (enhanced feature)
  const searchMessages = useCallback((query: string, includeArchived = false) => {
    return sessionManagerRef.current?.searchMessages(query, includeArchived) || [];
  }, []);

  return {
    // Legacy compatibility
    messages,
    currentPlan,
    status,
    awaitingFile,
    awaitingInput,
    isTyping,
    history,
    addMessage,
    addCompleteMessage,
    updateLastMessage,
    processPrompt,
    clearPlan,
    updateStatus,
    newChat,
    openSession,
    getEngineFile,
    engine: superleeEngine,

    // Enhanced features
    notification,
    showNotification,
    loadSessionFromIPFS,
    getSessionStats,
    searchMessages,
    
    // Session manager access for advanced operations
    sessionManager: sessionManagerRef.current,
    
    // Command processor utilities
    ChatCommandProcessor,
    ChatIPFSService
  };
}
