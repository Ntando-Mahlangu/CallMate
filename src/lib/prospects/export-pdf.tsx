import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Company } from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#181818" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#666666", marginBottom: 20 },
  itemTitle: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  itemBody: { fontSize: 9.5, color: "#333333", marginBottom: 2, lineHeight: 1.4 },
  muted: { fontSize: 9, color: "#666666", marginBottom: 8 },
  company: { marginBottom: 14, borderBottom: "1 solid #DDDDDD", paddingBottom: 10 },
});

export function buildProspectsPdfDocument(organizationName: string, companies: Company[]) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{organizationName}</Text>
        <Text style={styles.subtitle}>
          Prospect List · {companies.length} compan{companies.length === 1 ? "y" : "ies"}
        </Text>

        {companies.map((company) => (
          <View key={company.id} style={styles.company} wrap={false}>
            <Text style={styles.itemTitle}>{company.name}</Text>
            <Text style={styles.itemBody}>
              {company.category ?? "Uncategorized"}
              {company.formattedAddress ? ` · ${company.formattedAddress}` : ""}
            </Text>
            {(company.website || company.phone) && (
              <Text style={styles.itemBody}>
                {[company.website, company.phone].filter(Boolean).join(" · ")}
              </Text>
            )}
            {company.fitScore != null && (
              <Text style={styles.itemBody}>
                Fit {company.fitScore}/100{company.fitReason ? ` — ${company.fitReason}` : ""}
              </Text>
            )}
            {company.confidenceScore != null && (
              <Text style={styles.muted}>
                Confidence {company.confidenceScore}/100
                {company.confidenceReason ? ` — ${company.confidenceReason}` : ""}
              </Text>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function prospectsToPdfBuffer(
  organizationName: string,
  companies: Company[],
): Promise<Buffer> {
  return renderToBuffer(buildProspectsPdfDocument(organizationName, companies));
}
