import type { RawCompanyResult } from "./types";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";

export type LeadScore = {
  fitScore: number;
  fitReason: string;
  confidenceScore: number;
  confidenceReason: string;
};

/**
 * Fast, free heuristic scoring run on every search result (docs/outrun/06
 * "PERFORMANCE — never block the interface waiting for all processing to
 * complete"). AI is reserved for the expensive per-company Research step;
 * running an AI call per search result would be slow and costly for
 * numbers a simple heuristic already explains honestly.
 */
export function scoreCompany(
  company: RawCompanyResult,
  icp: GrowthBlueprintData["idealCustomerProfile"] | null,
): LeadScore {
  let fit = 20;
  const fitReasons: string[] = [];

  if (icp && company.category) {
    const categoryMatch = icp.industry
      .toLowerCase()
      .split(/\s+/)
      .some((word) => word.length > 3 && company.category!.toLowerCase().includes(word));
    if (categoryMatch) {
      fit += 45;
      fitReasons.push(`Category "${company.category}" aligns with your target industry.`);
    } else {
      fit += 15;
      fitReasons.push(`Category "${company.category}" is a loose match for your target industry.`);
    }
  } else {
    fitReasons.push("No industry category returned for this result.");
  }

  if (icp) {
    const locationMatch =
      company.formattedAddress &&
      icp.location.toLowerCase() !== "national" &&
      icp.location.toLowerCase() !== "international" &&
      company.formattedAddress.toLowerCase().includes(icp.location.toLowerCase());
    if (locationMatch) {
      fit += 20;
      fitReasons.push("Location matches your ideal customer profile.");
    } else {
      fit += 10;
    }
  }

  if (company.reviewCount != null && company.rating != null) {
    if (company.reviewCount > 10 && company.rating >= 3.5) {
      fit += 15;
      fitReasons.push(`${company.reviewCount} reviews at ${company.rating}★ suggest an active, healthy business.`);
    } else {
      fit += 5;
    }
  }

  let confidence = 10;
  const confidenceReasons: string[] = [];

  if (company.website) {
    confidence += 40;
    confidenceReasons.push("Has a website.");
  } else {
    confidenceReasons.push("No website found — recommendations based on limited information.");
  }
  if (company.phone) {
    confidence += 15;
    confidenceReasons.push("Verified phone number.");
  }
  if (company.formattedAddress) {
    confidence += 15;
    confidenceReasons.push("Verified address.");
  }
  if (company.reviewCount != null && company.reviewCount > 10) {
    confidence += 20;
    confidenceReasons.push("Meaningful review volume.");
  }

  return {
    fitScore: Math.min(95, fit),
    fitReason: fitReasons.join(" "),
    confidenceScore: Math.min(95, confidence),
    confidenceReason: confidenceReasons.join(" "),
  };
}
