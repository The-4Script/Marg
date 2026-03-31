"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { MapPin, Activity, ShieldAlert, HeartPulse, Flame, Brain, Baby, Stethoscope, AlertTriangle, Users, Bed } from "lucide-react";

interface Ambulance {
  id: string;
  lat: number;
  lng: number;
  driverName: string;
  status: string;
}

const EMERGENCY_CHECKLIST = [
  "Emergency bed ready",
  "On-call doctor notified"
];

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export default function HospitalDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [hospitalLocation, setHospitalLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeAmbulances, setActiveAmbulances] = useState<Ambulance[]>([]);
  const [settingLocation, setSettingLocation] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Auth and Hospital Location Setup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists() && userDoc.data().hospitalLocation) {
             setHospitalLocation(userDoc.data().hospitalLocation);
          }
        } catch (e) {
          console.error("Error fetching location", e);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Global Incoming Ambulances Listener
  useEffect(() => {
    if (!hospitalLocation) return; // Only track if location is set

    const q = query(collection(db, "ambulances"), where("status", "==", "active"));
    const unsub = onSnapshot(q, (snapshot) => {
      const incoming: Ambulance[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Ambulance;
        incoming.push({ ...data, id: doc.id });
      });
      setActiveAmbulances(incoming);
    });

    return () => unsub();
  }, [hospitalLocation]);

  const handleSetLocation = () => {
    if (!navigator.geolocation) {
       alert("Geolocation is not supported by your browser.");
       return;
    }
    setSettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
         const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
         if (user) {
            await updateDoc(doc(db, "users", user.uid), { hospitalLocation: loc });
         }
         setHospitalLocation(loc);
         setSettingLocation(false);
      },
      (err) => {
         console.error(err);
         alert("Could not get location. Please allow location access.");
         setSettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  if (loading) {
     return <div className="text-center p-12 text-slate-500 font-medium tracking-wide animate-pulse">Initializing Triage System...</div>;
  }

  // State: Facility Location Not Configured
  if (!hospitalLocation) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 border-2 border-slate-200 rounded-xl bg-white text-center shadow-sm">
         <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-8 h-8" />
         </div>
         <h1 className="text-2xl font-bold text-slate-900 mb-2">Configure Facility Location</h1>
         <p className="text-slate-500 mb-8 max-w-md mx-auto">
           To receive accurate incoming ETAs from tracked ambulances, you must set your hospital's static physical coordinates.
         </p>
         <button 
           onClick={handleSetLocation}
           disabled={settingLocation}
           className="bg-slate-900 text-white font-bold tracking-wide px-8 py-4 rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-300"
         >
           {settingLocation ? "Acquiring Coordinates..." : "Set Geolocation to Current Location"}
         </button>
      </div>
    );
  }

  // Calculate sorted list of active ambulances based on ETA
  const routedAmbulances = activeAmbulances.map(amb => {
     const dist = calculateDistance(hospitalLocation.lat, hospitalLocation.lng, amb.lat, amb.lng);
     const eta = dist * 1.5; // distance / 40kmph * 60m
     return { ...amb, eta, dist };
  }).sort((a, b) => a.eta - b.eta);

  return (
    <div className="min-h-screen">
      
      {/* Global Clinical Counter Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b-2 border-slate-200 pb-8">
         <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Hospital Triage
            </h1>
            <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
               <MapPin className="w-4 h-4" /> Fixed Coordinates: {hospitalLocation.lat.toFixed(4)}, {hospitalLocation.lng.toFixed(4)}
            </p>
         </div>

         <div className={`p-4 rounded-xl border-2 flex items-center gap-4 ${routedAmbulances.length > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-2xl ${routedAmbulances.length > 0 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
               {routedAmbulances.length}
            </div>
            <div>
               <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Active Emergencies</p>
               <p className={`font-semibold ${routedAmbulances.length > 0 ? 'text-red-700' : 'text-slate-800'}`}>
                  Incoming Transit
               </p>
            </div>
         </div>
      </div>

      {routedAmbulances.length === 0 ? (
         <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 text-center bg-slate-50/50">
            <Bed className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No Incoming Units</h3>
            <p className="text-slate-500 mt-2">All sectors are holding steady. Waiting for active dispatches.</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routedAmbulances.map(amb => {
               const checkItems = EMERGENCY_CHECKLIST;
               
               return (
                 <div key={amb.id} className="bg-white border-2 border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
                    
                    {/* Active Header */}
                    <div className="p-5">
                       <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-2">
                             <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]"></div>
                             <span className="text-xs font-black tracking-widest text-red-600 uppercase">Incoming Unit</span>
                          </div>
                          <div className="text-right">
                             <span className="block text-3xl font-black text-slate-900 leading-none">{Math.max(1, Math.ceil(amb.eta))}m</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live ETA</span>
                          </div>
                       </div>

                       {/* Driver Info */}
                       <div className="space-y-4">
                         <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Driver Manifest</p>
                            <p className="font-semibold text-slate-900 flex items-center gap-2">
                              {amb.driverName}
                            </p>
                         </div>
                       </div>
                    </div>

                    {/* Preparation Checklist */}
                    <div className="bg-slate-50 mt-auto px-5 py-4 border-t border-slate-200">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Triage Protocol</p>
                       <ul className="space-y-2">
                          {checkItems.map((item: string, idx: number) => (
                             <li key={idx} className="flex items-start gap-3">
                                <div className="mt-0.5 w-4 h-4 bg-slate-200 border-2 border-slate-300 rounded border-dashed flex-shrink-0"></div>
                                <span className="text-sm font-semibold text-slate-700 leading-snug">{item}</span>
                             </li>
                          ))}
                       </ul>
                    </div>
                 </div>
               )
            })}
         </div>
      )}
    </div>
  );
}
