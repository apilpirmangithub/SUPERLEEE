import { ChatSession } from './command-processor';
import { fetchJSON } from '@/lib/utils/ipfs';

export interface ChatIPFSUploadResult {
  cid: string;
  url: string;
  keccak?: string;
  uploadedAt: string;
}

export interface ChatIPFSLoadResult {
  session: ChatSession;
  loadedAt: string;
  source: 'ipfs' | 'pinata-gateway';
}

export class ChatIPFSService {
  
  /**
   * Upload chat session to IPFS via Pinata
   */
  static async uploadSession(session: ChatSession): Promise<ChatIPFSUploadResult> {
    try {
      // Validate session structure
      if (!session.sessionId || !Array.isArray(session.messages)) {
        throw new Error('Invalid session structure');
      }

      // Add metadata for chat session
      const sessionWithMetadata = {
        ...session,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        type: 'superlee-chat-session'
      };

      // Upload to IPFS via existing API route
      const result = await fetchJSON('/api/ipfs/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionWithMetadata)
      });

      if (!result.cid) {
        throw new Error('Failed to get CID from upload response');
      }

      return {
        cid: result.cid,
        url: result.url || `https://ipfs.io/ipfs/${result.cid}`,
        keccak: result.keccak,
        uploadedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Chat IPFS upload failed:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load chat session from IPFS
   */
  static async loadSession(cid: string): Promise<ChatIPFSLoadResult> {
    try {
      if (!cid || typeof cid !== 'string') {
        throw new Error('Invalid CID provided');
      }

      // Clean CID (remove ipfs:// prefix if present)
      const cleanCid = cid.replace(/^ipfs:\/\//, '');

      // Try multiple IPFS gateways for better reliability
      const gateways = [
        process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud',
        'https://ipfs.io',
        'https://cloudflare-ipfs.com',
        'https://dweb.link'
      ];

      let lastError: Error | null = null;
      
      for (const gateway of gateways) {
        try {
          const url = `${gateway}/ipfs/${cleanCid}`;
          
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000) // 10 seconds
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Validate loaded data structure
          const session = this.validateAndCleanSession(data);
          
          return {
            session,
            loadedAt: new Date().toISOString(),
            source: gateway.includes('pinata') ? 'pinata-gateway' : 'ipfs'
          };

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(`Failed to load from ${gateway}:`, error);
          continue; // Try next gateway
        }
      }

      // If all gateways failed, throw the last error
      throw lastError || new Error('All IPFS gateways failed');

    } catch (error) {
      console.error('Chat IPFS load failed:', error);
      throw new Error(`Load failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate and clean session data loaded from IPFS
   */
  private static validateAndCleanSession(data: any): ChatSession {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid session data: not an object');
    }

    if (!data.sessionId || typeof data.sessionId !== 'string') {
      throw new Error('Invalid session data: missing or invalid sessionId');
    }

    if (!Array.isArray(data.messages)) {
      throw new Error('Invalid session data: messages must be an array');
    }

    // Validate each message
    const validMessages = data.messages.filter((msg: any) => {
      return (
        msg &&
        typeof msg === 'object' &&
        typeof msg.id === 'string' &&
        typeof msg.role === 'string' &&
        typeof msg.content === 'string' &&
        typeof msg.timestamp === 'string' &&
        ['user', 'assistant', 'system'].includes(msg.role)
      );
    });

    if (validMessages.length === 0) {
      throw new Error('Invalid session data: no valid messages found');
    }

    // Create clean session object
    const cleanSession: ChatSession = {
      sessionId: data.sessionId,
      messages: validMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        // Include optional fields if present and valid
        ...(msg.buttons && Array.isArray(msg.buttons) && { buttons: msg.buttons }),
        ...(msg.image && typeof msg.image === 'object' && { image: msg.image }),
        ...(msg.links && Array.isArray(msg.links) && { links: msg.links }),
        ...(typeof msg.isLoading === 'boolean' && { isLoading: msg.isLoading })
      })),
      createdAt: data.createdAt || data.messages[0]?.timestamp || new Date().toISOString(),
      updatedAt: data.updatedAt || data.messages[data.messages.length - 1]?.timestamp || new Date().toISOString()
    };

    return cleanSession;
  }

  /**
   * Generate shareable URL for a session
   */
  static generateShareableUrl(cid: string, baseUrl?: string): string {
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}?load=${encodeURIComponent(cid)}`;
  }

  /**
   * Extract CID from shareable URL
   */
  static extractCidFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const loadParam = urlObj.searchParams.get('load');
      return loadParam ? decodeURIComponent(loadParam) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get IPFS gateway URLs for a CID
   */
  static getGatewayUrls(cid: string): string[] {
    const cleanCid = cid.replace(/^ipfs:\/\//, '');
    
    return [
      `https://gateway.pinata.cloud/ipfs/${cleanCid}`,
      `https://ipfs.io/ipfs/${cleanCid}`,
      `https://cloudflare-ipfs.com/ipfs/${cleanCid}`,
      `https://dweb.link/ipfs/${cleanCid}`
    ];
  }

  /**
   * Check if CID is valid format
   */
  static isValidCid(cid: string): boolean {
    if (!cid || typeof cid !== 'string') {
      return false;
    }

    const cleanCid = cid.replace(/^ipfs:\/\//, '');
    
    // Basic CID validation (v0 and v1)
    // CIDv0: starts with Qm, 46 characters, base58
    // CIDv1: starts with b, variable length, base32
    const cidv0Pattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    const cidv1Pattern = /^b[a-z2-7]{58,}$/;
    
    return cidv0Pattern.test(cleanCid) || cidv1Pattern.test(cleanCid);
  }

  /**
   * Upload multiple sessions in batch
   */
  static async uploadBatchSessions(sessions: ChatSession[]): Promise<ChatIPFSUploadResult[]> {
    const results: ChatIPFSUploadResult[] = [];
    const errors: { session: string; error: string }[] = [];

    for (const session of sessions) {
      try {
        const result = await this.uploadSession(session);
        results.push(result);
      } catch (error) {
        errors.push({
          session: session.sessionId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (errors.length > 0) {
      console.warn('Some sessions failed to upload:', errors);
    }

    return results;
  }

  /**
   * Create backup of current session with metadata
   */
  static async createBackup(
    session: ChatSession, 
    metadata?: { 
      description?: string; 
      tags?: string[]; 
      userAddress?: string; 
    }
  ): Promise<ChatIPFSUploadResult> {
    const backupSession = {
      ...session,
      backup: {
        createdAt: new Date().toISOString(),
        description: metadata?.description || `Backup of session ${session.sessionId}`,
        tags: metadata?.tags || ['backup', 'chat-session'],
        userAddress: metadata?.userAddress,
        version: '1.0'
      }
    };

    return this.uploadSession(backupSession);
  }

  /**
   * Verify session integrity by downloading and comparing
   */
  static async verifyUpload(cid: string, originalSession: ChatSession): Promise<boolean> {
    try {
      const loaded = await this.loadSession(cid);
      
      return (
        loaded.session.sessionId === originalSession.sessionId &&
        loaded.session.messages.length === originalSession.messages.length &&
        loaded.session.messages.every((msg, index) => 
          msg.id === originalSession.messages[index].id &&
          msg.content === originalSession.messages[index].content
        )
      );
    } catch {
      return false;
    }
  }
}
