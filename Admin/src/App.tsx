import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Attendance from './pages/Attendance';
import LiveTracking from './pages/LiveTracking';
import Salaries from './pages/Salaries';
import Communications from './pages/Communications';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProfileModal from './components/ProfileModal';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import type { ProfileData } from './components/ProfileModal';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Profile Form States
  const [profileData, setProfileData] = useState<ProfileData>({
    name: 'Admin User',
    email: 'admin@ananyaworld.com',
    phone: '+91 98765 43210',
    role: 'Super Admin',
    profilePic: 'https://randomuser.me/api/portraits/men/32.jpg'
  });

  const handleLogout = () => {
    // Perform actual logout logic here
    console.log("Logged out");
    setShowLogoutConfirm(false);
  };

  return (
    <div className="flex h-[100dvh] bg-[#F5F7FA] font-sans overflow-hidden">
      
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profileData={profileData}
        setShowProfileModal={setShowProfileModal}
        setShowLogoutConfirm={setShowLogoutConfirm}
      />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col overflow-x-hidden bg-[#F5F7FA] pt-[72px] lg:pt-0 ${activeTab === 'communications' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        
        {activeTab === 'communications' ? (
          <div className="flex-1 p-2 sm:p-4 lg:p-6 min-h-0 flex flex-col">
            <Communications />
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            
            <Header 
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              profileData={profileData}
              setShowProfileModal={setShowProfileModal}
              setShowLogoutConfirm={setShowLogoutConfirm}
            />

            {/* PAGE CONTENT */}
            {activeTab === 'dashboard' ? (
              <Dashboard />
            ) : activeTab === 'staff' ? (
              <Staff />
            ) : activeTab === 'attendance' ? (
              <Attendance />
            ) : activeTab === 'gps' ? (
              <LiveTracking />
            ) : activeTab === 'payroll' ? (
              <Salaries />
            ) : null}
          </div>
        )}
      </main>

      {/* --- MODALS --- */}
      
      <ProfileModal 
        showProfileModal={showProfileModal}
        setShowProfileModal={setShowProfileModal}
        profileData={profileData}
        setProfileData={setProfileData}
      />

      <LogoutConfirmModal 
        showLogoutConfirm={showLogoutConfirm}
        setShowLogoutConfirm={setShowLogoutConfirm}
        onConfirm={handleLogout}
      />

    </div>
  );
}

export default App;
