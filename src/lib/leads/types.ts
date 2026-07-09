export type RawCompanyResult = {
  source: string;
  sourceId: string;
  name: string;
  category: string | null;
  website: string | null;
  phone: string | null;
  formattedAddress: string | null;
  rating: number | null;
  reviewCount: number | null;
};

/**
 * Every lead-data vendor implements this one interface (docs/outrun/11,
 * docs/outrun/06 "API ARCHITECTURE" — never couple the app to one
 * provider). Swapping Google Places for Apollo or another provider means
 * writing one new class, not touching search/scoring/UI code.
 */
export interface CompanyDataProvider {
  search(query: string): Promise<RawCompanyResult[]>;
}
