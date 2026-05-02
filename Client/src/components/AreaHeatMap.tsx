import { useMemo } from 'react';
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Flame } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_STYLE_ID = 'mapbox/streets-v12';
const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009];

export interface AreaHeatPoint {
  id: string;
  label: string;
  address: string;
  lat: number;
  lon: number;
  pricePerM2: number;
  totalListings: number;
}

interface PlanePoint {
  x: number;
  y: number;
}

interface HeatRegion {
  id: string;
  label: string;
  address: string;
  polygon: [number, number][];
  pricePerM2: number;
  color: string;
}

interface AreaHeatMapProps {
  areaName: string;
  points: AreaHeatPoint[];
  loading: boolean;
  error: string;
  selectedPointId?: string;
}

const formatPrice = (pricePerM2: number) =>
  `${Math.round(pricePerM2 / 1000000).toLocaleString('vi-VN')} triệu/m²`;

const getHeatColor = (pricePerM2: number, min: number, max: number) => {
  if (max <= min) return '#60a5fa';

  const ratio = (pricePerM2 - min) / (max - min);

  if (ratio > 0.88) return '#cb2b3e';
  if (ratio > 0.72) return '#ef4444';
  if (ratio > 0.56) return '#f97316';
  if (ratio > 0.4) return '#facc15';
  if (ratio > 0.24) return '#84cc16';
  return '#4ade80';
};

const clipPolygonWithHalfPlane = (
  polygon: PlanePoint[],
  current: PlanePoint,
  other: PlanePoint
) => {
  if (polygon.length === 0) return polygon;

  const a = 2 * (other.x - current.x);
  const b = 2 * (other.y - current.y);
  const c =
    other.x * other.x +
    other.y * other.y -
    current.x * current.x -
    current.y * current.y;
  const epsilon = 1e-9;

  const isInside = (point: PlanePoint) => a * point.x + b * point.y <= c + epsilon;

  const intersection = (start: PlanePoint, end: PlanePoint): PlanePoint => {
    const denominator = a * (end.x - start.x) + b * (end.y - start.y);

    if (Math.abs(denominator) < epsilon) {
      return end;
    }

    const t = (c - a * start.x - b * start.y) / denominator;
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
  };

  const result: PlanePoint[] = [];

  for (let index = 0; index < polygon.length; index++) {
    const from = polygon[index];
    const to = polygon[(index + 1) % polygon.length];
    const fromInside = isInside(from);
    const toInside = isInside(to);

    if (fromInside && toInside) {
      result.push(to);
      continue;
    }

    if (fromInside && !toInside) {
      result.push(intersection(from, to));
      continue;
    }

    if (!fromInside && toInside) {
      result.push(intersection(from, to));
      result.push(to);
    }
  }

  return result;
};

const buildHeatRegions = (points: AreaHeatPoint[]) => {
  if (points.length === 0) return [];

  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  const basePolygon: PlanePoint[] = [
    { x: Math.min(...lons) - 0.1, y: Math.min(...lats) - 0.1 },
    { x: Math.max(...lons) + 0.1, y: Math.min(...lats) - 0.1 },
    { x: Math.max(...lons) + 0.1, y: Math.max(...lats) + 0.1 },
    { x: Math.min(...lons) - 0.1, y: Math.max(...lats) + 0.1 },
  ];

  const prices = points.map((point) => point.pricePerM2);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return points
    .map((point) => {
      let polygon = [...basePolygon];
      const current = { x: point.lon, y: point.lat };

      for (const other of points) {
        if (other.id === point.id) continue;

        polygon = clipPolygonWithHalfPlane(polygon, current, {
          x: other.lon,
          y: other.lat,
        });

        if (polygon.length < 3) break;
      }

      if (polygon.length < 3) return null;

      const region: HeatRegion = {
        id: point.id,
        label: point.label,
        address: point.address,
        polygon: polygon.map((vertex) => [vertex.y, vertex.x] as [number, number]),
        pricePerM2: point.pricePerM2,
        color: getHeatColor(point.pricePerM2, min, max),
      };

      return region;
    })
    .filter((region): region is HeatRegion => region !== null);
};

function FitHeatBounds({ points }: { points: AreaHeatPoint[] }) {
  const map = useMap();

  useMemo(() => {
    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, 10);
      return;
    }

    const bounds = points.map((point) => [point.lat, point.lon] as [number, number]);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);

  return null;
}

export default function AreaHeatMap({
  areaName,
  points,
  loading,
  error,
  selectedPointId,
}: AreaHeatMapProps) {
  const tileUrl = MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE_ID}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = MAPBOX_TOKEN
    ? '&copy; Mapbox &copy; OpenStreetMap contributors'
    : '&copy; OpenStreetMap contributors';

  const heatRegions = useMemo(() => buildHeatRegions(points), [points]);
  const stats = useMemo(() => {
    const prices = points.map((point) => point.pricePerM2);
    return {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
    };
  }, [points]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-8 py-6 dark:border-slate-800">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          <Flame size={14} />
          Heatmap khu vực
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{areaName}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tô màu theo giá trung bình mỗi m² của từng khu vực do API trả về.
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-h-[420px] border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-800">
          <MapContainer center={DEFAULT_CENTER} zoom={10} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution={attribution}
              url={tileUrl}
              tileSize={MAPBOX_TOKEN ? 512 : 256}
              zoomOffset={MAPBOX_TOKEN ? -1 : 0}
            />

            <FitHeatBounds points={points} />

            {heatRegions.map((region) => (
              <Polygon
                key={region.id}
                positions={region.polygon}
                pathOptions={{
                  color: region.id === selectedPointId ? '#1d4ed8' : '#ffffff',
                  weight: region.id === selectedPointId ? 3 : 2,
                  fillColor: region.color,
                  fillOpacity: 0.58,
                }}
              >
                <Tooltip sticky direction="top" opacity={1}>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">{region.label}</p>
                    <p className="text-xs text-slate-500">{region.address}</p>
                    <p className="text-sm font-semibold text-primary">{formatPrice(region.pricePerM2)}</p>
                  </div>
                </Tooltip>
              </Polygon>
            ))}

            {points.map((point) => (
              <CircleMarker
                key={point.id}
                center={[point.lat, point.lon]}
                radius={point.id === selectedPointId ? 7 : 5}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: point.id === selectedPointId ? '#1d4ed8' : '#1e036e',
                  fillOpacity: 1,
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">{point.label}</p>
                    <p className="text-xs text-slate-500">{point.address}</p>
                    <p className="text-sm font-semibold text-primary">{formatPrice(point.pricePerM2)}</p>
                    <p className="text-[11px] text-slate-500">{point.totalListings} tin đăng</p>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="min-h-0 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Điểm dữ liệu</p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{points.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Khoảng giá</p>
              <p className="mt-2 text-base font-black text-slate-950 dark:text-white">
                {stats.min ? formatPrice(stats.min) : '--'} - {stats.max ? formatPrice(stats.max) : '--'}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              Đang tải dữ liệu khu vực và giá trung bình...
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {error}
            </div>
          ) : null}

          {!loading && !error && points.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              Chưa có đủ dữ liệu tọa độ và giá để dựng heatmap cho khu vực này.
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {points.map((point) => (
              <div
                key={point.id}
                className={`rounded-2xl border p-4 ${
                  point.id === selectedPointId
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30'
                }`}
              >
                <p className="font-bold text-slate-900 dark:text-white">{point.label}</p>
                <p className="mt-1 text-sm text-slate-500">{point.address}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-primary">{formatPrice(point.pricePerM2)}</p>
                  <p className="text-xs text-slate-500">{point.totalListings} tin</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
