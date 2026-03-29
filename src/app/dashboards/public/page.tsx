"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { APIProvider, Map, AdvancedMarker, Marker } from "@vis.gl/react-google-maps";
import { AlertCircle, Navigation } from "lucide-react";

interface Ambulance {
  id: string;
  lat: number;
  lng: number;
  patientType: string;
  driverName: string;
  status: string;
}

interface WarningState {
  distance: number;
  eta: number;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth ratio in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export default function PublicDashboard() {
  const [activeAmbulances, setActiveAmbulances] = useState<Ambulance[]>([]);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestWarning, setNearestWarning] = useState<WarningState | null>(null);

  // 1. Get User Location
  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Public Geo Error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
    return () => {
      if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // 2. Listen to Active Ambulances Globally
  useEffect(() => {
    const q = query(
      collection(db, "ambulances"),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveData: Ambulance[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        liveData.push({
          id: doc.id,
          lat: data.lat,
          lng: data.lng,
          patientType: data.patientType,
          driverName: data.driverName,
          status: data.status,
        });
      });
      setActiveAmbulances(liveData);
    });

    return () => unsubscribe();
  }, []);

  // 3. Proximity Calculation Loop
  useEffect(() => {
    if (!userPosition || activeAmbulances.length === 0) {
      setNearestWarning(null);
      return;
    }

    let minDistance = Infinity;

    activeAmbulances.forEach((amb) => {
      const dist = calculateDistance(userPosition.lat, userPosition.lng, amb.lat, amb.lng);
      if (dist < minDistance) {
        minDistance = dist;
      }
    });

    // If nearest is within 2km threshold:
    if (minDistance <= 2.0) {
      // 40km/h average -> 60 mins covering 40km = 1.5 mins per km
      const etaMinutes = minDistance * 1.5; 
      setNearestWarning({
        distance: minDistance,
        eta: etaMinutes
      });
    } else {
      setNearestWarning(null);
    }
  }, [userPosition, activeAmbulances]);

  return (
    <div className="relative w-full h-[calc(100vh-100px)] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      
      {/* MAP LAYER */}
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_KEY_HERE"}>
        <Map 
          defaultZoom={14} 
          center={userPosition || { lat: 19.0760, lng: 72.8777 }} 
          disableDefaultUI={true}
          mapId="public-awareness-map"
        >
          {/* User Marker */}
          {userPosition && (
            <AdvancedMarker position={userPosition} title="Your Location">
              <div className="w-5 h-5 bg-blue-500 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </AdvancedMarker>
          )}

          {/* Active Ambulances */}
          {activeAmbulances.map((amb) => (
             <AdvancedMarker 
                key={amb.id} 
                position={{ lat: amb.lat, lng: amb.lng }}
                title={`Driver: ${amb.driverName} | Patient: ${amb.patientType}`}
             >
                <div className="bg-white p-2 rounded-full border border-slate-200 shadow-md flex items-center justify-center text-xl transition-transform hover:scale-110 cursor-help">
                  🚑
                </div>
             </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>

      {/* NON-PANIC PROXIMITY BANNER */}
      {nearestWarning && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 min-w-[340px] max-w-md w-full px-4">
          <div className="bg-white/95 backdrop-blur-md shadow-2xl border border-slate-200 px-5 py-4 rounded-2xl flex items-center gap-4 transition-all duration-500 ease-out translate-y-0 opacity-100">
            <div className="flex-shrink-0 w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-[15px] font-semibold text-slate-900 tracking-tight">Ambulance Nearby</h4>
              <p className="text-sm text-slate-500 mt-0.5 leading-snug">
                Approximately <strong>{Math.max(1, Math.ceil(nearestWarning.eta))} min{Math.ceil(nearestWarning.eta) !== 1 ? 's' : ''}</strong> away ({nearestWarning.distance.toFixed(1)}km).<br/>Please prepare to yield.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Info Header (Subtle) */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm px-4 py-3 rounded-xl flex items-center gap-3">
           <Navigation className="w-4 h-4 text-blue-600" />
           <p className="text-sm font-medium text-slate-700">Live City Monitoring</p>
           <span className="ml-2 bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200">
              {activeAmbulances.length} Active Unit{activeAmbulances.length === 1 ? '' : 's'}
           </span>
        </div>
      </div>

    </div>
  );
}
