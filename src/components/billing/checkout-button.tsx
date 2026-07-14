"use client";

import { useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";

let paddlePromise: Promise<Paddle | undefined> | null = null;

function getPaddle() {
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      environment:
        process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
          ? "production"
          : "sandbox",
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    });
  }
  return paddlePromise;
}

export function CheckoutButton({
  priceId,
  organizationId,
}: {
  priceId: string;
  organizationId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState("");

  async function handleClick() {
    setError(null);
    setIsLoading(true);
    try {
      const paddle = await getPaddle();
      if (!paddle) throw new Error("Checkout is not available right now.");

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { organizationId },
        ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Checkout is not available right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <FormError message={error} />
      <Input
        placeholder="Coupon code (optional)"
        value={discountCode}
        onChange={(e) => setDiscountCode(e.target.value)}
      />
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? "Loading…" : "Upgrade to Starter"}
      </Button>
    </div>
  );
}
