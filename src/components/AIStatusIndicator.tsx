"use client";

import React from "react";
import { Bot, Zap, AlertCircle } from "lucide-react";
import { getOpenAIStatus } from "@/lib/openai";

interface AIStatusIndicatorProps {
  className?: string;
}

export function AIStatusIndicator({ className = "" }: AIStatusIndicatorProps) {
  const [status, setStatus] = React.useState<{ available: boolean; error?: string } | null>(null);

  React.useEffect(() => {
    const checkStatus = () => {
      const aiStatus = getOpenAIStatus();
      setStatus(aiStatus);
    };

    checkStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  if (status.available) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 ${className}`}>
        <Zap className="h-4 w-4 text-green-400" />
        <span className="text-sm text-green-300 font-medium">AI Enhanced</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 ${className}`}>
      <AlertCircle className="h-4 w-4 text-yellow-400" />
      <span className="text-sm text-yellow-300 font-medium">Basic Mode</span>
      {status.error && (
        <span className="text-xs text-yellow-400/70">({status.error})</span>
      )}
    </div>
  );
}

// Hook for components that need to know AI status
export function useAIStatus() {
  const [isAIAvailable, setIsAIAvailable] = React.useState(false);

  React.useEffect(() => {
    const checkStatus = () => {
      const status = getOpenAIStatus();
      setIsAIAvailable(status.available);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return isAIAvailable;
}
