"use client";
import Link from "next/link";
import { EnhancedAgentOrchestrator } from "@/components/agent/EnhancedAgentOrchestrator";

export default function Page() {
  return (
    <div>
      {/* Quick Navigation */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Link
          href="/simple-register"
          className="px-4 py-2 rounded-lg bg-purple-500/80 hover:bg-purple-500 text-white text-sm font-medium transition-colors backdrop-blur-sm"
        >
          ⚡ Simple Register
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white text-sm font-medium transition-colors backdrop-blur-sm"
        >
          📋 My IPs
        </Link>
      </div>

      <EnhancedAgentOrchestrator />
    </div>
  );
}
