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
import { collection, onSnapshot, query, where, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [allStaff, setAllStaff] = useState<any[]>([]);

  useEffect(() => {
    // Listen to Firebase Auth state changes
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setIsAuthLoading(true);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
            setIsAuthenticated(true);
            localStorage.setItem('adminAuth', 'true');
            setIsAuthLoading(false);
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
      setIsAuthLoading(false);
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

  // Admin-Side Auto Punch Out Engine: Checks last 3 days for active punch-ins past their shiftEndTime
  useEffect(() => {
    if (!isAuthenticated || allStaff.length === 0) return;

    const today = new Date();
    const datesToCheck: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      datesToCheck.push(d.toISOString().split('T')[0]);
    }

    const attQuery = query(
      collection(db, 'attendance'),
      where('date', 'in', datesToCheck)
    );

    const unsubscribeAttAutoPunch = onSnapshot(attQuery, (snapshot) => {
      snapshot.forEach(async (docSnap) => {
        const attData = docSnap.data();
        if (attData.punchIn && !attData.punchOut) {
          const staff = allStaff.find(
            s => s.empId === attData.staffId || s.id === attData.staffId
          );
          if (staff) {
            const shiftEndTime = staff.shiftEndTime || '18:00';
            const dateStr = attData.date;
            const [year, month, day] = dateStr.split('-').map(Number);
            const [hour, minute] = shiftEndTime.split(':').map(Number);
            
            const shiftEndLocal = new Date(year, month - 1, day, hour, minute, 0, 0);
            const now = new Date();

            if (now > shiftEndLocal) {
              const punchInDate = new Date(attData.punchIn);
              let punchOutDate = shiftEndLocal;
              if (punchInDate >= shiftEndLocal) {
                punchOutDate = new Date(punchInDate.getTime() + 60000);
              }

              const diffMs = punchOutDate.getTime() - punchInDate.getTime();
              const hoursStr = `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m`;

              try {
                await updateDoc(doc(db, 'attendance', docSnap.id), {
                  punchOut: punchOutDate.toISOString(),
                  hours: hoursStr,
                  locationOut: 'Auto Punch Out (Admin Engine)',
                  autoPunchedOut: true
                });
                console.log(`Admin Engine auto-punched out doc ${docSnap.id} for staff ${staff.name}`);
              } catch (err) {
                console.error(`Admin Engine error auto-punching out doc ${docSnap.id}`, err);
              }
            }
          }
        }
      });
    });

    return () => {
      unsubscribeAttAutoPunch();
    };
  }, [isAuthenticated, allStaff]);

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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] flex flex-col justify-center items-center relative overflow-hidden font-sans">
        {/* Decorative background lights */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse"></div>
          <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className="flex flex-col items-center z-10 text-center max-w-sm px-4">
          {/* Animated Spinner Icon Container */}
          <div className="relative mb-8">
            {/* Pulsing glow rings */}
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20 blur-xl animate-pulse"></div>
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 opacity-30 animate-spin duration-3000"></div>
            
            {/* Logo box */}
            <div className="relative h-20 w-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-3xl shadow-[0_8px_30px_rgb(59,130,246,0.3)] flex items-center justify-center border border-white/10 animate-bounce duration-2000">
              <span className="text-white text-3xl font-black tracking-tighter">AW</span>
            </div>
          </div>

          {/* Brand Name with gradient text */}
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 drop-shadow-md mb-2">
            ANANYA WORLD
          </h1>
          
          <p className="text-sm font-semibold tracking-widest text-blue-400 uppercase mb-8 animate-pulse">
            Dr. Lal PathLabs Franchise
          </p>

          {/* Loader bar container */}
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mb-4 relative border border-slate-700/50">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full w-1/2 animate-[loading_1.5s_infinite_ease-in-out]"></div>
          </div>

          {/* Loading status subtitle */}
          <p className="text-xs text-slate-400 font-medium tracking-wide animate-pulse">
            Initializing secure admin panel...
          </p>
        </div>

        {/* Custom CSS Animation for loading bar */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .animate-bounce {
            animation: bounce 2s infinite ease-in-out;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0) rotate(3deg); }
            50% { transform: translateY(-10px) rotate(-3deg); }
          }
        `}} />
      </div>
    );
  }

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
          <div className="flex-1 p-2 sm:p-4 lg:p-4 min-h-0 flex flex-col">
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
              <Communications branchesList={branchesList} profileData={profileData} setShowProfileModal={setShowProfileModal} setShowLogoutConfirm={setShowLogoutConfirm} />
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
              <Dashboard staffList={filteredStaff} setActiveTab={setActiveTab} branchesList={branchesList} />
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
