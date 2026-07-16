"use client";

import { useEffect, useRef, useState } from "react";
import { ChatPanel } from "@/components/ceo-agent/chat-panel";

type Message = { role: "USER" | "ASSISTANT"; content: string };

// docs/outrun/04 "TOP NAVIGATION" lists AI Chat alongside Search and
// Notifications — a persistent assistant reachable from any page, not
// just its own /ceo-agent route. Reuses ChatPanel (and the same
// /api/ceo-agent/chat + ChatMessage history) so a question asked here
// shows up in the full CEO Agent page's history too.
export function GlobalChatWidget({ initialMessages }: { initialMessages: Message[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Ask the CEO Agent"
        aria-expanded={isOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-96 max-w-[90vw]">
          <ChatPanel initialMessages={initialMessages} />
        </div>
      )}
    </div>
  );
}
