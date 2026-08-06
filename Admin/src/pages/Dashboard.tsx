import React from 'react';
import { 
  Users, MapPin, Clock, CalendarCheck2, CalendarX2, 
  UserPlus, Megaphone, FileDown, ChevronDown, Calendar, IndianRupee
} from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* ----- TOP STATS ROW ----- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
              <Users size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Total Staff</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">256</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">Active Employees</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 shrink-0">
              <CalendarCheck2 size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Present Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">186</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">72.66% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
              <MapPin size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">On Field Duty</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">48</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">Live Tracking</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
              <CalendarX2 size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Absent Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">70</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">27.34% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <Clock size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Late Login</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">22</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">Today</p>
        </div>
      </div>

      {/* ----- MIDDLE ROW (CHARTS & MAP) ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Attendance Overview (Doughnut Chart) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-900 font-bold">Attendance Overview</h3>
            <div className="flex items-center gap-1 text-gray-500 text-xs font-medium cursor-pointer">
              This Week <ChevronDown size={14} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* CSS Conic Gradient Doughnut */}
            <div className="relative w-32 h-32 rounded-full flex items-center justify-center" 
                 style={{ background: 'conic-gradient(#10B981 0% 72%, #EF4444 72% 90%, #F59E0B 90% 95%, #3B82F6 95% 100%)' }}>
              <div className="absolute w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-gray-500 text-[10px] font-medium">Total</span>
                <span className="text-xl font-bold text-gray-900">256</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-gray-600 font-medium">Present</span></div>
                <span className="text-gray-900 font-semibold">186 (72.66%)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-gray-600 font-medium">Absent</span></div>
                <span className="text-gray-900 font-semibold">70 (27.34%)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-gray-600 font-medium">Late</span></div>
                <span className="text-gray-900 font-semibold">22 (8.59%)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-gray-600 font-medium">On Leave</span></div>
                <span className="text-gray-900 font-semibold">18 (7.03%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live GPS Tracking (Map Placeholder) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-900 font-bold">Live GPS Tracking <span className="text-gray-500 font-normal text-sm">(On Duty)</span></h3>
            <span className="text-blue-500 text-xs font-bold cursor-pointer">View All</span>
          </div>
          <div className="flex-1 bg-blue-50/50 rounded-xl relative overflow-hidden border border-gray-100 min-h-[160px]">
            {/* Map Grid Pattern */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#CBD5E1 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
            <div className="absolute inset-0 opacity-10 bg-gradient-to-tr from-blue-300 to-green-300"></div>
            {/* Map Markers & Lines (Dummy) */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <path d="M 50 80 Q 150 150 250 50 T 350 120" stroke="#93C5FD" strokeWidth="4" fill="none" strokeDasharray="5,5" />
            </svg>
            {/* Marker 1 */}
            <div className="absolute top-1/4 left-1/3 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full border-2 border-white shadow-md overflow-hidden"><img src="https://randomuser.me/api/portraits/men/22.jpg" alt="user" /></div>
              <div className="w-2 h-2 bg-red-500 rounded-full mt-1"></div>
            </div>
            {/* Marker 2 */}
            <div className="absolute top-1/2 right-1/4 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full border-2 border-white shadow-md overflow-hidden"><img src="https://randomuser.me/api/portraits/men/45.jpg" alt="user" /></div>
              <div className="w-2 h-2 bg-red-500 rounded-full mt-1"></div>
            </div>
            {/* Info Card */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 shadow-sm border border-gray-200">
              <p className="text-green-600 font-bold text-lg leading-tight">48</p>
              <p className="text-gray-600 text-[9px] font-bold">Staff Tracking</p>
            </div>
          </div>
        </div>

        {/* Today's Punch Summary (Gauge Chart) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-900 font-bold mb-4">Today's Punch Summary</h3>
          <div className="flex flex-col items-center">
            {/* Semi-circle Gauge */}
            <div className="relative w-40 h-20 overflow-hidden mb-6 mt-2">
              <div className="w-40 h-40 rounded-full border-[12px] border-gray-100 absolute top-0" style={{ borderTopColor: '#3B82F6', borderRightColor: '#10B981', borderLeftColor: '#F59E0B', transform: 'rotate(-45deg)' }}></div>
              <div className="absolute bottom-0 w-full flex flex-col items-center justify-end pb-1">
                <span className="text-3xl font-bold text-gray-900">186</span>
                <span className="text-gray-500 text-[10px] font-medium">Punched In</span>
              </div>
            </div>
            
            <div className="w-full space-y-2.5 mt-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-gray-600 font-medium">Punched In</span></div>
                <span className="text-gray-900 font-semibold">186</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-gray-600 font-medium">Punched Out</span></div>
                <span className="text-gray-900 font-semibold">62</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-gray-600 font-medium">Yet to Punch In</span></div>
                <span className="text-gray-900 font-semibold">70</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----- BOTTOM ROW ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Salary Overview */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-gray-900 font-bold">Salary Overview</h3>
            <div className="flex items-center gap-1 text-gray-500 text-xs font-medium cursor-pointer">
              August 2025 <ChevronDown size={14} />
            </div>
          </div>
          
          <div className="mb-5">
            <p className="text-gray-500 text-xs font-medium mb-1">Total Payroll</p>
            <h2 className="text-[#2563EB] text-2xl font-bold">₹ 18,75,250</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#F0FDF4] p-3 rounded-xl border border-green-50">
              <p className="text-gray-500 text-[10px] font-medium mb-1">Paid</p>
              <p className="text-gray-900 text-sm font-bold mb-1">₹ 6,45,000</p>
              <p className="text-green-600 text-[10px] font-bold">34.40%</p>
            </div>
            <div className="bg-[#FFFBEB] p-3 rounded-xl border border-yellow-50">
              <p className="text-gray-500 text-[10px] font-medium mb-1">Processing</p>
              <p className="text-gray-900 text-sm font-bold mb-1">₹ 9,20,250</p>
              <p className="text-yellow-600 text-[10px] font-bold">49.06%</p>
            </div>
            <div className="bg-[#FEF2F2] p-3 rounded-xl border border-red-50">
              <p className="text-gray-500 text-[10px] font-medium mb-1">Pending</p>
              <p className="text-gray-900 text-sm font-bold mb-1">₹ 3,10,000</p>
              <p className="text-red-500 text-[10px] font-bold">16.54%</p>
            </div>
          </div>

          <div className="mt-auto border-t border-gray-100 pt-3 flex justify-between items-center cursor-pointer group">
            <span className="text-gray-600 text-xs font-medium group-hover:text-blue-600">View All Payroll</span>
            <ChevronDown size={16} className="text-gray-400 -rotate-90 group-hover:text-blue-600" />
          </div>
        </div>

        {/* Upcoming Salary Dates */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-gray-900 font-bold">Upcoming Salary Dates</h3>
            <span className="text-blue-500 text-xs font-bold cursor-pointer">View Calendar</span>
          </div>
          <div className="space-y-4">
            {[
              { date: '10 Aug 2025 (Sun)', count: '25 Staff', color: 'text-blue-500' },
              { date: '15 Aug 2025 (Fri)', count: '42 Staff', color: 'text-green-500' },
              { date: '20 Aug 2025 (Wed)', count: '31 Staff', color: 'text-yellow-500' },
              { date: '25 Aug 2025 (Mon)', count: '18 Staff', color: 'text-purple-500' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Calendar size={16} className="text-blue-500" strokeWidth={2} />
                  </div>
                  <span className="text-gray-800 text-sm font-medium">{item.date}</span>
                </div>
                <span className={`${item.color} text-xs font-bold bg-white px-2 py-1`}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-gray-900 font-bold">Recent Announcements</h3>
            <span className="text-blue-500 text-xs font-bold cursor-pointer">View All</span>
          </div>
          <div className="space-y-4">
            <div className="flex gap-3 border-b border-gray-50 pb-3">
              <div className="mt-1"><Megaphone size={16} className="text-blue-500" /></div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-gray-900 text-sm font-bold">Field duty guidelines updated</h4>
                  <span className="text-gray-400 text-[10px]">09:15 AM</span>
                </div>
                <p className="text-gray-500 text-xs">Please check the new field duty guidelines.</p>
              </div>
            </div>
            <div className="flex gap-3 border-b border-gray-50 pb-3">
              <div className="mt-1"><Megaphone size={16} className="text-blue-500" /></div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-gray-900 text-sm font-bold">Holiday on 15th August</h4>
                  <span className="text-gray-400 text-[10px]">Yesterday</span>
                </div>
                <p className="text-gray-500 text-xs">Office will remain closed on 15th August.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1"><Megaphone size={16} className="text-blue-500" /></div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-gray-900 text-sm font-bold">Monthly meeting</h4>
                  <span className="text-gray-400 text-[10px]">2 Aug 2025</span>
                </div>
                <p className="text-gray-500 text-xs">All staff meeting on 7th Aug at 11:00 AM.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ----- QUICK ACTIONS ROW ----- */}
      <div className="mb-2">
        <h3 className="text-gray-900 font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          <button className="bg-white border border-gray-200 hover:border-blue-300 rounded-2xl p-4 flex items-center gap-3 transition-colors shadow-sm text-left">
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-500"><UserPlus size={20} /></div>
            <div>
              <p className="text-gray-900 text-xs font-bold mb-0.5">Add New Staff</p>
              <p className="text-gray-400 text-[10px]">Add employee details</p>
            </div>
          </button>

          <button className="bg-white border border-gray-200 hover:border-green-300 rounded-2xl p-4 flex items-center gap-3 transition-colors shadow-sm text-left">
            <div className="bg-green-50 p-2.5 rounded-xl text-green-500"><CalendarCheck2 size={20} /></div>
            <div>
              <p className="text-gray-900 text-xs font-bold mb-0.5">Mark Attendance</p>
              <p className="text-gray-400 text-[10px]">Manual attendance entry</p>
            </div>
          </button>

          <button className="bg-white border border-gray-200 hover:border-yellow-300 rounded-2xl p-4 flex items-center gap-3 transition-colors shadow-sm text-left">
            <div className="bg-yellow-50 p-2.5 rounded-xl text-yellow-500"><IndianRupee size={20} /></div>
            <div>
              <p className="text-gray-900 text-xs font-bold mb-0.5">Process Payroll</p>
              <p className="text-gray-400 text-[10px]">Run salary for staff</p>
            </div>
          </button>

          <button className="bg-white border border-gray-200 hover:border-purple-300 rounded-2xl p-4 flex items-center gap-3 transition-colors shadow-sm text-left">
            <div className="bg-purple-50 p-2.5 rounded-xl text-purple-500"><Megaphone size={20} /></div>
            <div>
              <p className="text-gray-900 text-xs font-bold mb-0.5">Send Announcement</p>
              <p className="text-gray-400 text-[10px]">Notify all staff</p>
            </div>
          </button>

          <button className="bg-white border border-gray-200 hover:border-teal-300 rounded-2xl p-4 flex items-center gap-3 transition-colors shadow-sm text-left col-span-2 md:col-span-1">
            <div className="bg-teal-50 p-2.5 rounded-xl text-teal-500"><FileDown size={20} /></div>
            <div>
              <p className="text-gray-900 text-xs font-bold mb-0.5">Export Reports</p>
              <p className="text-gray-400 text-[10px]">Download all reports</p>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}