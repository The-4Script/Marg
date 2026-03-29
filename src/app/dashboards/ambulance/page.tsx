"use client";

import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { HeartPulse, Activity, Flame, Brain, Baby, PlusSquare } from "lucide-react";

type PatientType = "Cardiac Arrest" | "Trauma/Accident" | "Burns" | "Neurological" | "Maternity" | "General Emergency";

const PATIENT_TYPES: { label: PatientType; icon: React.ReactNode }[] = [
  { label: "Cardiac Arrest", icon: <HeartPulse className="w-5 h-5 mb-1" /> },
  { label: "Trauma/Accident", icon: <Activity className="w-5 h-5 mb-1" /> },
  { label: "Burns", icon: <Flame className="w-5 h-5 mb-1" /> },
  { label: "Neurological", icon: <Brain className="w-5 h-5 mb-1" /> },
  { label: "Maternity", icon: <Baby className="w-5 h-5 mb-1" /> },
  { label: "General Emergency", icon: <PlusSquare className="w-5 h-5 mb-1" /> },
];

export default function AmbulanceDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [patientType, setPatientType] = useState<PatientType | null>(null);
  const [status, setStatus] = useState<"inactive" | "active">("inactive");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Keep a ref of the latest position so the interval always grabs the current state
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Authenticate driver
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsub();
  }, []);

  // Track coordinates continuously
  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
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
            patientType,
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
  }, [status, user, patientType]);

  const handleStartEmergency = () => {
    if (!patientType) {
      alert("Please select a patient type first.");
      return;
    }
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
    <div className="flex flex-col h-[calc(100vh-100px)] lg:flex-row gap-6">
      
      {/* MAP COLUMN */}
      <div className="flex-1 bg-white border-2 border-slate-200 rounded-xl overflow-hidden relative min-h-[400px]">
        {position ? (
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_KEY_HERE"}>
            <Map 
              defaultZoom={15} 
              center={position} 
              disableDefaultUI={true}
              mapId="ambulance-map"
            >
              <Marker position={position} />
            </Map>
          </APIProvider>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-400">
            Acquiring GPS Signal...
          </div>
        )}
      </div>

      {/* CONTROL DOMAIN */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        
        {/* Status Indicator */}
        <div className={`p-6 border-2 rounded-xl flex items-center justify-between ${status === 'active' ? 'bg-red-50 border-red-600' : 'bg-slate-50 border-slate-200'}`}>
           <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Status</p>
              <h2 className={`text-2xl font-black ${status === 'active' ? 'text-red-700' : 'text-slate-800'}`}>
                {status === "active" ? "Emergency Active 🔴" : "Standby 🟢"}
              </h2>
              {status === "active" && (
                <p className="text-sm font-semibold text-red-600 mt-1">{patientType}</p>
              )}
           </div>
        </div>

        {/* Patient Selection */}
        <div className="flex-1 bg-white border-2 border-slate-200 p-6 rounded-xl flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Patient Type</h3>
          
          <div className="grid grid-cols-2 gap-3 flex-1 mb-6">
            {PATIENT_TYPES.map((type) => (
              <button 
                key={type.label}
                disabled={status === "active"}
                onClick={() => setPatientType(type.label)}
                className={`flex flex-col items-center justify-center text-center p-3 rounded-lg border-2 text-sm font-semibold transition-none ${
                   patientType === type.label 
                      ? "border-slate-900 bg-slate-900 text-white" 
                      : "border-slate-200 text-slate-600 hover:border-slate-400 disabled:opacity-50 disabled:hover:border-slate-200"
                }`}
              >
                {type.icon}
                {type.label}
              </button>
            ))}
          </div>

          <div className="mt-auto">
            {status === "inactive" ? (
              <button 
                onClick={handleStartEmergency}
                disabled={!patientType}
                className="w-full bg-red-600 text-white py-4 rounded-xl text-lg font-black tracking-wide hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500 transition-none uppercase"
              >
                Start Emergency
              </button>
            ) : (
              <button 
                onClick={handleEndEmergency}
                className="w-full bg-slate-900 text-white py-4 rounded-xl text-lg font-black tracking-wide hover:bg-slate-800 transition-none uppercase"
              >
                End Emergency
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
