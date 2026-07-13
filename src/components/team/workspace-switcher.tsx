"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";

export function WorkspaceSwitcher({
  workspaces,
  activeOrgId,
}: {
  workspaces: { id: string; name: string }[];
  activeOrgId: string;
}) {
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  async function handleChange(organizationId: string) {
    if (organizationId === activeOrgId) return;
    setIsSwitching(true);
    await fetch("/api/workspace/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId }),
    });
    router.push("/dashboard");
    router.refresh();
    setIsSwitching(false);
  }

  return (
    <Select
      value={activeOrgId}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isSwitching}
      className="h-9 w-auto max-w-48 text-sm"
    >
      {workspaces.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </Select>
  );
}
