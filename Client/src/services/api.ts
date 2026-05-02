import { API_ENDPOINTS } from '../config/endpoints';
import { BACKEND_CONFIG } from '../config/backend.config';
import { apiClient } from '../config/api-client';
import type {
  AdministrativeUnit,
  AvgPriceByLocationResult,
  NearbyAveragePriceByAddressResult,
  ProjectListByLocationResult,
  ProjectLocationResult,
  ValuationRequestPayload,
  ValuationResult,
} from '../types';

const BACKEND_URL = BACKEND_CONFIG.BASE_URL;

// API Types
export interface Project {
  id?: string;
  name?: string;
  address?: string;
  price?: number;
  area?: number;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const extractNearbyAveragePayload = (
  payload: any
): NearbyAveragePriceByAddressResult | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const source = payload.data ?? payload.result ?? payload;

  if (!source || typeof source !== 'object') {
    return null;
  }

  return source as NearbyAveragePriceByAddressResult;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const normalizeAdministrativeUnit = (item: any): AdministrativeUnit => ({
  id: String(item?.id ?? item?.code ?? ''),
  name: String(item?.name ?? ''),
  prefix: item?.prefix ? String(item.prefix) : undefined,
  longitude:
    item?.longitude == null || item?.longitude === '' ? null : Number(item.longitude),
  latitude: item?.latitude == null || item?.latitude === '' ? null : Number(item.latitude),
});

const extractArrayPayload = <T>(payload: any): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  const source = payload?.data ?? payload?.result ?? payload?.items ?? payload;
  return Array.isArray(source) ? (source as T[]) : [];
};

const extractObjectPayload = <T>(payload: any): T | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const source = payload.data ?? payload.result ?? payload;
  return source && typeof source === 'object' ? (source as T) : null;
};

const normalizeAvgPricePayload = (payload: any): AvgPriceByLocationResult | null => {
  const source = extractObjectPayload<any>(payload);

  if (!source) {
    return null;
  }

  return {
    id: String(source.id ?? ''),
    name: String(source.name ?? ''),
    avg_price_per_m2:
      source.avg_price_per_m2 == null || source.avg_price_per_m2 === ''
        ? null
        : Number(source.avg_price_per_m2),
    total_listings: Number(source.total_listings ?? 0),
  };
};

const normalizeProjectPayload = (item: any): ProjectLocationResult => ({
  id: String(item?.id ?? ''),
  name: String(item?.name ?? ''),
  address: String(item?.address ?? ''),
  province_id: String(item?.province_id ?? ''),
  province_name: String(item?.province_name ?? ''),
  district_id: String(item?.district_id ?? ''),
  district_name: String(item?.district_name ?? ''),
  ward_id: String(item?.ward_id ?? ''),
  ward_name: String(item?.ward_name ?? ''),
  longitude: item?.longitude == null || item?.longitude === '' ? null : Number(item.longitude),
  latitude: item?.latitude == null || item?.latitude === '' ? null : Number(item.latitude),
  status: item?.status ? String(item.status) : undefined,
  progress: item?.progress ? String(item.progress) : undefined,
  lowest_price_per_m2:
    item?.lowest_price_per_m2 == null || item?.lowest_price_per_m2 === ''
      ? null
      : Number(item.lowest_price_per_m2),
  highest_price_per_m2:
    item?.highest_price_per_m2 == null || item?.highest_price_per_m2 === ''
      ? null
      : Number(item.highest_price_per_m2),
});

// Remove Vietnamese diacritics from text
const removeVietnameseDiacritics = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

import type { 
  MapProvinceData, 
  MapDistrictData, 
  MapWardData, 
  MapDetailData 
} from '../types';

const normalizeMapDataArray = <T extends {name: string; avg_price: number; price_change_percent: number}>(payload: any): T[] => {
  const source = extractArrayPayload<any>(payload);
  return source.map((item: any) => ({
    name: String(item?.name ?? ''),
    avg_price: Number(item?.avg_price ?? 0),
    price_change_percent: Number(item?.price_change_percent ?? 0),
  })) as T[];
};

const normalizeMapDetail = (payload: any): MapDetailData => {
  const source = extractObjectPayload<any>(payload);
  return {
    avg_price: Number(source?.avg_price ?? 0),
    price_change_percent: Number(source?.price_change_percent ?? 0),
    monthly_prices: extractArrayPayload<any>(source?.monthly_prices ?? []).map((item: any) => ({
      month: Number(item?.month ?? 0),
      price: Number(item?.price ?? 0),
    })),
  };
};

export const fetchMapProvinces = async (): Promise<MapProvinceData[]> => {
  const response = await apiClient.get<any>(API_ENDPOINTS.MAP.PROVINCES);
  if (!response.success) throw new Error(response.error || 'Cannot fetch provinces');
  return normalizeMapDataArray<MapProvinceData>(response.data);
};

export const fetchMapDistricts = async (province_name: string): Promise<MapDistrictData[]> => {
  const response = await apiClient.get<any>(API_ENDPOINTS.MAP.DISTRICTS(province_name));
  if (!response.success) throw new Error(response.error || 'Cannot fetch districts');
  return normalizeMapDataArray<MapDistrictData>(response.data);
};

export const fetchMapWards = async (district_name: string): Promise<MapWardData[]> => {
  const response = await apiClient.get<any>(API_ENDPOINTS.MAP.WARDS(district_name));
  if (!response.success) throw new Error(response.error || 'Cannot fetch wards');
  return normalizeMapDataArray<MapWardData>(response.data);
};

export const fetchMapDetail = async (name: string): Promise<MapDetailData> => {
  const response = await apiClient.get<any>(API_ENDPOINTS.MAP.DETAIL(name));
  if (!response.success) throw new Error(response.error || 'Cannot fetch map detail');
  return normalizeMapDetail(response.data);
};


const extractValuationPayload = (payload: any): ValuationResult | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const source =
    payload.valuationResult ??
    payload.valuation ??
    payload.result ??
    payload.estimate ??
    payload.data ??
    payload;

  if (!source || typeof source !== 'object') {
    return null;
  }

  const minPrice = toNumber(source.minPrice ?? source.min_price ?? source.lowPrice);
  const maxPrice = toNumber(source.maxPrice ?? source.max_price ?? source.highPrice);
  const avgPrice = toNumber(
    source.avgPrice ?? source.avg_price ?? source.estimatedPrice ?? source.estimatePrice
  );
  const confidence = toNumber(
    source.confidence ?? source.confidenceScore ?? source.confidence_score
  );
  const pricePerM2 = toNumber(
    source.pricePerM2 ?? source.price_per_m2 ?? source.unitPrice
  );

  const rawTrend =
    source.areaTrend ??
    source.trend ??
    source.priceTrend ??
    source.marketTrend ??
    [];

  const areaTrend = Array.isArray(rawTrend)
    ? rawTrend
        .map((item: any) => ({
          month: String(item?.month ?? item?.label ?? item?.name ?? ''),
          price: toNumber(item?.price ?? item?.value),
        }))
        .filter((item) => item.month)
    : [];

  if (!minPrice && !maxPrice && !avgPrice && !pricePerM2) {
    return null;
  }

  return {
    minPrice,
    maxPrice,
    avgPrice,
    confidence,
    pricePerM2,
    areaTrend,
  };
};


// Fetch all projects
export const fetchProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/projects`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data;
    }
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    if (data.projects && Array.isArray(data.projects)) {
      return data.projects;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};

// Fetch single project by ID
export const fetchProjectById = async (id: string): Promise<Project | null> => {
  try {
    const response = await fetch(`${BACKEND_URL}/projects/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error(`Error fetching project ${id}:`, error);
    throw error;
  }
};

// Create new project
export const createProject = async (projectData: Omit<Project, 'id'>): Promise<Project> => {
  try {
    const response = await fetch(`${BACKEND_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

// Update project
export const updateProject = async (id: string, projectData: Partial<Project>): Promise<Project> => {
  try {
    const response = await fetch(`${BACKEND_URL}/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error(`Error updating project ${id}:`, error);
    throw error;
  }
};

// Delete project
export const deleteProject = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/projects/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting project ${id}:`, error);
    throw error;
  }
};

export const calculateValuation = async (
  payload: ValuationRequestPayload
): Promise<ValuationResult> => {
  const response = await apiClient.post<any>(API_ENDPOINTS.VALUATION.ESTIMATE, payload);

  if (!response.success) {
    throw new Error(response.error || response.message || 'Không thể định giá bất động sản');
  }

  const valuation = extractValuationPayload(response.data);

  if (!valuation) {
    throw new Error('Dữ liệu định giá trả về không đúng định dạng');
  }

  return valuation;
};

export const fetchNearbyAveragePricePerM2ByAddress = async (
  address: string
): Promise<NearbyAveragePriceByAddressResult> => {
  // Normalize address to remove Vietnamese diacritics
  const normalizedAddress = removeVietnameseDiacritics(address);

  const response = await apiClient.post<any>(
    API_ENDPOINTS.HOMES.NEARBY_AVERAGE_PRICE_PER_M2_BY_ADDRESS,
    { address: normalizedAddress }
  );

  if (!response.success) {
    throw new Error(
      response.error ||
        response.message ||
        'Không thể lấy dữ liệu giá trung bình theo địa chỉ'
    );
  }

  const result = extractNearbyAveragePayload(response.data);

  if (!result) {
    throw new Error('Dữ liệu biểu đồ trả về không đúng định dạng');
  }

  return result;
};

export const fetchProvinces = async (): Promise<AdministrativeUnit[]> => {
  const response = await apiClient.get<any>('api/v1/provinces');

  if (!response.success) {
    throw new Error(response.error || response.message || 'Không thể lấy danh sách tỉnh/thành');
  }

  return extractArrayPayload<any>(response.data)
    .map(normalizeAdministrativeUnit)
    .filter((item) => item.id && item.name);
};

export const fetchDistrictsByProvince = async (
  provinceId: string
): Promise<AdministrativeUnit[]> => {
  const response = await apiClient.get<any>(`api/v1/provinces/${provinceId}/districts`);

  if (!response.success) {
    throw new Error(response.error || response.message || 'Không thể lấy danh sách quận/huyện');
  }

  return extractArrayPayload<any>(response.data)
    .map(normalizeAdministrativeUnit)
    .filter((item) => item.id && item.name);
};

export const fetchWardsByDistrict = async (
  districtId: string
): Promise<AdministrativeUnit[]> => {
  const response = await apiClient.get<any>(`/api/v1/districts/${districtId}/wards`);

  if (!response.success) {
    throw new Error(response.error || response.message || 'Không thể lấy danh sách phường/xã');
  }

  return extractArrayPayload<any>(response.data)
    .map(normalizeAdministrativeUnit)
    .filter((item) => item.id && item.name);
};

export const fetchProvinceAveragePrice = async (
  provinceId: string,
  typeId?: string
): Promise<AvgPriceByLocationResult> => {
  const endpoint = typeId
    ? `api/v1/provinces/${provinceId}/avg-price-per-m2?type_id=${encodeURIComponent(typeId)}`
    : `api/v1/provinces/${provinceId}/avg-price-per-m2`;
  const response = await apiClient.get<any>(endpoint);

  if (!response.success) {
    throw new Error(response.error || response.message || 'Không thể lấy giá trung bình tỉnh/thành');
  }

  const result = normalizeAvgPricePayload(response.data);

  if (!result) {
    throw new Error('Dữ liệu giá trung bình tỉnh/thành không đúng định dạng');
  }

  return result;
};

export const fetchDistrictAveragePrice = async (
  districtId: string,
  typeId?: string
): Promise<AvgPriceByLocationResult> => {
  const endpoint = typeId
    ? `/api/v1/districts/${districtId}/avg-price-per-m2?type_id=${encodeURIComponent(typeId)}`
    : `/api/v1/districts/${districtId}/avg-price-per-m2`;
  const response = await apiClient.get<any>(endpoint);

  if (!response.success) {
    throw new Error(response.error || response.message || 'Không thể lấy giá trung bình quận/huyện');
  }

  const result = normalizeAvgPricePayload(response.data);

  if (!result) {
    throw new Error('Dữ liệu giá trung bình quận/huyện không đúng định dạng');
  }

  return result;
};

export const fetchWardAveragePrice = async (
  wardId: string,
  typeId?: string
): Promise<AvgPriceByLocationResult> => {
  const endpoint = typeId
    ? `/api/v1/wards/${wardId}/avg-price-per-m2?type_id=${encodeURIComponent(typeId)}`
    : `/api/v1/wards/${wardId}/avg-price-per-m2`;
  const response = await apiClient.get<any>(endpoint);

  if (!response.success) {
    throw new Error(response.error || response.message || 'Không thể lấy giá trung bình phường/xã');
  }

  const result = normalizeAvgPricePayload(response.data);

  if (!result) {
    throw new Error('Dữ liệu giá trung bình phường/xã không đúng định dạng');
  }

  return result;
};

export const fetchProjectsByDistrict = async (
  districtId: string
): Promise<ProjectListByLocationResult> => {
  const response = await apiClient.get<any>(`api/v1/projects/district/${districtId}`);

  if (!response.success) {
    throw new Error(response.error || response.message || 'Không thể lấy danh sách dự án theo quận/huyện');
  }

  const source = extractObjectPayload<any>(response.data);

  if (!source) {
    return { total: 0, projects: [] };
  }

  const projects = extractArrayPayload<any>(source.projects ?? source).map(normalizeProjectPayload);

  return {
    total: Number(source.total ?? projects.length),
    projects,
  };
};

export const fetchProjectsByWard = async (
  wardId: string
): Promise<ProjectListByLocationResult> => {
  const response = await apiClient.get<any>(`api/v1/projects/ward/${wardId}`);

  if (!response.success) {
    throw new Error(response.error || response.message || 'Không thể lấy danh sách dự án theo phường/xã');
  }

  const source = extractObjectPayload<any>(response.data);

  if (!source) {
    return { total: 0, projects: [] };
  }

  const projects = extractArrayPayload<any>(source.projects ?? source).map(normalizeProjectPayload);

  return {
    total: Number(source.total ?? projects.length),
    projects,
  };
};
