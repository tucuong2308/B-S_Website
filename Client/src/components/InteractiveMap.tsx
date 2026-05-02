import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  School,
  Hospital,
  ShoppingCart,
  Trees,
  Bus,
  Dumbbell,
} from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NearbyAmenity, NearbyAmenityKind } from '../types';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_STYLE_IDS = {
  street: 'mapbox/streets-v12',
  satellite: 'mapbox/satellite-streets-v12',
} as const;

const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

const createCustomIcon = (IconComponent: any, color: string) => {
  const iconHtml = renderToStaticMarkup(
    <div className={`p-2 rounded-full ${color} text-white shadow-lg border-2 border-white`}>
      <IconComponent size={16} />
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const propertyIcon = createCustomIcon(MapPin, 'bg-primary');

const amenityMeta: Record<
  NearbyAmenityKind,
  { icon: any; color: string; label: string }
> = {
  school: { icon: School, color: 'bg-sky-600', label: 'Trường học' },
  hospital: { icon: Hospital, color: 'bg-rose-600', label: 'Y tế' },
  shopping: { icon: ShoppingCart, color: 'bg-amber-500', label: 'Mua sắm' },
  park: { icon: Trees, color: 'bg-emerald-600', label: 'Công viên' },
  bus: { icon: Bus, color: 'bg-indigo-600', label: 'Giao thông' },
  gym: { icon: Dumbbell, color: 'bg-slate-700', label: 'Thể thao' },
};

interface InteractiveMapProps {
  center: [number, number];
  addressLabel: string;
  pois: NearbyAmenity[];
}

function MapViewportSync({
  center,
  pois,
}: {
  center: [number, number];
  pois: NearbyAmenity[];
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [
      center,
      ...pois.map((poi) => [poi.lat, poi.lon] as [number, number]),
    ];

    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
      return;
    }

    map.setView(center, 15);
  }, [center, map, pois]);

  return null;
}

export default function InteractiveMap({
  center,
  addressLabel,
  pois,
}: InteractiveMapProps) {
  const [mapView, setMapView] = useState<'street' | 'satellite'>('satellite');
  const mapStyleId = MAPBOX_STYLE_IDS[mapView];
  const tileUrl = MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/${mapStyleId}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = MAPBOX_TOKEN
    ? '&copy; Mapbox &copy; OpenStreetMap contributors'
    : '&copy; OpenStreetMap contributors';

  return (
    <div className="interactive-map-shell relative z-0 h-full w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="absolute right-3 top-3 z-20 flex items-center rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <button
          type="button"
          onClick={() => setMapView('street')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            mapView === 'street'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          Bản đồ
        </button>
        <button
          type="button"
          onClick={() => setMapView('satellite')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            mapView === 'satellite'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          Vệ tinh
        </button>
      </div>
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution={attribution}
          url={tileUrl}
          tileSize={MAPBOX_TOKEN ? 512 : 256}
          zoomOffset={MAPBOX_TOKEN ? -1 : 0}
        />

        <MapViewportSync center={center} pois={pois} />

        <Marker position={center} icon={propertyIcon}>
          <Popup>
            <div className="font-bold">{addressLabel}</div>
            <div className="text-xs">Vị trí bất động sản của bạn</div>
          </Popup>
        </Marker>

        {pois.map((poi) => (
          <Marker
            key={poi.id}
            position={[poi.lat, poi.lon]}
            icon={createCustomIcon(amenityMeta[poi.kind].icon, amenityMeta[poi.kind].color)}
          >
            <Popup>
              <div className="font-bold">{poi.name}</div>
              <div className="text-xs text-slate-500">{amenityMeta[poi.kind].label}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
