import React, { useState, useRef } from 'react';
import { X, Camera, User, Mail, Phone, Shield, KeyRound, Eye, EyeOff } from 'lucide-react';
import { db, auth } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  role: string;
  profilePic: string;
}

interface ProfileModalProps {
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  profileData: ProfileData;
  setProfileData: (data: ProfileData) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  showProfileModal,
  setShowProfileModal,
  profileData,
  setProfileData
}) => {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileData({ ...profileData, profilePic: reader.result as string });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save profile details to Firestore settings/admin_profile
      const docRef = doc(db, 'settings', 'admin_profile');
      await setDoc(docRef, profileData);

      // 2. If newPassword is provided, update via auth
      if (passwordForm.newPassword) {
        const user = auth.currentUser;
        if (user) {
          await updatePassword(user, passwordForm.newPassword);
          setPasswordForm({ currentPassword: '', newPassword: '' });
        } else {
          alert("Please re-login to change password.");
        }
      }

      alert("Profile settings saved successfully!");
      setShowProfileModal(false);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!showProfileModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Profile & Settings</h2>
          <button 
            onClick={() => setShowProfileModal(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Profile Image Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100 flex items-center justify-center">
                {isUploading ? (
                  <span className="text-xs text-gray-400 font-semibold">Uploading...</span>
                ) : (
                  <img src={profileData.profilePic} alt={profileData.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="text-white" size={24} />
              </div>
              <div className="absolute bottom-0 right-0 bg-[#2563EB] p-2 rounded-full border-2 border-white text-white shadow-sm">
                <Camera size={14} />
              </div>
            </div>
            
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageChange} 
            />

            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold text-gray-900">{profileData.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{profileData.role}</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                Upload New Photo
              </button>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input 
                    type="email" 
                    value={profileData.email}
                    readOnly
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={16} className="text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield size={16} className="text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    value={profileData.role}
                    readOnly
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <KeyRound size={16} className="text-gray-400" />
                Change Password
              </h3>
              <button 
                className="text-xs font-semibold text-[#2563EB] hover:underline"
                onClick={() => alert("Password reset link sent to " + profileData.email)}
              >
                Forgot Password?
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
          <button 
            onClick={() => setShowProfileModal(false)}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-75"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
