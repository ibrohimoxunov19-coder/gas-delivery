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
  onMarkerDrag?: (lat: number, lng: number) => void; // 📍 markerni surganda
  height?: string;
}

export default function Map({
  center = [41.37, 64.58],
  zoom = 6,
  markers = [],
  selected = null,
  onLocationSelect,
  onMarkerDrag,
  height = '400px',
}: MapProps) {
  const [LeafletMap, setLeafletMap] = useState<any>(null);

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
    });
  }, []);

  if (!LeafletMap) {
    return <div style={{ height }} className="bg-gray-200 rounded-xl animate-pulse" />;
  }

  const { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } = LeafletMap;

  // Markaz/zoom o'zgarganda xaritani sakratadi (klik/drag'da center o'zgarmaydi → siljimaydi)
  function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    const [lat, lng] = center;
    useEffect(() => {
      map.setView([lat, lng], zoom);
    }, [lat, lng, zoom, map]);
    return null;
  }

  // Xaritaga klik — manzil qo'yish
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

      {/* Buyurtma markerlari (haydovchi/xarita ko'rinishi) */}
      {markers.map((marker, index) => (
        <Marker key={index} position={marker.position}>
          <Popup>
            <strong>{marker.title}</strong>
            {marker.description && <p>{marker.description}</p>}
          </Popup>
        </Marker>
      ))}

      {/* 📍 Tanlangan manzil — SURILADIGAN (draggable) */}
      {selected && (
        <Marker
          position={selected}
          draggable={true}
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