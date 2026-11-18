'use client';

import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    title: string;
    description?: string;
  }>;
  selected?: [number, number] | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  onMarkerDrag?: (lat: number, lng: number) => void;
  height?: string;
}

export default function Map({
  center = [41.37, 64.58],
  zoom = 13,
  markers = [],
  selected = null,
  onLocationSelect,
  onMarkerDrag,
  height = '400px',
}: MapProps) {
  const [LeafletMap, setLeafletMap] = useState<any>(null);
  const [Lref, setLref] = useState<any>(null); // ✅ leaflet ob'ekti

  useEffect(() => {
    import('react-leaflet').then((mod) => {
      setLeafletMap({
        MapContainer: mod.MapContainer,
        TileLayer: mod.TileLayer,
        Marker: mod.Marker,
        Popup: mod.Popup,
        useMapEvents: mod.useMapEvents,
        useMap: mod.useMap,
      });
    });

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
      setLref(L); // ✅ SHU YERDA — useEffect ichida, import('leaflet') then'ida
    });
  }, []);

  // Ikkalasi ham yuklanmaguncha loading (bir zumda o'tadi)
  if (!LeafletMap || !Lref) {
    return <div style={{ height }} className="bg-gray-200 rounded-xl animate-pulse" />;
  }

  const { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } = LeafletMap;

  // 📍 Inline SVG marker (CDN kerak emas, har doim ko'rinadi)
  const makeDivIcon = (color: string) =>
    Lref.divIcon({
      className: '',
      html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="15" r="6" fill="white"/>
      </svg>`,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -40],
    });

  function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    const [lat, lng] = center;
    useEffect(() => {
      map.setView([lat, lng], zoom);
    }, [lat, lng, zoom, map]);
    return null;
  }

  function ClickHandler() {
    useMapEvents({
      click(e: any) {
        onLocationSelect?.(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '12px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController center={center} zoom={zoom} />
      {onLocationSelect && <ClickHandler />}

      {/* Buyurtma markerlari — KO'K pin */}
      {markers.map((marker, index) => (
        <Marker key={index} position={marker.position} icon={makeDivIcon('#2563eb')}>
          <Popup>
            <strong>{marker.title}</strong>
            {marker.description && <p>{marker.description}</p>}
          </Popup>
        </Marker>
      ))}

      {/* 📍 Tanlangan manzil — QIZIL pin, SURILADIGAN */}
      {selected && (
        <Marker
          position={selected}
          draggable={true}
          icon={makeDivIcon('#dc2626')}
          eventHandlers={{
            dragend: (e: any) => {
              const ll = e.target.getLatLng();
              onMarkerDrag?.(ll.lat, ll.lng);
            },
          }}
        >
          <Popup>📍 Tanlangan manzil — <b>suring</b></Popup>
        </Marker>
      )}
    </MapContainer>
  );
}