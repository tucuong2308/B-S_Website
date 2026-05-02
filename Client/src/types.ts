export interface PropertyInfo {
  address: string;
  type: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
}

export interface ValuationResult {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  confidence: number;
  pricePerM2: number;
  areaTrend: { month: string; price: number }[];
}

export interface MonthlyAveragePoint {
  month?: string | number | null;
  average_price_per_m2?: number | string | null;
  avg_price_per_m2?: number | string | null;
  price_per_m2?: number | string | null;
  value?: number | string | null;
  total_projects?: number | string | null;
  [key: string]: unknown;
}

export interface NearbyAveragePriceByAddressResult {
  monthly_prices?: MonthlyAveragePoint[] | null;
  address?: string | null;
  [key: string]: unknown;
}

export interface GeoCoordinates {
  lat: number;
  lon: number;
}

export type NearbyAmenityKind =
  | 'school'
  | 'hospital'
  | 'shopping'
  | 'park'
  | 'bus'
  | 'gym';

export interface NearbyAmenity {
  id: string;
  name: string;
  kind: NearbyAmenityKind;
  distanceMeters: number;
  lat: number;
  lon: number;
}

export interface HomeFormData {
  address: string;
  city: string;
  district: string;
  ward: string;
  street: string;
  coordinates?: GeoCoordinates | null;
  type: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
}

export interface ValuationRequestPayload {
  address: string;
  type: string;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
}

export interface ValuationPageState {
  formData: HomeFormData;
  valuationResult?: ValuationResult;
  nearbyAverageResult?: NearbyAveragePriceByAddressResult;
  marketAnalysisResult?: MarketPriceAnalysisResult;
  valuationError?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export interface MonthlyAveragePriceData {
  year: number;
  month: number;
  average_price_per_m2?: number | null;
  avg_price_per_m2?: number | null;
  price_per_m2?: number | null;
  avg_price_per_m2_display?: number | null;
  total_homes?: number | null;
  total_listings?: number | null;
}

export interface MarketPriceAnalysisResult {
  radius_km: number;
  overall_average_price_per_m2_12_months: number;
  monthly_prices: MonthlyAveragePriceData[];
  input_address: string;
  normalized_address: string;
  longitude: number;
  latitude: number;
}

export interface AdministrativeUnit {
  id: string;
  name: string;
  prefix?: string;
  longitude?: number | null;
  latitude?: number | null;
}

export interface AvgPriceByLocationResult {
  id: string;
  name: string;
  avg_price_per_m2: number | null;
  total_listings: number;
}

export interface MapProvinceData {
  name: string;
  avg_price: number;
  price_change_percent: number;
}

export interface MapDistrictData {
  name: string;
  avg_price: number;
  price_change_percent: number;
}

export interface MapWardData {
  name: string;
  avg_price: number;
  price_change_percent: number;
}

export interface MapDetailData {
  avg_price: number;
  price_change_percent: number;
  monthly_prices: Array<{
    month: number;
    price: number;
  }>;
}

export interface ChoroplethRegion {
  type: 'Feature';
  properties: {
    name: string;
    avg_price: number;
    price_change_percent: number;
  };
  geometry: any; // GeoJSON Geometry
}

export interface ChoroplethProps {
  data: MapProvinceData[] | MapDistrictData[] | MapWardData[];
  level: 'province' | 'district' | 'ward';
  parentName?: string;
  onRegionHover: (region: ChoroplethRegion | null) => void;
  onRegionClick: (name: string) => void;
  onDetailRequest: (name: string) => void;
}

export interface ProjectLocationResult {
  id: string;
  name: string;
  address: string;
  province_id: string;
  province_name: string;
  district_id: string;
  district_name: string;
  ward_id: string;
  ward_name: string;
  longitude?: number | null;
  latitude?: number | null;
  status?: string;
  progress?: string;
  lowest_price_per_m2?: number | null;
  highest_price_per_m2?: number | null;
}

export interface ProjectListByLocationResult {
  total: number;
  projects: ProjectLocationResult[];
}

