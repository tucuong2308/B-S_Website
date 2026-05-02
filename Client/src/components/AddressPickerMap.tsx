import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface AddressPickerMapProps {
  center: [number, number];
  selectedPosition: [number, number] | null;
  onSelect: (position: [number, number]) => void;
}

function MapViewportSync({
  center,
  selectedPosition,
}: {
  center: [number, number];
  selectedPosition: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

function MapClickHandler({ onSelect }: { onSelect: (position: [number, number]) => void }) {
  useMapEvents({
    click(event) {
      onSelect([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

export default function AddressPickerMap({
  center,
  selectedPosition,
  onSelect,
}: AddressPickerMapProps) {
  const [mapView, setMapView] = useState<'street' | 'satellite'>('satellite');
  const mapStyleId = MAPBOX_STYLE_IDS[mapView];
  const tileUrl = MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/${mapStyleId}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = MAPBOX_TOKEN
    ? '&copy; Mapbox &copy; OpenStreetMap contributors'
    : '&copy; OpenStreetMap contributors';

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
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
        zoom={16}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution={attribution}
          url={tileUrl}
          tileSize={MAPBOX_TOKEN ? 512 : 256}
          zoomOffset={MAPBOX_TOKEN ? -1 : 0}
        />
        <MapViewportSync center={center} selectedPosition={selectedPosition} />
        <MapClickHandler onSelect={onSelect} />
        {selectedPosition ? <Marker position={selectedPosition} /> : null}
      </MapContainer>
    </div>
  );
}
