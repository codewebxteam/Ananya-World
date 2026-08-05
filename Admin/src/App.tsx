import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Attendance from './pages/Attendance';
import LiveTracking from './pages/LiveTracking';
import Salaries from './pages/Salaries';
import Communications from './pages/Communications';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'staff':
        return <Staff />;
      case 'attendance':
        return <Attendance />;
      case 'tracking':
        return <LiveTracking />;
      case 'salaries':
        return <Salaries />;
      case 'communications':
        return <Communications />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
