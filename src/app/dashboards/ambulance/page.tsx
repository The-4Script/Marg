"use client";

import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { HeartPulse, Activity, Flame, Brain, Baby, PlusSquare, MapPin } from "lucide-react";

type PatientType = "Cardiac Arrest" | "Trauma/Accident" | "Burns" | "Neurological" | "Maternity" | "General Emergency";

const PATIENT_TYPES: { label: PatientType; icon: React.ReactNode }[] = [
  { label: "Cardiac Arrest", icon: <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { label: "Trauma/Accident", icon: <Activity className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { label: "Burns", icon: <Flame className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { label: "Neurological", icon: <Brain className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { label: "Maternity", icon: <Baby className="w-5 h-5 sm:w-6 sm:h-6" /> },
  { label: "General Emergency", icon: <PlusSquare className="w-5 h-5 sm:w-6 sm:h-6" /> },
];

function HospitalMarkers({ position }: { position: { lat: number, lng: number } }) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [hospitals, setHospitals] = useState<google.maps.places.PlaceResult[]>([]);

  useEffect(() => {
    if (!map || !placesLib || !position) return;
    const service = new placesLib.PlacesService(map);
    service.nearbySearch(
      { location: position, radius: 5000, type: 'hospital' },
      (results, status) => {
        if (status === placesLib.PlacesServiceStatus.OK && results) {
          setHospitals(results);
        }
      }
    );
  }, [map, placesLib, position]);

  return (
    <>
      {hospitals.map((h, i) => {
        if (!h.geometry || !h.geometry.location) return null;
        return (
          <AdvancedMarker key={i} position={h.geometry.location} title={h.name}>
             <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-md flex items-center justify-center shadow-lg border-2 border-red-500 overflow-hidden">
               <span className="text-red-500 font-black text-[10px] leading-none">H</span>
             </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

export default function AmbulanceDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [patientType, setPatientType] = useState<PatientType | null>(null);
  const [status, setStatus] = useState<"inactive" | "active">("inactive");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState(0);

  // Keep a ref of the latest position so the interval always grabs the current state
  const positionRef = useRef(position);

  // Authenticate driver
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsub();
  }, []);

  // Track coordinates continuously & calculate heading
  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          
          setPosition((prev) => {
            if (prev) {
              const dLng = newPos.lng - prev.lng;
              const dLat = newPos.lat - prev.lat;
              if (Math.abs(dLng) > 0.00001 || Math.abs(dLat) > 0.00001) {
                let angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
                setHeading(angle);
              }
            }
            positionRef.current = newPos;
            return newPos;
          });
        },
        (err) => console.error("Geolocation Error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
    return () => {
      if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Broadcast interval
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (status === "active" && user) {
      intervalId = setInterval(async () => {
        const currentPos = positionRef.current;
        if (!currentPos) return;

        const ambulanceRef = doc(db, "ambulances", user.uid);
        try {
          await setDoc(ambulanceRef, {
            lat: currentPos.lat,
            lng: currentPos.lng,
            heading: heading,
            patientType: patientType || "General Emergency",
            status: "active",
            timestamp: serverTimestamp(),
            driverName: user.displayName || "Ambulance Driver",
          }, { merge: true });
        } catch (error) {
          console.error("Broadcast failed:", error);
        }
      }, 3000); // 3 seconds broadcast
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, user, patientType, heading]);

  const handleStartEmergency = () => {
    setStatus("active");
  };

  const handleEndEmergency = async () => {
    setStatus("inactive");
    if (user) {
      try {
        const ambulanceRef = doc(db, "ambulances", user.uid);
        await updateDoc(ambulanceRef, { status: "inactive" });
      } catch (e) {
        console.error("Could not set inactive state", e);
      }
    }
  };

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 antialiased overflow-hidden relative selection:bg-red-500/30">
      
      {/* Background Grid Texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4vw_4vw] sm:bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950 opacity-80 pointer-events-none" />

      {/* Main Container - The Phone Mockup */}
      <div 
         className="bg-slate-950 rounded-[2.5rem] sm:rounded-[3.5rem] border-[min(2vw,8px)] sm:border-[12px] border-slate-800 shadow-[0_20px_80px_rgba(0,0,0,0.8),inset_0_0_10px_rgba(255,255,255,0.05)] overflow-hidden relative flex flex-col ring-1 ring-white/10"
         style={{ height: '85vh', maxHeight: '900px', width: 'auto', aspectRatio: '9/19.5', maxWidth: '400px' }}
      >
        
        {/* Dynamic Island / Notch */}
        <div className="absolute top-0 inset-x-0 w-1/3 max-w-[120px] h-[3.5%] min-h-[24px] bg-slate-900 rounded-b-3xl mx-auto z-50 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.5)] border-b border-x border-slate-800/50 flex items-center justify-center space-x-2 px-2">
           <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-800 shadow-[inset_0_1px_2px_rgba(0,0,0,1)]"></div>
           <div className="w-8 sm:w-12 h-1.5 sm:h-2 rounded-full bg-slate-800 shadow-[inset_0_1px_2px_rgba(0,0,0,1)]"></div>
        </div>

        {/* Status Pill Badge (Header) */}
        <div className="absolute top-[6%] inset-x-0 mx-auto w-max z-40 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-2">
          <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${status === 'active' ? 'bg-red-500 animate-[pulse_1s_infinite] shadow-[0_0_12px_rgba(239,68,68,1)]' : 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,1)]'}`} />
          <span className="text-[0.6rem] sm:text-[0.65rem] font-black tracking-[0.2em] text-white uppercase mt-[1px]">
            {status === "active" ? "EMERGENCY ACTIVE" : "STANDBY"}
          </span>
        </div>

        {/* Top Section - Live Google Map (~45%) */}
        <div className="h-[45%] w-full relative shrink-0 bg-slate-900 border-b border-slate-800 overflow-hidden flex flex-col">
          {position ? (
            <div className="flex-1 w-full h-full">
              <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_KEY_HERE"}>
                <Map 
                  defaultZoom={17} 
                  tilt={45}
                  heading={heading}
                  center={position} 
                  disableDefaultUI={true}
                  mapId="ambulance-map"
                  className="w-full h-full"
                  style={{ width: "100%", height: "100%" }}
                >
                  <HospitalMarkers position={position} />

                  <AdvancedMarker position={position} zIndex={50}>
                    <div className="relative flex items-center justify-center filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.6)] w-12 h-24 sm:w-12 sm:h-24">
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
                        <circle cx="16" cy="36" r="4" fill="#60a5fa" filter="blur(2px)" opacity={status === 'active' ? "0.8" : "0"} className="animate-pulse" />
                        <circle cx="32" cy="36" r="4" fill="#f87171" filter="blur(2px)" opacity={status === 'active' ? "0.8" : "0"} className="animate-pulse" />
                        <rect x="6" y="2" width="8" height="4" rx="2" fill="#fef08a" />
                        <rect x="34" y="2" width="8" height="4" rx="2" fill="#fef08a" />
                        <polygon points="6,2 14,2 10,-20 2,-20" fill="#fef08a" opacity="0.3" filter="blur(3px)" />
                        <polygon points="34,2 42,2 46,-20 38,-20" fill="#fef08a" opacity="0.3" filter="blur(3px)" />
                        <rect x="6" y="90" width="8" height="4" rx="2" fill="#ef4444" />
                        <rect x="34" y="90" width="8" height="4" rx="2" fill="#ef4444" />
                      </svg>
                    </div>
                  </AdvancedMarker>
                </Map>
              </APIProvider>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-500 font-medium z-10 w-full h-full">
              <MapPin className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse mb-2 opacity-50" />
              <span className="text-[0.6rem] sm:text-xs uppercase tracking-widest animate-pulse">Acquiring GPS...</span>
            </div>
          )}
          
          <div className="absolute inset-x-0 bottom-0 h-[10%] bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-10" />
        </div>

        {/* Middle Section - Patient Selector */}
        <div className="flex-1 bg-slate-950 flex flex-col p-[4%] pb-[25%] overflow-y-auto custom-scrollbar h-full w-full">
          <div className="flex items-center justify-between mb-3 shrink-0">
             <h3 className="text-[0.6rem] sm:text-[0.7rem] font-black text-slate-500 uppercase tracking-widest">Select Patient Type <span className="text-slate-600 font-normal lowercase tracking-normal hidden sm:inline">(Optional)</span></h3>
             {status === 'active' && patientType && (
                <span className="text-[0.55rem] sm:text-[0.6rem] px-2 py-0.5 rounded-sm bg-red-950/50 text-red-500 font-bold border border-red-900/50 uppercase tracking-wider">
                  {patientType}
                </span>
             )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 h-full w-full pb-4">
            {PATIENT_TYPES.map((type) => {
              const isActive = patientType === type.label;
              return (
                <button 
                  key={type.label}
                  disabled={status === "active"}
                  onClick={() => setPatientType(isActive ? null : type.label)}
                  className={`flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] w-full h-full min-h-[4rem] sm:min-h-[5rem] ${
                     isActive 
                        ? "border-red-600 bg-red-950/20 text-red-500 shadow-[inset_0_0_20px_rgba(220,38,38,0.15)]" 
                        : "border-slate-800/80 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:bg-slate-800 disabled:opacity-30 disabled:hover:scale-100 disabled:active:scale-100"
                  }`}
                >
                  <div className={isActive ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "text-slate-500"}>
                    {type.icon}
                  </div>
                  <span className="text-[0.6rem] sm:text-[0.65rem] font-bold text-center leading-tight tracking-wide px-1">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Button Area - Pinned */}
        <div className="absolute bottom-0 inset-x-0 h-[10%] min-h-[4rem] bg-gradient-to-t from-slate-950 via-slate-950 border-t border-slate-900 flex items-end w-full">
          {status === "inactive" ? (
            <button 
              onClick={handleStartEmergency}
              className="w-full h-full bg-red-600 text-white flex items-center justify-center text-sm sm:text-[1.1rem] font-black tracking-[0.2em] uppercase shadow-[0_-10px_40px_rgba(220,38,38,0.2)] hover:bg-red-500 active:bg-red-700 transition-colors disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none pb-2 sm:pb-4"
            >
              Start Emergency
            </button>
          ) : (
            <button 
              onClick={handleEndEmergency}
              className="w-full h-full bg-slate-950 text-white flex items-center justify-center text-sm sm:text-[1.1rem] font-black tracking-[0.2em] uppercase relative overflow-hidden group pb-2 sm:pb-4"
            >
              <div className="absolute inset-0 border-t-[min(1vh,4px)] border-red-600 animate-[pulse_1s_infinite]" />
              <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ef4444_10px,#ef4444_20px)] animate-[pan_10s_linear_infinite]" />
              
              <span className="relative z-10 text-red-500 group-hover:text-red-400 group-active:scale-95 transition-transform duration-100 flex items-center gap-2 sm:gap-3">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-sm"></span>
                End Emergency
              </span>
            </button>
          )}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html:`
        @keyframes pan {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
      `}} />
    </div>
  );
}
