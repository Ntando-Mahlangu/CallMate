"use client";

import { useState } from "react";
import type { Contact } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";

export function ContactsPanel({
  companyId,
  initialContacts,
}: {
  companyId: string;
  initialContacts: Contact[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsAdding(true);

    const res = await fetch(`/api/prospects/${companyId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, email, phone }),
    });
    const body = await res.json();
    setIsAdding(false);

    if (!res.ok) {
      setError(body.error ?? "We couldn't add that contact.");
      return;
    }

    setContacts((prev) => [...prev, body.contact]);
    setName("");
    setRole("");
    setEmail("");
    setPhone("");
  }

  async function handleDelete(contactId: string) {
    setBusyId(contactId);
    const res = await fetch(`/api/prospects/${companyId}/contacts/${contactId}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    }
  }

  return (
    <div className="space-y-4">
      {contacts.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          No contacts added yet for this company.
        </p>
      ) : (
        <ul className="space-y-3">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {contact.name}
                  {contact.role && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">{contact.role}</span>
                  )}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {[contact.email, contact.phone].filter(Boolean).join(" · ") || "No contact details"}
                </p>
              </div>
              <Button
                variant="secondary"
                className="h-8 px-3 text-xs"
                disabled={busyId === contact.id}
                onClick={() => handleDelete(contact.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="space-y-3 border-t border-[var(--color-border)] pt-4">
        <FormError message={error} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            aria-label="Name"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            aria-label="Role"
            placeholder="Role (optional)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <Input
            aria-label="Email"
            placeholder="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            aria-label="Phone"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" className="h-9 px-4 text-sm" disabled={isAdding}>
          {isAdding ? "Adding…" : "Add contact"}
        </Button>
      </form>
    </div>
  );
}
