import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Calendar, Clock, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import type { ProfileData } from './ProfileModal';

import { Building2 } from 'lucide-react';

interface HeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  profileData: ProfileData;
  setShowProfileModal: (show: boolean) => void;
  setShowLogoutConfirm: (show: boolean) => void;
  branchesList: any[];
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  isChatTab?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  profileData,
  setShowProfileModal,
  setShowLogoutConfirm,
  branchesList,
  selectedBranchId,
  setSelectedBranchId,
  isChatTab = false
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ProfileDropdown = () => (
    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="px-4 py-2 border-b border-gray-50 mb-2">
        <p className="text-sm font-bold text-gray-900">{profileData.name}</p>
        <p className="text-xs text-gray-500 truncate">{profileData.email}</p>
      </div>
      
      <button 
        onClick={() => { setShowProfileModal(true); setIsProfileDropdownOpen(false); }}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#2563EB] transition-colors"
      >
        <User size={16} />
        My Profile
      </button>
      
      <button 
        onClick={() => { setShowProfileModal(true); setIsProfileDropdownOpen(false); }}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#2563EB] transition-colors"
      >
        <Settings size={16} />
        Change Password
      </button>
      
      <div className="border-t border-gray-50 mt-2 pt-2">
        <button 
          onClick={() => { setShowLogoutConfirm(true); setIsProfileDropdownOpen(false); }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header with Hamburger Menu */}
      <div className="lg:hidden fixed top-0 left-0 w-full bg-[#0A1A2F] text-white p-4 flex justify-between items-center z-40 shadow-md">
        <div className="flex items-center gap-1">
          <span className="text-[#FFD100] font-bold text-xl tracking-wide">Ananya</span>
          <span className="text-white font-semibold text-xl tracking-wide">World</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1 focus:outline-none"
        >
          {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Desktop Header Content (rendered inside Main Content Area in App.tsx) */}
      <div className={`${isChatTab ? 'hidden md:flex mb-4' : 'flex'} flex-col md:flex-row md:items-center justify-between gap-4 mb-8`}>
        <div>
          <h1 className="text-2xl lg:text-[28px] font-extrabold text-gray-900 flex items-center gap-2 mb-1">
            Good Morning, {profileData.name.split(' ')[0]} <span className="text-2xl">👋</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium">Here's what's happening with your team today.</p>
        </div>

        <div className="flex items-center gap-4 lg:gap-6 self-start md:self-auto">
          {/* Branch Switcher */}
          <div className="relative">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
              <Building2 size={18} className="text-blue-500 mr-2" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer appearance-none pr-6 w-32 md:w-48 truncate"
              >
                <option value="all">All Branches</option>
                {branchesList.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 hidden md:flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-[#2563EB]" strokeWidth={2.5} />
              <span className="text-xs font-semibold text-gray-700">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-[#2563EB]" strokeWidth={2.5} />
              <span className="text-xs font-semibold text-gray-700">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className="w-10 h-10 rounded-full bg-yellow-100 border border-gray-200 overflow-hidden shadow-sm hover:ring-2 hover:ring-[#2563EB] transition-all">
                <img src={profileData.profilePic} alt="Admin" className="w-full h-full object-cover" />
              </div>
              <ChevronDown size={16} className={`text-gray-500 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isProfileDropdownOpen && <ProfileDropdown />}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
