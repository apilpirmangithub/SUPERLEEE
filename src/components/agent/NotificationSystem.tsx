import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface NotificationEvent {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'progress';
  title: string;
  message: string;
  duration?: number; // Auto-dismiss after ms (0 = no auto-dismiss)
  actions?: NotificationAction[];
  metadata?: {
    transactionHash?: string;
    ipId?: string;
    explorerUrl?: string;
    ipfsUrl?: string;
    progress?: number; // 0-100 for progress notifications
  };
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

interface NotificationSystemProps {
  maxVisible?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

interface NotificationItemProps {
  notification: NotificationEvent;
  onDismiss: (id: string) => void;
  onAction: (action: NotificationAction) => void;
}

// Global notification state
let globalNotifications: NotificationEvent[] = [];
let globalSetNotifications: React.Dispatch<React.SetStateAction<NotificationEvent[]>> | null = null;

// Global notification API
export const NotificationAPI = {
  show: (notification: Omit<NotificationEvent, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification = { ...notification, id };
    
    if (globalSetNotifications) {
      globalSetNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
    }
    
    return id;
  },

  dismiss: (id: string) => {
    if (globalSetNotifications) {
      globalSetNotifications(prev => prev.filter(n => n.id !== id));
    }
  },

  dismissAll: () => {
    if (globalSetNotifications) {
      globalSetNotifications([]);
    }
  },

  update: (id: string, updates: Partial<NotificationEvent>) => {
    if (globalSetNotifications) {
      globalSetNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, ...updates } : n)
      );
    }
  },

  // Workflow-specific convenience methods
  workflowStarted: (workflowName: string) => {
    return NotificationAPI.show({
      type: 'progress',
      title: 'Workflow Started',
      message: `${workflowName} is now running...`,
      duration: 0,
      metadata: { progress: 0 }
    });
  },

  workflowProgress: (id: string, step: string, progress: number) => {
    NotificationAPI.update(id, {
      message: `${step}...`,
      metadata: { progress }
    });
  },

  workflowCompleted: (id: string, result: { ipId?: string; txHash?: string; explorerUrl?: string }) => {
    NotificationAPI.update(id, {
      type: 'success',
      title: 'Workflow Completed',
      message: 'Your IP has been successfully registered!',
      duration: 10000,
      metadata: {
        ipId: result.ipId,
        transactionHash: result.txHash,
        explorerUrl: result.explorerUrl,
        progress: 100
      },
      actions: result.explorerUrl ? [{
        label: 'View on Explorer',
        action: () => window.open(result.explorerUrl, '_blank'),
        style: 'primary'
      }] : undefined
    });
  },

  workflowFailed: (id: string, error: string) => {
    NotificationAPI.update(id, {
      type: 'error',
      title: 'Workflow Failed',
      message: error,
      duration: 0,
      actions: [{
        label: 'Retry',
        action: () => {
          // This would trigger a retry - implement based on your retry logic
          console.log('Retry action triggered');
        },
        style: 'primary'
      }]
    });
  },

  // IP Registration events
  ipRegistrationStarted: (fileName: string) => {
    return NotificationAPI.show({
      type: 'progress',
      title: 'IP Registration',
      message: `Registering ${fileName}...`,
      duration: 0,
      metadata: { progress: 0 }
    });
  },

  ipAnalysisComplete: (analysis: { quality: number; riskLevel: string; isEligible: boolean }) => {
    return NotificationAPI.show({
      type: analysis.isEligible ? 'success' : 'warning',
      title: 'Analysis Complete',
      message: `Quality: ${analysis.quality}/10, Risk: ${analysis.riskLevel}${!analysis.isEligible ? ' - Not eligible for registration' : ''}`,
      duration: 5000
    });
  },

  duplicateDetected: (tokenId?: string) => {
    return NotificationAPI.show({
      type: 'warning',
      title: 'Duplicate Content',
      message: `This content is already registered${tokenId ? ` (Token #${tokenId})` : ''}`,
      duration: 8000,
      actions: [{
        label: 'View Original',
        action: () => {
          if (tokenId) {
            window.open(`https://aeneid.explorer.story.foundation/token/${tokenId}`, '_blank');
          }
        },
        style: 'secondary'
      }]
    });
  },

  identityVerificationRequired: () => {
    return NotificationAPI.show({
      type: 'info',
      title: 'Identity Verification Required',
      message: 'Please take a photo to verify your identity for this content',
      duration: 0,
      actions: [{
        label: 'Take Photo',
        action: () => {
          // Trigger camera modal - implement based on your camera logic
          console.log('Camera action triggered');
        },
        style: 'primary'
      }]
    });
  },

  // Transaction events
  transactionSubmitted: (txHash: string, explorerUrl: string) => {
    return NotificationAPI.show({
      type: 'info',
      title: 'Transaction Submitted',
      message: 'Waiting for blockchain confirmation...',
      duration: 0,
      metadata: { transactionHash: txHash, explorerUrl },
      actions: [{
        label: 'View Transaction',
        action: () => window.open(`${explorerUrl}/tx/${txHash}`, '_blank'),
        style: 'secondary'
      }]
    });
  },

  transactionConfirmed: (id: string, ipId: string, explorerUrl: string) => {
    NotificationAPI.update(id, {
      type: 'success',
      title: 'Transaction Confirmed',
      message: 'Your IP registration is complete!',
      duration: 10000,
      metadata: { ipId, explorerUrl },
      actions: [{
        label: 'View IP Asset',
        action: () => window.open(`${explorerUrl}/ipa/${ipId}`, '_blank'),
        style: 'primary'
      }]
    });
  }
};

function NotificationItem({ notification, onDismiss, onAction }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(notification.id), 300);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.id, onDismiss]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'progress': return '⏳';
      default: return 'ℹ️';
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success': return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'error': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      case 'info': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'progress': return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    }
  };

  const getActionButtonStyle = (style: NotificationAction['style'] = 'secondary') => {
    switch (style) {
      case 'primary': return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'danger': return 'bg-red-500 hover:bg-red-600 text-white';
      default: return 'bg-white/10 hover:bg-white/20 text-gray-300';
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`max-w-sm w-full backdrop-blur-sm border rounded-lg p-4 shadow-lg ${getColors()}`}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl">{getIcon()}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-white text-sm mb-1">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-300 mb-2">
                {notification.message}
              </p>
            </div>
            
            <button
              onClick={() => onDismiss(notification.id)}
              className="text-gray-400 hover:text-white transition-colors ml-2"
            >
              ✕
            </button>
          </div>

          {/* Progress bar for progress notifications */}
          {notification.type === 'progress' && notification.metadata?.progress !== undefined && (
            <div className="mb-3">
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div 
                  className="bg-purple-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${notification.metadata.progress}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {notification.metadata.progress}% complete
              </div>
            </div>
          )}

          {/* Transaction/IP metadata */}
          {notification.metadata && (
            <div className="text-xs text-gray-400 space-y-1 mb-3">
              {notification.metadata.transactionHash && (
                <div>TX: {notification.metadata.transactionHash.slice(0, 10)}...</div>
              )}
              {notification.metadata.ipId && (
                <div>IP ID: {notification.metadata.ipId.slice(0, 20)}...</div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => onAction(action)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${getActionButtonStyle(action.style)}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationSystem({ 
  maxVisible = 5, 
  position = 'top-right' 
}: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);

  // Register global setter
  useEffect(() => {
    globalSetNotifications = setNotifications;
    globalNotifications = notifications;

    return () => {
      globalSetNotifications = null;
    };
  }, [notifications]);

  const handleDismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleAction = useCallback((action: NotificationAction) => {
    action.action();
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left': return 'top-4 left-4';
      case 'top-center': return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      default: return 'top-4 right-4';
    }
  };

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      <div className="space-y-3">
        <AnimatePresence>
          {notifications.slice(0, maxVisible).map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onDismiss={handleDismiss}
              onAction={handleAction}
            />
          ))}
        </AnimatePresence>
        
        {/* Overflow indicator */}
        {notifications.length > maxVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/10 border border-white/20 rounded-lg p-2 text-center"
          >
            <span className="text-gray-400 text-sm">
              +{notifications.length - maxVisible} more notifications
            </span>
            <button
              onClick={() => setNotifications([])}
              className="ml-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Clear All
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// React hook for using notifications
export function useNotifications() {
  return {
    show: NotificationAPI.show,
    dismiss: NotificationAPI.dismiss,
    dismissAll: NotificationAPI.dismissAll,
    update: NotificationAPI.update,
    
    // Workflow shortcuts
    workflowStarted: NotificationAPI.workflowStarted,
    workflowProgress: NotificationAPI.workflowProgress,
    workflowCompleted: NotificationAPI.workflowCompleted,
    workflowFailed: NotificationAPI.workflowFailed,
    
    // IP Registration shortcuts
    ipRegistrationStarted: NotificationAPI.ipRegistrationStarted,
    ipAnalysisComplete: NotificationAPI.ipAnalysisComplete,
    duplicateDetected: NotificationAPI.duplicateDetected,
    identityVerificationRequired: NotificationAPI.identityVerificationRequired,
    
    // Transaction shortcuts
    transactionSubmitted: NotificationAPI.transactionSubmitted,
    transactionConfirmed: NotificationAPI.transactionConfirmed
  };
}

// Workflow Event Manager - integrates with your workflow engine
export class WorkflowNotificationManager {
  private notificationId: string | null = null;

  startWorkflow(workflowName: string) {
    this.notificationId = NotificationAPI.workflowStarted(workflowName);
    return this.notificationId;
  }

  updateProgress(step: string, progress: number) {
    if (this.notificationId) {
      NotificationAPI.workflowProgress(this.notificationId, step, progress);
    }
  }

  completeWorkflow(result: { ipId?: string; txHash?: string; explorerUrl?: string }) {
    if (this.notificationId) {
      NotificationAPI.workflowCompleted(this.notificationId, result);
      this.notificationId = null;
    }
  }

  failWorkflow(error: string) {
    if (this.notificationId) {
      NotificationAPI.workflowFailed(this.notificationId, error);
      this.notificationId = null;
    }
  }

  reset() {
    this.notificationId = null;
  }
}
