<div align="center">
  <h1>🚑 Marg (मार्ग)</h1>
  <p><em>"Between life and death — we clear the way"</em></p>
  
  <p>
    <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
    <img src="https://img.shields.io/badge/Google%20Maps-4285F4?style=for-the-badge&logo=googlemaps&logoColor=white" alt="Google Maps" />
    <img src="https://img.shields.io/badge/Gemini%20API-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white" alt="Gemini API" />
    <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  </p>
</div>

---

## 🚨 The Problem
Every single minute lost in traffic drastically reduces a critical patient's chance of survival. Across the globe, ambulances get trapped in severe gridlock due to a fundamental lack of coordination. Currently, there is no real-time synchronization between the ambulance driver navigating the streets, the police commanding the traffic flow, the hospital preparing for the arrival, and the public vehicles unknowingly blocking the route. People lose their lives not because science failed them, but because the road did.

## 💡 The Solution
**Marg (मार्ग)** is an end-to-end emergency response intelligence system designed to entirely eliminate ambulance transit delays. By connecting the four critical pillars of emergency transport—Ambulances, Police authorities, Hospitals, and the Public—into a single synchronized ecosystem, Marg ensures that the patient's path is cleared before they even reach the intersection. With real-time Haversine proximity tracking, clinical ETA routing, and authoritative command centers, we guarantee that the golden hour is never compromised.

## ✨ Features
Marg is comprised of four distinct, synchronized visual dashboards:

1. **Ambulance Dashboard**: Live GPS tracking and one-touch distress beacons for drivers to broadcast their route and patient criticality.
2. **Police Command Center**: A dark-themed authoritative grid plotting all live emergencies across the city, proactively calculating and mapping the exact route required for immediate traffic clearance.
3. **Hospital Triage**: Clinical, automated routing engines that instantly alert medical staff of inbound ETAs, rendering precise preparation checklists (e.g., *Trauma -> OT prepared, blood bank notified*) based directly on the patient's condition.
4. **Public Area Map**: A calm, non-panic early-warning system utilizing geolocation radar to gently alert citizens strictly when an active ambulance enters a 2km radius, providing estimated yield times.

## 🛠️ Tech Stack
- **Framework**: Next.js (App Router)
- **Database & Auth**: Firebase / Cloud Firestore
- **Mapping Engine**: `@vis.gl/react-google-maps` (Google Maps API + Directions API)
- **Intelligence**: Gemini API
- **Deployment**: Vercel
- **Styling**: Tailwind CSS & Lucide Icons

## 🚀 Getting Started

Follow these instructions to spin up the entire multi-dashboard ecosystem locally.

### 1. Clone the repository
```bash
git clone https://github.com/Kaustubhhbhoirr/Marg.git
cd marg
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory and securely add your keys:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
HUGGING_FACE_API_TOKEN=your_huggingface_api_key
```

### 4. Ignite the engines
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser. Use the Role Selection portal to test the different synchronized dashboards simultaneously!

## 📱 Dashboards Integration

Marg operates on a unified Firebase WebSocket layer. 
- **Ambulances** act as the **Producers**, continuously broadcasting their GPS locations and patient states.
- **Police, Hospitals, and Public Map** act as **Consumers**, ingesting the active signals in real-time. Distances are rigorously calculated locally using the high-performance Haversine formula, ensuring zero latency in ETA routing and proximity warnings.

## 🎯 SDG Alignment
Marg strictly aligns with the United Nations Sustainable Development Goals:
- **SDG 3: Good Health and Well-being** — Halving global deaths and injuries from road traffic accidents and ensuring universal health coverage through radically improved emergency response infrastructure.

## 🔮 Future Roadmap
- **Android Auto Integration**: Direct integration into car infotainment systems to actively alert drivers of approaching ambulances seamlessly.
- **Automated Toll Booths**: Fast-tracking protocol bypassing FASTag queues for active emergencies.
- **Smart Traffic Signals**: IoT synchronization to automatically turn intersection lights green as the ambulance approaches.
- **Pan-India Deployment**: Scaling robust mapping infrastructure across all tier-1 and tier-2 Indian cities.

---

## 👥 Team — 4Script

> *Four developers. One mission. Save lives.*

| 🧑‍💻 | Name | Role |
|:---:|------|------|
| 🔴 | **Kaustubh Bhoir** | Product + Frontend + Maps |
| 🔴 | **Durvesh Thorat** | Backend + Firebase |
| 🔴 | **Nipun Tamore** | AI + Gemini Integration |
| 🔴 | **Arnav Patil** | Testing + PWA |

---

<div align="center">
  <h3>🏆 Built with ❤️ for Google Solution Challenge 2026 India</h3>
  <p>Dedicated to ensuring that the road is never the reason a life is lost.</p>
</div>
