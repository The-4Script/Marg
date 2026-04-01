"use client";

import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin, Mic, Square, Loader2, CheckCircle, Navigation, X } from "lucide-react";

// ─── Hospital Markers ────────────────────────────────────────────────────────
function HospitalMarkers({ 
  position, 
  onSelect, 
  selectedPlaceId 
}: { 
  position: { lat: number; lng: number };
  onSelect: (place: google.maps.places.PlaceResult | null) => void;
  selectedPlaceId: string | null;
}) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const [hospitals, setHospitals] = useState<google.maps.places.PlaceResult[]>([]);

  useEffect(() => {
    if (!map || !placesLib || !position) return;
    const service = new placesLib.PlacesService(map);
    service.nearbySearch(
      { location: position, radius: 5000, type: "hospital" },
      (results, status) => {
        if (status === placesLib.PlacesServiceStatus.OK && results) setHospitals(results);
      }
    );
  }, [map, placesLib, position]);

  return (
    <>
      {hospitals.map((h, i) => {
        if (!h.geometry?.location || !h.place_id) return null;
        const isSelected = h.place_id === selectedPlaceId;
        return (
          <AdvancedMarker 
            key={h.place_id || i} 
            position={h.geometry.location} 
            title={h.name}
            onClick={() => onSelect(h)}
            zIndex={isSelected ? 60 : 10}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-4 transition-all duration-300 cursor-pointer ${isSelected ? 'bg-cyan-500 border-white scale-125 shadow-[0_0_20px_rgba(6,182,212,0.8)]' : 'bg-slate-900 border-red-500 hover:scale-110'}`}>
              <span className={`font-black text-base leading-none ${isSelected ? 'text-slate-950' : 'text-red-500'}`}>H</span>
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

// ─── Directions Line ─────────────────────────────────────────────────────────
function Directions({ origin, destination }: { origin: { lat: number; lng: number } | null; destination: { lat: number; lng: number } | null }) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

  useEffect(() => {
    if (!routesLib || !map) return;
    setDirectionsService(new routesLib.DirectionsService());
    setDirectionsRenderer(new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#06b6d4",
        strokeWeight: 6,
        strokeOpacity: 0.8,
        zIndex: 50,
      }
    }));
  }, [routesLib, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin || !destination) {
      if (directionsRenderer) directionsRenderer.setDirections(null);
      return;
    }
    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      },
      (response, status) => {
        if (status === "OK" && response) {
          directionsRenderer.setDirections(response);
        } else {
          console.error("Directions request failed:", status);
        }
      }
    );
    return () => directionsRenderer.setDirections(null);
  }, [directionsService, directionsRenderer, origin, destination]);

  return null;
}

// ─── Ambulance SVG Marker ─────────────────────────────────────────────────────
function AmbulanceMarker({ emergency, scale = 1 }: { emergency: boolean; scale?: number }) {
  return (
    <div
      className="relative flex items-center justify-center drop-shadow-lg w-8 h-16 transition-transform duration-300 origin-bottom"
      style={{ transform: `scale(${scale})` }}
    >
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
        <circle cx="16" cy="36" r="4" fill="#60a5fa" opacity={emergency ? "0.9" : "0"} className="animate-pulse" />
        <circle cx="32" cy="36" r="4" fill="#f87171" opacity={emergency ? "0.9" : "0"} className="animate-pulse" />
        <rect x="6" y="2" width="8" height="4" rx="2" fill="#fef08a" />
        <rect x="34" y="2" width="8" height="4" rx="2" fill="#fef08a" />
        <rect x="6" y="90" width="8" height="4" rx="2" fill="#ef4444" />
        <rect x="34" y="90" width="8" height="4" rx="2" fill="#ef4444" />
      </svg>
    </div>
  );
}

// ─── Voice Note Controls (shared) ─────────────────────────────────────────────
function VoiceControls({
  voiceState,
  onStart,
  onStop,
}: {
  voiceState: string;
  onStart: () => void;
  onStop: () => void;
}) {
  if (voiceState === "idle")
    return (
      <button
        onClick={onStart}
        className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-xl hover:bg-slate-700 active:scale-95 transition-all text-sm font-semibold w-full justify-center"
      >
        <Mic className="w-4 h-4 text-red-400" />
        Record Voice Note
      </button>
    );
  if (voiceState === "recording")
    return (
      <button
        onClick={onStop}
        className="flex items-center gap-2 bg-red-700 border border-red-500 text-white px-4 py-2 rounded-xl animate-pulse active:scale-95 transition-all text-sm font-semibold w-full justify-center"
      >
        <Square className="w-4 h-4 fill-current" />
        Stop & Send
      </button>
    );
  if (voiceState === "processing")
    return (
      <div className="flex items-center gap-2 bg-amber-700/80 border border-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold w-full justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Encoding Audio...
      </div>
    );
  return (
    <div className="flex items-center gap-2 bg-green-900/80 border border-green-600 text-green-300 px-4 py-2 rounded-xl text-sm font-semibold w-full justify-center">
      <CheckCircle className="w-4 h-4" />
      Voice Note Dispatched
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AmbulanceDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [emergency, setEmergency] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "processing" | "done">("idle");
  const [voiceBase64, setVoiceBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [initialPosition, setInitialPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState(17);

  const [selectedHospital, setSelectedHospital] = useState<google.maps.places.PlaceResult | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const positionRef = useRef<{ lat: number; lng: number } | null>(null);
  const headingRef = useRef(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (u) setUser(u); });
    return () => unsub();
  }, []);

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
                headingRef.current = (Math.atan2(dLng, dLat) * 180) / Math.PI;
              }
            }
            positionRef.current = newPos;
            return newPos;
          });
          setInitialPosition((prev) => prev ?? newPos);
        },
        (err) => console.error("Geo Error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);

  useEffect(() => {
    if (!emergency || !user) return;
    const id = setInterval(async () => {
      const pos = positionRef.current;
      if (!pos) return;
      try {
        await setDoc(doc(db, "ambulances", user.uid), {
          lat: pos.lat, lng: pos.lng,
          heading: headingRef.current,
          status: "active",
          voiceData: voiceBase64,
          aiSummary: "", // Placeholder for future async AI transcription
          timestamp: serverTimestamp(),
          driverName: user.displayName || "Ambulance Driver",
        }, { merge: true });
      } catch (e) { console.error(e); }
    }, 3000);
    return () => clearInterval(id);
  }, [emergency, user, voiceBase64]);

  const handleStartEmergency = () => setEmergency(true);
  const handleEndEmergency = async () => {
    setEmergency(false);
    setVoiceState("idle");
    setVoiceBase64(null);
    if (user) {
      try { await updateDoc(doc(db, "ambulances", user.uid), { status: "inactive" }); }
      catch (e) { console.error(e); }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          setVoiceBase64(base64);
          setVoiceState("done");
          
          if (!user) return;
          
          setIsAnalyzing(true);
          try {
            const res = await fetch("/api/analyze-voice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audioBase64: base64 })
            });
            const data = await res.json();
            
            if (data.status === "success" || data.transcript) {
              await updateDoc(doc(db, "ambulances", user.uid), {
                aiSummary: data.condition ? JSON.stringify(data.condition) : "",
                aiTranscription: data.transcript || "Transcription unavailable"
              });
            }
          } catch (e) {
            console.error("AI analysis failed", e);
          } finally {
            setIsAnalyzing(false);
          }
        };
      };
      mr.start();
      setVoiceState("recording");
      recordTimeoutRef.current = setTimeout(() => stopRecording(), 30000);
    } catch (err) {
      alert("Microphone access required for voice notes.");
    }
  };

  const stopRecording = () => {
    if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
    if (mediaRecorderRef.current && voiceState === "recording") {
      setVoiceState("processing");
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const markerScale = Math.max(0.3, Math.min(1.0, (zoom - 11) / 4));

  // ─── Shared Map Content ──────────────────────────────────────────────────────
  const mapContent = (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
      <Map
        defaultCenter={initialPosition ?? { lat: 19.076, lng: 72.8777 }}
        defaultZoom={17}
        defaultTilt={45}
        disableDefaultUI={true}
        gestureHandling="greedy"
        mapId="ambulance-map"
        onZoomChanged={(e) => setZoom(e.detail.zoom)}
        style={{ width: "100%", height: "100%" }}
      >
        {initialPosition && !destination && (
          <HospitalMarkers 
            position={initialPosition} 
            onSelect={setSelectedHospital} 
            selectedPlaceId={selectedHospital?.place_id || null} 
          />
        )}
        
        {destination && (
          <>
            <AdvancedMarker position={destination} zIndex={40}>
              <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.8)] border-[3px] border-white animate-pulse">
                <MapPin className="w-7 h-7 text-slate-900" fill="currentColor" />
              </div>
            </AdvancedMarker>
            {position && <Directions origin={position} destination={destination} />}
          </>
        )}

        {position && (
          <AdvancedMarker position={position} zIndex={50}>
            <AmbulanceMarker emergency={emergency} scale={markerScale} />
          </AdvancedMarker>
        )}
      </Map>
    </APIProvider>
  );

  // ─── GPS Acquiring placeholder ───────────────────────────────────────────────
  const gpsPlaceholder = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
      <MapPin className="w-8 h-8 animate-pulse mb-2 opacity-40" />
      <span className="text-xs uppercase tracking-widest animate-pulse">Acquiring GPS...</span>
    </div>
  );


  // ═══════════════════════════════════════════════════════════════════════════════
  // DESKTOP VIEW — full-screen map with floating overlays
  // ═══════════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════════
  // DESKTOP VIEW (default) — full-screen map, floating overlays only
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full relative overflow-hidden bg-slate-950" style={{ height: 'calc(100vh - 160px)', minHeight: '500px' }}>

      {/* ── FULL-SCREEN MAP ───────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {initialPosition ? mapContent : gpsPlaceholder}
      </div>

      {/* ── TOP-CENTER: Status pill ───────────────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700/60 px-4 py-2 rounded-full shadow-lg">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${emergency ? "bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,1)]" : "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"}`} />
          <span className={`text-xs font-black tracking-[0.2em] uppercase ${emergency ? "text-red-400" : "text-green-400"}`}>
            {emergency ? "Emergency Active" : "Standby"}
          </span>
        </div>
        
        {/* ── END NAVIGATION BUTTON ───────────────────────────────────────────── */}
        {destination && (
          <button
            onClick={() => {
              setDestination(null);
              setSelectedHospital(null);
            }}
            className="px-6 py-3 bg-red-600/95 backdrop-blur-md hover:bg-red-500 text-white font-black tracking-[0.1em] uppercase text-xs rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all flex items-center gap-2 active:scale-95 border-2 border-red-400/50 hover:border-white"
          >
            <X className="w-4 h-4" strokeWidth={3} />
            End Navigation
          </button>
        )}
      </div>

      {/* ── HOSPITAL DETAILS BUBBLE ───────────────────────────────────────────── */}
      {selectedHospital && !destination && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 p-5 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_15px_rgba(6,182,212,0.2)] flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-4">
                <h3 className="text-white font-black text-lg leading-tight uppercase tracking-wide">{selectedHospital.name}</h3>
                <p className="text-slate-400 text-xs mt-1.5 font-medium leading-snug tracking-wider uppercase">{selectedHospital.vicinity}</p>
                {selectedHospital.rating && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-amber-400 text-xs font-bold bg-amber-400/10 px-2 py-0.5 rounded text-amber-500">
                      ★ {selectedHospital.rating}
                    </span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setSelectedHospital(null)} 
                className="p-1 -mr-2 -mt-2 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={() => {
                if (selectedHospital.geometry?.location) {
                   setDestination({
                     lat: selectedHospital.geometry.location.lat(),
                     lng: selectedHospital.geometry.location.lng()
                   });
                }
              }}
              className="w-full py-4 mt-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-black tracking-[0.15em] uppercase text-sm rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] border-2 border-white transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Navigation className="w-5 h-5 fill-current" />
              Set Destination
            </button>
          </div>
        </div>
      )}

      {/* ── RIGHT: Voice Note (only after emergency, secondary) ───────────────── */}
      {emergency && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
          {voiceState === "idle" && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 text-white px-4 py-3 rounded-xl shadow-lg hover:bg-slate-800 active:scale-95 transition-all text-sm font-bold uppercase tracking-wider"
            >
              <Mic className="w-5 h-5 text-red-400" />
              Voice Note
            </button>
          )}
          {voiceState === "recording" && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm border border-red-500 text-white px-4 py-3 rounded-xl shadow-lg animate-pulse active:scale-95 transition-all text-sm font-bold uppercase tracking-wider"
            >
              <Square className="w-5 h-5 fill-current" />
              Stop & Send
            </button>
          )}
          {voiceState === "processing" && (
            <div className="flex items-center gap-2 bg-amber-700/90 border border-amber-500 text-white px-4 py-3 rounded-xl text-sm font-bold">
              <Loader2 className="w-5 h-5 animate-spin" />
              Encoding...
            </div>
          )}
          {voiceState === "done" && (
            <div className="flex items-center gap-2 bg-green-900/90 border border-green-600 text-green-300 px-4 py-3 rounded-xl text-sm font-bold">
              <CheckCircle className="w-5 h-5" />
              Sent
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM-CENTER: Emergency Button ──────────────────────────────────── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-72">
        {!emergency ? (
          <button
            onClick={handleStartEmergency}
            className="w-full py-4 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black tracking-[0.15em] uppercase text-base rounded-2xl shadow-[0_8px_40px_rgba(220,38,38,0.6)] transition-all duration-200 active:scale-[0.97] backdrop-blur-sm"
          >
            🚨 Start Emergency
          </button>
        ) : (
          <button
            onClick={handleEndEmergency}
            className="w-full py-4 bg-slate-900/90 backdrop-blur-sm hover:bg-slate-800/90 border-2 border-red-800/60 text-red-400 font-black tracking-[0.1em] uppercase text-sm rounded-2xl transition-all duration-200 active:scale-[0.97] relative overflow-hidden shadow-xl"
          >
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,#ef4444_8px,#ef4444_16px)]" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-sm animate-pulse"></span>
              End Emergency
            </span>
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes pan { 0%{background-position:0 0} 100%{background-position:50px 50px} }` }} />
    </div>
  );
}
