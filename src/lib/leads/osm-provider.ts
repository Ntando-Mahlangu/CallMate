import type { CompanyDataProvider, RawCompanyResult } from "./types";
import { withRetry, HttpError } from "@/lib/resilience/retry";

// docs/outrun/06, docs/outrun/11 — the free lead-data option behind the
// same CompanyDataProvider interface Google Places implements. Uses
// OpenStreetMap's public Nominatim search: no API key, no billing account,
// genuinely free. The tradeoff is real and worth restating here: Nominatim
// is a geocoder indexing whatever OSM's community has tagged, so it has no
// concept of star ratings or review counts (scoreCompany in ./scoring.ts
// degrades gracefully when those are null) and business contact info
// (phone/website) is far patchier than Google Places, especially outside
// well-mapped regions.
//
// The public nominatim.openstreetmap.org instance also has a hard usage
// policy: max ~1 request/second and a required identifying User-Agent —
// fine for an early, low-volume launch, but self-host Nominatim/Overpass
// (or move to a paid provider) before relying on this at real scale.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Outrun/1.0 (+https://outrunv1.online)";

// OSM's `class` tag on non-business results (a city, a road, a country
// border, ...) — anything outside this set is filtered out so search
// results are actual businesses, not arbitrary geocoded places.
const BUSINESS_CLASSES = new Set(["amenity", "shop", "office", "craft", "tourism", "leisure"]);

type NominatimResult = {
  osm_type: string;
  osm_id: number;
  display_name: string;
  type?: string;
  class?: string;
  namedetails?: { name?: string };
  extratags?: Record<string, string>;
};

function prettifyCategory(type: string | undefined): string | null {
  if (!type) return null;
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export class OsmPlacesProvider implements CompanyDataProvider {
  async search(query: string): Promise<RawCompanyResult[]> {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("extratags", "1");
    url.searchParams.set("namedetails", "1");
    url.searchParams.set("limit", "20");

    const results = await withRetry(async () => {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new HttpError(`OpenStreetMap search failed: ${response.status} ${body}`, response.status);
      }

      return (await response.json()) as NominatimResult[];
    });

    return results
      .filter((r) => r.class && BUSINESS_CLASSES.has(r.class))
      .map((r) => ({
        source: "openstreetmap",
        sourceId: `${r.osm_type}/${r.osm_id}`,
        name: r.namedetails?.name ?? r.display_name.split(",")[0]!.trim(),
        category: prettifyCategory(r.type),
        website: r.extratags?.website ?? r.extratags?.["contact:website"] ?? null,
        phone: r.extratags?.phone ?? r.extratags?.["contact:phone"] ?? null,
        formattedAddress: r.display_name,
        rating: null,
        reviewCount: null,
      }));
  }
}
