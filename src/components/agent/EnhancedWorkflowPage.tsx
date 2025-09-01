import React from 'react';
import { EnhancedWorkflowOrchestrator } from './EnhancedWorkflowOrchestrator';
import { NotificationSystem } from './NotificationSystem';

/**
 * Main page component that combines the enhanced workflow orchestrator
 * with the notification system for a complete sophisticated workflow experience.
 * 
 * Features:
 * - Smart Analysis Mode: Auto-pipeline with AI analysis aggregator
 * - Traditional Chat Mode: Backward-compatible chat interface
 * - Real-time notifications for all workflow events
 * - One-click approval system
 * - Enhanced metadata generation
 * - Progressive workflow steps with visual feedback
 */
export function EnhancedWorkflowPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ai-bg via-gray-900 to-blue-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,rgba(96,165,250,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_1px,rgba(255,255,255,0.03)_1px)] bg-[size:60px_60px] animate-grid" />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <EnhancedWorkflowOrchestrator />
      </div>

      {/* Global Notification System */}
      <NotificationSystem 
        maxVisible={5} 
        position="top-right" 
      />
    </div>
  );
}

export default EnhancedWorkflowPage;
