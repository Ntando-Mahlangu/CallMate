import type { Company } from "@prisma/client";

const COLUMNS: { header: string; value: (c: Company) => string }[] = [
  { header: "Name", value: (c) => c.name },
  { header: "Category", value: (c) => c.category ?? "" },
  { header: "Website", value: (c) => c.website ?? "" },
  { header: "Phone", value: (c) => c.phone ?? "" },
  { header: "Contact Email", value: (c) => c.contactEmail ?? "" },
  { header: "Address", value: (c) => c.formattedAddress ?? "" },
  { header: "Rating", value: (c) => (c.rating != null ? String(c.rating) : "") },
  { header: "Review Count", value: (c) => (c.reviewCount != null ? String(c.reviewCount) : "") },
  { header: "Fit Score", value: (c) => (c.fitScore != null ? String(c.fitScore) : "") },
  { header: "Fit Reason", value: (c) => c.fitReason ?? "" },
  { header: "Confidence Score", value: (c) => (c.confidenceScore != null ? String(c.confidenceScore) : "") },
  { header: "Confidence Reason", value: (c) => c.confidenceReason ?? "" },
  { header: "Saved", value: (c) => (c.isSaved ? "Yes" : "No") },
  { header: "Added", value: (c) => c.createdAt.toISOString() },
];

// RFC 4180 — quote any field containing a comma, quote, or newline;
// double up embedded quotes.
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function companiesToCsv(companies: Company[]): string {
  const rows = [
    COLUMNS.map((c) => c.header),
    ...companies.map((company) => COLUMNS.map((c) => escapeCsvField(c.value(company)))),
  ];
  return rows.map((row) => row.join(",")).join("\r\n");
}
