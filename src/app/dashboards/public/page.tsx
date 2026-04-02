"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { AlertCircle, Navigation, Search, MapPin, Crosshair } from "lucide-react";

// ─── SVG Ambulance Marker (shared style with driver view) ────────────────────
function AmbulanceSVGMarker() {
  return (
    <div className="relative flex items-center justify-center drop-shadow-lg w-8 h-16 transition-transform duration-300 origin-bottom">
      <svg width="100%" height="100%" viewBox="0 0 48 96" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="44" height="88" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
        <rect x="4" y="6" width="40" height="84" rx="6" fill="#f8fafc" />
        <path d="M6,20 Q24,12 42,20 L38,32 H10 Z" fill="#0f172a" />
        <path d="M8,22 Q24,16 40,22 L37,30 H11 Z" fill="#334155" />
        <rect x="10" y="80" width="28" height="6" rx="2" fill="#0f172a" />
        <rect x="3" y="24" width="3" height="15" fill="#0f172a" />
        <rect x="42" y="24" width="3" height="15" fill="#0f172a" />
        <rect x="12" y="38" width="24" height="32" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
        <path d="M20,44 h8 v6 h6 v8 h-6 v6 h-8 v-6 h-6 v-8 h6 z" fill="#ef4444" />
        <rect x="10" y="34" width="12" height="4" rx="2" fill="#3b82f6" />
        <rect x="26" y="34" width="12" height="4" rx="2" fill="#ef4444" />
        {/* Roof lights — always active since all displayed units are in emergency */}
        <circle cx="16" cy="36" r="4" fill="#60a5fa" opacity="0.9" className="animate-pulse" />
        <circle cx="32" cy="36" r="4" fill="#f87171" opacity="0.9" className="animate-pulse" />
        <rect x="6" y="2" width="8" height="4" rx="2" fill="#fef08a" />
        <rect x="34" y="2" width="8" height="4" rx="2" fill="#fef08a" />
        <rect x="6" y="90" width="8" height="4" rx="2" fill="#ef4444" />
        <rect x="34" y="90" width="8" height="4" rx="2" fill="#ef4444" />
      </svg>
    </div>
  );
}

interface Ambulance {
  id: string;
  lat: number;
  lng: number;
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

function DirectionsOverlay({ userPosition }: { userPosition: { lat: number; lng: number } | null }) {
  const map = useMap(); // Removed explicit ID mapId to rely on context directly
  const placesLib = useMapsLibrary("places");
  const routesLib = useMapsLibrary("routes");

  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

  const [originPoint, setOriginPoint] = useState<{ lat: number; lng: number } | null | "CURRENT_LOCATION">("CURRENT_LOCATION");
  const [destPoint, setDestPoint] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize Routing
  useEffect(() => {
    if (!routesLib || !map) return;
    setDirectionsService(new routesLib.DirectionsService());
    const renderer = new routesLib.DirectionsRenderer({ 
      map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: "#3b82f6",
        strokeOpacity: 0.8,
        strokeWeight: 6,
      },
    });
    setDirectionsRenderer(renderer);
    
    return () => {
      renderer.setMap(null);
    };
  }, [routesLib, map]);

  // Initialize Autocompletes
  useEffect(() => {
    if (!placesLib) return;

    if (originInputRef.current) {
      const originAutocomplete = new placesLib.Autocomplete(originInputRef.current, {
        fields: ["geometry", "name", "formatted_address"],
      });
      originAutocomplete.addListener("place_changed", () => {
        const place = originAutocomplete.getPlace();
        if (place.geometry?.location) {
          setOriginPoint({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
        }
      });
    }

    if (destInputRef.current) {
      const destAutocomplete = new placesLib.Autocomplete(destInputRef.current, {
        fields: ["geometry", "name", "formatted_address"],
      });
      destAutocomplete.addListener("place_changed", () => {
        const place = destAutocomplete.getPlace();
        if (place.geometry?.location) {
          setDestPoint({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
        }
      });
    }
  }, [placesLib]);

  // Manual trigger for Calculate Route via the button
  const handleNavigate = () => {
    if (!directionsService || !directionsRenderer) {
      alert("Map rendering services are still loading. Please try again in a few seconds.");
      return;
    }

    const actualOrigin = originPoint === "CURRENT_LOCATION" ? userPosition : originPoint;

    if (!actualOrigin) {
      alert("Origin location not resolved. If using 'Your location', please allow GPS permissions.");
      return;
    }

    if (!destPoint) {
      alert("Please select a specific destination from the dropdown suggestions.");
      return;
    }

    directionsService
      .route({
        origin: actualOrigin,
        destination: destPoint,
        travelMode: google.maps.TravelMode.DRIVING,
      })
      .then((response) => {
        directionsRenderer.setDirections(response);
      })
      .catch((err) => {
        console.error("Directions API error: ", err);
        alert("Could not calculate a valid driving route. Make sure the points are road-accessible.");
      });
  };

  const useCurrentLocation = () => {
    setOriginPoint("CURRENT_LOCATION");
    if (originInputRef.current) {
      originInputRef.current.value = "Current location";
    }
  };

  return (
    <div className="absolute top-6 right-6 z-[100] w-[380px] max-w-[calc(100vw-3rem)]">
      <div className="bg-white/95 backdrop-blur-3xl rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white p-2 transition-all duration-300 ring-1 ring-slate-900/5 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
        
        {/* Inner panel */}
        <div className="bg-slate-50/50 rounded-[20px] p-4 border border-slate-100">
           
           <div className="flex gap-3 relative">
              {/* Timeline Track */}
              <div className="flex flex-col items-center pt-3 pb-3 w-4">
                 <div className="w-3.5 h-3.5 rounded-full border-[3px] border-blue-600 bg-slate-50 z-10 shadow-sm" />
                 <div className="w-0.5 flex-1 bg-gradient-to-b from-blue-200 via-slate-200 to-rose-200 my-1 opacity-60 rounded-full" />
                 <MapPin className="w-4 h-4 text-rose-500 z-10 -ml-px" />
              </div>

              {/* Inputs */}
              <div className="flex flex-col flex-1 gap-3">
                 
                 {/* Origin */}
                 <div className="relative bg-white border border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-xl overflow-hidden shadow-sm transition-all duration-200 group">
                    <input
                      ref={originInputRef}
                      type="text"
                      placeholder="Enter starting point"
                      defaultValue="Current location"
                      onChange={(e) => {
                        if (e.target.value === "") setOriginPoint(null);
                      }}
                      className="w-full text-[14px] font-medium text-slate-800 placeholder:text-slate-400 py-3 pl-3 pr-10 outline-none bg-transparent"
                    />
                    <button 
                       onClick={useCurrentLocation}
                       className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                       title="Use current location"
                    >
                       <Crosshair className="w-4 h-4" />
                    </button>
                 </div>

                 {/* Destination */}
                 <div className="relative bg-white border border-slate-200 hover:border-slate-300 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
                    <input
                      ref={destInputRef}
                      type="text"
                      placeholder="Where are you going?"
                      className="w-full text-[14px] font-medium text-slate-800 placeholder:text-slate-400 py-3 px-3 outline-none bg-transparent"
                    />
                 </div>

              </div>
           </div>

           {/* Action Button */}
           <button 
             onClick={handleNavigate}
             className="mt-5 w-full bg-slate-900 hover:bg-blue-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-blue-600/30 transition-all duration-300 flex items-center justify-center gap-2 group transform active:scale-[0.98]"
           >
             <span>Get Directions</span>
             <Navigation className="w-4 h-4 opacity-80 group-hover:translate-x-1 transition-all duration-300" />
           </button>

        </div>
      </div>
    </div>
  );
}

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
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
      
      {/* MAP LAYER */}
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_KEY_HERE"}>
        <Map 
          defaultCenter={userPosition || { lat: 19.0760, lng: 72.8777 }} 
          defaultZoom={14} 
          disableDefaultUI={true}
          zoomControl={true}
          gestureHandling="greedy"
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

          {/* Active Ambulances - SVG marker */}
          {activeAmbulances.map((amb) => (
             <AdvancedMarker 
                key={amb.id} 
                position={{ lat: amb.lat, lng: amb.lng }}
                title={`Driver: ${amb.driverName}`}
             >
                <AmbulanceSVGMarker />
             </AdvancedMarker>
          ))}
          
          <DirectionsOverlay userPosition={userPosition} />
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
