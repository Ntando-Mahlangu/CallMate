import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { GrowthBlueprint } from "@prisma/client";
import type { BusinessSnapshot, GrowthBlueprintData, WebsiteAnalysis } from "./schema";

// docs/outrun/05 "EXPORTS — Exports should preserve premium formatting."
// A restrained dark-on-light print layout (PDF renderers don't do the
// app's dark theme well on paper) rather than a raw data dump.
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#181818" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#666666", marginBottom: 20 },
  score: { fontSize: 32, fontWeight: 700, marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginTop: 18, marginBottom: 8 },
  paragraph: { fontSize: 10, lineHeight: 1.5, marginBottom: 6 },
  itemTitle: { fontSize: 10.5, fontWeight: 700, marginBottom: 2 },
  itemBody: { fontSize: 10, color: "#333333", marginBottom: 8, lineHeight: 1.4 },
  muted: { fontSize: 9, color: "#666666" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function buildBlueprintPdfDocument(organizationName: string, blueprint: GrowthBlueprint) {
  const snapshot = blueprint.businessSnapshot as BusinessSnapshot;
  const strengths = blueprint.strengths as GrowthBlueprintData["strengths"];
  const weaknesses = blueprint.weaknesses as GrowthBlueprintData["weaknesses"];
  const bottleneck = blueprint.biggestBottleneck as GrowthBlueprintData["biggestBottleneck"];
  const opportunities = blueprint.opportunities as GrowthBlueprintData["opportunities"];
  const growthStrategy = blueprint.growthStrategy as GrowthBlueprintData["growthStrategy"];
  const icp = blueprint.idealCustomerProfile as GrowthBlueprintData["idealCustomerProfile"];
  const roadmap = blueprint.roadmap as GrowthBlueprintData["roadmap"];
  const websiteAnalysis = blueprint.websiteAnalysis as WebsiteAnalysis | null;
  const scoreCategories = blueprint.scoreCategories as GrowthBlueprintData["scoreCategories"];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{organizationName}</Text>
        <Text style={styles.subtitle}>Growth Blueprint · Version {blueprint.version}</Text>

        <Text style={styles.score}>{blueprint.growthScore}/100</Text>
        <Text style={styles.paragraph}>{blueprint.executiveSummary}</Text>

        <Section title="Business Snapshot">
          <Text style={styles.itemBody}>Industry: {snapshot.industry}</Text>
          <Text style={styles.itemBody}>Target market: {snapshot.targetMarket}</Text>
          <Text style={styles.itemBody}>Ideal customer: {snapshot.idealCustomer}</Text>
          <Text style={styles.itemBody}>Business model: {snapshot.businessModel}</Text>
          <Text style={styles.itemBody}>Primary goal: {snapshot.primaryGoal}</Text>
          <Text style={styles.itemBody}>
            Primary acquisition channel: {snapshot.primaryAcquisitionChannel}
          </Text>
          <Text style={styles.itemBody}>Growth stage: {snapshot.growthStage}</Text>
          <Text style={styles.itemBody}>
            Estimated customer value:{" "}
            {snapshot.estimatedCustomerValue != null
              ? `$${snapshot.estimatedCustomerValue}`
              : "Not known"}
          </Text>
          <Text style={styles.itemBody}>Website status: {snapshot.websiteStatus}</Text>
          <Text style={styles.itemBody}>Campaign status: {snapshot.campaignStatus}</Text>
        </Section>

        <Section title="Strengths">
          {strengths.map((s) => (
            <View key={s.title} style={{ marginBottom: 6 }}>
              <Text style={styles.itemTitle}>{s.title}</Text>
              <Text style={styles.itemBody}>{s.reason}</Text>
            </View>
          ))}
        </Section>

        <Section title="Weaknesses">
          {weaknesses.map((w) => (
            <View key={w.title} style={{ marginBottom: 6 }}>
              <Text style={styles.itemTitle}>
                {w.title} ({w.estimatedImpact} impact)
              </Text>
              <Text style={styles.itemBody}>{w.whyItMatters}</Text>
              <Text style={styles.muted}>Fix: {w.suggestedImprovement}</Text>
            </View>
          ))}
        </Section>

        <Section title="Biggest Opportunity">
          <Text style={styles.itemTitle}>{bottleneck.title}</Text>
          <Text style={styles.itemBody}>{bottleneck.description}</Text>
          <Text style={styles.itemBody}>Why it matters: {bottleneck.whyItIsLimitingGrowth}</Text>
          <Text style={styles.itemBody}>
            Fixing it changes the business by: {bottleneck.howFixingItChangesTheBusiness}
          </Text>
        </Section>

        <Section title="Highest ROI Opportunities">
          {opportunities.map((o) => (
            <View key={o.title} style={{ marginBottom: 8 }}>
              <Text style={styles.itemTitle}>
                {o.title} — {o.confidence}% confidence, {o.estimatedImpact} impact
              </Text>
              <Text style={styles.itemBody}>{o.description}</Text>
              <Text style={styles.muted}>Evidence: {o.supportingEvidence}</Text>
              <Text style={styles.muted}>Next step: {o.recommendedAction}</Text>
            </View>
          ))}
        </Section>
      </Page>

      <Page size="A4" style={styles.page}>
        <Section title="Recommended Growth Strategy">
          {growthStrategy.map((s) => (
            <View key={s.channel} style={{ marginBottom: 6 }}>
              <Text style={styles.itemTitle}>
                {s.channel} ({s.impact} impact)
              </Text>
              <Text style={styles.itemBody}>{s.whyItFits}</Text>
            </View>
          ))}
        </Section>

        <Section title="Ideal Customer Profile">
          <Text style={styles.itemBody}>Industry: {icp.industry}</Text>
          <Text style={styles.itemBody}>Company size: {icp.companySize}</Text>
          <Text style={styles.itemBody}>Decision maker: {icp.decisionMaker}</Text>
          <Text style={styles.itemBody}>Location: {icp.location}</Text>
          <Text style={styles.itemBody}>
            Pain points: {icp.painPoints.map((p) => `${p.text} (${p.basis})`).join(", ")}
          </Text>
          <Text style={styles.itemBody}>
            Likely goals: {icp.likelyGoals.map((g) => `${g.text} (${g.basis})`).join(", ")}
          </Text>
          <Text style={styles.itemBody}>
            Buying triggers: {icp.buyingTriggers.map((t) => `${t.text} (${t.basis})`).join(", ")}
          </Text>
        </Section>

        <Section title="Growth Roadmap">
          {(["Today", "This Week", "This Month", "This Quarter"] as const).map((horizon) => {
            const items = roadmap.filter((item) => item.horizon === horizon);
            if (items.length === 0) return null;
            return (
              <View key={horizon} style={{ marginBottom: 6 }}>
                <Text style={styles.itemTitle}>{horizon}</Text>
                {items.map((item) => (
                  <Text key={item.action} style={styles.itemBody}>
                    • {item.action} — {item.reason}
                  </Text>
                ))}
              </View>
            );
          })}
        </Section>

        <Section title="Score Breakdown">
          {scoreCategories.map((c) => (
            <View key={c.category} style={styles.row}>
              <Text style={styles.itemBody}>
                {c.category} — {c.reason}
              </Text>
              <Text style={styles.itemTitle}>{c.score}</Text>
            </View>
          ))}
        </Section>

        {websiteAnalysis && (
          <Section title="Website Analysis">
            <Text style={styles.itemBody}>Headline clarity: {websiteAnalysis.headlineClarity}</Text>
            <Text style={styles.itemBody}>Offer clarity: {websiteAnalysis.offerClarity}</Text>
            <Text style={styles.itemBody}>Calls-to-action: {websiteAnalysis.callsToAction}</Text>
            <Text style={styles.itemBody}>Trust signals: {websiteAnalysis.trustSignals}</Text>
            <Text style={styles.itemBody}>Messaging: {websiteAnalysis.messaging}</Text>
            <Text style={styles.muted}>
              Contact info: {websiteAnalysis.hasContactInfo ? "found" : "not found"} · Title:{" "}
              {websiteAnalysis.hasTitle ? "present" : "missing"} · Meta description:{" "}
              {websiteAnalysis.hasMetaDescription ? "present" : "missing"} · {websiteAnalysis.wordCount}{" "}
              words · {websiteAnalysis.imagesMissingAlt} images missing alt text
            </Text>
          </Section>
        )}

        <Section title="AI Confidence Notes">
          <Text style={styles.itemBody}>{blueprint.confidenceNotes}</Text>
        </Section>
      </Page>
    </Document>
  );
}

export async function blueprintToPdfBuffer(
  organizationName: string,
  blueprint: GrowthBlueprint,
): Promise<Buffer> {
  return renderToBuffer(buildBlueprintPdfDocument(organizationName, blueprint));
}
