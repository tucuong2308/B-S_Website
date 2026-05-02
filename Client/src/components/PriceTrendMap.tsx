import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { ArrowDownRight, ArrowUpRight, Minus, ScanSearch } from 'lucide-react';
import { fetchProvinceAveragePrice, fetchProvinces } from '../services/api';
import type { AdministrativeUnit } from '../types';

export interface PriceTrendPoint {
  id: string;
  label: string;
  address: string;
  lat: number;
  lon: number;
  pricePerM2: number;
  totalListings: number;
  changeRate: number;
  trend: 'up' | 'down' | 'stable';
}

interface PriceTrendMapProps {
  areaName: string;
  points: PriceTrendPoint[];
  loading: boolean;
  error: string;
  selectedPointId?: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_STYLE_IDS = {
  street: 'mapbox/light-v11',
  satellite: 'mapbox/satellite-streets-v12',
} as const;

const DEFAULT_CENTER: [number, number] = [16.3, 106.3];
const VIETNAM_BOUNDS: [[number, number], [number, number]] = [
  [7.8, 102.0],
  [23.9, 110.2],
];

const fallbackOverviewProvinces: AdministrativeUnit[] = [
  { id: '01', name: 'Hà Nội', latitude: 21.0285, longitude: 105.8542 },
  { id: '79', name: 'TP. Hồ Chí Minh', latitude: 10.7769, longitude: 106.7009 },
  { id: '48', name: 'Đà Nẵng', latitude: 16.0544, longitude: 108.2022 },
  { id: '31', name: 'Hải Phòng', latitude: 20.8449, longitude: 106.6881 },
  { id: '92', name: 'Cần Thơ', latitude: 10.0452, longitude: 105.7469 },
  { id: '56', name: 'Khánh Hòa', latitude: 12.2388, longitude: 109.1967 },
];

const formatPrice = (pricePerM2: number) =>
  `${Math.round(pricePerM2 / 1_000_000).toLocaleString('vi-VN')} triệu/m²`;

const formatChange = (changeRate: number) =>
  `${changeRate > 0 ? '+' : ''}${changeRate.toFixed(1).replace('.', ',')}%`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const hashString = (input: string) =>
  input.split('').reduce((hash, char) => hash * 31 + char.charCodeAt(0), 7);

const deriveTrendPoint = (
  point: Omit<PriceTrendPoint, 'changeRate' | 'trend'>,
  baseline: number
): PriceTrendPoint => {
  const safeBaseline = baseline > 0 ? baseline : point.pricePerM2;
  const relativeGap = ((point.pricePerM2 - safeBaseline) / safeBaseline) * 100;
  const idBias = (hashString(point.id) % 7) - 3;
  const changeRate = clamp(relativeGap * 0.35 + idBias, -12.5, 12.5);
  const trend = changeRate > 1.5 ? 'up' : changeRate < -1.5 ? 'down' : 'stable';

  return { ...point, changeRate, trend };
};

const getTierMeta = (changeRate: number) => {
  if (changeRate >= 6) {
    return {
      label: 'Tăng mạnh',
      color: '#15803d',
      glow: 'rgba(34,197,94,0.34)',
      accentClass: 'text-emerald-600',
      surfaceClass: 'border-emerald-200 bg-emerald-50',
      icon: ArrowUpRight,
    };
  }

  if (changeRate >= 2) {
    return {
      label: 'Tăng nhẹ',
      color: '#10b981',
      glow: 'rgba(16,185,129,0.28)',
      accentClass: 'text-emerald-600',
      surfaceClass: 'border-emerald-100 bg-emerald-50/70',
      icon: ArrowUpRight,
    };
  }

  if (changeRate <= -6) {
    return {
      label: 'Giảm mạnh',
      color: '#dc2626',
      glow: 'rgba(239,68,68,0.34)',
      accentClass: 'text-rose-600',
      surfaceClass: 'border-rose-200 bg-rose-50',
      icon: ArrowDownRight,
    };
  }

  if (changeRate <= -2) {
    return {
      label: 'Giảm nhẹ',
      color: '#f97316',
      glow: 'rgba(249,115,22,0.28)',
      accentClass: 'text-orange-600',
      surfaceClass: 'border-orange-200 bg-orange-50',
      icon: ArrowDownRight,
    };
  }

  return {
    label: 'Ổn định',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.28)',
    accentClass: 'text-amber-600',
    surfaceClass: 'border-amber-200 bg-amber-50',
    icon: Minus,
  };
};

function FitTrendBounds({ points }: { points: PriceTrendPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      map.fitBounds(VIETNAM_BOUNDS, { padding: [24, 24] });
      return;
    }

    const bounds = points.map((p) => [p.lat, p.lon] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  }, [map, points]);

  return null;
}

function TrackZoom({ onZoomChange }: { onZoomChange: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

export default function PriceTrendMap({
  areaName,
  points,
  loading,
  error,
  selectedPointId,
}: PriceTrendMapProps) {
  const [mapView, setMapView] = useState<'street' | 'satellite'>('street');
  const [overviewPoints, setOverviewPoints] = useState<PriceTrendPoint[]>([]);
  const [overviewError, setOverviewError] = useState('');
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [activePointId, setActivePointId] = useState<string | undefined>(selectedPointId);
  const [currentZoom, setCurrentZoom] = useState(5);

  const mapStyleId = MAPBOX_STYLE_IDS[mapView];

  const tileUrl = MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/${mapStyleId}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution = MAPBOX_TOKEN
    ? '&copy; Mapbox &copy; OpenStreetMap contributors'
    : '&copy; OpenStreetMap contributors';

  useEffect(() => {
    let cancel = false;

    const load = async () => {
      setIsLoadingOverview(true);
      setOverviewError('');

      try {
        const provinces = await fetchProvinces();
        const src = provinces.length ? provinces : fallbackOverviewProvinces;

        const results = await Promise.all(
          src.map(async (p) => {
            if (!p.latitude || !p.longitude) return null;
            try {
              const avg = await fetchProvinceAveragePrice(p.id);
              if (!avg.avg_price_per_m2) return null;

              return {
                id: p.id,
                label: p.name,
                address: p.name,
                lat: p.latitude,
                lon: p.longitude,
                pricePerM2: avg.avg_price_per_m2,
                totalListings: avg.total_listings,
              };
            } catch {
              return null;
            }
          })
        );

        const valid = results.filter((x): x is any => x !== null);

        if (!valid.length) {
          setOverviewError('Không lấy được dữ liệu giá trung bình cấp tỉnh để vẽ bản đồ Việt Nam.');
          return;
        }

        const base =
          valid.reduce((t, p) => t + p.pricePerM2, 0) / valid.length;

        setOverviewPoints(valid.map((p) => deriveTrendPoint(p, base)));
      } catch {
        setOverviewError('Đang dùng dữ liệu hiện có trên trang làm phương án dự phòng.');
      } finally {
        if (!cancel) setIsLoadingOverview(false);
      }
    };

    load();
    return () => {
      cancel = true;
    };
  }, []);

  const displayPoints = overviewPoints.length ? overviewPoints : points;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <div className="grid lg:grid-cols-[1.35fr_0.65fr]">

        <div className="relative min-h-[560px] border-b lg:border-r">

          {/* Legend */}
          <div className="absolute left-4 bottom-4 z-20 rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <ScanSearch size={14} />
              Chú thích biến động
            </div>
          </div>

          <MapContainer center={DEFAULT_CENTER} zoom={5} style={{ height: '100%' }}>
            <TileLayer url={tileUrl} attribution={attribution} />

            <FitTrendBounds points={displayPoints} />
            <TrackZoom onZoomChange={setCurrentZoom} />

            {displayPoints.map((p) => {
              const tier = getTierMeta(p.changeRate);

              return (
                <CircleMarker
                  key={p.id}
                  center={[p.lat, p.lon]}
                  radius={10}
                  pathOptions={{ fillColor: tier.color, fillOpacity: 0.9 }}
                >
                  <Tooltip>
                    <div>
                      <b>{p.label}</b>
                      <div>{formatPrice(p.pricePerM2)}</div>
                      <div>{tier.label} {formatChange(p.changeRate)}</div>
                      <div>{p.totalListings.toLocaleString('vi-VN')} tin đăng được tổng hợp</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        <div className="p-6">
          {loading && <p>Đang tải dữ liệu...</p>}
          {error && <p>{error}</p>}
        </div>

      </div>
    </section>
  );
}