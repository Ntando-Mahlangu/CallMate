"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EvidenceToggle({ reason }: { reason: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setVisible((v) => !v)}>
        {visible ? "Hide Evidence" : "Show Evidence"}
      </Button>
      {visible && (
        <p className="animate-fade-in mt-3 text-sm text-[var(--color-text-secondary)]">
          {reason}
        </p>
      )}
    </div>
  );
}
