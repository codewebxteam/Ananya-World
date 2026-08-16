import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, MoreVertical, Megaphone, Pin, FileText, 
  Calendar, Paperclip, Image as ImageIcon, File, Smile, Send,
  MessageCircle, ChevronDown, ThumbsUp, MapPin, X, Video as VideoIcon
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { uploadToImageKitWithDetails, deleteFromImageKit } from '../services/imagekit';

const COMMON_EMOJIS = ["😀", "😂", "🥰", "😎", "🤔", "🙌", "👍", "🙏", "🔥", "💯", "🎉", "❤️"];

export default function Communications() {
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState('normal');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      authorId: 'admin_id',
      avatar: 'https://ui-avatars.com/api/?name=Admin&background=DC2626&color=fff&bold=true&size=128&format=png',
      attachments,
      likes: 0,
      createdAt: serverTimestamp(),
      pinned: false
    };

    if (typeLower === 'announcement') msgDoc.title = 'Important Announcement';
    else if (typeLower === 'notice') msgDoc.title = 'Notice';
    else if (typeLower === 'holiday notice') msgDoc.title = 'Holiday Notice';

    try {
      await addDoc(collection(db, 'communications'), msgDoc);
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
          <img src={msg.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.author)}&background=EFF6FF&color=1D4ED8`} alt={msg.author} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
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

  const pinnedMessages = messages.filter(m => m.pinned);
  const regularMessages = messages.filter(m => !m.pinned);
  const displayMessages = [...pinnedMessages, ...regularMessages].sort((a, b) => {
      // Re-sort by time to keep pinned mixed or keep pinned at top? Let's just keep chronological for now, 
      // but maybe highlight pinned. Let's just use original chronological.
      return 0; // We'll just render `messages` directly.
  });

  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-[1400px] mx-auto min-h-0 animate-in fade-in duration-300">
        
        {/* Main Chat Container */}
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
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 font-medium">No communications found.</div>
            ) : (
              messages.map(renderMessage)
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
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
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
    </div>
  );
}