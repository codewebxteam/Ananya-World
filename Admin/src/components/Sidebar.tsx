import React from 'react';
import { 
  LayoutDashboard, Users, CalendarDays, MapPin, 
  IndianRupee, MessageSquare, ChevronDown, LogOut, Settings, Building, CalendarRange
} from 'lucide-react';
import type { ProfileData } from './ProfileModal';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profileData: ProfileData;
  setShowProfileModal: (show: boolean) => void;
  setShowLogoutConfirm: (show: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  activeTab,
  setActiveTab,
  profileData,
  setShowProfileModal,
  setShowLogoutConfirm
}) => {
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'branches', name: 'Branches', icon: Building },
    { id: 'staff', name: 'Staff Directory', icon: Users },
    { id: 'attendance', name: 'Attendance Logs', icon: CalendarDays },
    { id: 'leaves', name: 'Leaves & Offs', icon: CalendarRange },
    { id: 'gps', name: 'Live GPS Tracking', icon: MapPin },
    { id: 'payroll', name: 'Payroll & Salaries', icon: IndianRupee },
    { id: 'communications', name: 'Communications', icon: MessageSquare },
  ];

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0A1A2F] text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="p-6 pt-8 mb-4 lg:pt-8 hidden lg:block">
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-[#FFD100] font-bold text-2xl tracking-wide">Ananya</span>
          <span className="text-white font-semibold text-2xl tracking-wide">World</span>
        </div>
        <span className="text-gray-400 text-xs tracking-wider">Admin Panel</span>
      </div>
      
      <div className="lg:hidden h-20" /> 

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false); // Close on mobile click
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
                isActive 
                  ? 'bg-[#2563EB] text-white shadow-md' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400'} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[15px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 mt-auto">
        <div className="relative mb-2">
           <button 
             onClick={() => setShowLogoutConfirm(true)}
             className="w-full flex items-center gap-3 px-4 py-3 mb-2 text-gray-300 hover:text-white hover:bg-red-500/10 rounded-xl transition-colors"
           >
             <LogOut size={20} className="text-red-400" />
             <span className="text-[15px] font-medium text-red-400">Logout</span>
           </button>
        </div>
        <button 
          onClick={() => setShowProfileModal(true)}
          className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden border border-white/20">
              <img src={profileData.profilePic} alt={profileData.name} className="w-full h-full object-cover" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-white text-sm font-bold leading-tight">{profileData.name}</p>
              <p className="text-gray-400 text-xs">{profileData.role}</p>
            </div>
          </div>
          <Settings size={16} className="text-gray-400" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
