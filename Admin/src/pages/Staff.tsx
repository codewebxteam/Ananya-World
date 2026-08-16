import { useState } from 'react';
import { 
  Users, MapPin, 
  ChevronDown,
  UserCheck,
  Search, Plus, Edit, Filter, X, Briefcase, Power, CheckCircle, RefreshCw, CalendarX
} from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import AddStaffModal from '../components/AddStaffModal';
import StaffDetailsModal from '../components/StaffDetailsModal';
import EditStaffModal from '../components/EditStaffModal';
import ManageExceptionsModal from '../components/ManageExceptionsModal';

interface StaffProps {
  staffList: any[];
  branchesList: any[];
}

export default function Staff({ staffList, branchesList }: StaffProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffToEdit, setStaffToEdit] = useState<any>(null);
  const [manageExceptionsStaff, setManageExceptionsStaff] = useState<any>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffType, setSelectedStaffType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedBranch, setSelectedBranch] = useState('All');

  const handleResetPassword = async (email: string) => {
    if (window.confirm(`Send password reset email to ${email}?`)) {
      try {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent successfully!');
      } catch (error: any) {
        alert(error.message || 'Error sending password reset email.');
      }
    }
  };

  const handleToggleStatus = async (staff: any) => {
    const newStatus = staff.status === 'Active' ? 'Inactive' : 'Active';
    if (window.confirm(`Are you sure you want to mark ${staff.name} as ${newStatus}?`)) {
      try {
        await updateDoc(doc(db, 'users', staff.id), { status: newStatus });
      } catch (error: any) {
        alert(error.message || 'Error updating status.');
      }
    }
  };

  // Helper function to render status badges
  const renderStatus = (status: string) => {
    const s = status || 'Inactive';
    switch(s) {
      case 'Active': 
      case 'On Duty': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {s}
          </span>
        );
      case 'On Field': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            {s}
          </span>
        );
      case 'On Leave': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            {s}
          </span>
        );
      case 'Inactive': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-bold border border-gray-200">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            {s}
          </span>
        );
      default: 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-500 text-xs font-semibold">
            {s}
          </span>
        );
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStaffType('All');
    setSelectedStatus('All');
    setSelectedBranch('All');
  };

  // Filter Logic
  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = 
      (staff.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.empId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.designation || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedStaffType === 'All' || staff.staffType === selectedStaffType;
    const matchesStatus = selectedStatus === 'All' || staff.status === selectedStatus;
    const matchesBranch = selectedBranch === 'All' || staff.branchId === selectedBranch;

    return matchesSearch && matchesType && matchesStatus && matchesBranch;
  });

  // Calculate stats dynamically based on all staff
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter(s => s.status === 'Active' || s.status === 'On Duty' || s.status === 'On Field').length;
  const fieldStaffCount = staffList.filter(s => s.staffType === 'Field Staff').length;
  const officeStaffCount = staffList.filter(s => s.staffType === 'Office Staff').length;
  const onLeaveCount = staffList.filter(s => s.status === 'On Leave').length;

  return (
    <div className="space-y-6">
      
      <AddStaffModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} branchesList={branchesList} />
      <StaffDetailsModal 
        isOpen={!!selectedStaff} 
        onClose={() => setSelectedStaff(null)} 
        staff={selectedStaff} 
        onEdit={(staff) => setStaffToEdit(staff)}
        onResetPassword={(email) => handleResetPassword(email)}
      />
      <EditStaffModal isOpen={!!staffToEdit} onClose={() => setStaffToEdit(null)} branchesList={branchesList} staffToEdit={staffToEdit} />
      {manageExceptionsStaff && <ManageExceptionsModal staff={manageExceptionsStaff} onClose={() => setManageExceptionsStaff(null)} />}

      {/* ----- PREMIUM STATS CARDS GRID ----- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Card 1: Total Staff */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md hover:border-blue-100 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Users size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-full">Overview</span>
          </div>
          <div className="mt-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Staff</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1 leading-tight tracking-tight">{totalStaff}</h3>
          </div>
          <p className="text-gray-400 text-[10px] mt-2 font-medium">Onboarded staff members</p>
        </div>

        {/* Card 2: Active Staff */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md hover:border-green-100 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <UserCheck size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-green-600 bg-green-50/50 px-2 py-0.5 rounded-full">On Duty</span>
          </div>
          <div className="mt-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Active Staff</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1 leading-tight tracking-tight">{activeStaff}</h3>
          </div>
          <p className="text-green-600/80 text-[10px] mt-2 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
            {totalStaff > 0 ? `${Math.round((activeStaff / totalStaff) * 100)}% active right now` : '0%'}
          </p>
        </div>

        {/* Card 3: Field Staff */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md hover:border-orange-100 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <MapPin size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50/50 px-2 py-0.5 rounded-full">Field Ops</span>
          </div>
          <div className="mt-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Field Staff</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1 leading-tight tracking-tight">{fieldStaffCount}</h3>
          </div>
          <p className="text-gray-400 text-[10px] mt-2 font-medium">On-field sample collectors</p>
        </div>

        {/* Card 4: Office Staff */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md hover:border-purple-100 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Briefcase size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50/50 px-2 py-0.5 rounded-full">In-Office</span>
          </div>
          <div className="mt-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Office Staff</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1 leading-tight tracking-tight">{officeStaffCount}</h3>
          </div>
          <p className="text-gray-400 text-[10px] mt-2 font-medium">Lab & desk operations</p>
        </div>

        {/* Card 5: On Leave */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md hover:border-red-100 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <CalendarX size={24} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-red-600 bg-red-50/50 px-2 py-0.5 rounded-full">Leaves</span>
          </div>
          <div className="mt-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">On Leave</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1 leading-tight tracking-tight">{onLeaveCount}</h3>
          </div>
          <p className="text-gray-400 text-[10px] mt-2 font-medium">Approved leaves today</p>
        </div>
      </div>

      {/* ----- STAFF DIRECTORY CONTAINER ----- */}
      <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100">
        
        {/* Title & Onboarding CTA */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Staff Management Directory</h2>
            <p className="text-gray-500 text-xs mt-0.5">Manage details, active tracking profiles, and shifts of your employees.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#2563EB] hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 text-white px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus size={18} strokeWidth={2.5} />
            Onboard New Staff
          </button>
        </div>

        {/* ----- SEARCH & PREMIUM FILTERS BAR ----- */}
        <div className="bg-gray-50/70 border border-gray-100 rounded-3xl p-5 mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, employee ID, email, designation..." 
                className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
              />
            </div>
            
            {/* Staff Type Filter */}
            <div className="w-full lg:w-48">
              <select 
                value={selectedStaffType}
                onChange={(e) => setSelectedStaffType(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-sm"
              >
                <option value="All">All Staff Types</option>
                <option value="Field Staff">Field Staff</option>
                <option value="Office Staff">Office Staff</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full lg:w-48">
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Duty">On Duty</option>
                <option value="On Field">On Field</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>

            {/* Branch Filter */}
            <div className="w-full lg:w-48">
              <select 
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-sm"
              >
                <option value="All">All Branches</option>
                {branchesList.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters Option */}
          {(searchTerm !== '' || selectedStaffType !== 'All' || selectedStatus !== 'All' || selectedBranch !== 'All') && (
            <div className="flex justify-between items-center pt-1">
              <p className="text-xs text-gray-500 font-semibold">
                Showing {filteredStaff.length} of {totalStaff} staff members
              </p>
              <button 
                onClick={handleResetFilters}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={12} />
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* ----- DIRECTORY DATA TABLE ----- */}
        <div className="overflow-x-auto rounded-[20px] border border-gray-100 shadow-sm bg-white">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee ID</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Staff Type</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Designation</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="py-4 px-6 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold">
                    No staff members match the selected filters or search queries.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr 
                    key={staff.id} 
                    onClick={() => setSelectedStaff(staff)}
                    className="hover:bg-blue-50/30 transition-all duration-200 cursor-pointer group"
                  >
                    {/* Employee Profile */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100/70 border border-blue-200 text-blue-700 flex items-center justify-center font-black text-sm group-hover:scale-105 transition-transform duration-200">
                          {staff.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{staff.name}</p>
                          <p className="text-xs text-gray-400 font-medium mt-0.5">{staff.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td className="py-4 px-6">
                      <span className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                        {staff.empId || 'N/A'}
                      </span>
                    </td>

                    {/* Staff Type */}
                    <td className="py-4 px-6">
                      <span className={`text-xs font-bold ${staff.staffType === 'Field Staff' ? 'text-orange-600' : 'text-purple-600'}`}>
                        {staff.staffType || 'N/A'}
                      </span>
                    </td>

                    {/* Designation */}
                    <td className="py-4 px-6 text-sm text-gray-600 font-bold">
                      {staff.designation || 'N/A'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      {renderStatus(staff.status)}
                    </td>

                    {/* Phone Contact */}
                    <td className="py-4 px-6 text-sm font-bold text-gray-800">
                      {staff.phone || 'N/A'}
                    </td>

                    {/* Actions Column */}
                    <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {/* Toggle Status Button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(staff);
                          }}
                          title={`Mark as ${staff.status === 'Active' ? 'Inactive' : 'Active'}`}
                          className={`p-2 rounded-xl transition-all border border-gray-100 active:scale-[0.93] ${
                            staff.status === 'Active' 
                              ? 'text-red-500 bg-red-50 hover:bg-red-100 border-red-200' 
                              : 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200'
                          }`}
                        >
                          <Power size={15} strokeWidth={2.5} />
                        </button>

                        {/* Edit Staff Button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setStaffToEdit(staff);
                          }} 
                          title="Edit Staff Details"
                          className="p-2 text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-all active:scale-[0.93]"
                        >
                          <Edit size={15} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}