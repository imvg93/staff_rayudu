import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import { Spinner } from './components/ui.jsx';

const Dashboard    = lazy(() => import('./pages/Dashboard.jsx'));
const Supervisor   = lazy(() => import('./pages/Supervisor.jsx'));
const Celebrations = lazy(() => import('./pages/Celebrations.jsx'));
const Staff        = lazy(() => import('./pages/Staff.jsx'));
const StaffDetail  = lazy(() => import('./pages/StaffDetail.jsx'));
const Attendance   = lazy(() => import('./pages/Attendance.jsx'));
const Insights     = lazy(() => import('./pages/Insights.jsx'));
const Leaves       = lazy(() => import('./pages/Leaves.jsx'));
const Payroll      = lazy(() => import('./pages/Payroll.jsx'));
const Timeline     = lazy(() => import('./pages/Timeline.jsx'));
const SalarySlip   = lazy(() => import('./pages/SalarySlip.jsx'));
const SalaryReport = lazy(() => import('./pages/SalaryReport.jsx'));
const Reviews        = lazy(() => import('./pages/Reviews.jsx'));
const Leaderboard    = lazy(() => import('./pages/Leaderboard.jsx'));
const ReviewAnalytics = lazy(() => import('./pages/ReviewAnalytics.jsx'));
const PublicReview   = lazy(() => import('./pages/PublicReview.jsx'));
const Shifts       = lazy(() => import('./pages/SimplePages.jsx').then(m => ({ default: m.Shifts })));
const Advances     = lazy(() => import('./pages/SimplePages.jsx').then(m => ({ default: m.Advances })));
const Penalties    = lazy(() => import('./pages/SimplePages.jsx').then(m => ({ default: m.Penalties })));
const Documents    = lazy(() => import('./pages/Documents.jsx'));
const Performance  = lazy(() => import('./pages/SimplePages.jsx').then(m => ({ default: m.Performance })));
const Assets       = lazy(() => import('./pages/SimplePages.jsx').then(m => ({ default: m.Assets })));
const Promotions   = lazy(() => import('./pages/SimplePages.jsx').then(m => ({ default: m.Promotions })));
const Exits        = lazy(() => import('./pages/SimplePages.jsx').then(m => ({ default: m.Exits })));

const fallback = <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Public customer review form — reached by scanning an employee QR code (no auth) */}
      <Route path="/r/:token" element={<Suspense fallback={fallback}><PublicReview /></Suspense>} />
      <Route element={<Layout />}>
        <Route path="/" element={<Suspense fallback={fallback}><Dashboard /></Suspense>} />
        <Route path="/supervisor" element={<Suspense fallback={fallback}><Supervisor /></Suspense>} />
        <Route path="/celebrations" element={<Suspense fallback={fallback}><Celebrations /></Suspense>} />
        <Route path="/staff" element={<Suspense fallback={fallback}><Staff /></Suspense>} />
        <Route path="/staff/:id" element={<Suspense fallback={fallback}><StaffDetail /></Suspense>} />
        <Route path="/attendance" element={<Suspense fallback={fallback}><Attendance /></Suspense>} />
        <Route path="/shifts" element={<Suspense fallback={fallback}><Shifts /></Suspense>} />
        <Route path="/leaves" element={<Suspense fallback={fallback}><Leaves /></Suspense>} />
        <Route path="/timeline" element={<Suspense fallback={fallback}><Timeline /></Suspense>} />
        <Route path="/timeline/:id" element={<Suspense fallback={fallback}><Timeline /></Suspense>} />
        <Route path="/payroll" element={<Suspense fallback={fallback}><Payroll /></Suspense>} />
        <Route path="/advances" element={<Suspense fallback={fallback}><Advances /></Suspense>} />
        <Route path="/penalties" element={<Suspense fallback={fallback}><Penalties /></Suspense>} />
        <Route path="/documents" element={<Suspense fallback={fallback}><Documents /></Suspense>} />
        <Route path="/performance" element={<Suspense fallback={fallback}><Performance /></Suspense>} />
        <Route path="/assets" element={<Suspense fallback={fallback}><Assets /></Suspense>} />
        <Route path="/promotions" element={<Suspense fallback={fallback}><Promotions /></Suspense>} />
        <Route path="/exits" element={<Suspense fallback={fallback}><Exits /></Suspense>} />
        <Route path="/salary-slip" element={<Suspense fallback={fallback}><SalarySlip /></Suspense>} />
        <Route path="/salary-report" element={<Suspense fallback={fallback}><SalaryReport /></Suspense>} />
        <Route path="/insights" element={<Suspense fallback={fallback}><Insights /></Suspense>} />
        <Route path="/reviews" element={<Suspense fallback={fallback}><Reviews /></Suspense>} />
        <Route path="/leaderboard" element={<Suspense fallback={fallback}><Leaderboard /></Suspense>} />
        <Route path="/review-analytics" element={<Suspense fallback={fallback}><ReviewAnalytics /></Suspense>} />
      </Route>
    </Routes>
  );
}
