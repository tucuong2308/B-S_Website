import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Map, Milestone, Building, Maximize, Bed, Bath, Search, Database, TrendingUp, Cpu, CheckCircle, ChevronRight, Crosshair, Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AddressPickerMap from '../components/AddressPickerMap';
import ProvinceHeatMapModal, { type HeatPoint } from '../components/ProvinceHeatMapModal';
import { fetchNearbyAveragePricePerM2ByAddress } from '../services/api';
import type { GeoCoordinates, HomeFormData } from '../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const DEFAULT_MAP_CENTER: [number, number] = [10.7769, 106.7009];

interface Province {
  code: string;
  name: string;
}

interface MapboxSuggestion {
  place_name: string;
  text: string;
  center: [number, number];
  id: string;
  context?: Array<{ id: string; text: string }>;
}

interface ReverseGeocodeResult {
  fullAddress: string;
  coordinates: GeoCoordinates;
}

interface FeaturedAreaHotspot {
  id: string;
  label: string;
  address: string;
  lat: number;
  lon: number;
  fallbackPricePerM2: number;
}

interface FeaturedArea {
  name: string;
  count: string;
  img: string;
  center: [number, number];
  hotspots: FeaturedAreaHotspot[];
}

const featuredAreas: FeaturedArea[] = [
  {
    name: 'TP. Hồ Chí Minh',
    count: '12,450+',
    img: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=2070&auto=format&fit=crop',
    center: [10.7769, 106.7009],
    hotspots: [
      { id: 'hcm-q1', label: 'Quận 1', address: 'Quận 1, TP. Hồ Chí Minh', lat: 10.7766, lon: 106.7009, fallbackPricePerM2: 225000000 },
      { id: 'hcm-q2', label: 'TP. Thủ Đức', address: 'Thủ Đức, TP. Hồ Chí Minh', lat: 10.8451, lon: 106.7759, fallbackPricePerM2: 132000000 },
      { id: 'hcm-q7', label: 'Quận 7', address: 'Quận 7, TP. Hồ Chí Minh', lat: 10.7342, lon: 106.7218, fallbackPricePerM2: 118000000 },
      { id: 'hcm-tanbinh', label: 'Tân Bình', address: 'Tân Bình, TP. Hồ Chí Minh', lat: 10.8015, lon: 106.652, fallbackPricePerM2: 142000000 },
    ],
  },
  {
    name: 'Hà Nội',
    count: '10,120+',
    img: 'https://media-cdn-v2.laodong.vn/Storage/NewsPortal/2022/8/23/1084256/294774680_2919476031.jpg',
    center: [21.0285, 105.8542],
    hotspots: [
      { id: 'hn-hoankiem', label: 'Hoàn Kiếm', address: 'Hoàn Kiếm, Hà Nội', lat: 21.0281, lon: 105.8522, fallbackPricePerM2: 310000000 },
      { id: 'hn-caugiay', label: 'Cầu Giấy', address: 'Cầu Giấy, Hà Nội', lat: 21.0368, lon: 105.7906, fallbackPricePerM2: 185000000 },
      { id: 'hn-namtuliem', label: 'Nam Từ Liêm', address: 'Nam Từ Liêm, Hà Nội', lat: 21.0054, lon: 105.7469, fallbackPricePerM2: 145000000 },
      { id: 'hn-hadong', label: 'Hà Đông', address: 'Hà Đông, Hà Nội', lat: 20.9714, lon: 105.7788, fallbackPricePerM2: 108000000 },
    ],
  },
  {
    name: 'Đà Nẵng',
    count: '5,630+',
    img: 'https://cdn-media.sforum.vn/storage/app/media/ctvseo_MH/%E1%BA%A3nh%20%C4%91%E1%BA%B9p%20%C4%91%C3%A0%20n%E1%BA%B5ng/anh-dep-da-nang-42.jpg',
    center: [16.0544, 108.2022],
    hotspots: [
      { id: 'dn-haichau', label: 'Hải Châu', address: 'Hải Châu, Đà Nẵng', lat: 16.0546, lon: 108.2203, fallbackPricePerM2: 118000000 },
      { id: 'dn-thanhkhe', label: 'Thanh Khê', address: 'Thanh Khê, Đà Nẵng', lat: 16.0678, lon: 108.1916, fallbackPricePerM2: 92000000 },
      { id: 'dn-nguhanhson', label: 'Ngũ Hành Sơn', address: 'Ngũ Hành Sơn, Đà Nẵng', lat: 16.0045, lon: 108.2641, fallbackPricePerM2: 105000000 },
      { id: 'dn-lienchieu', label: 'Liên Chiểu', address: 'Liên Chiểu, Đà Nẵng', lat: 16.0759, lon: 108.1498, fallbackPricePerM2: 68000000 },
    ],
  },
  {
    name: 'Bình Dương',
    count: '3,210+',
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    center: [10.9804, 106.6519],
    hotspots: [
      { id: 'bd-thudau1', label: 'Thủ Dầu Một', address: 'Thủ Dầu Một, Bình Dương', lat: 10.9804, lon: 106.6519, fallbackPricePerM2: 82000000 },
      { id: 'bd-dian', label: 'Dĩ An', address: 'Dĩ An, Bình Dương', lat: 10.9068, lon: 106.7694, fallbackPricePerM2: 93000000 },
      { id: 'bd-thuanan', label: 'Thuận An', address: 'Thuận An, Bình Dương', lat: 10.9052, lon: 106.713, fallbackPricePerM2: 88000000 },
      { id: 'bd-bencat', label: 'Bến Cát', address: 'Bến Cát, Bình Dương', lat: 11.1289, lon: 106.6115, fallbackPricePerM2: 54000000 },
    ],
  },
];

const extractRepresentativePrice = (payload: any, fallbackPricePerM2: number) => {
  const overall = payload?.overall_average_price_per_m2_12_months;

  if (typeof overall === 'number' && Number.isFinite(overall) && overall > 0) {
    return overall;
  }

  const monthlyAverages = Array.isArray(payload?.monthly_prices) ? payload.monthly_prices : [];
  const validPrices = monthlyAverages
    .map((item: any) => Number(item?.average_price_per_m2))
    .filter((price: number) => Number.isFinite(price) && price > 0);

  if (validPrices.length > 0) {
    return validPrices.reduce((sum: number, price: number) => sum + price, 0) / validPrices.length;
  }

  return fallbackPricePerM2;
};

// Helper function to normalize Vietnamese text (remove prefixes)
const normalizeVietnamese = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/^(thành phố|tỉnh|tp\.?|thị phố)\s+/gi, '')
    .replace(/^(quận|huyện|thị xã)\s+/gi, '')
    .replace(/^(phường|xã|thị trấn)\s+/gi, '')
    .trim();
};

const normalizeVietnameseKey = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(thanh pho|tinh|tp|thi xa|thi tran)\s+/i, '')
    .replace(/^(quan|q|huyen|h|thi xa|tx|thanh pho|tp)\s+/i, '')
    .replace(/^(phuong|p|xa|x|thi tran|tt)\s+/i, '')
    .replace(/^(duong|dg|so nha|hem|ngo|ngach)\s+/i, '')
    .trim();
};

// Helper function to fuzzy match normalized Vietnamese names
const vietnameseFuzzyMatch = (text1: string, text2: string): boolean => {
  const norm1 = normalizeVietnameseKey(text1);
  const norm2 = normalizeVietnameseKey(text2);
  return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
};

const buildUniqueCandidates = (...groups: Array<Array<string | undefined>>) => {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const group of groups) {
    for (const value of group) {
      const trimmed = value?.trim();

      if (!trimmed) {
        continue;
      }

      const normalized = normalizeVietnameseKey(trimmed);

      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      results.push(trimmed);
    }
  }

  return results;
};

const extractMapboxAddressParts = (suggestion: MapboxSuggestion) => {
  const segments = suggestion.place_name
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

  const parts = {
    provinceName: '',
    districtName: '',
    wardName: '',
    streetName: segments[0] || suggestion.text || '',
  };

  if (suggestion.context?.length) {
    for (const contextItem of suggestion.context) {
      if (contextItem.id.startsWith('region.')) {
        parts.provinceName = contextItem.text;
      } else if (contextItem.id.startsWith('district.')) {
        parts.districtName = contextItem.text;
      } else if (
        contextItem.id.startsWith('place.') ||
        contextItem.id.startsWith('locality.') ||
        contextItem.id.startsWith('neighborhood.')
      ) {
        parts.wardName = contextItem.text;
      }
    }
  }

  if (!parts.provinceName && segments.length > 0) {
    parts.provinceName = segments[segments.length - 1];
  }

  if (!parts.districtName && segments.length > 1) {
    parts.districtName = segments[segments.length - 2];
  }

  if (!parts.wardName && segments.length > 2) {
    parts.wardName = segments[segments.length - 3];
  }

  const contextValues = suggestion.context ?? [];
  const provinceCandidates = buildUniqueCandidates(
    contextValues
      .filter((contextItem) => contextItem.id.startsWith('region.'))
      .map((contextItem) => contextItem.text),
    [parts.provinceName],
    segments.slice(-2)
  );
  const districtCandidates = buildUniqueCandidates(
    contextValues
      .filter(
        (contextItem) =>
          contextItem.id.startsWith('district.') ||
          contextItem.id.startsWith('place.') ||
          contextItem.id.startsWith('locality.')
      )
      .map((contextItem) => contextItem.text),
    [parts.districtName],
    segments.slice(Math.max(segments.length - 3, 0), Math.max(segments.length - 1, 0))
  );
  const wardCandidates = buildUniqueCandidates(
    contextValues
      .filter(
        (contextItem) =>
          contextItem.id.startsWith('locality.') ||
          contextItem.id.startsWith('neighborhood.') ||
          contextItem.id.startsWith('place.')
      )
      .map((contextItem) => contextItem.text),
    [parts.wardName],
    segments.slice(Math.max(segments.length - 4, 0), Math.max(segments.length - 2, 0))
  );

  return {
    ...parts,
    provinceCandidates,
    districtCandidates,
    wardCandidates,
  };
};

const findProvinceCode = (
  provinceList: Province[],
  provinceLookup: Record<string, string>,
  candidateName: string
): string => {
  if (!candidateName) {
    return '';
  }

  for (const [provinceName, provinceCode] of Object.entries(provinceLookup)) {
    if (vietnameseFuzzyMatch(provinceName, candidateName)) {
      return provinceCode;
    }
  }

  const matchedProvince = provinceList.find((province) =>
    vietnameseFuzzyMatch(province.name, candidateName)
  );

  return matchedProvince ? String(matchedProvince.code) : '';
};

const findProvinceCodeFromCandidates = (
  provinceList: Province[],
  provinceLookup: Record<string, string>,
  candidateNames: string[]
): string => {
  for (const candidateName of candidateNames) {
    const foundCode = findProvinceCode(provinceList, provinceLookup, candidateName);

    if (foundCode) {
      return foundCode;
    }
  }

  return '';
};

const findAdministrativeCode = <
  T extends {
    code: string;
    name: string;
  },
>(
  options: T[],
  candidateNames: string[]
): string => {
  for (const candidateName of candidateNames) {
    const matched = options.find((option) => vietnameseFuzzyMatch(option.name, candidateName));

    if (matched) {
      return String(matched.code);
    }
  }

  return '';
};

const extractStreetFromAddress = (address: Record<string, string> | undefined): string => {
  if (!address) {
    return '';
  }

  const streetParts = [
    address.house_number,
    address.road,
    address.residential,
    address.hamlet,
    address.neighbourhood,
  ].filter(Boolean);

  return streetParts.join(' ').trim();
};

const geocodeAddress = async (address: string): Promise<GeoCoordinates | null> => {
  const trimmedAddress = address.trim();

  if (!trimmedAddress) {
    return null;
  }

  if (MAPBOX_TOKEN) {
    const encodedQuery = encodeURIComponent(trimmedAddress);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=vi&limit=1`
    );

    if (response.ok) {
      const payload = await response.json();
      const feature = Array.isArray(payload?.features) ? payload.features[0] : null;

      if (Array.isArray(feature?.center) && feature.center.length >= 2) {
        return {
          lat: Number(feature.center[1]),
          lon: Number(feature.center[0]),
        };
      }
    }
  }

  const params = new URLSearchParams({
    q: trimmedAddress,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'vn',
  });

  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`);

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const result = Array.isArray(payload) ? payload[0] : null;

  if (!result?.lat || !result?.lon) {
    return null;
  }

  return {
    lat: Number(result.lat),
    lon: Number(result.lon),
  };
};

const reverseGeocodeCoordinates = async (
  coordinates: GeoCoordinates
): Promise<ReverseGeocodeResult | null> => {
  if (MAPBOX_TOKEN) {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lon},${coordinates.lat}.json?access_token=${MAPBOX_TOKEN}&language=vi&limit=1`
    );

    if (response.ok) {
      const payload = await response.json();
      const feature = Array.isArray(payload?.features) ? payload.features[0] : null;

      if (feature) {
        return {
          fullAddress: feature.place_name || `${coordinates.lat}, ${coordinates.lon}`,
          coordinates,
        };
      }
    }
  }

  const params = new URLSearchParams({
    lat: String(coordinates.lat),
    lon: String(coordinates.lon),
    format: 'jsonv2',
    'accept-language': 'vi',
    zoom: '18',
  });

  const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`);

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const address = payload?.address as Record<string, string> | undefined;
  return {
    fullAddress: payload?.display_name || `${coordinates.lat}, ${coordinates.lon}`,
    coordinates,
  };
};

export default function Home() {
  const navigate = useNavigate();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState<HomeFormData>({
    address: '',
    city: '',
    district: '',
    ward: '',
    street: '',
    coordinates: null,
    type: '',
    area: '',
    bedrooms: '',
    bathrooms: ''
  });
  
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapPickerCenter, setMapPickerCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [mapPickerPosition, setMapPickerPosition] = useState<[number, number] | null>(null);
  const [mapPickerAddress, setMapPickerAddress] = useState('');
  const [isResolvingMapAddress, setIsResolvingMapAddress] = useState(false);
  const [mapPickerError, setMapPickerError] = useState('');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isSearchingMapLocation, setIsSearchingMapLocation] = useState(false);
  const [selectedFeaturedArea, setSelectedFeaturedArea] = useState<FeaturedArea | null>(null);
  const [heatMapPoints, setHeatMapPoints] = useState<HeatPoint[]>([]);
  const [isHeatMapOpen, setIsHeatMapOpen] = useState(false);
  const [isLoadingHeatMap, setIsLoadingHeatMap] = useState(false);
  const [heatMapError, setHeatMapError] = useState('');

  const fetchMapboxSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!MAPBOX_TOKEN) {
      console.log('Mapbox token not configured');
      return;
    }

    try {
      setIsLoading(true);
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=vi&limit=5`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log('Mapbox API error');
        return;
      }

      const data = await response.json();
      const results: MapboxSuggestion[] = data.features.map((feature: any) => ({
        place_name: feature.place_name,
        text: feature.text,
        center: feature.center,
        id: feature.id,
        context: feature.context
      }));

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.log('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressChange = (val: string) => {
    setFormData({ ...formData, address: val, coordinates: null });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.length > 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchMapboxSuggestions(val);
      }, 400);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: MapboxSuggestion) => {
    applyResolvedAddress({
      fullAddress: suggestion.place_name,
      coordinates: {
        lat: suggestion.center[1],
        lon: suggestion.center[0],
      },
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const applyResolvedAddress = ({
    fullAddress,
    coordinates,
  }: ReverseGeocodeResult) => {
    setFormData((prev) => ({
      ...prev,
      address: fullAddress,
      city: '',
      district: '',
      ward: '',
      street: '',
      coordinates,
      type: prev.type,
      area: prev.area,
      bedrooms: prev.bedrooms,
      bathrooms: prev.bathrooms,
    }));
  };

  const openMapPicker = async () => {
    setIsMapPickerOpen(true);
    setMapPickerError('');

    if (formData.coordinates) {
      const initialPosition: [number, number] = [formData.coordinates.lat, formData.coordinates.lon];
      setMapPickerCenter(initialPosition);
      setMapPickerPosition(initialPosition);
      setMapPickerAddress(formData.address);
      setMapSearchQuery(formData.address);
      return;
    }

    if (!formData.address.trim()) {
      setMapPickerCenter(DEFAULT_MAP_CENTER);
      setMapPickerPosition(null);
      setMapPickerAddress('');
      setMapSearchQuery('');
      return;
    }

    setIsResolvingMapAddress(true);

    try {
      const coordinates = await geocodeAddress(formData.address);

      if (!coordinates) {
        setMapPickerCenter(DEFAULT_MAP_CENTER);
        setMapPickerPosition(null);
        setMapPickerAddress('');
        setMapPickerError('Chưa xác định được vị trí hiện tại, bạn hãy bấm trực tiếp lên bản đồ.');
        return;
      }

      const nextPosition: [number, number] = [coordinates.lat, coordinates.lon];
      setMapPickerCenter(nextPosition);
      setMapPickerPosition(nextPosition);
      setMapPickerAddress(formData.address);
      setMapSearchQuery(formData.address);
    } catch (error) {
      setMapPickerCenter(DEFAULT_MAP_CENTER);
      setMapPickerPosition(null);
      setMapPickerAddress('');
      setMapSearchQuery(formData.address);
      setMapPickerError(
        error instanceof Error
          ? error.message
          : 'Không thể tải vị trí ban đầu từ địa chỉ hiện tại.'
      );
    } finally {
      setIsResolvingMapAddress(false);
    }
  };

  const handleMapLocationSelect = async (position: [number, number]) => {
    setMapPickerCenter(position);
    setMapPickerPosition(position);
    setMapPickerAddress('');
    setMapPickerError('');
    setIsResolvingMapAddress(true);

    try {
      const resolvedAddress = await reverseGeocodeCoordinates({
        lat: position[0],
        lon: position[1],
      });

      if (!resolvedAddress) {
        setMapPickerError('Không thể lấy địa chỉ từ điểm đã chọn. Bạn hãy thử vị trí khác.');
        return;
      }

      setMapPickerAddress(resolvedAddress.fullAddress);
    } catch (error) {
      setMapPickerError(
        error instanceof Error ? error.message : 'Không thể lấy địa chỉ từ điểm đã chọn.'
      );
    } finally {
      setIsResolvingMapAddress(false);
    }
  };

  const handleMapSearch = async () => {
    const query = mapSearchQuery.trim();

    if (!query) {
      setMapPickerError('Nhập địa chỉ hoặc khu vực để tìm trên bản đồ.');
      return;
    }

    setMapPickerError('');
    setIsSearchingMapLocation(true);

    try {
      const coordinates = await geocodeAddress(query);

      if (!coordinates) {
        setMapPickerError('Không tìm thấy vị trí phù hợp trên bản đồ.');
        return;
      }

      const nextPosition: [number, number] = [coordinates.lat, coordinates.lon];
      setMapPickerCenter(nextPosition);
      setMapPickerPosition(nextPosition);
      setMapPickerAddress(query);
    } catch (error) {
      setMapPickerError(
        error instanceof Error ? error.message : 'Không thể tìm vị trí trên bản đồ.'
      );
    } finally {
      setIsSearchingMapLocation(false);
    }
  };

  const confirmMapPickerAddress = async () => {
    if (!mapPickerPosition) {
      setMapPickerError('Bạn hãy chọn một điểm trên bản đồ trước.');
      return;
    }

    setMapPickerError('');
    setIsResolvingMapAddress(true);

    try {
      const resolvedAddress = await reverseGeocodeCoordinates({
        lat: mapPickerPosition[0],
        lon: mapPickerPosition[1],
      });

      if (!resolvedAddress) {
        setMapPickerError('Không thể xác nhận địa chỉ tại điểm đã chọn.');
        return;
      }

      applyResolvedAddress(resolvedAddress);
      setMapPickerAddress(resolvedAddress.fullAddress);
      setIsMapPickerOpen(false);
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (error) {
      setMapPickerError(
        error instanceof Error ? error.message : 'Không thể xác nhận địa chỉ từ bản đồ.'
      );
    } finally {
      setIsResolvingMapAddress(false);
    }
  };

  const openFeaturedAreaHeatMap = async (area: FeaturedArea) => {
    setSelectedFeaturedArea(area);
    setIsHeatMapOpen(true);
    setIsLoadingHeatMap(true);
    setHeatMapError('');
    setHeatMapPoints(
      area.hotspots.map((hotspot) => ({
        id: hotspot.id,
        label: hotspot.label,
        address: hotspot.address,
        lat: hotspot.lat,
        lon: hotspot.lon,
        pricePerM2: hotspot.fallbackPricePerM2,
        isEstimated: true,
      }))
    );

    try {
      const resolvedPoints = await Promise.all(
        area.hotspots.map(async (hotspot) => {
          try {
            const response = await fetchNearbyAveragePricePerM2ByAddress(hotspot.address);
            return {
              id: hotspot.id,
              label: hotspot.label,
              address: hotspot.address,
              lat: hotspot.lat,
              lon: hotspot.lon,
              pricePerM2: extractRepresentativePrice(response, hotspot.fallbackPricePerM2),
              isEstimated: false,
            } as HeatPoint;
          } catch {
            return {
              id: hotspot.id,
              label: hotspot.label,
              address: hotspot.address,
              lat: hotspot.lat,
              lon: hotspot.lon,
              pricePerM2: hotspot.fallbackPricePerM2,
              isEstimated: true,
            } as HeatPoint;
          }
        })
      );

      setHeatMapPoints(resolvedPoints);
      if (resolvedPoints.every((point) => point.isEstimated)) {
        setHeatMapError('Chưa lấy được dữ liệu trực tiếp từ API, đang hiển thị giá ước tính tham khảo.');
      }
    } finally {
      setIsLoadingHeatMap(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.address-container')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleValuate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(formData.area) <= 0) {
      alert("Diện tích phải lớn hơn 0 m²");
      return;
    }

    const address = formData.address.trim();

    if (!address) {
      alert("Vui lòng nhập địa chỉ để phân tích định giá");
      return;
    }

    try {
      setIsSubmitting(true);
      const marketAnalysisResult = await fetchNearbyAveragePricePerM2ByAddress(address);

      // Check if API returned valid data with monthly_prices
      if (!marketAnalysisResult || !Array.isArray(marketAnalysisResult.monthly_prices) || marketAnalysisResult.monthly_prices.length === 0) {
        alert("Dữ liệu chưa đủ. Vui lòng thử lại với địa chỉ khác hoặc quay lại sau.");
        return;
      }

      navigate('/result', {
        state: {
          formData,
          marketAnalysisResult,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể phân tích dữ liệu định giá lúc này';

      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNotLand = formData.type && formData.type !== 'land';

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="relative min-h-[720px] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'linear-gradient(rgba(16, 25, 34, 0.75), rgba(16, 25, 34, 0.75)), url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop")',
            }}
          />
          
          <div className="relative z-10 flex flex-col gap-4 max-w-[800px] mb-10">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white text-4xl font-black leading-tight tracking-tight md:text-6xl"
            >
              Định giá bất động sản chính xác trong giây lát
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-slate-200 text-base md:text-xl font-medium max-w-2xl mx-auto"
            >
              Sử dụng công nghệ AI tiên tiến để phân tích hàng triệu dữ liệu thị trường và đưa ra giá trị thực cho ngôi nhà của bạn.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 w-full max-w-[900px] bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-2xl text-left"
          >
            <form onSubmit={handleValuate} className="space-y-6">
              {/* Search Address */}
              <div className="relative address-container">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tìm kiếm địa chỉ</label>
                <div className="flex gap-3">
                  <div className="flex min-w-0 flex-1 items-center px-4 gap-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                    <MapPin className="text-slate-400" size={20} />
                    <input 
                      className="w-full py-3.5 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm" 
                      placeholder="Nhập địa chỉ hoặc chọn trên bản đồ..." 
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      onFocus={() => formData.address.length > 2 && setShowSuggestions(true)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={openMapPicker}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Crosshair size={16} />
                    Mở bản đồ
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-none transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin size={16} className="text-primary shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-200">{suggestion.place_name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Loại hình <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select 
                    required
                    className="w-full py-3.5 pl-12 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="">Chọn loại hình</option>
                    <option value="house">Nhà phố</option>
                    <option value="apartment">Căn hộ</option>
                    <option value="land">Đất nền</option>
                    <option value="villa">Biệt thự</option>
                  </select>
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
                </div>
              </div>

              {/* Area */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Diện tích (m²) <span className="text-red-500">*</span></label>
                <div className="flex items-center px-4 gap-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <Maximize className="text-slate-400" size={20} />
                  <input 
                    required
                    className="w-full py-3.5 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm" 
                    placeholder="100" 
                    type="number"
                    min="1"
                    value={formData.area}
                    onChange={(e) => setFormData({...formData, area: e.target.value})}
                  />
                  <span className="text-slate-400 text-sm font-bold">m²</span>
                </div>
              </div>

              {/* Conditional Bedrooms & Bathrooms */}
              {isNotLand && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Số phòng ngủ</label>
                    <div className="flex items-center px-4 gap-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                      <Bed className="text-slate-400" size={20} />
                      <input 
                        className="w-full py-3.5 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm" 
                        placeholder="0" 
                        type="number"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Số phòng vệ sinh</label>
                    <div className="flex items-center px-4 gap-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                      <Bath className="text-slate-400" size={20} />
                      <input 
                        className="w-full py-3.5 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm" 
                        placeholder="0" 
                        type="number"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1e036e] text-white py-4 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1e036e]/20"
                >
                  <Search size={24} />
                  <span>{isSubmitting ? 'Đang phân tích...' : 'Phân tích định giá'}</span>
                </button>
              </div>
            </form>
          </motion.div>

          {isMapPickerOpen && (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-5xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Chọn địa chỉ trên bản đồ</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Bấm vào bản đồ để chọn vị trí chính xác của bất động sản. Bạn có thể tìm kiếm địa chỉ hoặc khu vực để nhanh chóng định vị trên bản đồ. Sau khi chọn xong, nhấn "Xác nhận" để áp dụng địa chỉ đã chọn vào form.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(false)}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="h-[480px] overflow-hidden rounded-2xl">
                    <AddressPickerMap
                      center={mapPickerCenter}
                      selectedPosition={mapPickerPosition}
                      onSelect={handleMapLocationSelect}
                    />
                  </div>

                  <div className="flex flex-col justify-between gap-5">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          Tìm vị trí
                        </p>
                        <div className="mt-3 flex gap-3">
                          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-800">
                            <Search size={16} className="text-slate-400" />
                            <input
                              className="w-full py-3 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                              placeholder="Nhập địa chỉ hoặc khu vực "
                              type="text"
                              value={mapSearchQuery}
                              onChange={(e) => setMapSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleMapSearch();
                                }
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleMapSearch}
                            disabled={isSearchingMapLocation}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700"
                          >
                            {isSearchingMapLocation ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            Tìm
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          Hướng dẫn
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          Kéo và zoom để tìm khu vực, sau đó bấm vào đúng vị trí nhà hoặc đất. Hệ thống sẽ tự động lấy lại địa chỉ để điền vào form.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          Vị trí đã chọn
                        </p>
                        <div className="mt-3 space-y-3 text-sm">
                          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                            <p className="font-semibold text-slate-700 dark:text-slate-200">Tọa độ</p>
                            <p className="mt-1 text-slate-500 dark:text-slate-400">
                              {mapPickerPosition
                                ? `${mapPickerPosition[0].toFixed(6)}, ${mapPickerPosition[1].toFixed(6)}`
                                : 'Chưa chọn vị trí'}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                            <p className="font-semibold text-slate-700 dark:text-slate-200">Địa chỉ nhận diện</p>
                            <p className="mt-1 leading-6 text-slate-500 dark:text-slate-400">
                              {isResolvingMapAddress ? 'Đang lấy địa chỉ từ bản đồ...' : mapPickerAddress || 'Chưa có địa chỉ để hiển thị'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {mapPickerError && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                          {mapPickerError}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setIsMapPickerOpen(false)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={confirmMapPickerAddress}
                        disabled={isResolvingMapAddress}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isResolvingMapAddress ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                        Xác nhận địa chỉ này
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="relative z-10 flex flex-wrap justify-center gap-6 mt-8 text-white/80 text-sm font-medium">
            <div className="flex items-center gap-1">
              <CheckCircle size={16} className="text-green-400" />
              <span>100% Miễn phí</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle size={16} className="text-green-400" />
              <span>Dữ liệu thực tế</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle size={16} className="text-green-400" />
              <span>Kết quả tức thì</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-[1200px] mx-auto w-full px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-3">Tại sao chọn PropVal?</h2>
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Công nghệ giúp minh bạch hóa thị trường</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Database, title: 'Dữ liệu chính xác', desc: 'Kho dữ liệu khổng lồ được cập nhật liên tục từ hàng nghìn giao dịch thực tế mỗi ngày.' },
              { icon: TrendingUp, title: 'Phân tích chuyên sâu', desc: 'Không chỉ đưa ra giá, chúng tôi cung cấp biểu đồ xu hướng và so sánh chi tiết với khu vực xung quanh.' },
              { icon: Cpu, title: 'AI Thông minh', desc: 'Thuật toán Machine Learning tự học hỏi để đưa ra mức giá sát với thị trường nhất theo thời gian thực.' }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="text-primary" size={28} />
                </div>
                <h4 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{feature.title}</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Featured Areas */}
        <section className="max-w-[1200px] mx-auto w-full px-6 py-20">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Khu vực nổi bật</h2>
            <a className="text-primary font-bold flex items-center gap-1 hover:underline" href="#">
              Xem tất cả <ChevronRight size={20} />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {featuredAreas.map((area) => (
              <div
                key={area.name}
                className="group"
              >
                <div className="relative h-64 rounded-xl overflow-hidden mb-4">
                  <img 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    src={area.img} 
                    alt={area.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h4 className="text-xl font-bold">{area.name}</h4>
                    <p className="text-sm opacity-80">{area.count} Bất động sản</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

