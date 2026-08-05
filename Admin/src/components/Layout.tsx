import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export default function Layout({ activeTab, setActiveTab, children }: LayoutProps) {
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="main-content">
        <Header activeTab={activeTab} />
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
