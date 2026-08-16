import React from 'react';
import { 
  Users, MapPin, 
  Search, Filter, 
  WifiOff, Timer, Activity, LocateFixed, Plus, Minus,
  RefreshCcw, Info, ChevronRight
} from 'lucide-react';

export default function LiveTracking() {
  // Dummy data for map staff list
  const mapStaffList: any[] = [];

  // Dummy data for recent staff table
  const recentStaffData: any[] = [];

  const renderStatus = (status: string) => {
    switch(status) {
      case 'On Duty': return <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px] font-bold border border-green-100">On Duty</span>;
      case 'On Field': return <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-100">On Field</span>;
      case 'Offline': return <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100">Offline</span>;
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* ----- TOP STATS ROW ----- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><Users size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Staff Online</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">0</h3>
            </div>
          </div>
          <p className="text-green-600 text-[10px] font-medium mt-2 ml-[60px]">Currently Online</p>
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 shrink-0"><MapPin size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">On Field</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">0</h3>
            </div>
          </div>
          <p className="text-green-600 text-[10px] font-medium mt-2 ml-[60px]">Active in Field</p>
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0"><Activity size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Total Tracking</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">0</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] font-medium mt-2 ml-[60px]">Live Tracking</p>
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0"><WifiOff size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Offline</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">0</h3>
            </div>
          </div>
          <p className="text-red-500 text-[10px] font-medium mt-2 ml-[60px]">Not Online</p>
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col justify-between col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0"><Timer size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Avg. Session Time</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">0h 0m</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] font-medium mt-2 ml-[60px]">Today</p>
        </div>
      </div>

      {/* ----- MAP SECTION ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left Panel: Staff on Map List */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-gray-900 font-bold mb-3">Staff on Map <span className="text-gray-500 font-normal text-sm">(0)</span></h2>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input type="text" placeholder="Search staff..." className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400" />
              </div>
              <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                <Filter size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {mapStaffList.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No staff active on map.</div>
            ) : (
              mapStaffList.map((staff, idx) => (
                <div key={staff.id} className={`p-4 flex items-start gap-3 ${idx !== mapStaffList.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 cursor-pointer transition-colors`}>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${staff.dot}`}></div>
                    <img src={staff.avatar} alt={staff.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className="text-sm font-bold text-gray-900">{staff.name}</h4>
                      {renderStatus(staff.status)}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mb-1">{staff.role}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-gray-500">
                        <MapPin size={12} />
                        <span className="text-[11px]">{staff.location}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">{staff.time}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 border-t border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 rounded-b-[20px] group transition-colors">
            <span className="text-blue-600 text-xs font-bold px-2">View All Staff</span>
            <ChevronRight size={16} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Right Panel: Map Area */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 lg:col-span-2 relative overflow-hidden h-[500px]">
          {/* Map Background Simulation */}
          <div className="absolute inset-0 bg-[#F0F4F8]" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            {/* SVG lines to simulate roads */}
            <svg className="w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
              <path d="M -50 100 Q 200 150 400 50 T 900 200" stroke="#94A3B8" strokeWidth="6" fill="none" />
              <path d="M 100 -50 Q 150 200 300 400 T 500 800" stroke="#94A3B8" strokeWidth="4" fill="none" />
              <path d="M 300 250 Q 500 250 700 400 T 1000 300" stroke="#FCD34D" strokeWidth="4" fill="none" />
            </svg>
          </div>

          {/* Map UI Elements */}
          {/* Top Left: Map/Satellite Toggle */}
          <div className="absolute top-4 left-4 flex bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <button className="px-4 py-1.5 text-sm font-bold text-gray-800 bg-gray-100">Map</button>
            <button className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50">Satellite</button>
          </div>

          {/* Top Right: Map Legend */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-xl p-3 shadow-sm border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <span className="text-green-600 font-bold w-4 text-right">0</span> Online
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <span className="text-orange-500 font-bold w-4 text-right">0</span> On Field
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <span className="text-gray-500 font-bold w-4 text-right">0</span> Offline
            </div>
          </div>

          {/* Dummy Avatars on Map (Removed) */}

          {/* Bottom Right: Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button className="w-9 h-9 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"><LocateFixed size={18} /></button>
            <div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 border-b border-gray-100"><Plus size={18} /></button>
              <button className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50"><Minus size={18} /></button>
            </div>
          </div>

          {/* Bottom Left: Auto Refresh */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <div className="bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2">
              <span className="text-gray-600 text-xs font-medium">Auto refresh in 30s</span>
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <button className="bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors group">
              <RefreshCcw size={14} className="text-blue-500 group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-blue-600 text-xs font-bold">Refresh Now</span>
            </button>
          </div>

        </div>
      </div>

      {/* ----- BOTTOM SECTION ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Recently Active Staff Table */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
          <h3 className="text-gray-900 font-bold mb-4">Recently Active Staff</h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">#</th>
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Staff Name</th>
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Last Location</th>
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Last Updated</th>
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Battery</th>
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentStaffData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">No recent active staff found.</td>
                  </tr>
                ) : (
                  recentStaffData.map((staff) => (
                    <tr key={staff.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-2 text-sm text-gray-600 font-medium">{staff.id}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <img src={staff.avatar} alt={staff.name} className="w-7 h-7 rounded-full object-cover" />
                          <span className="text-sm font-bold text-gray-900">{staff.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600">{staff.location}</td>
                      <td className="py-3 px-2 text-sm text-gray-600">{staff.updated}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-2.5 rounded-[2px] border border-gray-300 p-[1px] relative flex">
                            <div className={`h-full rounded-[1px] ${staff.batColor}`} style={{ width: `${staff.battery}%` }}></div>
                            <div className="absolute -right-[2px] top-[2px] w-[2px] h-1 bg-gray-300 rounded-r-sm"></div>
                          </div>
                          <span className="text-xs text-gray-700 font-medium">{staff.battery}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">{renderStatus(staff.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center cursor-pointer hover:text-blue-600 group">
            <span className="text-blue-600 text-xs font-bold">View All Live Staff</span>
            <ChevronRight size={16} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Tracking Summary (Today) */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-gray-900 font-bold mb-6">Tracking Summary <span className="text-gray-500 font-normal text-sm ml-1">(Today)</span></h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-8 justify-center mb-6 flex-1">
            {/* CSS Conic Gradient Doughnut */}
            <div className="relative w-36 h-36 rounded-full flex items-center justify-center shrink-0" 
                 style={{ background: 'conic-gradient(#10B981 0% 75%, #F59E0B 75% 91%, #9CA3AF 91% 100%)' }}>
              <div className="absolute w-[100px] h-[100px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-3xl font-bold text-gray-900 leading-tight">0</span>
                <span className="text-gray-500 text-[10px] font-medium leading-tight text-center mt-1">Total<br/>Tracking</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 w-full space-y-4">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span className="text-gray-600 font-medium">On Duty</span></div>
                <span className="text-gray-900 font-semibold">0 <span className="text-gray-400 font-normal text-xs ml-1">(0%)</span></span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div><span className="text-gray-600 font-medium">On Field</span></div>
                <span className="text-gray-900 font-semibold">0 <span className="text-gray-400 font-normal text-xs ml-1">(0%)</span></span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div><span className="text-gray-600 font-medium">Offline</span></div>
                <span className="text-gray-900 font-semibold">0 <span className="text-gray-400 font-normal text-xs ml-1">(0%)</span></span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex gap-2.5">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-700 text-xs font-bold mb-0.5">All times are in IST (Asia/Kolkata)</p>
              <p className="text-blue-600/80 text-[10px]">Live tracking is active for online staff only.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}