import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import type { ProfileData } from './ProfileModal';

interface LayoutProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profileData: ProfileData;
  setShowProfileModal: (show: boolean) => void;
  setShowLogoutConfirm: (show: boolean) => void;
  branchesList: any[];
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  children: React.ReactNode;
}

export default function Layout({
  isSidebarOpen,
  setIsSidebarOpen,
  activeTab,
  setActiveTab,
  profileData,
  setShowProfileModal,
  setShowLogoutConfirm,
  branchesList,
  selectedBranchId,
  setSelectedBranchId,
  children
}: LayoutProps) {
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
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
      <div className="main-content">
        <Header 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          profileData={profileData}
          setShowProfileModal={setShowProfileModal}
          setShowLogoutConfirm={setShowLogoutConfirm}
          branchesList={branchesList}
          selectedBranchId={selectedBranchId}
          setSelectedBranchId={setSelectedBranchId}
        />
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
