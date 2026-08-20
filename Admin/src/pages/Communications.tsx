import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, MoreVertical, Megaphone, Pin, FileText, 
  Calendar, Paperclip, Image as ImageIcon, File, Smile, Send,
  MessageCircle, ChevronDown, ThumbsUp, MapPin, X, Video as VideoIcon,
  Lock, Users, Plus, Settings, Trash2, UserPlus, UserMinus, ChevronRight, Edit3, Check
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc, deleteDoc, where, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { uploadToImageKitWithDetails, deleteFromImageKit } from '../services/imagekit';

const COMMON_EMOJIS = ["😀", "😂", "🥰", "😎", "🤔", "🙌", "👍", "🙏", "🔥", "💯", "🎉", "❤️"];

const getEmpIdsFromRoomId = (roomId: string) => {
  if (!roomId || !roomId.startsWith('private_')) return { empA: '', empB: '' };
  const parts = roomId.split('_');
  return {
    empA: parts[1] || '',
    empB: parts[2] || ''
  };
};

interface CommunicationsProps {
  branchesList?: any[];
}

export default function Communications({ branchesList = [] }: CommunicationsProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState('normal');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Monitoring states
  const [activeTab, setActiveTab] = useState<'group' | 'private' | 'banner' | 'direct' | 'custom'>('group');
  const [privateRooms, setPrivateRooms] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [searchQueryPrivate, setSearchQueryPrivate] = useState("");

  // Daily Banner States
  const [bannerTitle, setBannerTitle] = useState("Daily Update");
  const [bannerMessage, setBannerMessage] = useState("");
  const [isUpdatingBanner, setIsUpdatingBanner] = useState(false);

  // Custom Groups States
  const [customGroups, setCustomGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [customGroupMessageText, setCustomGroupMessageText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const privateMessagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customGroupMessagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Group Chat listener
  useEffect(() => {
    const q = query(collection(db, 'communications'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let msgTime = 0;
        if (data.createdAt?.toMillis) {
          msgTime = data.createdAt.toMillis();
        } else if (data.createdAt?.seconds) {
          msgTime = data.createdAt.seconds * 1000;
        }

        // Auto vanish messages older than 5 days (from Firestore and ImageKit)
        if (msgTime && (now - msgTime > FIVE_DAYS_MS)) {
          if (data.attachments && Array.isArray(data.attachments)) {
            data.attachments.forEach((att: any) => {
              if (att.fileId) {
                deleteFromImageKit(att.fileId);
              }
            });
          }
          deleteDoc(doc(db, 'communications', docSnap.id)).catch(console.error);
        } else {
          msgs.push({ id: docSnap.id, ...data });
        }
      });
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen to all private rooms
  useEffect(() => {
    const q = query(collection(db, 'private_rooms'), orderBy('lastMessageAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms: any[] = [];
      snapshot.forEach((docSnap) => {
        rooms.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPrivateRooms(rooms);
    }, (err) => {
      console.error("Error listening to private rooms:", err);
    });
    return () => unsubscribe();
  }, []);

  // 3. Derived direct messages state in-memory (guarantees instant 0ms updates and avoids Firestore index limitations)
  const selectedRoomMessages = messages.filter(msg => msg.roomId === selectedRoomId);

  // Scroll direct chats to bottom automatically on new messages
  useEffect(() => {
    if (selectedRoomId) {
      setTimeout(() => privateMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [selectedRoomId, selectedRoomMessages.length]);

  // 4. Listen to daily banner changes
  useEffect(() => {
    const docBannerRef = doc(db, 'daily_banner', 'current');
    const unsubscribe = onSnapshot(docBannerRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBannerTitle(data.title || "Daily Update");
        setBannerMessage(data.message || "");
      }
    });
    return () => unsubscribe();
  }, []);

  // 5. Listen to staff users
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'staff'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staff: any[] = [];
      snapshot.forEach(docSnap => {
        staff.push({ id: docSnap.id, ...docSnap.data() });
      });
      setStaffList(staff);
    });
    return () => unsubscribe();
  }, []);

  // 6. Listen to custom groups
  useEffect(() => {
    const q = query(collection(db, 'custom_groups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groups: any[] = [];
      snapshot.forEach(docSnap => {
        groups.push({ id: docSnap.id, ...docSnap.data() });
      });
      setCustomGroups(groups);
    }, (err) => {
      console.error('Error listening to custom_groups:', err);
    });
    return () => unsubscribe();
  }, []);

  // Derived: messages for selected custom group
  const selectedGroupMessages = messages.filter(msg => msg.roomId === `custom_group_${selectedGroupId}`);
  const selectedGroup = customGroups.find(g => g.id === selectedGroupId);

  // Scroll custom group messages
  useEffect(() => {
    if (selectedGroupId) {
      setTimeout(() => customGroupMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [selectedGroupId, selectedGroupMessages.length]);

  // Helper: get branch name
  const getBranchName = (branchId: string) => {
    if (!branchId) return 'Unassigned';
    const b = branchesList.find(item => item.id === branchId);
    return b ? b.name : branchId;
  };

  // Group staff by branch
  const getStaffByBranch = (staffArr: any[]) => {
    const grouped: Record<string, any[]> = {};
    staffArr.forEach(s => {
      const branch = s.branchName || getBranchName(s.branchId) || 'Unassigned';
      if (!grouped[branch]) grouped[branch] = [];
      grouped[branch].push(s);
    });
    return grouped;
  };

  // Toggle member selection
  const toggleMember = (empId: string) => {
    setSelectedMembers(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
  };

  // Create group handler
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { alert('Please enter a group name.'); return; }
    if (selectedMembers.length === 0) { alert('Please select at least one member.'); return; }
    try {
      const memberNames = selectedMembers.map(empId => {
        const s = staffList.find(st => st.empId === empId);
        return s?.name || empId;
      });
      await addDoc(collection(db, 'custom_groups'), {
        name: newGroupName.trim(),
        createdBy: 'admin',
        createdAt: serverTimestamp(),
        members: selectedMembers,
        memberNames,
      });
      setShowCreateGroup(false);
      setNewGroupName('');
      setSelectedMembers([]);
      setGroupSearchQuery('');
    } catch (err: any) {
      alert('Error creating group: ' + err.message);
    }
  };

  // Send message in custom group
  const handleSendCustomGroupMessage = async (text: string = '', attachments: any[] = []) => {
    if (!text.trim() && attachments.length === 0) return;
    if (!selectedGroupId) return;
    setCustomGroupMessageText('');
    try {
      await addDoc(collection(db, 'communications'), {
        type: 'normal',
        text,
        author: 'Admin',
        authorId: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=2563EB&color=fff&bold=true&size=128&format=png',
        attachments,
        likes: 0,
        createdAt: serverTimestamp(),
        pinned: false,
        roomId: `custom_group_${selectedGroupId}`,
        isPrivate: false,
        isCustomGroup: true,
        groupId: selectedGroupId,
      });
      setTimeout(() => customGroupMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Error sending custom group message:', err);
    }
  };

  // Remove member from group
  const handleRemoveMember = async (empId: string) => {
    if (!selectedGroup) return;
    const newMembers = selectedGroup.members.filter((m: string) => m !== empId);
    const newNames = newMembers.map((id: string) => {
      const s = staffList.find(st => st.empId === id);
      return s?.name || id;
    });
    await updateDoc(doc(db, 'custom_groups', selectedGroup.id), { members: newMembers, memberNames: newNames });
  };

  // Add member to group
  const handleAddMember = async (empId: string) => {
    if (!selectedGroup) return;
    if (selectedGroup.members.includes(empId)) return;
    const newMembers = [...selectedGroup.members, empId];
    const newNames = newMembers.map((id: string) => {
      const s = staffList.find(st => st.empId === id);
      return s?.name || id;
    });
    await updateDoc(doc(db, 'custom_groups', selectedGroup.id), { members: newMembers, memberNames: newNames });
  };

  // Rename group
  const handleRenameGroup = async () => {
    if (!selectedGroup || !editGroupName.trim()) return;
    await updateDoc(doc(db, 'custom_groups', selectedGroup.id), { name: editGroupName.trim() });
  };

  // Delete group
  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    if (!window.confirm(`Delete group "${selectedGroup.name}"? All messages will remain but the group will be removed.`)) return;
    await deleteDoc(doc(db, 'custom_groups', selectedGroup.id));
    setSelectedGroupId(null);
    setShowGroupSettings(false);
  };

  const handleUpdateBanner = async () => {
    if (!bannerMessage.trim()) {
      alert("Please enter a banner message.");
      return;
    }
    setIsUpdatingBanner(true);
    try {
      const docBannerRef = doc(db, 'daily_banner', 'current');
      await setDoc(docBannerRef, {
        title: bannerTitle.trim() || "Daily Update",
        message: bannerMessage.trim(),
        updatedAt: serverTimestamp()
      });
      alert("Daily Banner updated successfully!");
    } catch (error: any) {
      alert("Error updating banner: " + error.message);
    } finally {
      setIsUpdatingBanner(false);
    }
  };

  const handleSendMessage = async (text: string = "", attachments: any[] = []) => {
    if ((!text.trim() && attachments.length === 0)) return;

    const msgText = text;
    setMessageText("");
    setShowEmojis(false);

    const typeLower = messageType.toLowerCase();
    
    const msgDoc: any = {
      type: typeLower === 'holiday notice' ? 'notice' : typeLower === 'announcement' ? 'announcement' : typeLower === 'notice' ? 'notice' : 'normal',
      text: msgText,
      author: 'Admin',
      authorId: 'admin',
      avatar: 'https://ui-avatars.com/api/?name=Admin&background=2563EB&color=fff&bold=true&size=128&format=png',
      attachments,
      likes: 0,
      createdAt: serverTimestamp(),
      pinned: false
    };

    if (activeTab === 'direct' && selectedRoomId) {
      msgDoc.roomId = selectedRoomId;
      msgDoc.isPrivate = true;
      const parts = selectedRoomId.split('_');
      const staffId = parts[2] || '';
      msgDoc.participants = [staffId, 'admin'];
    } else {
      msgDoc.roomId = 'group';
      msgDoc.isPrivate = false;
      if (typeLower === 'announcement') msgDoc.title = 'Important Announcement';
      else if (typeLower === 'notice') msgDoc.title = 'Notice';
      else if (typeLower === 'holiday notice') msgDoc.title = 'Holiday Notice';
    }

    try {
      await addDoc(collection(db, 'communications'), msgDoc);

      if (activeTab === 'direct' && selectedRoomId) {
        // Update or set room info
        const roomRef = doc(db, 'private_rooms', selectedRoomId);
        const parts = selectedRoomId.split('_');
        const staffId = parts[2] || '';
        const staff = staffList.find(s => s.empId === staffId);

        await setDoc(roomRef, {
          roomId: selectedRoomId,
          userA: staffId,
          userB: 'admin',
          userAName: staff?.name || 'Staff',
          userBName: 'Admin',
          userAAvatar: staff?.avatar || null,
          userBAvatar: 'https://ui-avatars.com/api/?name=Admin&background=2563EB&color=fff&bold=true&size=128&format=png',
          userABranch: staff?.branchName || staff?.branchId || 'Field Operations',
          userBBranch: 'Headquarters',
          lastMessage: msgText || '[Attachment]',
          lastMessageAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSendText = () => handleSendMessage(messageText);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      const res = await uploadToImageKitWithDetails(file);
      if (res && res.url) {
        let type = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        if (file.type.startsWith('video/')) type = 'video';
        await handleSendMessage("", [{ url: res.url, fileId: res.fileId, fileType: type, name: file.name }]);
      } else {
        alert("Upload failed.");
      }
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handlePin = async (msg: any) => {
    try {
      await updateDoc(doc(db, 'communications', msg.id), {
        pinned: !msg.pinned
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleLike = async (msg: any) => {
    try {
      await updateDoc(doc(db, 'communications', msg.id), {
        likes: (msg.likes || 0) + 1
      });
    } catch (error) {
      console.error(error);
    }
  };

  const renderMessage = (msg: any) => {
    const time = msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    if (msg.type !== 'normal') {
      const isNotice = msg.type === 'notice' || msg.title === 'Holiday Notice';
      const theme = isNotice ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]' : 'bg-[#FDF4FF] border-[#F5D0FE] text-[#9333EA]';
      const MsgIcon = isNotice ? Megaphone : Megaphone;

      return (
        <div key={msg.id} className={`mb-6 p-4 rounded-xl border flex gap-4 ${theme} shadow-sm relative group`}>
          <div className="shrink-0 mt-0.5">
            <MsgIcon size={24} strokeWidth={2} />
          </div>
          <div className="flex-1 pr-8">
            <h4 className="font-bold text-[13px] tracking-wide mb-1 flex items-center gap-2 uppercase">
              {msg.title || msg.type}
              {msg.pinned && <Pin size={14} className="ml-2 text-inherit" />}
            </h4>
            <p className="text-gray-800 text-[15px] mb-2">{msg.text}</p>
            
            {msg.attachments?.map((att: any, i: number) => (
              <div key={i} className="mt-2 mb-2">
                {att.fileType === 'image' && (
                  <img 
                    src={att.url} 
                    alt="Attachment" 
                    onClick={() => setSelectedImage(att.url)}
                    className="max-w-[300px] rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity" 
                  />
                )}
                {att.fileType === 'video' && (
                  <video 
                    src={att.url} 
                    controls 
                    className="max-w-[340px] max-h-[240px] rounded-xl shadow-sm border border-gray-200" 
                  />
                )}
                {att.fileType === 'document' && (
                  <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-inherit w-fit">
                    <FileText size={16} />
                    <span className="text-xs font-semibold">{att.name}</span>
                  </a>
                )}
              </div>
            ))}

            <p className="text-gray-500 text-xs font-medium">By {msg.author} • {time}</p>
          </div>
          <button onClick={() => handlePin(msg)} className={`absolute top-4 right-4 transition-opacity ${msg.pinned ? 'opacity-100 text-blue-600' : 'opacity-40 hover:opacity-100 text-inherit'}`}>
            <Pin size={20} strokeWidth={2.5} />
          </button>
        </div>
      );
    }

    return (
      <div key={msg.id} className="flex gap-3 mb-6 relative group">
        <div className="relative shrink-0">
          <img 
            src={msg.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.author)}&background=EFF6FF&color=1D4ED8`} 
            alt={msg.author} 
            onClick={() => setSelectedImage(msg.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.author)}&background=EFF6FF&color=1D4ED8`)}
            className="w-10 h-10 rounded-full object-cover border border-gray-200 cursor-pointer hover:scale-105 transition-transform duration-200" 
          />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
        <div className="flex-1 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900 text-[15px]">{msg.author}</span>
            <span className="text-gray-400 text-xs">{time}</span>
            {msg.pinned && <Pin size={12} className="text-blue-500" />}
          </div>
          
          {msg.text ? <p className="text-gray-800 text-[15px] leading-relaxed mb-2 whitespace-pre-wrap">{msg.text}</p> : null}
          
          {msg.attachments?.map((att: any, i: number) => (
            <div key={i} className="mt-1 mb-2">
              {att.fileType === 'image' && (
                <img 
                  src={att.url} 
                  alt="Attachment" 
                  onClick={() => setSelectedImage(att.url)}
                  className="max-w-[300px] rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity" 
                />
              )}
              {att.fileType === 'video' && (
                <video 
                  src={att.url} 
                  controls 
                  className="max-w-[340px] max-h-[240px] rounded-xl shadow-sm border border-gray-200" 
                />
              )}
              {att.fileType === 'document' && (
                <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 w-fit">
                  <FileText size={16} className="text-gray-500" />
                  <span className="text-xs text-gray-700 font-semibold">{att.name}</span>
                </a>
              )}
            </div>
          ))}

        </div>
        <button onClick={() => handlePin(msg)} className={`absolute top-0 right-4 transition-opacity ${msg.pinned ? 'opacity-100 text-blue-600' : 'opacity-0 group-hover:opacity-40 hover:opacity-100 text-gray-400'}`}>
          <Pin size={16} strokeWidth={2.5} />
        </button>
      </div>
    );
  };

  const renderPrivateMessage = (msg: any) => {
    const time = msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const date = msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString() : '';

    const isAdmin = msg.authorId === 'admin';

    return (
      <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-4 w-full`}>
        <div className={`flex gap-2.5 max-w-[70%] ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isAdmin && (
            <img 
              src={msg.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.author)}&background=EFF6FF&color=1D4ED8`} 
              alt={msg.author} 
              onClick={() => setSelectedImage(msg.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.author)}&background=EFF6FF&color=1D4ED8`)}
              className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 self-end cursor-pointer hover:scale-105 transition-transform duration-200" 
            />
          )}
          <div className={`rounded-2xl p-3 shadow-sm border ${
            isAdmin 
              ? 'bg-blue-600 border-blue-700 text-white rounded-br-none' 
              : 'bg-white border-gray-200 text-gray-800 rounded-bl-none'
          }`}>
            {!isAdmin && (
              <p className="text-[10px] font-black text-blue-600 mb-1">
                {msg.author}
              </p>
            )}
            
            {msg.text ? <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p> : null}
            
            {msg.attachments?.map((att: any, i: number) => (
              <div key={i} className="mt-2 mb-1">
                {att.fileType === 'image' && (
                  <img 
                    src={att.url} 
                    alt="Attachment" 
                    onClick={() => setSelectedImage(att.url)}
                    className="max-w-[200px] rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity" 
                  />
                )}
                {att.fileType === 'video' && (
                  <video 
                    src={att.url} 
                    controls 
                    className="max-w-[240px] max-h-[160px] rounded-lg shadow-sm border border-gray-200" 
                  />
                )}
                {att.fileType === 'document' && (
                  <a href={att.url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-2 rounded-lg border w-fit hover:bg-opacity-90 transition-colors ${
                    isAdmin ? 'bg-blue-700 border-blue-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}>
                    <FileText size={16} />
                    <span className="text-xs font-semibold truncate max-w-[120px]">{att.name || 'Document'}</span>
                  </a>
                )}
              </div>
            ))}
            
            <div className="flex items-center justify-end gap-1.5 mt-1.5">
              <span className={`text-[9px] font-semibold ${isAdmin ? 'text-blue-200' : 'text-gray-400'}`}>
                {date} {time}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const groupMessages = messages.filter(msg => msg.roomId === 'group' || !msg.roomId);

  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-[1400px] mx-auto min-h-0 animate-in fade-in duration-300">
      
      {/* Top Tab Bar for Admin Monitoring */}
      <div className="flex bg-gray-150 p-1 rounded-xl gap-1.5 mb-5 w-full max-w-md border border-gray-200/40 bg-gray-200/50">
        <button
          onClick={() => setActiveTab('group')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'group'
              ? 'bg-white text-blue-600 shadow-sm font-extrabold'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={14} />
          Group Chat
        </button>
        <button
          onClick={() => {
            setActiveTab('private');
            setSelectedRoomId(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'private'
              ? 'bg-white text-blue-600 shadow-sm font-extrabold'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Lock size={14} />
          Private Monitor
        </button>
        <button
          onClick={() => {
            setActiveTab('direct');
            setSelectedRoomId(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'direct'
              ? 'bg-white text-blue-600 shadow-sm font-extrabold'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageCircle size={14} />
          Personal Chats
        </button>
        <button
          onClick={() => {
            setActiveTab('banner');
            setSelectedRoomId(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'banner'
              ? 'bg-white text-blue-600 shadow-sm font-extrabold'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Megaphone size={14} />
          Banner
        </button>
        <button
          onClick={() => {
            setActiveTab('custom');
            setSelectedRoomId(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'custom'
              ? 'bg-white text-blue-600 shadow-sm font-extrabold'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={14} />
          Custom Groups
        </button>
      </div>

      {activeTab === 'banner' ? (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto w-full mt-4 flex flex-col justify-start overflow-y-auto">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
              <Megaphone size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-lg">Update Daily Announcement Banner</h3>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">This banner is displayed on the main home screen of the Staff mobile application in real-time.</p>
            </div>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Banner Title</label>
              <input 
                type="text" 
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                placeholder="e.g. Today's Update, Holiday Notice"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all font-bold"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Banner Announcement Message</label>
              <textarea 
                value={bannerMessage}
                onChange={(e) => setBannerMessage(e.target.value)}
                placeholder="Type the message to display on the staff home screen banner..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all min-h-[140px] resize-y leading-relaxed font-semibold"
              />
            </div>
            
            <button 
              onClick={handleUpdateBanner}
              disabled={isUpdatingBanner}
              className={`w-full py-3.5 rounded-xl font-bold text-sm text-center shadow-md flex items-center justify-center gap-2 transition-all ${
                isUpdatingBanner 
                  ? 'bg-gray-300 text-white cursor-not-allowed shadow-none' 
                  : 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-100 hover:shadow-lg'
              }`}
            >
              {isUpdatingBanner ? "Updating..." : "Update Live Banner 🚀"}
            </button>
          </div>
        </div>
      ) : activeTab === 'group' ? (
        /* Main Chat Container for Group Chat */
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-0">
          
          {/* Top Search & Actions Bar */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0">
            <h2 className="text-xl font-bold text-gray-900 hidden sm:block">Team Communications</h2>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              <div className="relative w-full sm:w-64">
                <Search size={18} className="absolute left-3.5 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search messages..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Chat Messages Feed Area */}
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar bg-white relative">
            {groupMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 font-medium">No communications found.</div>
            ) : (
              groupMessages.map(renderMessage)
            )}
            {isUploading && (
              <div className="text-center py-2 text-blue-500 font-semibold text-sm animate-pulse">Uploading attachment...</div>
            )}
            <div ref={messagesEndRef} className="h-4" /> 
          </div>

          {/* Bottom Message Input Area */}
          <div className="p-2.5 sm:p-4 border-t border-gray-100 bg-white shrink-0">
            
            {showEmojis && (
                <div className="mb-2 bg-white rounded-full py-1.5 px-3 border border-gray-100 shadow-sm flex gap-2 overflow-x-auto custom-scrollbar">
                    {COMMON_EMOJIS.map((emoji, index) => (
                        <button key={index} onClick={() => setMessageText(prev => prev + emoji)} className="text-lg sm:text-xl hover:scale-110 transition-transform shrink-0">
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {/* Message Type Selector */}
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-500">Message Type</span>
              <div className="relative">
                <select 
                  value={messageType} 
                  onChange={(e) => setMessageType(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg pl-7 sm:pl-9 pr-7 sm:pr-8 py-1 sm:py-1.5 focus:outline-none focus:border-blue-400 cursor-pointer"
                >
                  <option value="normal">Normal Message</option>
                  <option value="announcement">Announcement</option>
                  <option value="notice">Notice</option>
                  <option value="holiday notice">Holiday Notice</option>
                </select>
                <MessageCircle size={14} className="absolute left-2.5 top-2 sm:top-2.5 text-gray-400 pointer-events-none" />
                <ChevronDown size={14} className="absolute right-2 top-2 sm:top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Input Box Wrapper */}
            <div className="border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
              <textarea 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message here..." 
                className="w-full bg-transparent px-3 py-2 sm:p-3 text-sm text-gray-800 focus:outline-none resize-none min-h-[42px] sm:min-h-[56px] max-h-[120px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendText();
                  }
                }}
              ></textarea>
              
              {/* Bottom Toolbar inside Input */}
              <div className="flex justify-between items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-50/50 border-t border-gray-100">
                
                {/* Attachment Icons */}
                <div className="flex items-center gap-1">
                  <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Paperclip size={18} strokeWidth={2} /></button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><ImageIcon size={18} strokeWidth={2} /></button>
                  <button onClick={() => setShowEmojis(!showEmojis)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Smile size={18} strokeWidth={2} /></button>
                </div>
                
                {/* Send Button */}
                <button 
                  onClick={handleSendText} 
                  disabled={!messageText.trim()}
                  className={`px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-sm ${!messageText.trim() ? 'bg-gray-300 text-white cursor-not-allowed' : 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-200'}`}
                >
                  <Send size={14} strokeWidth={2.5} className="ml-0.5" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'private' ? (
        /* Private Chat Monitoring Split Panel */
        <div className="flex-1 flex gap-6 min-h-0 w-full">
          
          {/* Left Panel: Active Conversations List */}
          <div className="w-80 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden shrink-0">
            <div className="p-4 border-b border-gray-100 bg-white">
              <h3 className="font-bold text-gray-900 mb-2.5 text-xs uppercase tracking-wider">Conversations</h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search staff names..." 
                  value={searchQueryPrivate}
                  onChange={(e) => setSearchQueryPrivate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
              {privateRooms.filter(room => {
                const q = searchQueryPrivate.toLowerCase();
                return (room.userAName || '').toLowerCase().includes(q) || 
                       (room.userBName || '').toLowerCase().includes(q);
              }).length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 font-semibold">No active conversations found</div>
              ) : (
                privateRooms.filter(room => {
                  const q = searchQueryPrivate.toLowerCase();
                  return (room.userAName || '').toLowerCase().includes(q) || 
                         (room.userBName || '').toLowerCase().includes(q);
                }).map((room) => {
                  const isSelected = selectedRoomId === room.roomId;
                  const time = room.lastMessageAt ? new Date(room.lastMessageAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  const { empA, empB } = getEmpIdsFromRoomId(room.roomId);
                  return (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.roomId)}
                      className={`w-full text-left p-3.5 hover:bg-blue-50/30 transition-all flex flex-col gap-1.5 ${isSelected ? 'bg-blue-50/50 border-r-4 border-blue-600' : ''}`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-1 w-full">
                            <span className="font-extrabold text-gray-900 text-[13px] truncate block">{room.userAName}</span>
                            <span className="text-gray-400 text-[10px]">↔</span>
                            <span className="font-extrabold text-gray-900 text-[13px] truncate block">{room.userBName}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">({empA} ↔ {empB})</span>
                        </div>
                        <span className="text-[9px] text-gray-400 shrink-0 font-medium mt-0.5">{time}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[9px] text-gray-400 font-semibold">
                        <span>{room.userABranch || 'Other'} ↔ {room.userBBranch || 'Other'}</span>
                      </div>

                      <p className="text-[11px] text-gray-500 truncate w-full italic mt-0.5">
                        {room.lastMessage || 'No messages'}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Messages Feed */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-h-0">
            {selectedRoomId ? (
              <>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/30 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-black text-gray-900 text-sm">
                      {(() => {
                        const r = privateRooms.find(r => r.roomId === selectedRoomId);
                        if (!r) return "";
                        const { empA, empB } = getEmpIdsFromRoomId(r.roomId);
                        return `${r.userAName} (${empA}) ↔ ${r.userBName} (${empB})`;
                      })()}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                      Monitoring private communication history
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full text-amber-700">
                    <Lock size={12} />
                    <span className="text-[9px] font-black uppercase">MONITORED</span>
                  </div>
                </div>

                {/* Messages feed */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 scroll-smooth custom-scrollbar">
                  {selectedRoomMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs font-semibold">No messages in this chat.</div>
                  ) : (
                    selectedRoomMessages.map(renderPrivateMessage)
                  )}
                  <div ref={privateMessagesEndRef} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4 border border-blue-100 text-blue-600 shadow-sm shadow-blue-100">
                  <Lock size={28} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Private Chat Monitor Dashboard</h3>
                <p className="text-xs text-gray-400 max-w-xs font-semibold leading-relaxed">
                  Select an active private conversation from the left sidebar to monitor communication logs in real-time.
                </p>
              </div>
            )}
          </div>

        </div>
      ) : activeTab === 'direct' ? (
        /* Personal Chat Panel */
        (() => {
          const directRooms = privateRooms.filter(room => room.userB === 'admin' || room.roomId.startsWith('private_admin_'));
          const availableStaffToChat = staffList.filter(staff => {
            const roomId = `private_admin_${staff.empId}`;
            return !directRooms.some(room => room.roomId === roomId);
          });

          return (
            <div className="flex-1 flex gap-6 min-h-0 w-full">
              
              {/* Left Panel: Direct Conversations & Staff List */}
              <div className="w-80 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden shrink-0">
                <div className="p-4 border-b border-gray-100 bg-white shrink-0">
                  <h3 className="font-bold text-gray-900 mb-2.5 text-xs uppercase tracking-wider">Staff Chats</h3>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search staff..." 
                      value={searchQueryPrivate}
                      onChange={(e) => setSearchQueryPrivate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                  {/* Existing Direct Chat Rooms */}
                  {directRooms.filter(room => {
                    const q = searchQueryPrivate.toLowerCase();
                    return (room.userAName || '').toLowerCase().includes(q) || 
                           (room.userBName || '').toLowerCase().includes(q);
                  }).map((room) => {
                    const isSelected = selectedRoomId === room.roomId;
                    const time = room.lastMessageAt ? new Date(room.lastMessageAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoomId(room.roomId)}
                        className={`w-full text-left p-3.5 hover:bg-blue-50/30 transition-all flex flex-col gap-1.5 ${isSelected ? 'bg-blue-50/50 border-r-4 border-blue-600' : ''}`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <img 
                              src={room.userAAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.userAName)}&background=EFF6FF&color=1D4ED8`} 
                              alt={room.userAName} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(room.userAAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.userAName)}&background=EFF6FF&color=1D4ED8`);
                              }}
                              className="w-7 h-7 rounded-full object-cover border border-gray-200 cursor-pointer hover:scale-105 transition-transform duration-200" 
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-extrabold text-gray-900 text-[13px] truncate block">{room.userAName}</span>
                              <span className="text-[9px] text-gray-400 font-semibold">{room.userABranch || 'Field Operations'}</span>
                            </div>
                          </div>
                          <span className="text-[9px] text-gray-400 shrink-0 font-medium mt-0.5">{time}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate w-full italic pl-9">
                          {room.lastMessage || 'No messages'}
                        </p>
                      </button>
                    );
                  })}

                  {/* Start New Conversation (Available Staff) */}
                  {availableStaffToChat.filter(staff => {
                    const q = searchQueryPrivate.toLowerCase();
                    return (staff.name || '').toLowerCase().includes(q) || 
                           (staff.empId || '').toLowerCase().includes(q);
                  }).length > 0 && (
                    <div className="p-3 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 border-t border-gray-100">
                      Start New Chat
                    </div>
                  )}

                  {availableStaffToChat.filter(staff => {
                    const q = searchQueryPrivate.toLowerCase();
                    return (staff.name || '').toLowerCase().includes(q) || 
                           (staff.empId || '').toLowerCase().includes(q);
                  }).map((staff) => {
                    const roomId = `private_admin_${staff.empId}`;
                    const isSelected = selectedRoomId === roomId;
                    return (
                      <button
                        key={staff.id}
                        onClick={() => {
                          setSelectedRoomId(roomId);
                        }}
                        className={`w-full text-left p-3.5 hover:bg-purple-50/30 transition-all flex items-center gap-2.5 ${isSelected ? 'bg-purple-50/50 border-r-4 border-purple-600' : ''}`}
                      >
                        <img 
                          src={staff.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=F3E8FF&color=7E22CE`} 
                          alt={staff.name} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(staff.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=F3E8FF&color=7E22CE`);
                          }}
                          className="w-7 h-7 rounded-full object-cover border border-purple-200 cursor-pointer hover:scale-105 transition-transform duration-200" 
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-extrabold text-gray-900 text-[13px] truncate block">{staff.name}</span>
                          <span className="text-[9px] text-purple-600 font-semibold">{staff.designation || 'Staff'} • ID: {staff.empId}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel: Direct Message Thread & Chat Input */}
              <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-h-0">
                {selectedRoomId ? (
                  <>
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/30 flex justify-between items-center shrink-0">
                      <div>
                        <h3 className="font-black text-gray-900 text-sm">
                          {(() => {
                            const parts = selectedRoomId.split('_');
                            const staffId = parts[2] || '';
                            const staff = staffList.find(s => s.empId === staffId);
                            const room = directRooms.find(r => r.roomId === selectedRoomId);
                            return `Chat with ${staff?.name || room?.userAName || 'Staff'} (${staffId})`;
                          })()}
                        </h3>
                        <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                          Direct personal chat with field agent
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-purple-700">
                        <MessageCircle size={12} />
                        <span className="text-[9px] font-black uppercase">DIRECT CHAT</span>
                      </div>
                    </div>

                    {/* Messages feed */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 scroll-smooth custom-scrollbar">
                      {selectedRoomMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-xs font-semibold">No messages in this chat. Start typing below!</div>
                      ) : (
                        selectedRoomMessages.map(renderPrivateMessage)
                      )}
                      {isUploading && (
                        <div className="text-center py-2.5 text-blue-600 font-bold text-xs animate-pulse bg-blue-50/80 rounded-xl border border-blue-100 mt-2">
                          Uploading attachment... Please wait.
                        </div>
                      )}
                      <div ref={privateMessagesEndRef} />
                    </div>

                    {/* Direct Message Input */}
                    <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                      {showEmojis && (
                          <div className="mb-2 bg-white rounded-full py-1.5 px-3 border border-gray-100 shadow-sm flex gap-2 overflow-x-auto custom-scrollbar">
                              {COMMON_EMOJIS.map((emoji, index) => (
                                  <button key={index} onClick={() => setMessageText(prev => prev + emoji)} className="text-lg sm:text-xl hover:scale-110 transition-transform shrink-0">
                                      {emoji}
                                  </button>
                              ))}
                          </div>
                      )}

                    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                      <textarea 
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type a personal message..." 
                        className="w-full bg-transparent px-3 py-2 text-sm text-gray-800 focus:outline-none resize-none min-h-[42px] max-h-[120px]"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendText();
                          }
                        }}
                      />
                      
                      <div className="flex justify-between items-center px-4 py-2 bg-gray-50/50 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Paperclip size={18} /></button>
                          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><ImageIcon size={18} /></button>
                          <button onClick={() => setShowEmojis(!showEmojis)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Smile size={18} /></button>
                        </div>
                          
                          <button 
                            onClick={handleSendText} 
                            disabled={!messageText.trim()}
                            className={`px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 transition-colors shadow-sm ${!messageText.trim() ? 'bg-gray-300 text-white cursor-not-allowed' : 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-200'}`}
                          >
                            <Send size={14} strokeWidth={2.5} />
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
                    <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4 border border-blue-100 text-blue-600 shadow-sm shadow-blue-100">
                      <MessageCircle size={28} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">Direct Personal Messages</h3>
                    <p className="text-xs text-gray-400 max-w-xs font-semibold leading-relaxed">
                      Select a staff member from the left sidebar to start or resume a private conversation.
                    </p>
                  </div>
                )}
              </div>

            </div>
          );
        })()
      ) : activeTab === 'custom' ? (
        <div className="flex-1 flex gap-6 min-h-0 w-full">
          
          {/* Left: Groups List */}
          <div className="w-80 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden shrink-0">
            <div className="p-4 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Custom Groups</h3>
                <button 
                  onClick={() => { setShowCreateGroup(true); setSelectedMembers([]); setNewGroupName(''); setGroupSearchQuery(''); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={12} /> Create Group
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {customGroups.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">No custom groups yet</p>
                  <p className="text-[10px] mt-1">Click "Create Group" to get started</p>
                </div>
              ) : (
                customGroups.map(group => {
                  const isSelected = selectedGroupId === group.id;
                  const lastMsg = messages.filter(m => m.roomId === `custom_group_${group.id}`).slice(-1)[0];
                  return (
                    <button
                      key={group.id}
                      onClick={() => { setSelectedGroupId(group.id); setShowGroupSettings(false); }}
                      className={`w-full text-left p-4 hover:bg-blue-50/30 transition-all flex items-center gap-3 border-b border-gray-50 ${isSelected ? 'bg-blue-50/50 border-r-4 border-blue-600' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                        {group.name?.charAt(0)?.toUpperCase() || 'G'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-gray-900 text-[13px] truncate">{group.name}</span>
                          <span className="text-[9px] text-gray-400 shrink-0 ml-2">{group.members?.length || 0} members</span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate italic mt-0.5">
                          {lastMsg?.text || 'No messages yet'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Group Chat or Settings */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-w-0">
            {selectedGroupId && selectedGroup ? (
              showGroupSettings ? (
                /* Group Settings Panel */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShowGroupSettings(false)} className="text-gray-500 hover:text-gray-700 cursor-pointer"><X size={18} /></button>
                      <h3 className="font-bold text-gray-900 text-sm">Group Settings</h3>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Rename */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Group Name</label>
                      <div className="flex gap-2">
                        <input
                          value={editGroupName}
                          onChange={e => setEditGroupName(e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                          placeholder="Enter group name..."
                        />
                        <button 
                          onClick={handleRenameGroup}
                          disabled={!editGroupName.trim() || editGroupName.trim() === selectedGroup.name}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Current Members */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                        Members ({selectedGroup.members?.length || 0})
                      </label>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {selectedGroup.members?.map((empId: string) => {
                          const staff = staffList.find(s => s.empId === empId);
                          return (
                            <div key={empId} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2.5">
                                {staff?.avatar ? (
                                  <img src={staff.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                    {(staff?.name || empId).charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <span className="text-sm font-bold text-gray-900 block">{staff?.name || empId}</span>
                                  <span className="text-[10px] text-gray-400">{staff?.designation || 'Staff'}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveMember(empId)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Remove member"
                              >
                                <UserMinus size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Add Members */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Add Members</label>
                      <div className="relative mb-2">
                        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                          value={addMemberSearch}
                          onChange={e => setAddMemberSearch(e.target.value)}
                          placeholder="Search staff to add..."
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                        />
                      </div>
                      <div className="space-y-1 max-h-[250px] overflow-y-auto">
                        {staffList
                          .filter(s => !selectedGroup.members?.includes(s.empId))
                          .filter(s => !addMemberSearch || s.name?.toLowerCase().includes(addMemberSearch.toLowerCase()) || s.empId?.includes(addMemberSearch))
                          .map(staff => (
                            <div key={staff.empId} className="flex items-center justify-between p-2.5 hover:bg-green-50/50 rounded-lg transition-colors">
                              <div className="flex items-center gap-2.5">
                                {staff.avatar ? (
                                  <img src={staff.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs">
                                    {staff.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                                <div>
                                  <span className="text-sm font-bold text-gray-900 block">{staff.name}</span>
                                  <span className="text-[10px] text-gray-400">{staff.designation || 'Staff'} • {staff.branchName || getBranchName(staff.branchId)}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAddMember(staff.empId)}
                                className="text-green-500 hover:text-green-700 hover:bg-green-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Add to group"
                              >
                                <UserPlus size={14} />
                              </button>
                            </div>
                          ))
                        }
                      </div>
                    </div>

                    {/* Delete Group */}
                    <div className="pt-4 border-t border-gray-100">
                      <button
                        onClick={handleDeleteGroup}
                        className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 size={16} /> Delete Group
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Group Chat Feed */
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {selectedGroup.name?.charAt(0)?.toUpperCase() || 'G'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{selectedGroup.name}</h3>
                        <span className="text-[10px] text-gray-500">{selectedGroup.members?.length || 0} members</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setShowGroupSettings(true); setEditGroupName(selectedGroup.name || ''); setAddMemberSearch(''); }}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Settings size={18} />
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {selectedGroupMessages.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center py-16 text-gray-400">
                        <div className="text-center">
                          <MessageCircle size={28} className="mx-auto mb-2 opacity-40" />
                          <p className="text-xs font-bold">No messages yet</p>
                          <p className="text-[10px] mt-1">Send the first message to this group</p>
                        </div>
                      </div>
                    ) : (
                      selectedGroupMessages.map(msg => {
                        const time = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                        const isAdmin = msg.authorId === 'admin';
                        return (
                          <div key={msg.id} className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                            {!isAdmin && (
                              <img
                                src={msg.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.author)}&background=EFF6FF&color=1D4ED8`}
                                alt={msg.author}
                                className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 self-end"
                              />
                            )}
                            <div className={`rounded-2xl p-3 shadow-sm border max-w-[70%] ${isAdmin ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-gray-900 border-gray-100'}`}>
                              {!isAdmin && <span className="text-[10px] font-bold block mb-1 opacity-70">{msg.author}</span>}
                              {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                              {msg.attachments?.map((att: any, i: number) => (
                                <div key={i} className="mt-2">
                                  {att.fileType === 'image' && <img src={att.url} alt="" onClick={() => setSelectedImage(att.url)} className="max-w-[250px] rounded-lg cursor-pointer hover:opacity-90" />}
                                  {att.fileType === 'video' && <video src={att.url} controls className="max-w-[280px] rounded-lg" />}
                                  {att.fileType === 'document' && (
                                    <a href={att.url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${isAdmin ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                      <FileText size={14} /> {att.name || 'Document'}
                                    </a>
                                  )}
                                </div>
                              ))}
                              <span className={`text-[9px] mt-1 block ${isAdmin ? 'text-blue-200' : 'text-gray-400'}`}>{time}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={customGroupMessagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                      <textarea
                        value={customGroupMessageText}
                        onChange={e => setCustomGroupMessageText(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full bg-transparent px-3 py-2 text-sm text-gray-800 focus:outline-none resize-none min-h-[42px] max-h-[120px]"
                        rows={1}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendCustomGroupMessage(customGroupMessageText); }}}
                      />
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50/50">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Paperclip size={16} />
                        </button>
                        <button
                          onClick={() => handleSendCustomGroupMessage(customGroupMessageText)}
                          disabled={!customGroupMessageText.trim()}
                          className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm ${!customGroupMessageText.trim() ? 'bg-gray-300 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'}`}
                        >
                          <Send size={14} /> Send
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Custom Groups</h3>
                  <p className="text-xs text-gray-400 max-w-xs font-semibold leading-relaxed">
                    Select a group from the left or create a new one.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ====== CREATE GROUP MODAL ====== */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Create Custom Group</h2>
                <p className="text-xs text-gray-500 mt-0.5">Select staff members to add to your group</p>
              </div>
              <button onClick={() => setShowCreateGroup(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Group Name Input */}
            <div className="px-5 pt-4 pb-2 shrink-0">
              <input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Enter group name... (e.g. Field Team Alpha)"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Search */}
            <div className="px-5 py-2 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  value={groupSearchQuery}
                  onChange={e => setGroupSearchQuery(e.target.value)}
                  placeholder="Search staff by name or ID..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              {selectedMembers.length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold">{selectedMembers.length} selected</span>
                  <button onClick={() => setSelectedMembers([])} className="text-gray-400 hover:text-red-500 text-[10px] font-bold cursor-pointer">Clear All</button>
                </div>
              )}
            </div>

            {/* Staff List by Branch */}
            <div className="flex-1 overflow-y-auto px-5 pb-3">
              {(() => {
                const filtered = staffList.filter(s =>
                  !groupSearchQuery ||
                  s.name?.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                  s.empId?.includes(groupSearchQuery)
                );
                const grouped = getStaffByBranch(filtered);
                const branches = Object.keys(grouped).sort();

                if (branches.length === 0) {
                  return <p className="text-center text-gray-400 text-sm py-8">No staff found</p>;
                }

                return branches.map(branch => (
                  <div key={branch} className="mb-4">
                    <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1 z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <h4 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">{branch}</h4>
                      <span className="text-[9px] text-gray-400 font-bold">({grouped[branch].length})</span>
                    </div>
                    <div className="space-y-1">
                      {grouped[branch].map((staff: any) => {
                        const isSelected = selectedMembers.includes(staff.empId);
                        return (
                          <button
                            key={staff.empId}
                            onClick={() => toggleMember(staff.empId)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-2 border-blue-400 shadow-sm'
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                            </div>
                            {staff.avatar ? (
                              <img src={staff.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs border border-gray-200">
                                {staff.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="flex-1 text-left min-w-0">
                              <span className="text-sm font-bold text-gray-900 truncate block">{staff.name}</span>
                              <span className="text-[10px] text-gray-400">{staff.designation || 'Staff'} • ID: {staff.empId}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-bold text-sm rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                  !newGroupName.trim() || selectedMembers.length === 0
                    ? 'bg-gray-300 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                }`}
              >
                <Plus size={16} /> Create Group ({selectedMembers.length} members)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-slate-900 shadow-2xl flex items-center justify-center">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white hover:bg-black/80 p-2.5 rounded-full transition-colors z-50 shadow"
            >
              <X size={20} />
            </button>
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg animate-in zoom-in-95 duration-200" 
            />
          </div>
        </div>
      )}

      {/* Single hidden file input at root to prevent conflicts */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
    </div>
  );
}