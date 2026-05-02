import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Bath,
  Bed,
  Bookmark,
  Building2,
  Bus,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Hospital,
  Info,
  MapPin,
  MessageSquare,
  Maximize2,
  School,
  Share2,
  ShoppingCart,
  Trees,
  TrendingUp,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import InteractiveMap from '../components/InteractiveMap';
import type {
  GeoCoordinates,
  NearbyAmenity,
  NearbyAmenityKind,
  ValuationPageState,
  MarketPriceAnalysisResult,
} from '../types';

const FALLBACK_CENTER: [number, number] = [10.7769, 106.7009];
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const similarProps = [
  {
    id: 1,
    title: 'Căn hộ 2PN, view sông, tầng cao',
    price: '4.75 tỷ',
    area: '82 m2',
    rooms: '2 PN',
    match: '98%',
    img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1980&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'Full nội thất, dọn vào ở ngay',
    price: '4.4 tỷ',
    area: '78 m2',
    rooms: '2 PN',
    match: '94%',
    img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=2070&auto=format&fit=crop',
  },
  {
    id: 3,
    title: 'Căn hộ góc, 2 ban công',
    price: '4.9 tỷ',
    area: '95 m2',
    rooms: '2 PN',
    match: '89%',
    img: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2074&auto=format&fit=crop',
  },
];

const amenityMeta: Record<
  NearbyAmenityKind,
  { icon: any; title: string; fallbackDetail: string }
> = {
  school: { icon: School, title: 'Trường học', fallbackDetail: 'Chưa tìm thấy trường học lân cận' },
  hospital: { icon: Hospital, title: 'Y tế', fallbackDetail: 'Chưa tìm thấy cơ sở y tế lân cận' },
  shopping: { icon: ShoppingCart, title: 'Mua sắm', fallbackDetail: 'Chưa tìm thấy điểm mua sắm lân cận' },
  park: { icon: Trees, title: 'Công viên', fallbackDetail: 'Chưa tìm thấy công viên lân cận' },
  bus: { icon: Bus, title: 'Giao thông', fallbackDetail: 'Chưa tìm thấy trạm xe buýt lân cận' },
  gym: { icon: Dumbbell, title: 'Thể thao', fallbackDetail: 'Chưa tìm thấy phòng gym lân cận' },
};

const amenityKinds: NearbyAmenityKind[] = ['school', 'hospital', 'shopping', 'park', 'bus', 'gym'];

const evaluationMetrics = [
  { label: 'Thanh khoản', score: 8.5 },
  { label: 'Tiềm năng tăng giá', score: 9.1 },
  { label: 'Môi trường sống', score: 7.8 },
  { label: 'Kết nối giao thông', score: 8.4 },
];

const marketHighlights = [
  {
    title: 'Nhu cầu khu vực',
    description:
      'Lượng tìm kiếm và nhu cầu xem nhà trong nhóm tài sản cùng phân khúc đang giữ ở mức tốt, phù hợp với cả nhu cầu ở thực lẫn đầu tư trung hạn.',
  },
  {
    title: 'Độ hấp dẫn vị trí',
    description:
      'Tài sản nằm gần các tiện ích thiết yếu và có khả năng tiếp cận hạ tầng tốt, giúp cải thiện thanh khoản khi thị trường biến động.',
  },
  {
    title: 'Khả năng khai thác',
    description:
      'Những tài sản tương tự trong cùng khu vực thường giữ giá tốt hơn khi có đủ trường học, y tế, mua sắm và giao thông trong bán kính ngắn.',
  },
];

type ChartDataPoint = {
  label: string;
  month: number;
  year: number;
  totalMonthIndex: number;
  price: number;
};

const transformMarketDataToChartFormat = (
  marketResult: MarketPriceAnalysisResult | undefined
): ChartDataPoint[] => {
  if (
    !marketResult ||
    !Array.isArray(marketResult.monthly_prices) ||
    marketResult.monthly_prices.length === 0
  ) {
    return [];
  }

  // Sort by year and month to ensure proper order
  const sorted = [...marketResult.monthly_prices].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  const step1 = sorted.map((item) => {
    const rawPrice =
      item.avg_price_per_m2 ??
      item.average_price_per_m2 ??
      item.price_per_m2 ??
      null;

    if (rawPrice === null || rawPrice === 0) {
      return {
        label: `${item.month}/${item.year}`,
        month: item.month,
        year: item.year,
        totalMonthIndex: item.year * 12 + (item.month - 1),
        price: null as number | null,
      };
    }

    const displayPrice = rawPrice / 1_000_000;

    return {
      label: `${item.month}/${item.year}`,
      month: item.month,
      year: item.year,
      totalMonthIndex: item.year * 12 + (item.month - 1),
      price: parseFloat(displayPrice.toFixed(2)),
    };
  });

  // Second pass: linearly interpolate missing months from the nearest valid points.
  const step2 = step1.map((item, index) => {
    if (item.price !== null) {
      return item;
    }

    let prevIndex = -1;
    for (let i = index - 1; i >= 0; i--) {
      if (step1[i].price !== null) {
        prevIndex = i;
        break;
      }
    }

    let nextIndex = -1;
    for (let i = index + 1; i < step1.length; i++) {
      if (step1[i].price !== null) {
        nextIndex = i;
        break;
      }
    }

    let interpolatedPrice = 0;

    if (prevIndex !== -1 && nextIndex !== -1) {
      const prevPoint = step1[prevIndex];
      const nextPoint = step1[nextIndex];
      const span = nextPoint.totalMonthIndex - prevPoint.totalMonthIndex;
      const progress =
        span > 0
          ? (item.totalMonthIndex - prevPoint.totalMonthIndex) / span
          : 0;

      interpolatedPrice =
        prevPoint.price! + (nextPoint.price! - prevPoint.price!) * progress;
    } else if (prevIndex !== -1) {
      interpolatedPrice = step1[prevIndex].price!;
    } else if (nextIndex !== -1) {
      interpolatedPrice = step1[nextIndex].price!;
    }

    return {
      label: item.label,
      month: item.month,
      year: item.year,
      totalMonthIndex: item.totalMonthIndex,
      price: parseFloat(interpolatedPrice.toFixed(2)),
    };
  });

  return step2 as ChartDataPoint[];
};

const formatPrice = (pricePerM2: number | null | undefined): string => {
  if (!pricePerM2) return '0';
  return Math.round(pricePerM2 / 1000000).toLocaleString('vi-VN');
};

const formatPriceInBillion = (priceInVND: number): string => {
  if (!priceInVND) return '0';
  const billion = priceInVND / 1000000000;
  return billion.toFixed(2);
};

const getMonthlyPriceValue = (item: {
  average_price_per_m2?: number | null;
  avg_price_per_m2?: number | null;
  price_per_m2?: number | null;
}) => item.avg_price_per_m2 ?? item.average_price_per_m2 ?? item.price_per_m2 ?? null;

const getMonthlyListingCount = (item: {
  total_homes?: number | null;
  total_listings?: number | null;
}) => item.total_listings ?? item.total_homes ?? 0;

const overpassSelectors: Record<NearbyAmenityKind, string[]> = {
  school: ['node["amenity"="school"]', 'way["amenity"="school"]'],
  hospital: ['node["amenity"="hospital"]', 'way["amenity"="hospital"]', 'node["amenity"="clinic"]'],
  shopping: ['node["shop"="supermarket"]', 'way["shop"="supermarket"]', 'node["amenity"="marketplace"]'],
  park: ['node["leisure"="park"]', 'way["leisure"="park"]', 'node["leisure"="garden"]'],
  bus: ['node["highway"="bus_stop"]', 'node["amenity"="bus_station"]', 'way["amenity"="bus_station"]'],
  gym: ['node["leisure"="fitness_centre"]', 'way["leisure"="fitness_centre"]', 'node["sport"="fitness"]'],
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceMeters = (origin: GeoCoordinates, destination: GeoCoordinates): number => {
  const earthRadius = 6371000;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLon = toRadians(destination.lon - origin.lon);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (distanceMeters: number) =>
  distanceMeters < 1000
    ? `${Math.round(distanceMeters)}m`
    : `${(distanceMeters / 1000).toFixed(1)}km`;

const buildOverpassQuery = (center: GeoCoordinates) => {
  const selectors = amenityKinds
    .flatMap((kind) =>
      overpassSelectors[kind].map(
        (selector) => `${selector}(around:2000,${center.lat},${center.lon});`
      )
    )
    .join('');

  return `[out:json][timeout:25];(${selectors});out center tags;`;
};

const detectAmenityKind = (tags?: Record<string, string>): NearbyAmenityKind | null => {
  if (!tags) return null;
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'hospital' || tags.amenity === 'clinic') return 'hospital';
  if (tags.shop === 'supermarket' || tags.amenity === 'marketplace') return 'shopping';
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'park';
  if (tags.highway === 'bus_stop' || tags.amenity === 'bus_station') return 'bus';
  if (tags.leisure === 'fitness_centre' || tags.sport === 'fitness') return 'gym';
  return null;
};

const getCoordinates = (element: any): GeoCoordinates | null => {
  if (typeof element?.lat === 'number' && typeof element?.lon === 'number') {
    return { lat: element.lat, lon: element.lon };
  }

  if (typeof element?.center?.lat === 'number' && typeof element?.center?.lon === 'number') {
    return { lat: element.center.lat, lon: element.center.lon };
  }

  return null;
};

const scoreAmenityCandidate = (
  kind: NearbyAmenityKind,
  element: any,
  distanceMeters: number
): number => {
  const tags = element?.tags ?? {};
  let score = Math.max(0, 5000 - distanceMeters);

  if (tags.name) {
    score += 1800;
  }

  if (tags.operator || tags.brand) {
    score += 600;
  }

  if (kind === 'school') {
    if (tags.amenity === 'school') score += 800;
    if (tags.amenity === 'college' || tags.amenity === 'university') score += 400;
  }

  if (kind === 'hospital') {
    if (tags.amenity === 'hospital') score += 1000;
    if (tags.amenity === 'clinic') score += 500;
  }

  if (kind === 'shopping') {
    if (tags.shop === 'supermarket') score += 900;
    if (tags.amenity === 'marketplace') score += 700;
    if (tags.shop === 'mall') score += 800;
  }

  if (kind === 'park') {
    if (tags.leisure === 'park') score += 800;
    if (tags.leisure === 'garden') score += 500;
  }

  if (kind === 'bus') {
    if (tags.amenity === 'bus_station') score += 900;
    if (tags.highway === 'bus_stop') score += 500;
  }

  if (kind === 'gym') {
    if (tags.leisure === 'fitness_centre') score += 900;
    if (tags.sport === 'fitness') score += 500;
  }

  return score;
};

async function geocodeAddress(address: string): Promise<GeoCoordinates | null> {
  if (MAPBOX_TOKEN) {
    const encodedAddress = encodeURIComponent(address);
    const mapboxResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=vi&limit=1`
    );

    if (mapboxResponse.ok) {
      const payload = await mapboxResponse.json();
      const feature = Array.isArray(payload?.features) ? payload.features[0] : null;

      if (
        feature?.center &&
        Array.isArray(feature.center) &&
        feature.center.length >= 2
      ) {
        return {
          lat: Number(feature.center[1]),
          lon: Number(feature.center[0]),
        };
      }
    }
  }

  const params = new URLSearchParams({
    q: address,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'vn',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`);
  if (!response.ok) throw new Error('Không thể tìm tọa độ từ địa chỉ');

  const results = await response.json();
  const item = Array.isArray(results) ? results[0] : null;
  if (!item?.lat || !item?.lon) return null;

  return { lat: Number(item.lat), lon: Number(item.lon) };
}

async function fetchNearbyAmenities(center: GeoCoordinates): Promise<NearbyAmenity[]> {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: buildOverpassQuery(center),
  });

  if (!response.ok) throw new Error('Không thể lấy tiện ích xung quanh');

  const payload = await response.json();
  const elements = Array.isArray(payload?.elements) ? payload.elements : [];
  const bestByKind = new Map<
    NearbyAmenityKind,
    NearbyAmenity & { score: number }
  >();

  for (const element of elements) {
    const kind = detectAmenityKind(element.tags);
    const coords = getCoordinates(element);
    if (!kind || !coords) continue;

    const candidate: NearbyAmenity = {
      id: `${kind}-${element.id}`,
      name: element?.tags?.name || amenityMeta[kind].title,
      kind,
      distanceMeters: calculateDistanceMeters(center, coords),
      lat: coords.lat,
      lon: coords.lon,
    };
    const score = scoreAmenityCandidate(kind, element, candidate.distanceMeters);

    const existing = bestByKind.get(kind);
    if (!existing || score > existing.score) {
      bestByKind.set(kind, { ...candidate, score });
    }
  }

  return Array.from(bestByKind.values())
    .map(({ score: _score, ...amenity }) => amenity)
    .sort((left, right) => left.distanceMeters - right.distanceMeters);
}

export default function Result() {
  const location = useLocation();
  const pageState = location.state as ValuationPageState | undefined;
  const formData = pageState?.formData;
  const marketResult = pageState?.marketAnalysisResult;

  // Use normalized address from API if available, otherwise use form data
  const address = marketResult?.normalized_address || formData?.address?.trim() || 'Địa chỉ chưa xác định';
  const areaLabel = formData?.address?.split(',').slice(-2).join(', ').trim() || 'khu vực lân cận';
  const propertyTypeLabel =
    formData?.type === 'house'
      ? 'Nhà phố'
      : formData?.type === 'apartment'
        ? 'Căn hộ'
        : formData?.type === 'land'
          ? 'Đất nền'
          : formData?.type === 'villa'
            ? 'Biệt thự'
            : 'Bất động sản';

  const [selectedPropertyIndex, setSelectedPropertyIndex] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(FALLBACK_CENTER);
  const [nearbyAmenities, setNearbyAmenities] = useState<NearbyAmenity[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [amenityNotice, setAmenityNotice] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedProperty =
    selectedPropertyIndex !== null ? similarProps[selectedPropertyIndex] : null;

  // Calculate chart data from market result
  const chartData = useMemo(() => transformMarketDataToChartFormat(marketResult), [marketResult]);
  const validMonthlyPrices = useMemo(
    () => (marketResult?.monthly_prices ?? []).filter((item) => getMonthlyPriceValue(item) !== null),
    [marketResult]
  );
  const latestMonthlySnapshot = useMemo(
    () =>
      validMonthlyPrices.length > 0 ? validMonthlyPrices[validMonthlyPrices.length - 1] : null,
    [validMonthlyPrices]
  );
  const xAxisTicks = useMemo(() => {
    if (chartData.length === 0) {
      return [];
    }

    const latestMonthIndex = chartData[chartData.length - 1].totalMonthIndex;
    const ticks = chartData
      .filter((item) => {
        const monthDiff = latestMonthIndex - item.totalMonthIndex;
        return monthDiff > 0 && monthDiff % 2 === 0;
      })
      .map((item) => item.label);

    return ticks.length > 0 ? ticks : [chartData[chartData.length - 1].label];
  }, [chartData]);

  // Calculate statistics from market result
  const pricePerM2 =
    marketResult?.overall_average_price_per_m2_12_months ??
    getMonthlyPriceValue(latestMonthlySnapshot ?? {}) ??
    0;
  const pricePerM2Display = formatPrice(pricePerM2);
  
  // Estimate total price based on area
  const estimatedArea = parseFloat(formData?.area || '80');
  const estimatedTotalPrice = pricePerM2 ? (pricePerM2 * estimatedArea) / 1000000 : 4.5;
  const estimatedTotalPriceDisplay = formatPriceInBillion(pricePerM2 * estimatedArea);
  
  const priceRange = {
    min: (estimatedTotalPrice * 0.95).toFixed(2),
    max: (estimatedTotalPrice * 1.05).toFixed(2),
  };

  // Set map center from market result if available
  useEffect(() => {
    if (marketResult?.latitude && marketResult?.longitude) {
      setMapCenter([marketResult.latitude, marketResult.longitude]);
    }
  }, [marketResult]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!formData?.address?.trim()) return;

      try {
        setIsLoadingLocation(true);
        setLocationError('');
        setAmenityNotice('');
        const coordinates =
          formData.coordinates ?? (await geocodeAddress(formData.address.trim()));
        if (!coordinates) throw new Error('Không tìm thấy tọa độ phù hợp cho địa chỉ này');
        if (cancelled) return;

        setMapCenter([coordinates.lat, coordinates.lon]);
        try {
          const amenities = await fetchNearbyAmenities(coordinates);
          if (!cancelled) {
            setNearbyAmenities(amenities);
          }
        } catch {
          if (!cancelled) {
            setNearbyAmenities([]);
            setAmenityNotice(
              'ChÆ°a táº£i Ä‘Æ°á»£c tiá»‡n Ă­ch xung quanh. Báº£n Ä‘á»“ vá»‹ trĂ­ váº«n hiá»ƒn thá»‹ bĂ¬nh thÆ°á»ng.'
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setNearbyAmenities([]);
          setAmenityNotice('');
          setLocationError(
            error instanceof Error
              ? error.message
              : 'Không thể tải dữ liệu vị trí và tiện ích xung quanh'
          );
        }
      } finally {
        if (!cancelled) setIsLoadingLocation(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [formData?.address]);

  const amenityCards = useMemo(
    () =>
      amenityKinds.map((kind) => {
        const amenity = nearbyAmenities.find((item) => item.kind === kind);
        return {
          kind,
          icon: amenityMeta[kind].icon,
          title: amenityMeta[kind].title,
          detail: amenity
            ? `${amenity.name} (${formatDistance(amenity.distanceMeters)})`
            : amenityMeta[kind].fallbackDetail,
        };
      }),
    [nearbyAmenities]
  );

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    const next = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
    scrollContainerRef.current.scrollTo({ left: next, behavior: 'smooth' });
  };

  const showPreviousProperty = () => {
    if (selectedPropertyIndex === null) return;
    setSelectedPropertyIndex((selectedPropertyIndex - 1 + similarProps.length) % similarProps.length);
  };

  const showNextProperty = () => {
    if (selectedPropertyIndex === null) return;
    setSelectedPropertyIndex((selectedPropertyIndex + 1) % similarProps.length);
  };

  useEffect(() => {
    if (selectedPropertyIndex === null) {
      document.body.style.overflow = '';
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPropertyIndex(null);
      }

      if (event.key === 'ArrowLeft') {
        showPreviousProperty();
      }

      if (event.key === 'ArrowRight') {
        showNextProperty();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPropertyIndex]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <Navbar />

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        <AnimatePresence>
          {selectedProperty && (
            <div
              className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
              onClick={() => setSelectedPropertyIndex(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(event) => event.stopPropagation()}
                className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-slate-900 max-h-[calc(100vh-2rem)]"
              >
                <button
                  type="button"
                  onClick={showPreviousProperty}
                  className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-3 text-slate-900 shadow-lg transition hover:bg-white dark:bg-slate-900/90 dark:text-white"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={showNextProperty}
                  className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-3 text-slate-900 shadow-lg transition hover:bg-white dark:bg-slate-900/90 dark:text-white"
                >
                  <ChevronRight size={22} />
                </button>
                <button
                  onClick={() => setSelectedPropertyIndex(null)}
                  className="absolute top-4 right-4 z-30 rounded-full bg-black/35 p-2.5 text-white transition-colors hover:bg-black/55"
                >
                  <X size={20} />
                </button>
                <div className="h-72 md:h-[24rem] xl:h-[28rem] relative">
                  <img src={selectedProperty.img} alt={selectedProperty.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                      Tài sản tham khảo
                    </span>
                    <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                      {selectedProperty.match} phù hợp
                    </span>
                  </div>
                </div>
                <div className="max-h-[calc(100vh-2rem-18rem)] overflow-y-auto p-6 md:p-8 xl:p-10">
                  <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">TÀI SẢN THAM KHẢO</p>
                      <h3 className="text-2xl font-black leading-tight text-slate-900 dark:text-white md:text-3xl xl:text-4xl">{selectedProperty.title}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                        So nhanh từng tài sản tương đương ngay trong popup. Bạn có thể bấm mũi tên trái/phải hoặc dùng phím mũi tên trên bàn phím để chuyển bài.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 px-5 py-4 lg:min-w-[220px]">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80">Giá chào bán</p>
                      <p className="mt-2 text-3xl font-black text-primary">{selectedProperty.price}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800 flex flex-col gap-2">
                      <Maximize2 size={20} className="text-primary" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Diện tích</p>
                      <span className="text-base font-bold text-slate-900 dark:text-white">{selectedProperty.area}</span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800 flex flex-col gap-2">
                      <Bed size={20} className="text-primary" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Phòng ngủ</p>
                      <span className="text-base font-bold text-slate-900 dark:text-white">{selectedProperty.rooms}</span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800 flex flex-col gap-2">
                      <Bath size={20} className="text-primary" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Phòng tắm</p>
                      <span className="text-base font-bold text-slate-900 dark:text-white">2 WC</span>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={showPreviousProperty}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft size={18} />
                      Bài trước
                    </button>
                    <button
                      type="button"
                      onClick={showNextProperty}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:brightness-110"
                    >
                      Bài tiếp theo
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link to="/" className="hover:text-primary">Trang chủ</Link>
          <ChevronRight size={12} />
          <span>Kết quả tìm kiếm</span>
          <ChevronRight size={12} />
          <span className="text-slate-900 dark:text-white font-bold">Chi tiết định giá</span>
        </nav>

        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(19,127,236,0.18),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_28%)]" />
          <div className="relative grid gap-8 px-6 py-8 md:px-8 lg:grid-cols-[1.65fr_0.95fr] lg:items-start">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                  Báo cáo định giá
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Cập nhật theo vị trí thực tế
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                    <MapPin size={26} />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
                      Tài sản đang định giá
                    </p>
                    <h1 className="max-w-3xl text-3xl font-black leading-tight text-slate-900 dark:text-white md:text-4xl">
                      {address}
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Báo cáo tổng hợp giá trị tài sản, chất lượng vị trí và mức độ hoàn thiện tiện ích
                      xung quanh để giúp bạn ra quyết định nhanh hơn.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {propertyTypeLabel}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {formData?.area || '80'} m2
                  </span>
                  {formData?.bedrooms && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {formData.bedrooms} phòng ngủ
                    </span>
                  )}
                  {formData?.bathrooms && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {formData.bathrooms} phòng tắm
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Giá ước tính
                  </p>
                  <p className="mt-3 text-3xl font-black text-primary">
                    {pricePerM2 > 0 ? estimatedTotalPriceDisplay : '0'} tỷ
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Tính từ {estimatedArea} m² × {pricePerM2Display} tr/m² tại {areaLabel}.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Giá mỗi m2
                  </p>
                  <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                    {pricePerM2Display} tr
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Mức giá trung bình trong bán kính {marketResult?.radius_km || 2} km tại vị trí này.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Độ tin cậy
                  </p>
                  <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                    {validMonthlyPrices.length > 0 ? '92%' : '85%'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Dựa trên {marketResult?.monthly_prices.length} tháng dữ liệu giá trung bình vùng.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/50">
                      Khuyến nghị nhanh
                    </p>
                    <h2 className="mt-3 text-3xl font-black">Giữ ở mức cạnh tranh</h2>
                  </div>
                  <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                    Khả quan
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/70">
                  Với lợi thế vị trí và thanh khoản hiện tại, tài sản phù hợp để định giá theo hướng
                  linh hoạt nhưng không cần chiết khấu sâu.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100">
                    <Bookmark size={18} />
                    Lưu báo cáo
                  </button>
                  <button className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                    <Share2 size={18} />
                    Chia sẻ
                  </button>
                </div>
              </div>

              <Link
                to="/chat"
                className="group flex w-full items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Tư vấn giao dịch ngay</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Trao đổi thêm với trợ lý để chốt chiến lược phù hợp.
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className="text-slate-400 transition group-hover:translate-x-1"
                />
              </Link>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary" />
                  <p className="text-sm font-black text-slate-900 dark:text-white">Đánh giá đa chiều</p>
                </div>
                <div className="space-y-4">
                  {evaluationMetrics.map((metric) => (
                    <div key={metric.label}>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold">
                        <span className="uppercase tracking-[0.2em] text-slate-400">{metric.label}</span>
                        <span className="text-primary">{metric.score}/10</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-primary to-sky-400"
                          style={{ width: `${metric.score * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50/50 to-white p-6 shadow-md dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900/50 dark:to-slate-900 md:p-8 hover:shadow-lg transition-shadow duration-300">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                  <TrendingUp className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Biến động giá khu vực</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {marketResult
                      ? `Diễn biến giá trong ${marketResult.monthly_prices.length} tháng gần nhất`
                      : 'Diễn biến giá 12 tháng gần nhất'}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                Dữ liệu thực tế
              </span>
            </div>

            <div className="relative">
              {/* Chart Background Decoration */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative h-80 w-full rounded-2xl bg-gradient-to-b from-slate-50/50 to-slate-50/10 p-4 dark:from-slate-800/30 dark:to-slate-800/10 backdrop-blur-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 10 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#137fec" stopOpacity={0.4} />
                        <stop offset="40%" stopColor="#137fec" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#137fec" stopOpacity={0} />
                      </linearGradient>
                      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                      </filter>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="4 6" 
                      vertical={false} 
                      stroke="#cbd5e1" 
                      opacity={0.4}
                      className="dark:stroke-slate-700"
                    />
                    <XAxis
                      dataKey="label"
                      ticks={xAxisTicks}
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                      className="dark:text-slate-400"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                      className="dark:text-slate-400"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                        padding: '12px 16px'
                      }}
                      labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                      formatter={(value) => [`${typeof value === 'number' ? value.toFixed(2) : value} tr`, 'Giá']}
                      cursor={{ strokeDasharray: '5 5', stroke: '#137fec', strokeOpacity: 0.5 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#137fec"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                      filter="url(#shadow)"
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6 flex gap-4 rounded-xl bg-gradient-to-r from-primary/10 to-sky-400/10 p-4 dark:from-primary/20 dark:to-sky-400/20">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary/60" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Giá mỗi m²: <span className="font-black text-primary">{pricePerM2Display} tr</span>
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <Info className="text-primary" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Phân tích thị trường chuyên sâu</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Góc nhìn tổng hợp để hỗ trợ quyết định niêm yết hoặc mua bán.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {marketHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <p className="text-sm font-black text-slate-900 dark:text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-10">
          <section className="relative rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="text-primary" size={24} />
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Vị trí và tiện ích xung quanh</h3>
                </div>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                Dữ liệu vị trí trực tiếp
              </div>
            </div>

            <div className="space-y-6">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <div className="w-full h-[320px] md:h-[430px] lg:h-[500px]">
                  <InteractiveMap center={mapCenter} addressLabel={address} pois={nearbyAmenities} />
                </div>
              </div>

              {isLoadingLocation && (
                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-950 dark:bg-sky-950/30 dark:text-sky-300">
                  Đang truy vấn vị trí và nhóm tiện ích phù hợp quanh tài sản...
                </div>
              )}

              {locationError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  {locationError}
                </div>
              )}

              {amenityNotice && !locationError && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                  {amenityNotice}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                {amenityCards.map((item) => (
                  <div
                    key={item.kind}
                    className="group rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                      <item.icon className="text-primary" size={22} />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                  <Building2 size={24} className="text-primary" />
                  Bất động sản tương đương đang bán
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => scroll('left')}
                  className="rounded-full border border-slate-200 bg-white p-2 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => scroll('right')}
                  className="rounded-full border border-slate-200 bg-white p-2 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {similarProps.map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => setSelectedPropertyIndex(similarProps.findIndex((item) => item.id === prop.id))}
                  className="min-w-[320px] snap-start overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 md:min-w-[370px] cursor-pointer"
                >
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={prop.img}
                      alt={prop.title}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900">
                      {prop.match} phù hợp
                    </div>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                        Tài sản tham chiếu
                      </p>
                      <h4 className="text-lg font-black leading-snug text-slate-900 dark:text-white">
                        {prop.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-2xl font-black text-primary">{prop.price}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Giá chào bán hiện tại</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {prop.area}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {prop.rooms}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
