"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Ambulance, Building2, Shield, Map } from "lucide-react";

export default function RoleSelection() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const selectRole = async (role: string) => {
    if (!user) return;
    setSavingRole(true);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        name: user.displayName,
        email: user.email,
        role: role,
        createdAt: serverTimestamp(),
      });
      router.push(`/dashboards/${role}`);
    } catch (error) {
      console.error("Error setting role:", error);
      alert("Failed to set role. Please try again.");
      setSavingRole(false);
    }
  };

  if (loading || savingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16 flex flex-col items-center">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Select Your Role</h1>
      <p className="text-gray-500 mb-12 text-center max-w-md">
        Please identify your primary role within the Marg Emergency Response network to access the appropriate dashboard.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <button
          onClick={() => selectRole("ambulance")}
          className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-transparent rounded-2xl shadow-sm hover:shadow-md hover:border-red-500 transition-all duration-200"
        >
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-100 transition-colors">
            <Ambulance className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ambulance Driver</h2>
          <p className="text-sm text-gray-500 text-center">Active transit navigation and hospital routing.</p>
        </button>

        <button
          onClick={() => selectRole("hospital")}
          className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-transparent rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500 transition-all duration-200"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Hospital Dashboard</h2>
          <p className="text-sm text-gray-500 text-center">Manage incoming patients and bed availability.</p>
        </button>

        <button
          onClick={() => selectRole("police")}
          className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-transparent rounded-2xl shadow-sm hover:shadow-md hover:border-slate-800 transition-all duration-200"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
            <Shield className="w-8 h-8 text-slate-700" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Police Dashboard</h2>
          <p className="text-sm text-gray-500 text-center">Monitor traffic clearance requests and emergencies.</p>
        </button>

        <button
          onClick={() => selectRole("public")}
          className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-transparent rounded-2xl shadow-sm hover:shadow-md hover:border-green-500 transition-all duration-200"
        >
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
            <Map className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Public Map</h2>
          <p className="text-sm text-gray-500 text-center">View general traffic conditions and reported incidents.</p>
        </button>
      </div>
    </div>
  );
}
