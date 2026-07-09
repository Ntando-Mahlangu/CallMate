import type { CompanyDataProvider, RawCompanyResult } from "./types";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.primaryTypeDisplayName",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
].join(",");

type PlacesTextSearchResponse = {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    primaryTypeDisplayName?: { text?: string };
    websiteUri?: string;
    nationalPhoneNumber?: string;
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
  }>;
};

export class GooglePlacesProvider implements CompanyDataProvider {
  constructor(private apiKey: string) {}

  async search(query: string): Promise<RawCompanyResult[]> {
    // Text Search understands natural-language queries directly
    // ("plumbers in Austin Texas") — no separate NL-parsing step needed.
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: query }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google Places search failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as PlacesTextSearchResponse;

    return (data.places ?? []).map((place) => ({
      source: "google_places",
      sourceId: place.id,
      name: place.displayName?.text ?? "Unnamed business",
      category: place.primaryTypeDisplayName?.text ?? null,
      website: place.websiteUri ?? null,
      phone: place.nationalPhoneNumber ?? null,
      formattedAddress: place.formattedAddress ?? null,
      rating: place.rating ?? null,
      reviewCount: place.userRatingCount ?? null,
    }));
  }
}
