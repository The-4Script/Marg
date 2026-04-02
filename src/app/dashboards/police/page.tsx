"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { ShieldAlert, Crosshair, MapPin, Route as RouteIcon, Navigation } from "lucide-react";

interface Ambulance {
  id: string;
  lat: number;
  lng: number;
  driverName: string;
  status: string;
}

interface Hospital {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

// Road-based route renderer using Google Maps DirectionsService
const DirectionsRouteLine = ({
  origin,
  destination,
}: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");

  useEffect(() => {
    if (!map || !routesLib) return;

    const directionsService = new routesLib.DirectionsService();
    const directionsRenderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true, // We draw our own markers
      polylineOptions: {
        strokeColor: "#ef4444",
        strokeOpacity: 0.85,
        strokeWeight: 5,
      },
    });

    directionsService.route(
      {
        origin,
        destination,
        travelMode: routesLib.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          directionsRenderer.setDirections(result);
        }
      }
    );

    return () => {
      directionsRenderer.setMap(null);
    };
  // Re-fetch route when coords change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, routesLib, origin.lat, origin.lng, destination.lat, destination.lng]);

  return null;
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

// Dark Mode Google Maps Overrides
const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

export default function PoliceDashboard() {
  const [activeAmbulances, setActiveAmbulances] = useState<Ambulance[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  // 1. Listen for active emergency fleets
  useEffect(() => {
    const q = query(collection(db, "ambulances"), where("status", "==", "active"));
    const unsub = onSnapshot(q, (snapshot) => {
      const active: Ambulance[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Ambulance;
        active.push({ ...data, id: doc.id });
      });
      setActiveAmbulances(active);
    });
    return () => unsub();
  }, []);

  // 2. Fetch known registered hospital locations for destination routing mapping
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "hospital"));
        const snap = await getDocs(q);
        const docs: Hospital[] = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (data.hospitalLocation) {
             docs.push({
               id: doc.id,
               name: data.name || "Hospital Facility",
               lat: data.hospitalLocation.lat,
               lng: data.hospitalLocation.lng
             });
          }
        });
        setHospitals(docs);
      } catch (e) {
        console.error("Failed to fetch hospital endpoints", e);
      }
    };
    fetchHospitals();
  }, []);

  // Get nearest hospital for an ambulance securely
  const getNearestDestination = (ambLat: number, ambLng: number) => {
     if (hospitals.length === 0) return null; // No registered hospitals — don't fabricate a route
     let closest = hospitals[0];
     let minDistance = Infinity;
     hospitals.forEach(h => {
        const d = calculateDistance(ambLat, ambLng, h.lat, h.lng);
        if (d < minDistance) {
           minDistance = d;
           closest = h;
        }
     });
     return { lat: closest.lat, lng: closest.lng, name: closest.name };
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-[calc(100vh-120px)] flex flex-col lg:flex-row shadow-2xl rounded-xl border border-slate-800 overflow-hidden">
      
      {/* SIDEBAR: Command Center Intelligence Grid */}
      <div className="w-full lg:w-[450px] bg-slate-950 border-r border-slate-800 flex flex-col z-10 shadow-xl overflow-y-auto">
         
         {/* Live Counter */}
         <div className="p-6 border-b border-slate-800 bg-slate-950/80 sticky top-0 backdrop-blur-md z-20">
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 uppercase">Central Command</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
              Traffic Authority <ShieldAlert className="w-4 h-4" />
            </p>

            <div className={`p-4 border-2 rounded-xl flex items-center justify-between ${activeAmbulances.length > 0 ? "bg-red-950/40 border-red-500/50" : "bg-slate-900 border-slate-800"}`}>
               <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Grid Status</p>
                 <p className={`text-xl font-black ${activeAmbulances.length > 0 ? "text-red-500" : "text-emerald-500"}`}>
                   {activeAmbulances.length} ACTIVE EMERGENCIES
                 </p>
               </div>
               <div className={`w-4 h-4 rounded-full ${activeAmbulances.length > 0 ? "bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]" : "bg-emerald-500"}`}></div>
            </div>
         </div>

         {/* Dispatch Feed */}
         <div className="p-4 flex-1">
            {activeAmbulances.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-8">
                  <Crosshair className="w-12 h-12 mb-4" />
                  <p className="font-semibold">City Grid Clear</p>
                  <p className="text-sm mt-2">Awaiting dispatched units requiring traffic clearance.</p>
               </div>
            ) : (
               <div className="space-y-4">
                  {activeAmbulances.map(amb => {
                     const dest = getNearestDestination(amb.lat, amb.lng);
                     const dist = dest ? calculateDistance(amb.lat, amb.lng, dest.lat, dest.lng) : null;
                     const etaMins = dist ? dist * 1.5 : null;

                     return (
                        <div key={amb.id} className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 relative overflow-hidden transition-all hover:bg-slate-800">
                           <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                           
                           {/* Card Top */}
                           <div className="flex justify-between items-start mb-4">
                              <div>
                                 <h3 className="font-bold text-white tracking-wide">{amb.driverName}</h3>
                              </div>
                              <div className="text-right">
                                 {etaMins != null ? (
                                   <>
                                     <p className="text-xl font-black text-red-500 leading-none">{Math.max(1, Math.ceil(etaMins))}m</p>
                                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Live ETA</p>
                                   </>
                                 ) : (
                                   <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No ETA</p>
                                 )}
                              </div>
                           </div>

                           {/* Card Body */}
                           <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                 <Navigation className="w-4 h-4 text-emerald-500 mt-0.5" />
                                 <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Origin / Current GPS</p>
                                    <p className="text-sm font-medium text-slate-300 font-mono tracking-tight">{amb.lat.toFixed(5)}, {amb.lng.toFixed(5)}</p>
                                 </div>
                              </div>
                              
                              {dest && (
                                <>
                                  <div className="pl-2 border-l-2 border-slate-800 ml-1.5 h-3"></div>
                                  <div className="flex items-start gap-3">
                                     <MapPin className="w-4 h-4 text-indigo-400 mt-0.5" />
                                     <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Routed Destination</p>
                                        <p className="text-sm font-medium text-slate-300">{dest.name}</p>
                                     </div>
                                  </div>
                                </>
                              )}
                           </div>

                           {/* Clearance Strip */}
                           <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                              <span className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-widest">
                                 <RouteIcon className="w-3.5 h-3.5" />
                                 {dist != null ? `${dist.toFixed(1)} km Transit Route` : "Route Pending"}
                              </span>
                              <span className="text-xs font-bold text-red-500 animate-pulse uppercase tracking-wider">CLEARANCE REQ</span>
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>

      </div>

      {/* MAP LAYER */}
      <div className="flex-1 relative bg-slate-900 min-h-[500px]">
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_KEY_HERE"}>
          <Map 
            defaultCenter={activeAmbulances.length > 0 ? { lat: activeAmbulances[0].lat, lng: activeAmbulances[0].lng } : { lat: 19.0760, lng: 72.8777 }} 
            defaultZoom={13} 
            disableDefaultUI={true}
            gestureHandling="greedy"
            mapId="police-command-map"
          >
             {activeAmbulances.map(amb => {
                const dest = getNearestDestination(amb.lat, amb.lng);
                return (
                   <React.Fragment key={amb.id}>
                      {/* Route line only if a real registered hospital destination exists */}
                      {dest && <DirectionsRouteLine origin={{lat: amb.lat, lng: amb.lng}} destination={{lat: dest.lat, lng: dest.lng}} />}
                      
                      {/* Active Ambulance Marker */}
                      <AdvancedMarker position={{lat: amb.lat, lng: amb.lng}} title={amb.driverName}>
                        <div className="bg-slate-900 border border-red-500/50 p-2 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center justify-center">
                           <span className="text-xl">🚨</span>
                        </div>
                      </AdvancedMarker>

                      {/* Destination Hospital Marker — only if registered hospital found */}
                      {dest && (
                        <AdvancedMarker position={{lat: dest.lat, lng: dest.lng}} title={dest.name}>
                          <div className="bg-slate-900 border border-indigo-500/50 p-1.5 rounded-sm flex items-center justify-center opacity-80">
                             <span className="text-lg">🏥</span>
                          </div>
                        </AdvancedMarker>
                      )}
                   </React.Fragment>
                );
             })}
          </Map>
        </APIProvider>
      </div>

    </div>
  );
}
