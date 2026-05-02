import { useMemo } from 'react';
import { MapContainer, CircleMarker, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Flame, X } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_STYLE_ID = 'mapbox/streets-v12';

export interface HeatPoint {
  id: string;
  label: string;
  address: string;
  lat: number;
  lon: number;
  pricePerM2: number;
  isEstimated?: boolean;
}

interface ProvinceHeatMapModalProps {
  areaName: string;
  points: HeatPoint[];
  center: [number, number];
  loading: boolean;
  error: string;
  onClose: () => void;
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
  isEstimated?: boolean;
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
  other: PlanePoint,
) => {
  if (polygon.length === 0) return polygon;

  const a = 2 * (other.x - current.x);
  const b = 2 * (other.y - current.y);
  const c =
    (other.x * other.x) +
    (other.y * other.y) -
    (current.x * current.x) -
    (current.y * current.y);
  const epsilon = 1e-9;

  const isInside = (point: PlanePoint) => (a * point.x) + (b * point.y) <= c + epsilon;

  const intersection = (start: PlanePoint, end: PlanePoint): PlanePoint => {
    const denominator = (a * (end.x - start.x)) + (b * (end.y - start.y));

    if (Math.abs(denominator) < epsilon) {
      return end;
    }

    const t = (c - (a * start.x) - (b * start.y)) / denominator;
    return {
      x: start.x + ((end.x - start.x) * t),
      y: start.y + ((end.y - start.y) * t),
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

const buildHeatRegions = (points: HeatPoint[]) => {
  if (points.length === 0) return [];

  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  const paddingLat = 0.1;
  const paddingLon = 0.1;

  const basePolygon: PlanePoint[] = [
    { x: Math.min(...lons) - paddingLon, y: Math.min(...lats) - paddingLat },
    { x: Math.max(...lons) + paddingLon, y: Math.min(...lats) - paddingLat },
    { x: Math.max(...lons) + paddingLon, y: Math.max(...lats) + paddingLat },
    { x: Math.min(...lons) - paddingLon, y: Math.max(...lats) + paddingLat },
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
        isEstimated: point.isEstimated,
      };

      return region;
    })
    .filter((region): region is HeatRegion => region !== null);
};

function FitHeatBounds({
  points,
}: {
  points: HeatPoint[];
}) {
  const map = useMap();

  useMemo(() => {
    if (points.length === 0) return;
    const bounds = points.map((point) => [point.lat, point.lon] as [number, number]);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);

  return null;
}

export default function ProvinceHeatMapModal({
  areaName,
  points,
  center,
  loading,
  error,
  onClose,
}: ProvinceHeatMapModalProps) {
  const tileUrl = MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE_ID}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = MAPBOX_TOKEN
    ? '&copy; Mapbox &copy; OpenStreetMap contributors'
    : '&copy; OpenStreetMap contributors';

  const stats = useMemo(() => {
    const prices = points.map((point) => point.pricePerM2);
    const min = prices.length > 0 ? Math.min(...prices) : 0;
    const max = prices.length > 0 ? Math.max(...prices) : 0;
    return { min, max };
  }, [points]);

  const heatRegions = useMemo(() => buildHeatRegions(points), [points]);

  return (
    <div className="fixed inset-0 z-[3100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.8rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Flame size={14} />
              Heat map giá đất
            </div>
            <h3 className="mt-3 text-2xl font-black text-slate-950">{areaName}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Bản đồ chia thành các vùng theo khu vực dữ liệu, di chuột vào từng vùng để xem giá đất ước tính.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-h-[360px] border-b border-slate-200 lg:border-b-0 lg:border-r">
            <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
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
                    color: '#ffffff',
                    weight: 2,
                    fillColor: region.color,
                    fillOpacity: 0.58,
                  }}
                >
                  <Tooltip sticky direction="top" opacity={1}>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">{region.label}</p>
                      <p className="text-xs text-slate-500">{region.address}</p>
                      <p className="text-sm font-semibold text-primary">
                        {formatPrice(region.pricePerM2)}
                      </p>
                      {region.isEstimated ? (
                        <p className="text-[11px] text-amber-600">Giá ước tính tham khảo</p>
                      ) : null}
                    </div>
                  </Tooltip>
                </Polygon>
              ))}

              {points.map((point) => (
                <CircleMarker
                  key={point.id}
                  center={[point.lat, point.lon]}
                  radius={5}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2,
                    fillColor: '#1e036e',
                    fillOpacity: 1,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">{point.label}</p>
                      <p className="text-xs text-slate-500">{point.address}</p>
                      <p className="text-sm font-semibold text-primary">
                        {formatPrice(point.pricePerM2)}
                      </p>
                      {point.isEstimated ? (
                        <p className="text-[11px] text-amber-600">Giá ước tính tham khảo</p>
                      ) : null}
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <div className="min-h-0 overflow-y-auto p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Điểm khảo sát
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">{points.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Khoảng giá
                </p>
                <p className="mt-2 text-base font-black text-slate-950">
                  {stats.min ? formatPrice(stats.min) : '--'} - {stats.max ? formatPrice(stats.max) : '--'}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                Đang tải dữ liệu giá theo các điểm đại diện...
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {error}
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {points.map((point) => (
                <div key={point.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-bold text-slate-900">{point.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{point.address}</p>
                  <p className="mt-2 text-sm font-bold text-primary">{formatPrice(point.pricePerM2)}</p>
                  {point.isEstimated ? (
                    <p className="mt-1 text-xs text-amber-600">Giá ước tính khi API chưa phản hồi</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
