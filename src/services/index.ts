// AI Detection Service
export async function detectAI(_imageBuffer: Buffer): Promise<{ isAI: boolean; confidence: number }> {
  return { isAI: false, confidence: 0 };
}

// IPFS Upload Service
export async function uploadToIPFS(data: Buffer | string, filename?: string): Promise<string> {
  try {
    if (typeof data === 'string') {
      // Upload JSON data
      const response = await fetch('/api/ipfs/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
      });

      if (!response.ok) throw new Error('JSON upload to IPFS failed');
      const result = await response.json();
      return result.cid;
    } else {
      // Upload file data
      const formData = new FormData();
      const file = new File([new Uint8Array(data)], filename || 'file', { type: 'application/octet-stream' });
      formData.append('file', file);

      const response = await fetch('/api/ipfs/file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('File upload to IPFS failed');
      const result = await response.json();
      return result.cid;
    }
  } catch (error) {
    console.error('uploadToIPFS error:', error);
    throw error;
  }
}

// OpenAI IP status check
import { compressImage } from "@/lib/utils/image";
export async function detectIPStatus(file: File): Promise<{ result: string }> {
  try {
    const maxW = 1024;
    const maxH = 1024;
    const quality = 0.8;
    const compressed = await compressImage(file, maxW, maxH, quality);

    const formData = new FormData();
    formData.append('file', compressed);

    const response = await fetch('/api/ip-status', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('OpenAI IP status API failed');
    const data = await response.json();
    return { result: data.result as string };
  } catch (error) {
    console.error('detectIPStatus error:', error);
    return { result: 'Status: Unknown\nRisk: Unable to determine\nTolerance: Good to register, please verify manually' };
  }
}


// Utility functions for file handling
export function fileToBuffer(file: File): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(Buffer.from(reader.result));
      } else {
        reject(new Error('Failed to convert file to buffer'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsArrayBuffer(file);
  });
}

// Hash computation utilities
export async function computeSHA256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function computeKeccak256(data: string): Promise<string> {
  // This would typically use a library like js-sha3 or viem
  // For now, we'll use a simple hash as placeholder
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Format utilities
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function formatIPFSUrl(cid: string, gateway: string = 'https://ipfs.io'): string {
  return `${gateway}/ipfs/${cid}`;
}
