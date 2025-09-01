import { ChatMessage, ChatSession } from './command-processor';

export interface SessionConfig {
  maxMessages: number;
  autoSaveInterval?: number; // in milliseconds
  enableAutoArchive: boolean;
  storageKey: string;
}

export interface SessionMemory {
  currentSession: ChatSession;
  archivedSessions: ChatSession[];
  lastSaved?: string;
  config: SessionConfig;
}

export class ChatSessionManager {
  private static readonly DEFAULT_CONFIG: SessionConfig = {
    maxMessages: 20,
    autoSaveInterval: 30000, // 30 seconds
    enableAutoArchive: true,
    storageKey: 'superlee_chat_session'
  };

  private memory: SessionMemory;
  private autoSaveTimer?: NodeJS.Timeout;
  private onSessionUpdate?: (session: ChatSession) => void;

  constructor(
    config: Partial<SessionConfig> = {},
    onSessionUpdate?: (session: ChatSession) => void
  ) {
    this.memory = {
      currentSession: this.createNewSession(),
      archivedSessions: [],
      config: { ...ChatSessionManager.DEFAULT_CONFIG, ...config }
    };
    this.onSessionUpdate = onSessionUpdate;
    
    this.loadFromStorage();
    this.startAutoSave();
  }

  /**
   * Create a new empty session
   */
  private createNewSession(): ChatSession {
    return {
      sessionId: crypto.randomUUID(),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Add message to current session
   */
  addMessage(message: ChatMessage): void {
    this.memory.currentSession.messages.push(message);
    this.memory.currentSession.updatedAt = new Date().toISOString();
    
    // Check if we need to trim the session
    if (this.memory.config.enableAutoArchive) {
      this.trimSession();
    }
    
    this.saveToStorage();
    this.notifySessionUpdate();
  }

  /**
   * Update existing message
   */
  updateMessage(messageId: string, updates: Partial<ChatMessage>): boolean {
    const messageIndex = this.memory.currentSession.messages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) {
      return false;
    }

    this.memory.currentSession.messages[messageIndex] = {
      ...this.memory.currentSession.messages[messageIndex],
      ...updates,
      id: messageId // Ensure ID doesn't change
    };
    
    this.memory.currentSession.updatedAt = new Date().toISOString();
    this.saveToStorage();
    this.notifySessionUpdate();
    
    return true;
  }

  /**
   * Remove message from session
   */
  removeMessage(messageId: string): boolean {
    const initialLength = this.memory.currentSession.messages.length;
    this.memory.currentSession.messages = this.memory.currentSession.messages.filter(
      m => m.id !== messageId
    );
    
    const removed = this.memory.currentSession.messages.length < initialLength;
    
    if (removed) {
      this.memory.currentSession.updatedAt = new Date().toISOString();
      this.saveToStorage();
      this.notifySessionUpdate();
    }
    
    return removed;
  }

  /**
   * Replace all messages in current session
   */
  setMessages(messages: ChatMessage[]): void {
    this.memory.currentSession.messages = [...messages];
    this.memory.currentSession.updatedAt = new Date().toISOString();
    
    if (this.memory.config.enableAutoArchive) {
      this.trimSession();
    }
    
    this.saveToStorage();
    this.notifySessionUpdate();
  }

  /**
   * Get current session messages
   */
  getMessages(): ChatMessage[] {
    return [...this.memory.currentSession.messages];
  }

  /**
   * Get current session
   */
  getCurrentSession(): ChatSession {
    return { ...this.memory.currentSession };
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    if (this.memory.currentSession.messages.length > 0) {
      // Archive current session before clearing
      this.archiveCurrentSession();
    }
    
    this.memory.currentSession = this.createNewSession();
    this.saveToStorage();
    this.notifySessionUpdate();
  }

  /**
   * Start a new session (archives current one if not empty)
   */
  newSession(): ChatSession {
    this.clearSession();
    return this.getCurrentSession();
  }

  /**
   * Load session from external source (e.g., IPFS)
   */
  loadSession(session: ChatSession): void {
    // Archive current session if not empty
    if (this.memory.currentSession.messages.length > 0) {
      this.archiveCurrentSession();
    }
    
    // Set new session
    this.memory.currentSession = {
      ...session,
      updatedAt: new Date().toISOString()
    };
    
    if (this.memory.config.enableAutoArchive) {
      this.trimSession();
    }
    
    this.saveToStorage();
    this.notifySessionUpdate();
  }

  /**
   * Archive current session
   */
  private archiveCurrentSession(): void {
    if (this.memory.currentSession.messages.length === 0) {
      return;
    }

    this.memory.archivedSessions.push({
      ...this.memory.currentSession
    });

    // Keep only last 10 archived sessions
    if (this.memory.archivedSessions.length > 10) {
      this.memory.archivedSessions = this.memory.archivedSessions.slice(-10);
    }
  }

  /**
   * Trim session to max messages and archive overflow
   */
  private trimSession(): void {
    const messages = this.memory.currentSession.messages;
    const maxMessages = this.memory.config.maxMessages;
    
    if (messages.length <= maxMessages) {
      return;
    }

    // Keep the most recent messages
    const trimmed = messages.slice(-maxMessages);
    const overflow = messages.slice(0, -maxMessages);
    
    // Create archived session for overflow
    if (overflow.length > 0) {
      const overflowSession: ChatSession = {
        sessionId: crypto.randomUUID(),
        messages: overflow,
        createdAt: overflow[0]?.timestamp || new Date().toISOString(),
        updatedAt: overflow[overflow.length - 1]?.timestamp || new Date().toISOString()
      };
      
      this.memory.archivedSessions.push(overflowSession);
      
      // Limit archived sessions
      if (this.memory.archivedSessions.length > 10) {
        this.memory.archivedSessions = this.memory.archivedSessions.slice(-10);
      }
    }
    
    this.memory.currentSession.messages = trimmed;
  }

  /**
   * Get archived sessions
   */
  getArchivedSessions(): ChatSession[] {
    return [...this.memory.archivedSessions];
  }

  /**
   * Search messages across current and archived sessions
   */
  searchMessages(query: string, includeArchived = false): Array<{
    message: ChatMessage;
    sessionId: string;
    isArchived: boolean;
  }> {
    const results: Array<{
      message: ChatMessage;
      sessionId: string;
      isArchived: boolean;
    }> = [];

    const searchInSession = (session: ChatSession, isArchived: boolean) => {
      session.messages.forEach(message => {
        if (message.content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            message,
            sessionId: session.sessionId,
            isArchived
          });
        }
      });
    };

    // Search current session
    searchInSession(this.memory.currentSession, false);

    // Search archived sessions if requested
    if (includeArchived) {
      this.memory.archivedSessions.forEach(session => {
        searchInSession(session, true);
      });
    }

    return results;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    currentMessages: number;
    archivedSessions: number;
    totalArchivedMessages: number;
    oldestMessage?: string;
    newestMessage?: string;
  } {
    const currentMessages = this.memory.currentSession.messages.length;
    const archivedSessions = this.memory.archivedSessions.length;
    const totalArchivedMessages = this.memory.archivedSessions.reduce(
      (total, session) => total + session.messages.length,
      0
    );

    let oldestMessage: string | undefined;
    let newestMessage: string | undefined;

    // Find oldest message
    if (this.memory.archivedSessions.length > 0) {
      oldestMessage = this.memory.archivedSessions[0].createdAt;
    } else if (currentMessages > 0) {
      oldestMessage = this.memory.currentSession.messages[0].timestamp;
    }

    // Find newest message
    if (currentMessages > 0) {
      newestMessage = this.memory.currentSession.messages[currentMessages - 1].timestamp;
    } else if (this.memory.archivedSessions.length > 0) {
      const lastArchived = this.memory.archivedSessions[archivedSessions - 1];
      newestMessage = lastArchived.updatedAt;
    }

    return {
      currentMessages,
      archivedSessions,
      totalArchivedMessages,
      oldestMessage,
      newestMessage
    };
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          this.memory.config.storageKey,
          JSON.stringify(this.memory)
        );
      }
    } catch (error) {
      console.warn('Failed to save session to localStorage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(this.memory.config.storageKey);
        if (stored) {
          const parsed: SessionMemory = JSON.parse(stored);
          
          // Merge with current memory, preserving config
          this.memory = {
            ...parsed,
            config: this.memory.config // Keep current config
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load session from localStorage:', error);
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.memory.config.autoSaveInterval && this.memory.config.autoSaveInterval > 0) {
      this.autoSaveTimer = setInterval(() => {
        this.saveToStorage();
        this.memory.lastSaved = new Date().toISOString();
      }, this.memory.config.autoSaveInterval);
    }
  }

  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }

  /**
   * Notify session update
   */
  private notifySessionUpdate(): void {
    if (this.onSessionUpdate) {
      this.onSessionUpdate(this.getCurrentSession());
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoSave();
    this.saveToStorage();
  }

  /**
   * Export session for external storage
   */
  exportSession(): ChatSession {
    return { ...this.memory.currentSession };
  }

  /**
   * Export all data (current + archived)
   */
  exportAllData(): SessionMemory {
    return {
      ...this.memory,
      lastSaved: new Date().toISOString()
    };
  }

  /**
   * Import data from external source
   */
  importData(data: Partial<SessionMemory>): void {
    if (data.currentSession) {
      this.memory.currentSession = data.currentSession;
    }
    
    if (data.archivedSessions) {
      this.memory.archivedSessions = data.archivedSessions;
    }
    
    this.saveToStorage();
    this.notifySessionUpdate();
  }
}
