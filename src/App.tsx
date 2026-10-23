import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { Spinner } from "./components/ui.tsx";
import { useApp } from "./lib/app.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import { Toasts } from "./components/Toasts.tsx";

const Directory = lazy(() => import("./pages/Directory.tsx"));
const MemberPage = lazy(() => import("./pages/MemberPage.tsx"));
const Compatibility = lazy(() => import("./pages/Compatibility.tsx"));
const Report = lazy(() => import("./pages/Report.tsx"));
const Spheres = lazy(() => import("./pages/Spheres.tsx"));
const Finder = lazy(() => import("./pages/Finder.tsx"));
const Meetings = lazy(() => import("./pages/Meetings.tsx"));
const Saved = lazy(() => import("./pages/Saved.tsx"));
const Referrals = lazy(() => import("./pages/Referrals.tsx"));
const Analytics = lazy(() => import("./pages/Analytics.tsx"));
const AdminMembers = lazy(() => import("./pages/AdminMembers.tsx"));
const ImportCenter = lazy(() => import("./pages/ImportCenter.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));

export default function App() {
  const { session, loading, isAdmin, isLeader } = useApp();
  if (loading) return <div className="flex h-full items-center justify-center"><Spinner label="Loading ConnectSphere…" /></div>;
  if (!session) return (<><Login /><Toasts /></>);
  return (
    <Layout>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Directory />} />
          <Route path="/members/:id" element={<MemberPage />} />
          <Route path="/compatibility" element={<Compatibility />} />
          <Route path="/compatibility/:a/:b" element={<Report />} />
          <Route path="/spheres" element={<Spheres />} />
          <Route path="/find" element={<Finder />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/analytics" element={isLeader ? <Analytics /> : <Navigate to="/" replace />} />
          <Route path="/admin/members" element={isAdmin ? <AdminMembers /> : <Navigate to="/" replace />} />
          <Route path="/admin/import" element={isAdmin ? <ImportCenter /> : <Navigate to="/" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toasts />
    </Layout>
  );
}
