import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import { auth } from './services/firebase';
import { signOut } from 'firebase/auth';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Attendance from './pages/Attendance';
import LiveTracking from './pages/LiveTracking';
import Salaries from './pages/Salaries';
import Communications from './pages/Communications';
import Branches from './pages/Branches';
import Leaves from './pages/Leaves';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './services/firebase';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProfileModal from './components/ProfileModal';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import type { ProfileData } from './components/ProfileModal';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Profile Form States
  const [profileData, setProfileData] = useState<ProfileData>({
    name: 'Manish Tripathi',
    email: 'manish.tripathi0@gmail.com',
    phone: '+91 98765 43210',
    role: 'Super Admin',
    profilePic: 'https://ui-avatars.com/api/?name=Manish+Tripathi&background=003B95&color=fff&bold=true&size=128&format=png'
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [allStaff, setAllStaff] = useState<any[]>([]);

  useEffect(() => {
    // Listen to Firebase Auth state changes
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
            setIsAuthenticated(true);
            localStorage.setItem('adminAuth', 'true');
            return;
          }
        } catch (e) {
          console.error("Error verifying admin role:", e);
        }
      }
      
      const localAuth = localStorage.getItem('adminAuth');
      if (localAuth === 'true') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Fetch admin profile settings
    const fetchAdminProfile = async () => {
      try {
        const docRef = doc(db, 'settings', 'admin_profile');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as ProfileData;
          setProfileData(data);
        } else {
          const defaultProfile = {
            name: 'Manish Tripathi',
            email: 'manish.tripathi0@gmail.com',
            phone: '+91 98765 43210',
            role: 'Super Admin',
            profilePic: 'https://ui-avatars.com/api/?name=Manish+Tripathi&background=003B95&color=fff&bold=true&size=128&format=png'
          };
          await setDoc(docRef, defaultProfile);
          setProfileData(defaultProfile);
        }
      } catch (err) {
        console.error("Error loading admin profile:", err);
      }
    };
    fetchAdminProfile();

    // Fetch branches
    const unsubscribeBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const branches: any[] = [];
      snapshot.forEach(doc => branches.push({ id: doc.id, ...doc.data() }));
      setBranchesList(branches);
    });

    // Fetch all staff
    const q = query(collection(db, 'users'), where('role', '==', 'staff'));
    const unsubscribeStaff = onSnapshot(q, (snapshot) => {
      const staff: any[] = [];
      snapshot.forEach(doc => staff.push({ id: doc.id, ...doc.data() }));
      
      // Sort by createdAt descending (newest first)
      staff.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setAllStaff(staff);
    });

    return () => {
      unsubscribeBranches();
      unsubscribeStaff();
    };
  }, [isAuthenticated]);

  const filteredStaff = selectedBranchId === 'all' 
    ? allStaff 
    : allStaff.filter(staff => staff.branchId === selectedBranchId);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('adminAuth', 'true');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuth');
    setShowLogoutConfirm(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-[100dvh] bg-[#F5F7FA] font-sans overflow-hidden">
      
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profileData={profileData}
        setShowProfileModal={setShowProfileModal}
        setShowLogoutConfirm={setShowLogoutConfirm}
      />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col overflow-x-hidden bg-[#F5F7FA] pt-[72px] lg:pt-0 ${activeTab === 'communications' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        
        {activeTab === 'communications' ? (
          <div className="flex-1 p-2 sm:p-6 lg:p-8 min-h-0 flex flex-col">
            <Header 
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              profileData={profileData}
              setShowProfileModal={setShowProfileModal}
              setShowLogoutConfirm={setShowLogoutConfirm}
              branchesList={branchesList}
              selectedBranchId={selectedBranchId}
              setSelectedBranchId={setSelectedBranchId}
              isChatTab={true}
            />
            <div className="flex-1 min-h-0 flex flex-col">
              <Communications branchesList={branchesList} />
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            
            <Header 
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              profileData={profileData}
              setShowProfileModal={setShowProfileModal}
              setShowLogoutConfirm={setShowLogoutConfirm}
              branchesList={branchesList}
              selectedBranchId={selectedBranchId}
              setSelectedBranchId={setSelectedBranchId}
            />

            {/* PAGE CONTENT */}
            {activeTab === 'dashboard' ? (
              <Dashboard staffList={filteredStaff} setActiveTab={setActiveTab} />
            ) : activeTab === 'branches' ? (
              <Branches />
            ) : activeTab === 'staff' ? (
              <Staff staffList={filteredStaff} branchesList={branchesList} />
            ) : activeTab === 'attendance' ? (
              <Attendance selectedBranchId={selectedBranchId} staffList={filteredStaff} />
            ) : activeTab === 'leaves' ? (
              <Leaves />
            ) : activeTab === 'gps' ? (
              <LiveTracking branchesList={branchesList} />
            ) : activeTab === 'payroll' ? (
              <Salaries />
            ) : null}
          </div>
        )}
      </main>

      {/* --- MODALS --- */}
      
      <ProfileModal 
        showProfileModal={showProfileModal}
        setShowProfileModal={setShowProfileModal}
        profileData={profileData}
        setProfileData={setProfileData}
      />

      <LogoutConfirmModal 
        showLogoutConfirm={showLogoutConfirm}
        setShowLogoutConfirm={setShowLogoutConfirm}
        onConfirm={handleLogout}
      />

    </div>
  );
}

export default App;
