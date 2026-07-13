import { Card } from "@/components/ui/card";

// Only features that exist and work today — doc 02 lists a few more
// (Campaign Builder, Weekly Growth Reviews) that aren't built yet, and a
// marketing page shouldn't promise those (Article XIII "Honest Marketing").
const FEATURES = [
  {
    title: "AI Growth Blueprint",
    body: "Understand exactly how your business should grow — a scored, evidence-based strategy, not generic advice.",
  },
  {
    title: "AI Prospect Discovery",
    body: "Describe who you're looking for in plain English. Outrun finds qualified businesses and ranks them by fit.",
  },
  {
    title: "AI Company Research",
    body: "Know every prospect before reaching out — pain points, why they match, and a recommended contact angle.",
  },
  {
    title: "AI Outreach",
    body: "Generate a personalized first message from that research, with the reasoning behind every opening line.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-5xl px-6 py-20">
      <h2 className="text-center text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
        Meet Your AI Growth Partner
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-center text-[var(--color-text-secondary)]">
        Instead of another dashboard, you get a partner that learns your
        business, finds opportunities, and does the research for you.
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{feature.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
