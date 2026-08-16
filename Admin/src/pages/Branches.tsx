import React, { useState, useEffect } from 'react';
import { Building, MapPin, Plus, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Branches() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100'); // default 100 meters
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setBranches(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !latitude || !longitude || !radius) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      await addDoc(collection(db, 'branches'), {
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseInt(radius, 10),
        createdAt: serverTimestamp()
      });
      setName('');
      setAddress('');
      setLatitude('');
      setLongitude('');
      setRadius('100');
      setIsAdding(false);
    } catch (err: any) {
      setError(err.message || 'Error adding branch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Branches</h2>
          <p className="text-gray-500 text-sm mt-1">Add and monitor all organizational branches.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add New Branch
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Building className="text-blue-500" size={20} />
            New Branch Details
          </h3>
          
          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch Name</label>
              <input 
                required 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Head Office, South Clinic..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Address</label>
              <input 
                required 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Geofencing Fields */}
            <div className="md:col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="text-blue-500" size={16} />
                Geofencing Setup (For Attendance)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Latitude</label>
                  <input 
                    required 
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. 28.6139"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Longitude</label>
                  <input 
                    required 
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. 77.2090"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Radius (in meters)</label>
                  <input 
                    required 
                    type="number"
                    min="10"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Save Branch'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-gray-500">Loading branches...</p>
        ) : branches.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center flex flex-col items-center">
             <Building className="text-gray-300 mb-3" size={40} />
             <h4 className="text-gray-800 font-bold mb-1">No Branches Found</h4>
             <p className="text-gray-500 text-sm">Add a branch to get started.</p>
          </div>
        ) : (
          branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none" />
              
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 shadow-sm border border-blue-100/50 group-hover:scale-110 transition-transform">
                  <Building size={22} strokeWidth={2} />
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">{branch.name}</h3>
              
              <div className="flex items-start gap-2 mt-3">
                <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-500 leading-snug">{branch.address}</p>
              </div>

              {branch.latitude && branch.longitude && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Geofenced
                  </span>
                  <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                    {branch.radius}m radius
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
