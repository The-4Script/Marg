"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithRedirect, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, googleAuthProvider } from "@/lib/firebase";
import { Activity, ShieldAlert, HeartPulse, ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserRole(userDocSnap.data().role || null);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithRedirect(auth, googleAuthProvider);
      // Notice: After redirect, the page will reload and Firebase will catch the auth state
      // in the onAuthStateChanged listener at the top of this component.
    } catch (error) {
      console.error("Sign-in error:", error);
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    if (userRole) {
      router.push(`/dashboards/${userRole}`);
    } else {
      router.push("/role-selection");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Activity className="w-12 h-12 text-red-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center lg:px-8">
        <div className="flex items-center space-x-3 mb-8">
          <HeartPulse className="w-12 h-12 text-red-600" />
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">Marg</h1>
        </div>
        
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-700 sm:text-3xl">
          Emergency Response Intelligence System
        </h2>
        
        <p className="mt-6 text-lg leading-8 text-gray-500 max-w-2xl">
          Rapid deployment, real-time coordination, and intelligent route management for emergency medical services and first responders.
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          {!user ? (
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center gap-3 rounded-full bg-red-600 px-8 py-4 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
          ) : (
            <button
              onClick={handleGoToDashboard}
              className="flex items-center gap-3 rounded-full bg-slate-900 px-8 py-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all duration-200 transform hover:scale-105"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl text-left border-t border-gray-100 pt-16">
          <div className="flex flex-col gap-3">
             <div className="bg-red-50 w-10 h-10 rounded-lg flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-red-600" />
             </div>
             <h3 className="font-semibold text-gray-900">Hospital Coordination</h3>
             <p className="text-sm text-gray-500">Real-time bed availability and incoming patient vitals dashboard.</p>
          </div>
          <div className="flex flex-col gap-3">
             <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
             </div>
             <h3 className="font-semibold text-gray-900">Traffic Clearance</h3>
             <p className="text-sm text-gray-500">Automated signal preemptions and police coordination channels.</p>
          </div>
          <div className="flex flex-col gap-3">
             <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
             </div>
             <h3 className="font-semibold text-gray-900">Ambulance Routing</h3>
             <p className="text-sm text-gray-500">Dynamic GPS routing actively mitigating traffic delays.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
