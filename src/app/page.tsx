"use client";
import { EnhancedWorkflowOrchestrator } from "@/components/agent/EnhancedWorkflowOrchestrator";
import { NotificationSystem } from "@/components/agent/NotificationSystem";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ai-bg via-gray-900 to-blue-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,rgba(96,165,250,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_1px,rgba(255,255,255,0.03)_1px)] bg-[size:60px_60px] animate-grid" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 pt-8 pb-16">
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
