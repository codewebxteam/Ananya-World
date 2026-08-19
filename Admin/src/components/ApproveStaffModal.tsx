import React, { useState } from 'react';
import { X, User, Mail, Lock, Phone, MapPin, Briefcase, Hash, Calendar, Loader2, Building2, IndianRupee, Clock, ChevronDown } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useEffect } from 'react';

interface ApproveStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchesList: any[];
  staffToEdit: any;
}

export default function ApproveStaffModal({ isOpen, onClose, branchesList, staffToEdit }: ApproveStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    empId: '',
    staffType: 'Field Staff',
    branchId: '',
    phone: '',
    parentPhone: '',
    address: '',
    designation: '',
    joinDate: new Date().toISOString().split('T')[0],
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    salaryAmount: '',
    nextSalaryDate: new Date().toISOString().split('T')[0],
    weeklyOff: 'Sunday',
    status: 'Active',
  });

  useEffect(() => {
    if (staffToEdit && isOpen) {
      setFormData({
        name: staffToEdit.name || '',
        email: staffToEdit.email || '',
        empId: staffToEdit.empId || '',
        staffType: staffToEdit.staffType || 'Field Staff',
        branchId: staffToEdit.branchId || '',
        phone: staffToEdit.phone || '',
        parentPhone: staffToEdit.parentPhone || '',
        address: staffToEdit.address || '',
        designation: staffToEdit.designation || '',
        joinDate: staffToEdit.joinDate || new Date().toISOString().split('T')[0],
        shiftStartTime: staffToEdit.shiftStartTime || '09:00',
        shiftEndTime: staffToEdit.shiftEndTime || '18:00',
        salaryAmount: staffToEdit.salaryAmount || '',
        nextSalaryDate: staffToEdit.nextSalaryDate || new Date().toISOString().split('T')[0],
        weeklyOff: staffToEdit.weeklyOff || 'Sunday',
        status: staffToEdit.status || 'Active',
      });
    }
  }, [staffToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!staffToEdit?.id) throw new Error("Staff ID is missing");
      if (!formData.empId.trim()) throw new Error("Employee ID is mandatory for approval.");
      if (!formData.salaryAmount) throw new Error("Monthly Salary is mandatory for approval.");
      if (!formData.nextSalaryDate) throw new Error("Next Salary Date is mandatory for approval.");
      
      // Update details in Firestore
      await updateDoc(doc(db, 'users', staffToEdit.id), {
        name: formData.name,
        empId: formData.empId,
        staffType: formData.staffType,
        branchId: formData.branchId,
        department: formData.staffType === 'Field Staff' ? 'Field Operations' : 'Office',
        phone: formData.phone,
        parentPhone: formData.parentPhone,
        address: formData.address,
        designation: formData.designation,
        joinDate: formData.joinDate,
        shiftStartTime: formData.shiftStartTime,
        shiftEndTime: formData.shiftEndTime,
        salaryAmount: Number(formData.salaryAmount) || 0,
        nextSalaryDate: formData.nextSalaryDate,
        weeklyOff: formData.weeklyOff,
        status: 'Active', // Auto-activate upon approval
        updatedAt: serverTimestamp(),
      });

      // Close modal and reset form
      // Close modal
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while updating the staff member.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-blue-800">Review & Approve Registration</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <form id="approve-staff-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="John Doe" />
                </div>
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                <div className="relative">
                  <Hash size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input required type="text" name="empId" value={formData.empId} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="e.g. AA-1001" />
                </div>
              </div>

              {/* Email (Read Only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input required readOnly type="email" name="email" value={formData.email} className="w-full pl-10 pr-4 py-2.5 bg-gray-200 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed focus:outline-none" placeholder="john@example.com" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed.</p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select required name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Duty">On Duty</option>
                  <option value="On Field">On Field</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              {/* Staff Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Staff Type</label>
                <select required name="staffType" value={formData.staffType} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer">
                  <option value="Field Staff">Field Staff</option>
                  <option value="Office Staff">Office Staff</option>
                </select>
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                <div className="relative">
                  <Building2 size={18} className="absolute left-3 top-3 text-gray-400" />
                  <select required name="branchId" value={formData.branchId} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer">
                    <option value="" disabled>Select Branch</option>
                    {branchesList.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Designation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                <div className="relative">
                  <Briefcase size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input required type="text" name="designation" value={formData.designation} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="e.g. Specimen Collector" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input required type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="+91 98765 43210" />
                </div>
              </div>

              {/* Parent Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parent's Number</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input required type="text" name="parentPhone" value={formData.parentPhone} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="+91 98765 43210" />
                </div>
              </div>

              {/* Join Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Join Date</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                  <input required type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>
              
              {/* Shift Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift Start Time</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                  <input required type="time" name="shiftStartTime" value={formData.shiftStartTime} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>

              {/* Shift End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift End Time</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                  <input required type="time" name="shiftEndTime" value={formData.shiftEndTime} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Salary Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Salary (₹)</label>
                  <div className="relative">
                    <IndianRupee size={18} className="absolute left-3 top-3 text-gray-400" />
                    <input required type="number" name="salaryAmount" value={formData.salaryAmount} onChange={handleChange} min="0" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  </div>
                </div>

                {/* Next Salary Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Next Salary Date</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-3 top-3 text-gray-400" />
                    <input required type="date" name="nextSalaryDate" value={formData.nextSalaryDate} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  </div>
                </div>
                
                {/* Weekly Off */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Off (Holiday)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Calendar size={18} />
                    </div>
                    <select 
                      name="weeklyOff" 
                      value={formData.weeklyOff} 
                      onChange={handleChange} 
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                    >
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-3 text-gray-400" />
                <input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="123 Main Street, City, State, ZIP" />
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" form="approve-staff-form" disabled={loading} className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-70">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Approving...</> : 'Approve & Activate Account'}
          </button>
        </div>

      </div>
    </div>
  );
}
