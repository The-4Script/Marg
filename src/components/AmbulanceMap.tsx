"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const getHospitalIcon = (isSelected: boolean) => L.divIcon({
  html: isSelected
    ? '<div class="w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.8)] border-4 border-white bg-cyan-500 transition-all duration-300 scale-125 cursor-pointer"><span class="font-black text-base text-slate-950">H</span></div>'
    : '<div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-4 border-red-500 bg-slate-900 transition-all duration-300 hover:scale-110 cursor-pointer"><span class="font-black text-base text-red-500">H</span></div>',
  className: "custom-leaflet-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const getAmbulanceIcon = (emergency: boolean, scale: number) => L.divIcon({
  html: `<div style="transform: scale(${scale})" class="relative flex items-center justify-center drop-shadow-lg w-8 h-16 origin-bottom">
    <svg width="100%" height="100%" viewBox="0 0 48 96" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="44" height="88" rx="8" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" />
      <rect x="4" y="6" width="40" height="84" rx="6" fill="#f8fafc" />
      <path d="M6,20 Q24,12 42,20 L38,32 H10 Z" fill="#0f172a" />
      <path d="M8,22 Q24,16 40,22 L37,30 H11 Z" fill="#334155" />
      <rect x="10" y="80" width="28" height="6" rx="2" fill="#0f172a" />
      <rect x="3" y="24" width="3" height="15" fill="#0f172a" />
      <rect x="42" y="24" width="3" height="15" fill="#0f172a" />
      <rect x="12" y="38" width="24" height="32" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
      <path d="M20,44 h8 v6 h6 v8 h-6 v6 h-8 v-6 h-6 v-8 h6 z" fill="#ef4444" />
      <rect x="10" y="34" width="12" height="4" rx="2" fill="#3b82f6" />
      <rect x="26" y="34" width="12" height="4" rx="2" fill="#ef4444" />
      ${emergency ? '<circle cx="16" cy="36" r="4" fill="#60a5fa" opacity="0.9" class="animate-pulse" />' : ''}
      ${emergency ? '<circle cx="32" cy="36" r="4" fill="#f87171" opacity="0.9" class="animate-pulse" />' : ''}
    </svg>
  </div>`,
  className: "custom-leaflet-icon",
  iconSize: [32, 64],
  iconAnchor: [16, 64]
});

const destinationIcon = L.divIcon({
  html: '<div class="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.8)] border-[3px] border-white animate-pulse"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-slate-900"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>',
  className: "custom-leaflet-icon",
  iconSize: [48, 48],
  iconAnchor: [24, 48]
});

export type PlaceResult = {
  place_id: string;
  name: string;
  vicinity?: string;
  rating?: number;
  geometry: { location: { lat: number; lng: number } };
};

export default function AmbulanceMap({
  initialPosition, position, emergency, destination, selectedPlaceId, onSelectHospital, zoom, setZoom
}: {
  initialPosition: { lat: number; lng: number } | null;
  position: { lat: number; lng: number } | null;
  emergency: boolean;
  destination: { lat: number; lng: number } | null;
  selectedPlaceId: string | null;
  onSelectHospital: (place: PlaceResult | null) => void;
  zoom: number;
  setZoom: (z: number) => void;
}) {
  const [hospitals, setHospitals] = useState<PlaceResult[]>([]);
  const [route, setRoute] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!initialPosition) return;
    const fetchHospitals = async () => {
      const radius = 5000;
      const query = `[out:json];(node["amenity"="hospital"](around:${radius},${initialPosition.lat},${initialPosition.lng});way["amenity"="hospital"](around:${radius},${initialPosition.lat},${initialPosition.lng}););out center;`;
      try {
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await response.json();
        const results = data.elements.map((el: any) => ({
          place_id: el.id.toString(),
          name: el.tags?.name || "Unknown Hospital",
          vicinity: el.tags?.['addr:street'] || "Unknown location",
          geometry: { location: { lat: el.lat || el.center?.lat, lng: el.lon || el.center?.lon } }
        })).filter((h: any) => h.geometry.location.lat);
        setHospitals(results);
      } catch (e) { console.error("Error fetching hospitals", e); }
    };
    fetchHospitals();
  }, [initialPosition]);

  useEffect(() => {
    if (!position || !destination) {
      setRoute([]);
      return;
    }
    const fetchRoute = async () => {
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${position.lng},${position.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
          setRoute(coords);
        }
      } catch (e) { console.error("Error fetching routing", e); }
    };
    fetchRoute();
  }, [destination, position?.lat, position?.lng]);

  const MapEvents = () => {
    const map = useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
    return null;
  };

  const MapUpdater = () => {
    const map = useMap();
    useEffect(() => { if (position) map.setView([position.lat, position.lng], map.getZoom(), { animate: true }); }, [position, map]);
    return null;
  };

  if (!initialPosition) return null;

  return (
    <MapContainer center={[initialPosition.lat, initialPosition.lng]} zoom={zoom} className="w-full h-full z-0 bg-slate-900" zoomControl={false}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
      <MapEvents />
      
      {!destination && hospitals.map(h => (
        <Marker key={h.place_id} position={[h.geometry.location.lat, h.geometry.location.lng]} icon={getHospitalIcon(h.place_id === selectedPlaceId)} eventHandlers={{ click: () => onSelectHospital(h) }} zIndexOffset={h.place_id === selectedPlaceId ? 100 : 10} />
      ))}

      {destination && <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} zIndexOffset={50} />}

      {route.length > 0 && destination && <Polyline positions={route} pathOptions={{ color: "#06b6d4", weight: 6, opacity: 0.8 }} />}

      {position && <Marker position={[position.lat, position.lng]} icon={getAmbulanceIcon(emergency, Math.max(0.3, Math.min(1.0, (zoom - 11) / 4)))} zIndexOffset={100} />}
      <MapUpdater />
    </MapContainer>
  );
}
