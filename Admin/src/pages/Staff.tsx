import React from 'react';
import { 
  Users, MapPin, 
  ChevronDown,
  UserCheck, CalendarX2, Clock,
  Search, Filter, Plus, Eye, Edit, MoreVertical
} from 'lucide-react';

export default function Staff() {
  // Dummy data for the table
  const staffData = [
    { id: 1, name: 'Rahul Verma', email: 'rahul.verma@aapartners.in', empId: 'AA-1024', dept: 'Field Operations', desig: 'Field Specimen Collector', status: 'On Duty', joinDate: '12 Jan 2024', phone: '+91 98765 43210', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { id: 2, name: 'Neha Sharma', email: 'neha.sharma@aapartners.in', empId: 'AA-1056', dept: 'Laboratory', desig: 'Lab Technician', status: 'On Duty', joinDate: '18 Feb 2024', phone: '+91 98765 43211', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { id: 3, name: 'Amit Kumar', email: 'amit.kumar@aapartners.in', empId: 'AA-1078', dept: 'Field Operations', desig: 'Field Executive', status: 'On Field', joinDate: '05 Mar 2024', phone: '+91 98765 43212', avatar: 'https://randomuser.me/api/portraits/men/46.jpg' },
    { id: 4, name: 'Priya Singh', email: 'priya.singh@aapartners.in', empId: 'AA-1089', dept: 'Customer Support', desig: 'Support Executive', status: 'On Duty', joinDate: '20 Mar 2024', phone: '+91 98765 43213', avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
    { id: 5, name: 'Vikram Singh', email: 'vikram.singh@aapartners.in', empId: 'AA-1098', dept: 'Logistics', desig: 'Logistics Executive', status: 'On Leave', joinDate: '10 Apr 2024', phone: '+91 98765 43214', avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
    { id: 6, name: 'Kajal Verma', email: 'kajal.verma@aapartners.in', empId: 'AA-1102', dept: 'Human Resources', desig: 'HR Executive', status: 'On Duty', joinDate: '15 Apr 2024', phone: '+91 98765 43215', avatar: 'https://randomuser.me/api/portraits/women/33.jpg' },
    { id: 7, name: 'Sandeep Yadav', email: 'sandeep.yadav@aapartners.in', empId: 'AA-1115', dept: 'Field Operations', desig: 'Field Specimen Collector', status: 'Inactive', joinDate: '01 May 2024', phone: '+91 98765 43216', avatar: 'https://randomuser.me/api/portraits/men/85.jpg' },
    { id: 8, name: 'Anjali Patel', email: 'anjali.patel@aapartners.in', empId: 'AA-1120', dept: 'Laboratory', desig: 'Lab Analyst', status: 'On Duty', joinDate: '12 May 2024', phone: '+91 98765 43217', avatar: 'https://randomuser.me/api/portraits/women/12.jpg' },
  ];

  // Helper function to render status badges
  const renderStatus = (status: string) => {
    switch(status) {
      case 'On Duty': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>{status}</span>;
      case 'On Field': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 text-orange-600 text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>{status}</span>;
      case 'On Leave': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{status}</span>;
      case 'Inactive': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>{status}</span>;
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* ----- TOP STATS ROW ----- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><Users size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Total Staff</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">256</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">All Employees</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 shrink-0"><UserCheck size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Active Staff</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">186</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">72.66% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0"><MapPin size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">On Field Duty</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">48</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">Live Tracking</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0"><CalendarX2 size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">On Leave</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">18</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">7.03% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0"><Clock size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Inactive Staff</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">52</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">20.31% of Total</p>
        </div>
      </div>

      {/* ----- STAFF DIRECTORY TABLE SECTION ----- */}
      <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100">
        
        {/* Table Header & Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <h2 className="text-lg font-bold text-gray-900">Staff Directory</h2>
          <button className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors">
            <Plus size={18} strokeWidth={2.5} />
            Add New Staff
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, employee ID, email or mobile..." 
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
            />
          </div>
          
          {/* Dropdowns */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <div className="relative min-w-[160px]">
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 appearance-none focus:outline-none focus:border-blue-400 cursor-pointer">
                <option>All Departments</option>
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative min-w-[160px]">
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 appearance-none focus:outline-none focus:border-blue-400 cursor-pointer">
                <option>All Designations</option>
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative min-w-[140px]">
              <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 appearance-none focus:outline-none focus:border-blue-400 cursor-pointer">
                <option>All Status</option>
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
            </div>
            <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors">
              <Filter size={16} /> Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 w-12">#</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Employee <ChevronDown size={12} className="inline ml-1 text-gray-400"/></th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Employee ID <ChevronDown size={12} className="inline ml-1 text-gray-400"/></th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Department <ChevronDown size={12} className="inline ml-1 text-gray-400"/></th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Designation <ChevronDown size={12} className="inline ml-1 text-gray-400"/></th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Status <ChevronDown size={12} className="inline ml-1 text-gray-400"/></th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Join Date <ChevronDown size={12} className="inline ml-1 text-gray-400"/></th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Contact <ChevronDown size={12} className="inline ml-1 text-gray-400"/></th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {staffData.map((staff) => (
                <tr key={staff.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-600 font-medium">{staff.id}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img src={staff.avatar} alt={staff.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{staff.name}</p>
                        <p className="text-[11px] text-gray-500">{staff.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-md">{staff.empId}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 font-medium">{staff.dept}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 font-medium">{staff.desig}</td>
                  <td className="py-3 px-4">{renderStatus(staff.status)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 font-medium">{staff.joinDate}</td>
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-gray-900">{staff.phone}</p>
                    <p className="text-[11px] text-gray-500">{staff.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"><Eye size={16} /></button>
                      <button className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"><Edit size={16} /></button>
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
          <p className="text-sm text-gray-500 font-medium">Showing 1 to 8 of 256 entries</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">&lt;</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2563EB] text-white font-medium">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-gray-600 hover:bg-gray-50 font-medium">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-gray-600 hover:bg-gray-50 font-medium">3</button>
              <span className="px-1 text-gray-400">...</span>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-gray-600 hover:bg-gray-50 font-medium">32</button>
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