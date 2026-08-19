import { useState, useEffect, useRef } from 'react';
import { 
  Users, MapPin, 
  Search, Filter, 
  WifiOff, Activity, LocateFixed, Plus, Minus,
  RefreshCcw, Info, ChevronRight, X, Phone, Mail, Award, Clock, AlertTriangle
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
  const [previewAvatar, setPreviewAvatar] = useState<{ url: string; name: string } | null>(null);

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

  // Helper: Get location stale status & elapsed time since last update
  const getLocationStaleInfo = (lastUpdateISO?: string) => {
    if (!lastUpdateISO) {
      return { isStale: false, diffMins: 0, timeAgoStr: '0m', warningMessage: '' };
    }

    try {
      const diffMs = Date.now() - new Date(lastUpdateISO).getTime();
      if (isNaN(diffMs) || diffMs <= 0) {
        return { isStale: false, diffMins: 0, timeAgoStr: '0m', warningMessage: '' };
      }
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;

      let timeAgoStr = `${diffMins}m`;
      if (diffHours > 0) {
        timeAgoStr = `${diffHours}h ${remMins}m`;
      }

      // Consider stale if location hasn't updated in 3 or more minutes
      const isStale = diffMins >= 3;
      const warningMessage = `Not Received Location from ${timeAgoStr}. Please inform staff to turn on internet connection or open the app & keep it in background.`;

      return {
        isStale,
        diffMins,
        timeAgoStr,
        warningMessage
      };
    } catch {
      return { isStale: false, diffMins: 0, timeAgoStr: '0m', warningMessage: '' };
    }
  };
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

      // Custom Red Location Pin
      const redPinIcon = {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5-2.5z',
        fillColor: '#EF4444',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 2,
        anchor: new window.google.maps.Point(12, 22),
        labelOrigin: new window.google.maps.Point(12, -8)
      };

      const staleInfo = getLocationStaleInfo(staff.lastLocationUpdate);

      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: staff.name,
        icon: redPinIcon,
        label: {
          text: staleInfo.isStale ? `${staff.name} (Inactive)` : staff.name,
          className: staleInfo.isStale ? 'map-marker-label map-marker-label-inactive' : 'map-marker-label map-marker-label-active'
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: system-ui, -apple-system, sans-serif; min-width: 210px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${staleInfo.isStale ? '#F59E0B' : '#EF4444'}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                ${staff.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #1E293B;">${staff.name}</h4>
                <p style="margin: 0; font-size: 10px; color: #64748B; font-weight: 500;">${getBranchName(staff.branchId)}</p>
              </div>
            </div>
            <p style="margin: 0 0 4px; font-size: 11px; color: #334155;"><strong>Punch In:</strong> ${staff.time} (${getElapsedDuration(staff.punchInTime)})</p>
            <p style="margin: 0 0 6px; font-size: 11px; color: #64748B; max-width: 220px; line-height: 1.4;">${staff.location}</p>
            ${staleInfo.isStale ? `
              <div style="padding: 6px 8px; background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 6px; font-size: 10px; color: #92400E; font-weight: 600; line-height: 1.3;">
                ⚠️ Not Received Location from ${staleInfo.timeAgoStr}. Please inform staff to turn on internet connection or open the app & keep it in background.
              </div>
            ` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindowsRef.current.forEach(iw => iw.close());
        infoWindow.open(mapInstanceRef.current, marker);
        setSelectedStaffDetail(staff);
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
      bounds.extend(position);
    });

    // Auto center map directly where field staff are located
    if (staffOnMap.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, 60);
    } else if (staffOnMap.length === 1) {
      mapInstanceRef.current.setCenter({ lat: staffOnMap[0].lat, lng: staffOnMap[0].lng });
      mapInstanceRef.current.setZoom(15);
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

        if (isPunchedIn && (data.currentLatitude || data.latitudeIn) && (data.currentLongitude || data.longitudeIn)) {
          activeList.push({
            id: docSnap.id,
            staffId: data.staffId,
            name: data.name || 'Unknown',
            role: data.dept || 'Field Staff',
            avatar: data.avatar || null,
            lat: Number(data.currentLatitude || data.latitudeIn),
            lng: Number(data.currentLongitude || data.longitudeIn),
            location: data.currentLocation || data.locationIn || 'Unknown Location',
            time: formattedTime,
            punchInTime: data.punchIn,
            lastLocationUpdate: data.lastLocationUpdate || data.punchIn || null,
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
          location: isPunchedIn ? (data.currentLocation || data.locationIn || 'Not Set') : (data.locationOut || 'Not Set'),
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
    mapInstanceRef.current.panTo({ lat: staff.lat, lng: staff.lng });
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

  const handleAutoFixBounds = () => {
    if (!mapInstanceRef.current || staffOnMap.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    staffOnMap.forEach(staff => {
      if (staff.lat && staff.lng) {
        bounds.extend({ lat: staff.lat, lng: staff.lng });
      }
    });
    if (staffOnMap.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, 60);
    } else if (staffOnMap.length === 1) {
      mapInstanceRef.current.panTo({ lat: staffOnMap[0].lat, lng: staffOnMap[0].lng });
      mapInstanceRef.current.setZoom(15);
    }
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
              filteredStaff.map((staff, idx) => {
                const staleInfo = getLocationStaleInfo(staff.lastLocationUpdate);

                return (
                  <div 
                    key={staff.id} 
                    onClick={() => handleSelectStaff(staff)}
                    className={`p-4 flex flex-col gap-2 ${idx !== filteredStaff.length - 1 ? 'border-b border-gray-50' : ''} ${staleInfo.isStale ? 'bg-amber-50/40 hover:bg-amber-50/80' : 'hover:bg-gray-50/50'} cursor-pointer transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${staleInfo.isStale ? 'bg-amber-500 animate-ping' : 'bg-orange-500'}`}></div>
                        {staff.avatar ? (
                          <img 
                            src={staff.avatar} 
                            alt={staff.name} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewAvatar({ url: staff.avatar, name: staff.name });
                            }}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 cursor-pointer hover:scale-105 transition-transform duration-200" 
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full ${staleInfo.isStale ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-orange-100 text-orange-600 border-orange-200'} flex items-center justify-center font-bold text-sm border`}>
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-0.5">
                          <h4 className="text-sm font-bold text-gray-900">{staff.name}</h4>
                          {staleInfo.isStale ? (
                            <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px] font-extrabold border border-amber-200 animate-pulse">
                              Signal Lost ({staleInfo.timeAgoStr})
                            </span>
                          ) : (
                            renderStatus(staff.status)
                          )}
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

                    {/* Stale Location Warning Banner */}
                    {staleInfo.isStale && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-900 font-medium leading-relaxed">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-amber-800">
                            Not Received Location from {staleInfo.timeAgoStr}.
                          </p>
                          <p className="text-amber-700 text-[10px] mt-0.5">
                            Please inform staff to turn on internet connection or open the app & keep it in background.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
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

          {/* Empty state when no field staff are active / online */}
          {onlineFieldStaffCount === 0 && (
            <div className="absolute inset-0 bg-slate-50 flex items-center justify-center flex-col p-6 text-center z-20">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 mb-4 shadow-sm">
                <WifiOff size={32} strokeWidth={2} />
              </div>
              <h3 className="text-gray-900 font-extrabold text-lg mb-1">No Active Staff Available Right Now</h3>
              <p className="text-gray-500 text-xs font-medium max-w-md leading-relaxed mb-5">
                Currently, no field staff members are punched-in on duty. As soon as a field staff member punches in from their app, live GPS tracking will automatically initialize on the map.
              </p>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm text-xs font-bold text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                <span>Waiting for Field Staff Punch-In...</span>
              </div>
            </div>
          )}

          {/* Fallback layout in case key is invalid or loading */}
          {onlineFieldStaffCount > 0 && !window.google && (
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
          <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
            <button 
              onClick={handleAutoFixBounds}
              className="px-3.5 py-2 bg-white rounded-xl shadow-md border border-gray-200 flex items-center gap-2 text-blue-600 font-bold text-xs hover:bg-blue-50 transition-colors"
              title="Fit all staff on map view"
            >
              <LocateFixed size={18} className="text-blue-500" />
              <span>Auto Fix</span>
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
                            <img 
                              src={staff.avatar} 
                              alt={staff.name} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewAvatar({ url: staff.avatar, name: staff.name });
                              }}
                              className="w-7 h-7 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200" 
                            />
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
                  <img 
                    src={selectedStaffDetail.avatar} 
                    alt={selectedStaffDetail.name} 
                    onClick={() => setPreviewAvatar({ url: selectedStaffDetail.avatar, name: selectedStaffDetail.name })}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/50 shadow cursor-pointer hover:scale-105 transition-transform duration-200" 
                  />
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
                      <p className="text-gray-400 text-[10px] font-medium leading-none">Assigned Branch</p>
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

              {/* Stale Location Warning Banner in Modal */}
              {selectedStaffDetail.lastLocationUpdate && getLocationStaleInfo(selectedStaffDetail.lastLocationUpdate).isStale && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 font-medium">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-amber-800">
                      Not Received Location from {getLocationStaleInfo(selectedStaffDetail.lastLocationUpdate).timeAgoStr}.
                    </p>
                    <p className="text-amber-700 text-[11px] mt-0.5 leading-relaxed">
                      Please inform staff to turn on internet connection or open the app and keep it in background.
                    </p>
                  </div>
                </div>
              )}

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

      {/* Large Avatar Preview Lightbox */}
      {previewAvatar && (
        <div 
          onClick={() => setPreviewAvatar(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[200] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-xl max-h-[85vh] overflow-hidden rounded-2xl bg-slate-950 shadow-2xl flex flex-col items-center justify-center p-1.5 border border-white/10">
            <button 
              onClick={() => setPreviewAvatar(null)}
              className="absolute top-4 right-4 bg-black/60 text-white hover:bg-black/80 p-2.5 rounded-full transition-colors z-[210] shadow"
            >
              <X size={20} />
            </button>
            <img 
              src={previewAvatar.url} 
              alt={previewAvatar.name} 
              className="max-w-full max-h-[75vh] object-contain rounded-xl animate-in zoom-in-95 duration-200" 
            />
            <div className="w-full text-center py-2 text-white font-bold text-xs bg-slate-900/60 absolute bottom-0 left-0">
              {previewAvatar.name} - Profile Picture
            </div>
          </div>
        </div>
      )}
    </div>
  );
}