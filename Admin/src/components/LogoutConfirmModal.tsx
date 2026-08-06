import React from 'react';
import { LogOut } from 'lucide-react';

interface LogoutConfirmModalProps {
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: (show: boolean) => void;
  onConfirm: () => void;
}

const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  showLogoutConfirm,
  setShowLogoutConfirm,
  onConfirm
}) => {
  if (!showLogoutConfirm) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut size={32} className="text-red-600 ml-1" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to log out of your admin account?
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-sm transition-colors"
            >
              Yes, Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
