import React, { useState } from 'react';
import { X, User, Mail, Lock, Phone, MapPin, Briefcase, Hash, Calendar, Loader2, Building2, IndianRupee, Clock, ChevronDown } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { secondaryAuth, db } from '../services/firebase';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchesList: any[];
}

export default function AddStaffModal({ isOpen, onClose, branchesList }: AddStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    empId: '',
    staffType: 'Field Staff',
    branchId: '',
    phone: '',
    address: '',
    designation: '',
    joinDate: new Date().toISOString().split('T')[0],
    shiftStartTime: '',
    shiftEndTime: '',
    salaryAmount: '',
    nextSalaryDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0], // Default to 1st of next month
    weeklyOff: '',
  });

  const isStepValid = (step: number) => {
    if (step === 1) {
      return (
        formData.name.trim() !== '' &&
        formData.email.trim() !== '' &&
        formData.password.length >= 6 &&
        formData.phone.trim() !== '' &&
        formData.address.trim() !== ''
      );
    }
    if (step === 2) {
      const isFieldStaff = formData.staffType === 'Field Staff';
      return (
        formData.empId.trim() !== '' &&
        formData.designation.trim() !== '' &&
        (isFieldStaff || formData.branchId !== '') &&
        formData.joinDate !== ''
      );
    }
    return true;
  };

  const handleNext = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'staffType') {
      if (value === 'Field Staff') {
        setFormData(prev => ({
          ...prev,
          staffType: value,
          branchId: '',
          shiftStartTime: '',
          shiftEndTime: '',
          weeklyOff: '',
        }));
        return;
      } else {
        setFormData(prev => ({
          ...prev,
          staffType: value,
          shiftStartTime: prev.shiftStartTime || '09:00',
          shiftEndTime: prev.shiftEndTime || '18:00',
          weeklyOff: prev.weeklyOff || 'Sunday',
        }));
        return;
      }
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create User in Firebase Auth using the secondary app
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email,
        formData.password
      );
      
      const user = userCredential.user;

      const selectedBranch = branchesList.find(b => b.id === formData.branchId);
      const branchName = selectedBranch ? selectedBranch.name : (formData.staffType === 'Field Staff' ? 'Field Operations' : '');

      // 2. Add details to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        empId: formData.empId,
        role: 'staff',
        staffType: formData.staffType,
        branchId: formData.branchId || '',
        branchName: branchName || '',
        department: formData.staffType === 'Field Staff' ? 'Field Operations' : 'Office',
        phone: formData.phone,
        address: formData.address,
        designation: formData.designation,
        joinDate: formData.joinDate,
        shiftStartTime: formData.shiftStartTime || '',
        shiftEndTime: formData.shiftEndTime || '',
        salaryAmount: formData.salaryAmount,
        nextSalaryDate: formData.nextSalaryDate,
        weeklyOff: formData.staffType === 'Field Staff' ? (formData.weeklyOff || '') : (formData.weeklyOff || 'Sunday'),
        status: 'Active',
        createdAt: serverTimestamp(),
      });

      // Close modal and reset form
      onClose();
      setCurrentStep(1);
      setFormData({
        name: '', email: '', password: '', empId: '', staffType: 'Field Staff', branchId: '',
        phone: '', address: '', designation: '', joinDate: new Date().toISOString().split('T')[0],
        shiftStartTime: '', shiftEndTime: '', salaryAmount: '', nextSalaryDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0], weeklyOff: '',
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while creating the staff member.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const steps = [
    { id: 1, name: 'Personal Profile', desc: 'Contact & Account' },
    { id: 2, name: 'Work Assignment', desc: 'Branch, ID & Role' },
    { id: 3, name: 'Shift & Payroll', desc: 'Timing & Salary' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-3xl z-10 overflow-hidden flex flex-col max-h-[95vh] border border-gray-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Onboard New Staff</h2>
            <p className="text-gray-500 text-xs mt-0.5">Step {currentStep} of 3: {steps[currentStep-1].name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Stepper Status Bar */}
        <div className="px-8 py-5 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-100 -z-10 rounded-full">
              <div 
                className="h-full bg-[#2563EB] transition-all duration-300 rounded-full" 
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              />
            </div>

            {steps.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!isCompleted && !isActive}
                  onClick={() => setCurrentStep(step.id)}
                  className="flex items-center gap-3 bg-white px-3 py-1 rounded-full border border-transparent transition-all cursor-pointer disabled:cursor-default"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border transition-all ${
                    isActive 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' 
                      : isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {isCompleted ? '✓' : step.id}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className={`text-xs font-bold leading-tight ${isActive ? 'text-gray-900' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                      {step.name}
                    </p>
                    <p className="text-[9px] text-gray-400 font-medium leading-tight">{step.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {error}
            </div>
          )}

          <form id="add-staff-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* STEP 1: Personal Profile */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                    <div className="relative">
                      <User size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium placeholder-gray-400" placeholder="John Doe" />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input required type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium placeholder-gray-400" placeholder="+91 98765 43210" />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium placeholder-gray-400" placeholder="john@example.com" />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Temporary Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input required type="password" name="password" value={formData.password} onChange={handleChange} minLength={6} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium placeholder-gray-400" placeholder="Min. 6 characters" />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Home Address</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium placeholder-gray-400" placeholder="123 Main Street, City, State, ZIP" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Work Assignment */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Employee ID */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Employee ID</label>
                    <div className="relative">
                      <Hash size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input required type="text" name="empId" value={formData.empId} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium placeholder-gray-400" placeholder="e.g. AA-1001" />
                    </div>
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Designation</label>
                    <div className="relative">
                      <Briefcase size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input required type="text" name="designation" value={formData.designation} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium placeholder-gray-400" placeholder="e.g. Specimen Collector" />
                    </div>
                  </div>

                  {/* Staff Type */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Staff Type</label>
                    <select required name="staffType" value={formData.staffType} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer text-gray-800 font-medium">
                      <option value="Field Staff">Field Staff</option>
                      <option value="Office Staff">Office Staff</option>
                    </select>
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Branch Assignment {formData.staffType === 'Field Staff' && <span className="text-gray-400 font-normal lowercase">(optional)</span>}
                    </label>
                    <div className="relative">
                      <Building2 size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <select required={formData.staffType !== 'Field Staff'} name="branchId" value={formData.branchId} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer text-gray-800 font-medium">
                        <option value="">{formData.staffType === 'Field Staff' ? 'No Specific Branch (Field)' : 'Select Branch'}</option>
                        {branchesList.map(branch => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Join Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Join Date</label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
                      <input required type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Shift & Payroll */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {formData.staffType === 'Field Staff' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-2.5">
                    <div className="text-xs">
                      {!formData.shiftStartTime && !formData.shiftEndTime ? (
                        <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Flexible Timing (No Fixed Shift Set)
                        </span>
                      ) : (
                        <span className="text-gray-600 font-medium">
                          Shift Timing: <strong className="text-blue-900 font-bold">{formData.shiftStartTime || 'None'} - {formData.shiftEndTime || 'None'}</strong>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(formData.shiftStartTime || formData.shiftEndTime) && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, shiftStartTime: '', shiftEndTime: '' }))}
                          className="text-xs bg-white text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg font-bold transition-all shadow-sm"
                        >
                          ✕ Clear Timing (Flexible)
                        </button>
                      )}
                      {(!formData.shiftStartTime || !formData.shiftEndTime) && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, shiftStartTime: '09:00', shiftEndTime: '18:00' }))}
                          className="text-xs bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg font-bold transition-all shadow-sm"
                        >
                          Set 9 AM - 6 PM
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Shift Start Time */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Shift Start Time {formData.staffType === 'Field Staff' && <span className="text-gray-400 font-normal lowercase">(optional)</span>}
                      </label>
                      {formData.shiftStartTime && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, shiftStartTime: '' }))}
                          className="text-[11px] text-red-500 hover:text-red-700 font-semibold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Clock size={18} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
                      <input required={formData.staffType !== 'Field Staff'} type="time" name="shiftStartTime" value={formData.shiftStartTime} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium" />
                    </div>
                  </div>

                  {/* Shift End Time */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Shift End Time {formData.staffType === 'Field Staff' && <span className="text-gray-400 font-normal lowercase">(optional)</span>}
                      </label>
                      {formData.shiftEndTime && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, shiftEndTime: '' }))}
                          className="text-[11px] text-red-500 hover:text-red-700 font-semibold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Clock size={18} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
                      <input required={formData.staffType !== 'Field Staff'} type="time" name="shiftEndTime" value={formData.shiftEndTime} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium" />
                    </div>
                  </div>

                  {/* Monthly Salary */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Monthly Salary (₹)</label>
                    <div className="relative">
                      <IndianRupee size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input required type="number" name="salaryAmount" value={formData.salaryAmount} onChange={handleChange} min="0" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium placeholder-gray-400" placeholder="25000" />
                    </div>
                  </div>

                  {/* Next Salary Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Next Salary Date</label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input required type="date" name="nextSalaryDate" value={formData.nextSalaryDate} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-800 font-medium" />
                    </div>
                  </div>
                </div>

                {/* Weekly Off */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Weekly Off Day (Holiday) {formData.staffType === 'Field Staff' && <span className="text-gray-400 font-normal lowercase">(optional)</span>}
                  </label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
                    <select 
                      name="weeklyOff" 
                      value={formData.weeklyOff} 
                      onChange={handleChange} 
                      className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer text-gray-800 font-medium appearance-none"
                    >
                      <option value="">{formData.staffType === 'Field Staff' ? 'No Weekly Off (Continuous Duty)' : 'Select Weekly Off'}</option>
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-4.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
          {/* Back Button */}
          {currentStep > 1 ? (
            <button 
              type="button" 
              onClick={handlePrev} 
              disabled={loading}
              className="px-5 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 active:scale-[0.98] rounded-2xl transition-all disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-2xl transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          {/* Next or Submit Button */}
          {currentStep < 3 ? (
            <button 
              type="button" 
              onClick={handleNext}
              disabled={!isStepValid(currentStep)}
              className="px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 active:scale-[0.98] rounded-2xl transition-all shadow-md shadow-blue-500/10"
            >
              Next Step
            </button>
          ) : (
            <button 
              type="submit" 
              form="add-staff-form" 
              disabled={loading} 
              className="px-6 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-[0.98] rounded-2xl transition-all flex items-center gap-2 shadow-md shadow-green-500/10 disabled:opacity-70"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Onboarding...</> : 'Complete Onboarding'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
