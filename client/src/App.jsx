import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Supervisor from './pages/Supervisor.jsx';
import Celebrations from './pages/Celebrations.jsx';
import Staff from './pages/Staff.jsx';
import Attendance from './pages/Attendance.jsx';
import Leaves from './pages/Leaves.jsx';
import Payroll from './pages/Payroll.jsx';
import Expenses from './pages/Expenses.jsx';
import Timeline from './pages/Timeline.jsx';
import { Shifts, Advances, Penalties, Documents, Performance, Assets, Promotions, Exits } from './pages/SimplePages.jsx';
import SalarySlip from './pages/SalarySlip.jsx';
import SalaryReport from './pages/SalaryReport.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/supervisor" element={<Supervisor />} />
        <Route path="/celebrations" element={<Celebrations />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/shifts" element={<Shifts />} />
        <Route path="/leaves" element={<Leaves />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/timeline/:id" element={<Timeline />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/advances" element={<Advances />} />
        <Route path="/penalties" element={<Penalties />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/promotions" element={<Promotions />} />
        <Route path="/exits" element={<Exits />} />
        <Route path="/salary-slip" element={<SalarySlip />} />
        <Route path="/salary-report" element={<SalaryReport />} />
      </Route>
    </Routes>
  );
}
