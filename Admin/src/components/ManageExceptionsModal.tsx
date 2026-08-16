import React, { useState, useEffect } from 'react';
import { X, Calendar, CalendarPlus, CalendarMinus, Trash2 } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

interface Props {
  staff: any;
  onClose: () => void;
}

export default function ManageExceptionsModal({ staff, onClose }: Props) {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [date, setDate] = useState('');
  const [type, setType] = useState('Leave');
  const [submitting, setSubmitting] = useState(false);

  const fetchExceptions = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'attendance_exceptions'),
        where('staffId', '==', staff.id)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side if no index
      data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExceptions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staff) {
      fetchExceptions();
    }
  }, [staff]);

  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return alert('Please select a date');

    setSubmitting(true);
    try {
      // Check if already exists
      const exists = exceptions.find(ex => ex.date === date);
      if (exists) {
        alert(`An exception already exists for this date (${exists.type}). Please delete it first.`);
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'attendance_exceptions'), {
        staffId: staff.id,
        date: date,
        type: type,
        createdAt: serverTimestamp()
      });
      
      setDate('');
      fetchExceptions();
    } catch (error: any) {
      alert('Error adding: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exception?')) {
      try {
        await deleteDoc(doc(db, 'attendance_exceptions', id));
        fetchExceptions();
      } catch (error: any) {
        alert('Error deleting: ' + error.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Leaves & Holidays</h3>
            <p className="text-xs text-gray-500">Managing exceptions for {staff.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {/* Add Form */}
          <div className="bg-blue-50/50 rounded-xl p-4 mb-6 border border-blue-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarPlus size={16} className="text-blue-500" /> Add New Exception
            </h4>
            <form onSubmit={handleAddException} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                  required
                />
              </div>
              <div className="flex-1">
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Leave">Grant Leave</option>
                  <option value="CancelHoliday">Cancel Holiday (Working Day)</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add'}
              </button>
            </form>
          </div>

          {/* List of Exceptions */}
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-gray-500" /> Existing Records
          </h4>
          
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
          ) : exceptions.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
              <p className="text-sm text-gray-500">No leaves or cancelled holidays found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exceptions.map(ex => (
                <div key={ex.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ex.type === 'Leave' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                      {ex.type === 'Leave' ? <CalendarPlus size={16} /> : <CalendarMinus size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{new Date(ex.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className={`text-[10px] font-bold ${ex.type === 'Leave' ? 'text-purple-600' : 'text-orange-600'}`}>
                        {ex.type === 'Leave' ? 'Approved Leave' : 'Cancelled Holiday (Working Day)'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(ex.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
