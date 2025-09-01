// Using built-in crypto.randomUUID() instead of uuid package

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  buttons?: string[];
  image?: {
    url: string;
    alt: string;
  };
  links?: Array<{
    text: string;
    url: string;
  }>;
  isLoading?: boolean;
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CommandResult {
  type: 'command' | 'message';
  success: boolean;
  message?: string;
  data?: any;
  shouldProcess?: boolean; // Whether to continue processing as regular message
}

export class ChatCommandProcessor {
  private static readonly COMMANDS = {
    FILL: '/fill',
    LAGI: '/lagi',
    EDIT: '/edit',
    CLEAR: '/clear',
    SAVE: '/save',
    LOAD: '/load',
    HELP: '/help'
  } as const;

  private static readonly MAX_SESSION_MESSAGES = 20;

  /**
   * Check if message is a command and process it
   */
  static async processMessage(
    input: string,
    messages: ChatMessage[],
    updateMessages: (messages: ChatMessage[]) => void,
    showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void
  ): Promise<CommandResult> {
    
    const trimmed = input.trim();
    
    // Check if it's a command (starts with /)
    if (!trimmed.startsWith('/')) {
      return {
        type: 'message',
        success: true,
        shouldProcess: true
      };
    }

    // Parse command and arguments
    const [command, ...args] = trimmed.split(' ');
    const commandLower = command.toLowerCase();

    try {
      switch (commandLower) {
        case this.COMMANDS.FILL:
          return await this.handleFillCommand(args.join(' '), messages, updateMessages, showNotification);
        
        case this.COMMANDS.LAGI:
          return await this.handleLagiCommand(messages, updateMessages, showNotification);
        
        case this.COMMANDS.EDIT:
          return await this.handleEditCommand(args, messages, updateMessages, showNotification);
        
        case this.COMMANDS.CLEAR:
          return await this.handleClearCommand(updateMessages, showNotification);
        
        case this.COMMANDS.SAVE:
          return await this.handleSaveCommand(messages, showNotification);
        
        case this.COMMANDS.LOAD:
          return await this.handleLoadCommand(args[0], updateMessages, showNotification);
        
        case this.COMMANDS.HELP:
          return await this.handleHelpCommand(showNotification);
        
        default:
          return {
            type: 'command',
            success: false,
            message: `❌ Command tidak dikenal: ${command}. Ketik /help untuk melihat daftar command.`
          };
      }
    } catch (error) {
      console.error('Command processing error:', error);
      return {
        type: 'command',
        success: false,
        message: `❌ Error saat menjalankan command: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * /fill <pesan> → replace pesan terakhir
   */
  private static async handleFillCommand(
    newContent: string,
    messages: ChatMessage[],
    updateMessages: (messages: ChatMessage[]) => void,
    showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void
  ): Promise<CommandResult> {
    
    if (!newContent.trim()) {
      return {
        type: 'command',
        success: false,
        message: '❌ /fill membutuhkan pesan. Contoh: /fill pesan baru'
      };
    }

    if (messages.length === 0) {
      return {
        type: 'command',
        success: false,
        message: '❌ Tidak ada pesan untuk di-replace'
      };
    }

    // Find last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserMessageIndex === -1) {
      return {
        type: 'command',
        success: false,
        message: '❌ Tidak ada pesan user untuk di-replace'
      };
    }

    const actualIndex = messages.length - 1 - lastUserMessageIndex;
    const updatedMessages = [...messages];
    updatedMessages[actualIndex] = {
      ...updatedMessages[actualIndex],
      content: newContent,
      timestamp: new Date().toISOString()
    };

    updateMessages(updatedMessages);
    showNotification?.('✅ Pesan berhasil di-replace', 'success');

    return {
      type: 'command',
      success: true,
      message: '✅ Pesan terakhir berhasil diganti',
      shouldProcess: true, // Process the new message
      data: { newContent }
    };
  }

  /**
   * /lagi → kirim ulang pesan sebelumnya
   */
  private static async handleLagiCommand(
    messages: ChatMessage[],
    updateMessages: (messages: ChatMessage[]) => void,
    showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void
  ): Promise<CommandResult> {
    
    // Find last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    if (!lastUserMessage) {
      return {
        type: 'command',
        success: false,
        message: '❌ Tidak ada pesan sebelumnya untuk diulang'
      };
    }

    // Add the repeated message
    const repeatedMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: lastUserMessage.content,
      timestamp: new Date().toISOString()
    };

    updateMessages([...messages, repeatedMessage]);
    showNotification?.('🔄 Mengirim ulang pesan sebelumnya', 'info');

    return {
      type: 'command',
      success: true,
      message: '🔄 Mengirim ulang pesan sebelumnya',
      shouldProcess: true, // Process the repeated message
      data: { content: lastUserMessage.content }
    };
  }

  /**
   * /edit <id> <pesan baru> → edit pesan lama
   */
  private static async handleEditCommand(
    args: string[],
    messages: ChatMessage[],
    updateMessages: (messages: ChatMessage[]) => void,
    showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void
  ): Promise<CommandResult> {
    
    if (args.length < 2) {
      return {
        type: 'command',
        success: false,
        message: '❌ /edit membutuhkan ID dan pesan baru. Contoh: /edit abc123 pesan baru'
      };
    }

    const [messageId, ...contentParts] = args;
    const newContent = contentParts.join(' ');

    const messageIndex = messages.findIndex(m => m.id.startsWith(messageId.toLowerCase()));
    
    if (messageIndex === -1) {
      return {
        type: 'command',
        success: false,
        message: `❌ Pesan dengan ID ${messageId} tidak ditemukan`
      };
    }

    const targetMessage = messages[messageIndex];
    if (targetMessage.role !== 'user') {
      return {
        type: 'command',
        success: false,
        message: '❌ Hanya pesan user yang bisa diedit'
      };
    }

    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = {
      ...targetMessage,
      content: newContent,
      timestamp: new Date().toISOString()
    };

    updateMessages(updatedMessages);
    showNotification?.(`✅ Pesan ${messageId} berhasil diedit`, 'success');

    return {
      type: 'command',
      success: true,
      message: `✅ Pesan ${messageId} berhasil diedit`
    };
  }

  /**
   * /clear → hapus history chat
   */
  private static async handleClearCommand(
    updateMessages: (messages: ChatMessage[]) => void,
    showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void
  ): Promise<CommandResult> {
    
    updateMessages([]);
    showNotification?.('🗑️ Chat history berhasil dihapus', 'success');

    return {
      type: 'command',
      success: true,
      message: '🗑️ Chat history berhasil dihapus'
    };
  }

  /**
   * /save → simpan log chat ke IPFS
   */
  private static async handleSaveCommand(
    messages: ChatMessage[],
    showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void
  ): Promise<CommandResult> {
    
    if (messages.length === 0) {
      return {
        type: 'command',
        success: false,
        message: '❌ Tidak ada chat untuk disimpan'
      };
    }

    try {
      const chatSession: ChatSession = {
        sessionId: crypto.randomUUID(),
        messages: messages,
        createdAt: messages[0]?.timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Upload to IPFS via API route
      const response = await fetch('/api/ipfs/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatSession)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const cid = result.cid || result.hash;

      showNotification?.(`💾 Chat berhasil disimpan ke IPFS: ${cid}`, 'success');

      return {
        type: 'command',
        success: true,
        message: `💾 Chat berhasil disimpan ke IPFS\n\n**CID:** \`${cid}\`\n\nGunakan \`/load ${cid}\` untuk memuat kembali chat ini.`,
        data: { cid, session: chatSession }
      };

    } catch (error) {
      console.error('Save to IPFS failed:', error);
      return {
        type: 'command',
        success: false,
        message: `❌ Gagal menyimpan ke IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * /load <cid> → load chat log dari IPFS
   */
  private static async handleLoadCommand(
    cid: string,
    updateMessages: (messages: ChatMessage[]) => void,
    showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void
  ): Promise<CommandResult> {
    
    if (!cid) {
      return {
        type: 'command',
        success: false,
        message: '❌ /load membutuhkan CID. Contoh: /load QmABC123'
      };
    }

    try {
      showNotification?.('📥 Memuat chat dari IPFS...', 'info');

      // Load from IPFS
      const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const chatSession: ChatSession = await response.json();

      if (!chatSession.messages || !Array.isArray(chatSession.messages)) {
        throw new Error('Format chat session tidak valid');
      }

      // Validate message structure
      const validMessages = chatSession.messages.filter(msg => 
        msg.id && msg.role && msg.content && msg.timestamp
      );

      if (validMessages.length === 0) {
        throw new Error('Tidak ada pesan valid dalam session');
      }

      updateMessages(validMessages);
      showNotification?.(`📥 Chat berhasil dimuat dari IPFS (${validMessages.length} pesan)`, 'success');

      return {
        type: 'command',
        success: true,
        message: `📥 Chat berhasil dimuat dari IPFS\n\n**Session ID:** ${chatSession.sessionId}\n**Pesan dimuat:** ${validMessages.length}\n**Dibuat:** ${new Date(chatSession.createdAt).toLocaleString()}`
      };

    } catch (error) {
      console.error('Load from IPFS failed:', error);
      return {
        type: 'command',
        success: false,
        message: `❌ Gagal memuat dari IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * /help → show available commands
   */
  private static async handleHelpCommand(
    showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void
  ): Promise<CommandResult> {
    
    const helpText = `📋 **Daftar Command Chat:**

**Command Utama:**
• \`/fill <pesan>\` - Replace pesan terakhir
• \`/lagi\` - Kirim ulang pesan sebelumnya  
• \`/edit <id> <pesan>\` - Edit pesan lama
• \`/clear\` - Hapus semua chat history

**IPFS Commands:**
• \`/save\` - Simpan chat ke IPFS
• \`/load <cid>\` - Muat chat dari IPFS

**Info:**
• \`/help\` - Tampilkan help ini

**Contoh Penggunaan:**
\`/fill Halo, saya ingin register IP\`
\`/edit abc123 Pesan yang sudah diedit\`
\`/load QmABC123def456\``;

    return {
      type: 'command',
      success: true,
      message: helpText
    };
  }

  /**
   * Create a new chat message
   */
  static createMessage(
    role: ChatMessage['role'], 
    content: string, 
    options?: Partial<Pick<ChatMessage, 'buttons' | 'image' | 'links' | 'isLoading'>>
  ): ChatMessage {
    return {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date().toISOString(),
      ...options
    };
  }

  /**
   * Trim session to max messages and archive old ones
   */
  static trimSession(messages: ChatMessage[]): {
    trimmed: ChatMessage[];
    archived: ChatMessage[];
  } {
    if (messages.length <= this.MAX_SESSION_MESSAGES) {
      return { trimmed: messages, archived: [] };
    }

    const trimmed = messages.slice(-this.MAX_SESSION_MESSAGES);
    const archived = messages.slice(0, -this.MAX_SESSION_MESSAGES);

    return { trimmed, archived };
  }

  /**
   * Get message by partial ID (for /edit command)
   */
  static findMessageByPartialId(messages: ChatMessage[], partialId: string): ChatMessage | null {
    const lowerPartialId = partialId.toLowerCase();
    return messages.find(m => m.id.toLowerCase().startsWith(lowerPartialId)) || null;
  }

  /**
   * Format message ID for display (show first 8 characters)
   */
  static formatMessageId(id: string): string {
    return id.substring(0, 8);
  }
}
