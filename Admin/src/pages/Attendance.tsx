import React, { useState } from 'react';
import { 
  Users, MapPin, ChevronDown,
  Calendar, Clock, CalendarCheck2, CalendarX2, 
  Plane, Search, Download, Eye, MoreVertical, MapPin as MapPinIcon
} from 'lucide-react';

export default function Attendance() {
  // Dummy data for the table
  const attendanceData = [
    { id: 1, name: 'Rahul Verma', empId: 'AA-1024', dept: 'Field Operations', date: '05 Aug 2025', punchIn: '09:02 AM', punchOut: '06:12 PM', hours: '9h 10m', status: 'Present', location: 'Office', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { id: 2, name: 'Neha Sharma', empId: 'AA-1056', dept: 'Laboratory', date: '05 Aug 2025', punchIn: '08:55 AM', punchOut: '05:55 PM', hours: '9h 00m', status: 'Present', location: 'Office', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { id: 3, name: 'Amit Kumar', empId: 'AA-1078', dept: 'Field Operations', date: '05 Aug 2025', punchIn: '10:15 AM', punchOut: '-', hours: '-', status: 'Late', location: 'Field', avatar: 'https://randomuser.me/api/portraits/men/46.jpg' },
    { id: 4, name: 'Priya Singh', empId: 'AA-1089', dept: 'Customer Support', date: '05 Aug 2025', punchIn: '-', punchOut: '-', hours: '-', status: 'Absent', location: '-', avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
    { id: 5, name: 'Vikram Singh', empId: 'AA-1098', dept: 'Logistics', date: '05 Aug 2025', punchIn: '09:10 AM', punchOut: '06:05 PM', hours: '8h 55m', status: 'Present', location: 'Warehouse', avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
    { id: 6, name: 'Kajal Verma', empId: 'AA-1102', dept: 'Human Resources', date: '05 Aug 2025', punchIn: '-', punchOut: '-', hours: '-', status: 'On Leave', location: '-', avatar: 'https://randomuser.me/api/portraits/women/33.jpg' },
  ];

  // Helper function for status badges
  const renderStatus = (status: string) => {
    switch(status) {
      case 'Present': return <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-100">Present</span>;
      case 'Late': return <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100">Late</span>;
      case 'Absent': return <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-xs font-bold border border-red-100">Absent</span>;
      case 'On Leave': return <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">On Leave</span>;
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* ----- TOP STATS ROW ----- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-500 shrink-0"><Users size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Total Staff</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">256</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">All Employees</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 shrink-0"><CalendarCheck2 size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Present Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">186</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">72.66% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0"><CalendarX2 size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Absent Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">48</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">18.75% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0"><Clock size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Late Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">22</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">8.59% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0"><Plane size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">On Leave Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">18</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">7.03% of Total</p>
        </div>
      </div>

      {/* ----- FILTERS SECTION ----- */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {/* Date Range */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 ml-1">Date Range</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3.5 top-3 text-gray-400" />
              <select className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-600 appearance-none focus:outline-none focus:border-blue-400 cursor-pointer">
                <option>01 Aug 2025 - 05 Aug 2025</option>
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Department */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 ml-1">Department</label>
            <div className="relative">
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 appearance-none focus:outline-none focus:border-blue-400 cursor-pointer">
                <option>All Departments</option>
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Designation */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 ml-1">Designation</label>
            <div className="relative">
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 appearance-none focus:outline-none focus:border-blue-400 cursor-pointer">
                <option>All Designations</option>
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 ml-1">Status</label>
            <div className="relative">
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 appearance-none focus:outline-none focus:border-blue-400 cursor-pointer">
                <option>All Status</option>
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 ml-1">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
              <input type="text" placeholder="Search by name or ID..." className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400" />
            </div>
          </div>
        </div>
        
        {/* Export Button aligned to bottom of flex container */}
        <div className="flex items-end">
          <button className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors h-[42px] shadow-sm">
            <Download size={16} strokeWidth={2.5} /> Export
          </button>
        </div>
      </div>

      {/* ----- CHARTS SECTION ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Attendance Overview (Doughnut Chart) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-900 font-bold mb-6">Attendance Overview <span className="text-gray-500 font-normal text-sm ml-1">(01 Aug - 05 Aug 2025)</span></h3>
          <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
            {/* CSS Conic Gradient Doughnut */}
            <div className="relative w-40 h-40 rounded-full flex items-center justify-center shrink-0" 
                 style={{ background: 'conic-gradient(#10B981 0% 72%, #EF4444 72% 87%, #F59E0B 87% 95.5%, #3B82F6 95.5% 100%)' }}>
              <div className="absolute w-[116px] h-[116px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-gray-500 text-xs font-medium mb-0.5">Total</span>
                <span className="text-2xl font-bold text-gray-900 leading-tight">1,280</span>
                <span className="text-gray-500 text-xs font-medium mt-0.5">Logs</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 w-full space-y-3.5 max-w-[200px]">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span className="text-gray-600 font-medium">Present</span></div>
                <span className="text-gray-900 font-semibold">922 <span className="text-gray-500 font-normal text-xs ml-1">(72.03%)</span></span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><span className="text-gray-600 font-medium">Absent</span></div>
                <span className="text-gray-900 font-semibold">192 <span className="text-gray-500 font-normal text-xs ml-1">(15.00%)</span></span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div><span className="text-gray-600 font-medium">Late</span></div>
                <span className="text-gray-900 font-semibold">108 <span className="text-gray-500 font-normal text-xs ml-1">(8.44%)</span></span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div><span className="text-gray-600 font-medium">On Leave</span></div>
                <span className="text-gray-900 font-semibold">58 <span className="text-gray-500 font-normal text-xs ml-1">(4.53%)</span></span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div><span className="text-gray-600 font-medium">Half Day</span></div>
                <span className="text-gray-900 font-semibold">0 <span className="text-gray-500 font-normal text-xs ml-1">(0.00%)</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Attendance Trend (Line Chart Placeholder) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-gray-900 font-bold">Daily Attendance Trend</h3>
            <div className="relative">
              <select className="bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-600 appearance-none cursor-pointer focus:outline-none">
                <option>Last 7 Days</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Mini Legend */}
          <div className="flex items-center gap-4 mb-4 text-[11px] font-medium text-gray-600">
            <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-green-500"></div><div className="w-1.5 h-1.5 rounded-full bg-green-500 -ml-2.5"></div> Present</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-red-500"></div><div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-2.5"></div> Absent</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-yellow-500"></div><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 -ml-2.5"></div> Late</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-blue-500"></div><div className="w-1.5 h-1.5 rounded-full bg-blue-500 -ml-2.5"></div> On Leave</div>
          </div>

          {/* Chart Graphic using SVG */}
          <div className="flex-1 relative w-full h-[180px] mt-2">
            {/* Y-Axis Labels */}
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-gray-400 w-6 text-right pr-2">
              <span>250</span><span>200</span><span>150</span><span>100</span><span>50</span><span>0</span>
            </div>
            
            {/* Graph Area */}
            <div className="absolute left-7 right-2 top-2 bottom-6 border-l border-b border-gray-200">
              {/* Grid lines */}
              <div className="absolute w-full border-t border-gray-100 top-[20%]"></div>
              <div className="absolute w-full border-t border-gray-100 top-[40%]"></div>
              <div className="absolute w-full border-t border-gray-100 top-[60%]"></div>
              <div className="absolute w-full border-t border-gray-100 top-[80%]"></div>
              
              {/* Lines (Simulated with SVG for accuracy to design) */}
              <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                {/* Green Line (Present) */}
                <path d="M 0,35 L 16.6,30 L 33.3,25 L 50,22 L 66.6,26 L 83.3,25 L 100,20" fill="none" stroke="#10B981" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                {/* Points Green */}
                <circle cx="0" cy="35" r="2.5" fill="#10B981" vectorEffect="non-scaling-stroke"/>
                <circle cx="16.6" cy="30" r="2.5" fill="#10B981" vectorEffect="non-scaling-stroke"/>
                <circle cx="33.3" cy="25" r="2.5" fill="#10B981" vectorEffect="non-scaling-stroke"/>
                <circle cx="50" cy="22" r="2.5" fill="#10B981" vectorEffect="non-scaling-stroke"/>
                <circle cx="66.6" cy="26" r="2.5" fill="#10B981" vectorEffect="non-scaling-stroke"/>
                <circle cx="83.3" cy="25" r="2.5" fill="#10B981" vectorEffect="non-scaling-stroke"/>
                <circle cx="100" cy="20" r="2.5" fill="#10B981" vectorEffect="non-scaling-stroke"/>
                
                {/* Red Line (Absent) */}
                <path d="M 0,80 L 16.6,82 L 33.3,80 L 50,81 L 66.6,83 L 83.3,81 L 100,80" fill="none" stroke="#EF4444" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <circle cx="0" cy="80" r="2" fill="#EF4444" vectorEffect="non-scaling-stroke"/>
                <circle cx="16.6" cy="82" r="2" fill="#EF4444" vectorEffect="non-scaling-stroke"/>
                <circle cx="33.3" cy="80" r="2" fill="#EF4444" vectorEffect="non-scaling-stroke"/>
                <circle cx="50" cy="81" r="2" fill="#EF4444" vectorEffect="non-scaling-stroke"/>
                <circle cx="66.6" cy="83" r="2" fill="#EF4444" vectorEffect="non-scaling-stroke"/>
                <circle cx="83.3" cy="81" r="2" fill="#EF4444" vectorEffect="non-scaling-stroke"/>
                <circle cx="100" cy="80" r="2" fill="#EF4444" vectorEffect="non-scaling-stroke"/>

                {/* Yellow Line (Late) */}
                <path d="M 0,90 L 16.6,92 L 33.3,88 L 50,91 L 66.6,90 L 83.3,89 L 100,88" fill="none" stroke="#F59E0B" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <circle cx="0" cy="90" r="2" fill="#F59E0B" vectorEffect="non-scaling-stroke"/>
                <circle cx="33.3" cy="88" r="2" fill="#F59E0B" vectorEffect="non-scaling-stroke"/>
                <circle cx="66.6" cy="90" r="2" fill="#F59E0B" vectorEffect="non-scaling-stroke"/>
                <circle cx="100" cy="88" r="2" fill="#F59E0B" vectorEffect="non-scaling-stroke"/>

                {/* Blue Line (On Leave) */}
                <path d="M 0,96 L 16.6,97 L 33.3,95 L 50,96 L 66.6,95 L 83.3,97 L 100,95" fill="none" stroke="#3B82F6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <circle cx="16.6" cy="97" r="1.5" fill="#3B82F6" vectorEffect="non-scaling-stroke"/>
                <circle cx="50" cy="96" r="1.5" fill="#3B82F6" vectorEffect="non-scaling-stroke"/>
                <circle cx="83.3" cy="97" r="1.5" fill="#3B82F6" vectorEffect="non-scaling-stroke"/>
              </svg>
            </div>

            {/* X-Axis Labels */}
            <div className="absolute left-7 right-2 bottom-0 flex justify-between text-[10px] text-gray-500 font-medium px-2 transform translate-y-full pt-2">
              <span>30 Jul</span><span>31 Jul</span><span>01 Aug</span><span>02 Aug</span><span>03 Aug</span><span>04 Aug</span><span>05 Aug</span>
            </div>
          </div>
        </div>
      </div>

      {/* ----- ATTENDANCE LOGS TABLE SECTION ----- */}
      <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Attendance Logs</h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 w-12">#</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Employee</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Employee ID</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Department</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Date</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Punch In</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Punch Out</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Working Hours</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Status</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Location</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-600 font-medium">{log.id}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img src={log.avatar} alt={log.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                      <span className="text-sm font-medium text-gray-900">{log.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-md">{log.empId}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{log.dept}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{log.date}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                    {log.punchIn !== '-' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>}
                    {log.punchIn}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                    {log.punchOut !== '-' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>}
                    {log.punchOut}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 font-medium">{log.hours}</td>
                  <td className="py-3 px-4">{renderStatus(log.status)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 flex items-center gap-1 mt-1">
                    {log.location !== '-' && <MapPinIcon size={14} className="text-gray-400" />}
                    {log.location}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"><Eye size={16} /></button>
                      <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-gray-100 gap-4">
          <p className="text-sm text-gray-500 font-medium">Showing 1 to 6 of 256 entries</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">&lt;</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2563EB] text-white font-medium">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-gray-600 hover:bg-gray-50 font-medium">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-gray-600 hover:bg-gray-50 font-medium">3</button>
              <span className="px-1 text-gray-400">...</span>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-gray-600 hover:bg-gray-50 font-medium">43</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">&gt;</button>
            </div>
            <div className="relative ml-2">
              <select className="bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm text-gray-600 appearance-none cursor-pointer">
                <option>10 / page</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}