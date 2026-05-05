import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { TrendingUp, TrendingDown, MapPin, Banknote } from 'lucide-react';
import type {
  PriceChartWidget as PriceChartWidgetType,
  ComparisonWidget as ComparisonWidgetType,
  MiniMapWidget as MiniMapWidgetType,
} from '../types';

const formatPrice = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  return v.toLocaleString('vi-VN');
};

const formatPricePerM2 = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M đ/m²`;
  return `${(v / 1000).toFixed(0)}K đ/m²`;
};

// ── Price Chart Widget ──────────────────────────────────────

export function PriceChartWidget({ data }: { data: PriceChartWidgetType }) {
  const chartData = data.monthly_prices.map((p) => ({
    month: p.month ? p.month.substring(0, 7) : '',
    price: p.avg_price_per_m2,
  }));

  const first = chartData[0]?.price ?? 0;
  const last = chartData[chartData.length - 1]?.price ?? 0;
  const change = last - first;
  const changePct = first > 0 ? ((change / first) * 100) : 0;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          Xu hướng giá tại {data.area_name}
        </h4>
        {change !== 0 && (
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
            change > 0
              ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
              : 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
          }`}>
            {change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={formatPricePerM2}
            width={70}
          />
          <Tooltip
            formatter={(value: number) => [formatPrice(value) + ' đ/m²', 'Giá']}
            labelFormatter={(label) => `Tháng ${label}`}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#priceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Comparison Widget ───────────────────────────────────────

export function ComparisonWidget({ data }: { data: ComparisonWidgetType }) {
  const maxPrice = Math.max(...data.areas.map((a) => a.avg_price_per_m2));

  const chartData = data.areas.map((a) => ({
    name: a.name,
    price: a.avg_price_per_m2,
    listings: a.total_listings,
  }));

  return (
    <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
        So sánh giá giữa các khu vực
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={formatPricePerM2}
            width={70}
          />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
          <Tooltip
            formatter={(value: number) => [formatPrice(value) + ' đ/m²', 'Giá TB']}
          />
          <Bar dataKey="price" radius={[0, 6, 6, 0]}>
            {chartData.map((entry, idx) => {
              const ratio = entry.price / maxPrice;
              const hue = 220 - (ratio * 180);
              return (
                <rect key={idx} fill={`hsl(${hue}, 70%, 55%)`} />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {data.areas.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Banknote size={14} className="text-primary shrink-0" />
            <span className="truncate">{a.name}: <strong>{formatPrice(a.avg_price_per_m2)} đ/m²</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mini Map Widget ─────────────────────────────────────────

export function MiniMapWidget({ data }: { data: MiniMapWidgetType }) {
  if (!data.markers || data.markers.length === 0) {
    return null;
  }

  const mapCenter: [number, number] = [data.center_lat, data.center_lon];

  return (
    <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <MapPin size={14} className="text-primary" />
          BĐS tại {data.area_name}
        </h4>
      </div>
      <div style={{ height: 200, width: '100%' }}>
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={false}
          dragging={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data.markers.map((m, i) => (
            <Marker key={i} position={[m.lat, m.lon]}>
              <Popup>
                <div className="text-xs">
                  <strong>{m.label}</strong><br />
                  Giá: {formatPrice(m.price)}đ<br />
                  Diện tích: {m.area}m²
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

// ── Widget Router ───────────────────────────────────────────

export function renderWidget(widget: { type: string;[key: string]: any }) {
  switch (widget.type) {
    case 'price_chart':
      return <PriceChartWidget data={widget as PriceChartWidgetType} />;
    case 'comparison':
      return <ComparisonWidget data={widget as ComparisonWidgetType} />;
    case 'mini_map':
      return <MiniMapWidget data={widget as MiniMapWidgetType} />;
    default:
      return null;
  }
}
