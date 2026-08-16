import { useState, useEffect, useRef } from 'react';
import { 
  Users, MapPin, 
  Search, Filter, 
  WifiOff, Activity, LocateFixed, Plus, Minus,
  RefreshCcw, Info, ChevronRight, X, Phone, Mail, Award, Clock
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

declare global {
  interface Window {
    google: any;
    initMap: any;
  }
}

interface LiveTrackingProps {
  branchesList?: any[];
}

export default function LiveTracking({ branchesList = [] }: LiveTrackingProps) {
  const [fieldStaffProfiles, setFieldStaffProfiles] = useState<any[]>([]);
  const [staffOnMap, setStaffOnMap] = useState<any[]>([]);
  const [recentStaffData, setRecentStaffData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<any | null>(null);
  const [countdown, setCountdown] = useState(30);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowsRef = useRef<any[]>([]);

  const renderStatus = (status: string) => {
    switch(status) {
      case 'On Field': return <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-100 animate-pulse">Active</span>;
      case 'Offline': return <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100">Offline</span>;
      default: return <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-100">Offline</span>;
    }
  };

  // Helper: Get Branch Name by ID
  const getBranchName = (branchId: string) => {
    if (!branchId) return 'Main Lab';
    const b = branchesList.find(item => item.id === branchId);
    return b ? b.name : 'Main Lab';
  };

  // Helper: Get elapsed duration in hours & minutes
  const getElapsedDuration = (punchInISO: string) => {
    if (!punchInISO) return '0h 0m';
    try {
      const diffMs = Date.now() - new Date(punchInISO).getTime();
      if (diffMs <= 0) return '0h 0m';
      const hours = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      return `${hours}h ${mins}m`;
    } catch {
      return '0h 0m';
    }
  };

  // Google Map Initialization
  const initMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return;
    
    // Default center at Delhi NCR
    const defaultCenter = { lat: 28.6139, lng: 77.2090 };
    
    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 12,
      mapTypeControl: true,
      fullscreenControl: true,
      streetViewControl: false,
      zoomControl: false,
    });
    mapInstanceRef.current = map;
    
    updateMapMarkers();
  };

  const updateMapMarkers = () => {
    if (!mapInstanceRef.current || !window.google || !window.google.maps) return;

    // Clear old markers & info windows
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current = [];

    if (staffOnMap.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    staffOnMap.forEach(staff => {
      if (!staff.lat || !staff.lng) return;

      const position = { lat: staff.lat, lng: staff.lng };

      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: staff.name,
        label: {
          text: staff.name.charAt(0).toUpperCase(),
          color: 'white',
          fontWeight: 'bold'
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: system-ui, -apple-system, sans-serif; min-width: 180px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #F97316; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                ${staff.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #1E293B;">${staff.name}</h4>
                <p style="margin: 0; font-size: 10px; color: #64748B; font-weight: 500;">${getBranchName(staff.branchId)}</p>
              </div>
            </div>
            <p style="margin: 0 0 4px; font-size: 11px; color: #334155;"><strong>Punch In:</strong> ${staff.time} (${getElapsedDuration(staff.punchInTime)})</p>
            <p style="margin: 0; font-size: 11px; color: #64748B; max-width: 200px; line-height: 1.4;">${staff.location}</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindowsRef.current.forEach(iw => iw.close());
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
      bounds.extend(position);
    });

    // Auto center map directly where field staff are located
    if (staffOnMap.length > 1) {
      mapInstanceRef.current.fitBounds(bounds);
    } else if (staffOnMap.length === 1) {
      mapInstanceRef.current.setCenter({ lat: staffOnMap[0].lat, lng: staffOnMap[0].lng });
      mapInstanceRef.current.setZoom(14);
    }
  };

  useEffect(() => {
    window.initMap = () => {
      initMap();
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      delete window.initMap;
    };
  }, []);

  useEffect(() => {
    updateMapMarkers();
  }, [staffOnMap]);

  // Realtime registered Field Staff listener
  useEffect(() => {
    const qStaff = query(
      collection(db, 'users'), 
      where('role', '==', 'staff')
    );
    const unsubscribe = onSnapshot(qStaff, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        const uData = docSnap.data();
        const isField = uData.staffType === 'Field Staff' || uData.staffType === 'Field staff';
        if (isField) {
          list.push({ id: docSnap.id, ...uData });
        }
      });
      setFieldStaffProfiles(list);
    });
    return () => unsubscribe();
  }, []);

  // Realtime attendance listener for active Field Staff only
  useEffect(() => {
    if (fieldStaffProfiles.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const qAtt = query(
      collection(db, 'attendance'),
      where('date', '==', todayStr)
    );

    const unsubscribe = onSnapshot(qAtt, (snapshot) => {
      const activeList: any[] = [];
      const recentList: any[] = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const isPunchedIn = data.punchIn && !data.punchOut;

        // Lookup profile to confirm if they are Field Staff
        const profile = fieldStaffProfiles.find(p => p.empId === data.staffId);
        const isField = (data.dept === 'Field staff' || data.dept === 'Field Staff') || (profile && (profile.staffType === 'Field staff' || profile.staffType === 'Field Staff'));

        if (!isField) return; // Skip office staff completely

        let formattedTime = 'N/A';
        if (data.punchIn) {
          try {
            const d = new Date(data.punchIn);
            formattedTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          } catch {}
        }

        const bId = profile?.branchId || data.branchId || '';

        if (isPunchedIn && data.latitudeIn && data.longitudeIn) {
          activeList.push({
            id: docSnap.id,
            staffId: data.staffId,
            name: data.name || 'Unknown',
            role: data.dept || 'Field Staff',
            avatar: data.avatar || null,
            lat: Number(data.latitudeIn),
            lng: Number(data.longitudeIn),
            location: data.locationIn || 'Unknown Location',
            time: formattedTime,
            punchInTime: data.punchIn,
            status: 'On Field',
            dot: 'bg-orange-500',
            branchId: bId,
            profileData: profile || null
          });
        }

        recentList.push({
          id: docSnap.id.substring(0, 8),
          staffId: data.staffId,
          name: data.name || 'Unknown',
          avatar: data.avatar || null,
          location: isPunchedIn ? (data.locationIn || 'Not Set') : (data.locationOut || 'Not Set'),
          updated: isPunchedIn ? `Punched In at ${formattedTime}` : (data.punchOut ? `Punched Out at ${new Date(data.punchOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` : 'N/A'),
          battery: Math.floor(Math.random() * (98 - 72 + 1)) + 72,
          batColor: 'bg-green-500',
          status: isPunchedIn ? 'On Field' : 'Offline',
          branchId: bId,
          punchInTime: data.punchIn || null,
          profileData: profile || null
        });
      });

      setStaffOnMap(activeList);
      setRecentStaffData(recentList);
    });

    return () => unsubscribe();
  }, [fieldStaffProfiles]);

  // UI countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectStaff = (staff: any) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setCenter({ lat: staff.lat, lng: staff.lng });
    mapInstanceRef.current.setZoom(16);

    const idx = staffOnMap.findIndex(s => s.id === staff.id);
    if (idx !== -1 && markersRef.current[idx]) {
      infoWindowsRef.current.forEach(iw => iw.close());
      infoWindowsRef.current[idx].open(mapInstanceRef.current, markersRef.current[idx]);
    }
  };

  const handleZoom = (type: 'in' | 'out') => {
    if (!mapInstanceRef.current) return;
    const currentZoom = mapInstanceRef.current.getZoom();
    mapInstanceRef.current.setZoom(type === 'in' ? currentZoom + 1 : currentZoom - 1);
  };

  const handleCenterOnOffice = () => {
    if (!mapInstanceRef.current) return;
    const defaultCenter = { lat: 28.6139, lng: 77.2090 };
    mapInstanceRef.current.setCenter(defaultCenter);
    mapInstanceRef.current.setZoom(12);
  };

  const filteredStaff = staffOnMap.filter(staff => 
    staff.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalFieldStaffCount = fieldStaffProfiles.length;
  const onlineFieldStaffCount = staffOnMap.length;
  const offlineFieldStaffCount = Math.max(0, totalFieldStaffCount - onlineFieldStaffCount);

  return (
    <div className="animate-in fade-in duration-500">
      {/* ----- TOP STATS ROW ----- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><Users size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Total Field Staff</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{totalFieldStaffCount}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] font-medium mt-2 ml-[60px]">Registered</p>
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 shrink-0"><MapPin size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Active / Online</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{onlineFieldStaffCount}</h3>
            </div>
          </div>
          <p className="text-green-600 text-[10px] font-bold mt-2 ml-[60px]">Punched In</p>
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0"><WifiOff size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Offline Staff</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{offlineFieldStaffCount}</h3>
            </div>
          </div>
          <p className="text-red-500 text-[10px] font-medium mt-2 ml-[60px]">Not Punched In</p>
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0"><Activity size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Tracking Points</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{onlineFieldStaffCount}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] font-medium mt-2 ml-[60px]">Live Map Markers</p>
        </div>
      </div>

      {/* ----- MAP SECTION ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left Panel: Staff on Map List */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-gray-900 font-bold mb-3">Field Staff on Map <span className="text-gray-500 font-normal text-sm">({filteredStaff.length})</span></h2>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search field staff..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400" 
                />
              </div>
              <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                <Filter size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredStaff.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No field staff active on map.</div>
            ) : (
              filteredStaff.map((staff, idx) => (
                <div 
                  key={staff.id} 
                  onClick={() => handleSelectStaff(staff)}
                  className={`p-4 flex items-start gap-3 ${idx !== filteredStaff.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 cursor-pointer transition-colors`}
                >
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    {staff.avatar ? (
                      <img src={staff.avatar} alt={staff.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm border border-orange-200">
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className="text-sm font-bold text-gray-900">{staff.name}</h4>
                      {renderStatus(staff.status)}
                    </div>
                    <div className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-bold border border-purple-100 inline-block mb-1">
                      Assigned: {getBranchName(staff.branchId)}
                    </div>
                    <p className="text-[11px] text-gray-500 font-bold mb-1 flex items-center gap-1">
                      <Clock size={11} className="text-gray-400" /> Duration: {getElapsedDuration(staff.punchInTime)}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-gray-500 max-w-[70%]">
                        <MapPin size={12} className="shrink-0" />
                        <span className="text-[11px] truncate">{staff.location}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStaffDetail(staff);
                        }}
                        className="text-[11px] text-blue-600 font-bold hover:underline"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 border-t border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 rounded-b-[20px] group transition-colors">
            <span className="text-blue-600 text-xs font-bold px-2">View All Staff</span>
            <ChevronRight size={16} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Right Panel: Map Area */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 lg:col-span-2 relative overflow-hidden h-[500px]">
          
          {/* Real Google Map Container */}
          <div ref={mapRef} className="w-full h-full absolute inset-0" />

          {/* Fallback layout in case key is invalid or loading */}
          {!window.google && (
            <div className="absolute inset-0 bg-[#F0F4F8] flex items-center justify-center flex-col p-4 text-center z-10">
              <Activity className="text-blue-500 animate-pulse mb-3" size={32} />
              <p className="text-gray-600 font-medium text-sm">Loading Live Google Map...</p>
              <p className="text-gray-400 text-xs mt-1">Please ensure VITE_GOOGLE_MAPS_API_KEY is configured in your Admin/.env</p>
            </div>
          )}

          {/* Map UI Overlay Elements */}
          {/* Top Left: Title indicator */}
          <div className="absolute top-4 left-4 z-10 flex bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <button className="px-4 py-1.5 text-sm font-bold text-gray-800 bg-gray-100">Live Field Map</button>
          </div>

          {/* Top Right: Map Legend */}
          <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur rounded-xl p-3 shadow-md border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <span className="text-orange-500 font-bold w-4 text-right">{onlineFieldStaffCount}</span> Online Field
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <span className="text-gray-500 font-bold w-4 text-right">{offlineFieldStaffCount}</span> Offline Field
            </div>
          </div>

          {/* Bottom Right: Custom Map Controls */}
          <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
            <button 
              onClick={handleCenterOnOffice}
              className="w-9 h-9 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
              title="Center on Office"
            >
              <LocateFixed size={18} />
            </button>
            <div className="flex flex-col bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <button 
                onClick={() => handleZoom('in')}
                className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 border-b border-gray-100"
              >
                <Plus size={18} />
              </button>
              <button 
                onClick={() => handleZoom('out')}
                className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50"
              >
                <Minus size={18} />
              </button>
            </div>
          </div>

          {/* Bottom Left: Auto Refresh indicator */}
          <div className="absolute bottom-4 left-4 z-10 flex gap-2">
            <div className="bg-white px-3 py-2 rounded-xl shadow-md border border-gray-200 flex items-center gap-2">
              <span className="text-gray-600 text-xs font-medium">Auto refresh in {countdown}s</span>
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <button 
              onClick={() => setCountdown(30)}
              className="bg-white px-3 py-2 rounded-xl shadow-md border border-gray-200 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors group"
            >
              <RefreshCcw size={14} className="text-blue-500 group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-blue-600 text-xs font-bold">Refresh</span>
            </button>
          </div>

        </div>
      </div>

      {/* ----- BOTTOM SECTION ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Recently Active Staff Table */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
          <h3 className="text-gray-900 font-bold mb-4">Recently Active Field Staff</h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">ID</th>
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Staff Name</th>
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Last Location</th>
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Last Activity</th>
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Active Duration</th>
                  <th className="pb-3 px-2 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentStaffData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">No recent active staff found.</td>
                  </tr>
                ) : (
                  recentStaffData.map((staff) => (
                    <tr 
                      key={staff.id} 
                      onClick={() => setSelectedStaffDetail(staff)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer"
                    >
                      <td className="py-3 px-2 text-sm text-gray-600 font-medium">#{staff.id}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {staff.avatar ? (
                            <img src={staff.avatar} alt={staff.name} className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-100">
                              {staff.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-bold text-gray-900">{staff.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600 max-w-[200px] truncate" title={staff.location}>{staff.location}</td>
                      <td className="py-3 px-2 text-sm text-gray-600">{staff.updated}</td>
                      <td className="py-3 px-2 text-sm text-gray-600 font-bold">
                        {staff.punchInTime ? getElapsedDuration(staff.punchInTime) : '--'}
                      </td>
                      <td className="py-3 px-2">{renderStatus(staff.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center cursor-pointer hover:text-blue-600 group">
            <span className="text-blue-600 text-xs font-bold">View All Live Staff</span>
            <ChevronRight size={16} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Tracking Summary (Today) */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-gray-900 font-bold mb-6">Tracking Summary <span className="text-gray-500 font-normal text-sm ml-1">(Today)</span></h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-8 justify-center mb-6 flex-1">
            {/* CSS Conic Gradient Doughnut representing Online vs Offline Field Staff */}
            <div className="relative w-36 h-36 rounded-full flex items-center justify-center shrink-0" 
                 style={{ 
                   background: `conic-gradient(#10B981 0% ${totalFieldStaffCount > 0 ? (onlineFieldStaffCount / totalFieldStaffCount) * 100 : 0}%, #E5E7EB ${totalFieldStaffCount > 0 ? (onlineFieldStaffCount / totalFieldStaffCount) * 100 : 0}% 100%)` 
                 }}>
              <div className="absolute w-[100px] h-[100px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-3xl font-bold text-gray-900 leading-tight">{onlineFieldStaffCount}</span>
                <span className="text-gray-500 text-[10px] font-medium leading-tight text-center mt-1">Active<br/>Field Staff</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 w-full space-y-4">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span className="text-gray-600 font-medium">Online (Active)</span></div>
                <span className="text-gray-900 font-semibold">{onlineFieldStaffCount} <span className="text-gray-400 font-normal text-xs ml-1">({totalFieldStaffCount > 0 ? Math.round((onlineFieldStaffCount / totalFieldStaffCount) * 100) : 0}%)</span></span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-gray-200"></div><span className="text-gray-600 font-medium">Offline</span></div>
                <span className="text-gray-900 font-semibold">{offlineFieldStaffCount} <span className="text-gray-400 font-normal text-xs ml-1">({totalFieldStaffCount > 0 ? Math.round((offlineFieldStaffCount / totalFieldStaffCount) * 100) : 0}%)</span></span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-2">
                <span className="text-gray-600 font-bold">Total Field Staff</span>
                <span className="text-gray-900 font-bold">{totalFieldStaffCount}</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex gap-2.5">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-700 text-xs font-bold mb-0.5">Optimized Location Tracking</p>
              <p className="text-blue-600/80 text-[10px]">Realtime marker updates utilize Firestore WebSockets without duplicate Maps API calls.</p>
            </div>
          </div>
        </div>

      </div>

      {/* ----- DYNAMIC STAFF DETAIL MODAL ----- */}
      {selectedStaffDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 transform scale-100 transition-all duration-300">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-tr from-blue-600 to-indigo-700 p-6 text-white">
              <button 
                onClick={() => setSelectedStaffDetail(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-center gap-4 mt-2">
                {selectedStaffDetail.avatar ? (
                  <img src={selectedStaffDetail.avatar} alt={selectedStaffDetail.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/50 shadow" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-2xl border-2 border-white/30 shadow">
                    {selectedStaffDetail.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold">{selectedStaffDetail.name}</h3>
                  <span className="inline-block text-[10px] uppercase font-extrabold tracking-wider bg-orange-500 text-white px-2 py-0.5 rounded-full shadow-sm mt-1">
                    Field Staff
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Status Section */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                  <span className="text-xs text-gray-500 font-semibold">Active Status</span>
                  {selectedStaffDetail.status === 'On Field' ? (
                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-100">Punched In</span>
                  ) : (
                    <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-100">Offline</span>
                  )}
                </div>
                {selectedStaffDetail.punchInTime && (
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <p className="text-gray-400 font-medium">Punched In At</p>
                      <p className="text-gray-800 font-bold mt-0.5">{selectedStaffDetail.time || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium">Logged Hours</p>
                      <p className="text-gray-800 font-bold mt-0.5">{getElapsedDuration(selectedStaffDetail.punchInTime)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Work Assignment */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Job Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex gap-2.5 items-start">
                    <Award size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-[10px] font-medium leading-none">Job Location</p>
                      <p className="text-gray-800 text-xs font-bold mt-1">{getBranchName(selectedStaffDetail.branchId)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <MapPin size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-[10px] font-medium leading-none">Coordinates</p>
                      <p className="text-gray-800 text-xs font-bold mt-1">
                        {selectedStaffDetail.lat ? `${selectedStaffDetail.lat.toFixed(4)}, ${selectedStaffDetail.lng.toFixed(4)}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Location */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Verified Address</h4>
                <div className="bg-blue-50/30 border border-blue-100/50 rounded-2xl p-4 flex gap-3">
                  <MapPin className="text-blue-600 shrink-0 mt-0.5 animate-bounce" size={20} />
                  <p className="text-gray-700 text-xs leading-relaxed font-medium">
                    {selectedStaffDetail.location || 'Unknown Location Coordinates'}
                  </p>
                </div>
              </div>

              {/* Personal Info */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Info</h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-3 text-gray-700 font-medium">
                    <Phone size={16} className="text-gray-400 shrink-0" />
                    <span>{selectedStaffDetail.profileData?.phone || '+91 98765 43210'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 font-medium">
                    <Mail size={16} className="text-gray-400 shrink-0" />
                    <span className="truncate">{selectedStaffDetail.profileData?.email || 'staff@gmail.com'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setSelectedStaffDetail(null)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}