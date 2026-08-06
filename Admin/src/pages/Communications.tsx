import React from 'react';
import { 
  MessageSquare,
  Search, MoreVertical, Megaphone, Pin, FileText, 
  Calendar, Paperclip, Image as ImageIcon, File, Smile, Send,
  MessageCircle, ChevronDown
} from 'lucide-react';

export default function Communications() {

  // Dummy Chat Data
  const chatMessages = [
    { id: 1, type: 'normal', name: 'Rahul Verma', time: '09:12 AM', text: 'Good morning everyone! Hope you all have a productive day.', likes: 12, avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { 
      id: 2, 
      type: 'announcement', 
      title: 'ANNOUNCEMENT', 
      text: 'Team meeting will be held on 7th Aug at 11:00 AM in the conference room.', 
      author: 'Admin', 
      time: '09:15 AM',
      icon: Megaphone,
      color: 'purple'
    },
    { id: 3, type: 'normal', name: 'Neha Sharma', time: '09:16 AM', text: 'Thank you! Please share the agenda.', likes: 4, avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { 
      id: 4, 
      type: 'notice', 
      title: 'NOTICE', 
      text: 'Please ensure to follow the updated field duty guidelines.', 
      author: 'Admin', 
      time: '09:18 AM',
      icon: FileText,
      color: 'orange'
    },
    { id: 5, type: 'normal', name: 'Amit Kumar', time: '09:20 AM', text: 'Noted, we will follow accordingly.', likes: 0, avatar: 'https://randomuser.me/api/portraits/men/46.jpg' },
    { 
      id: 6, 
      type: 'holiday', 
      title: 'HOLIDAY NOTICE', 
      text: 'Office will remain closed on 15th August on account of Independence Day.', 
      author: 'Admin', 
      time: '09:22 AM',
      icon: Calendar,
      color: 'green'
    },
    { id: 7, type: 'normal', name: 'Vikram Singh', time: '09:23 AM', text: 'Thanks for the update!', likes: 0, avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
  ];

  // Render different types of message cards
  const renderMessage = (msg) => {
    if (msg.type === 'normal') {
      return (
        <div key={msg.id} className="flex gap-3 mb-6">
          <div className="relative shrink-0">
            <img src={msg.avatar} alt={msg.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-gray-900 text-[15px]">{msg.name}</span>
              <span className="text-gray-400 text-xs">{msg.time}</span>
            </div>
            <p className="text-gray-800 text-[15px] leading-relaxed mb-2">{msg.text}</p>
            {msg.likes > 0 && (
              <button className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors">
                <span className="text-[13px]">👍</span>
                <span className="text-xs font-bold text-gray-600">{msg.likes}</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    // Colors mapping for Admin cards
    const colorStyles = {
      purple: 'bg-[#FDF4FF] border-[#F5D0FE] text-[#9333EA]', // Announcement
      orange: 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]', // Notice
      green: 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]',  // Holiday
    };
    
    const MsgIcon = msg.icon;
    const theme = colorStyles[msg.color];

    return (
      <div key={msg.id} className={`mb-6 p-4 rounded-xl border flex gap-4 ${theme} shadow-sm relative group`}>
        <div className="shrink-0 mt-0.5">
          <MsgIcon size={24} strokeWidth={2} />
        </div>
        <div className="flex-1 pr-8">
          <h4 className="font-bold text-[13px] tracking-wide mb-1 flex items-center gap-2 uppercase">
            {msg.title}
          </h4>
          <p className="text-gray-800 text-[15px] mb-2">{msg.text}</p>
          <p className="text-gray-500 text-xs font-medium">By {msg.author} • {msg.time}</p>
        </div>
        <button className="absolute top-4 right-4 text-inherit opacity-70 hover:opacity-100 transition-opacity">
          <Pin size={20} strokeWidth={2.5} />
        </button>
      </div>
    );
  };

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
              <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Chat Messages Feed Area */}
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar bg-white">
            {chatMessages.map(renderMessage)}
            {/* Added extra padding at bottom so last message isn't squashed */}
            <div className="h-4" /> 
          </div>

          {/* Bottom Message Input Area */}
          <div className="p-4 sm:p-5 border-t border-gray-100 bg-white shrink-0">
            
            {/* Message Type Selector */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium text-gray-500">Message Type</span>
              <div className="relative">
                <select className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:border-blue-400 cursor-pointer">
                  <option>Normal Message</option>
                  <option>Announcement</option>
                  <option>Notice</option>
                  <option>Holiday Notice</option>
                </select>
                <MessageCircle size={16} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                <ChevronDown size={16} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Input Box Wrapper */}
            <div className="border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
              <textarea 
                placeholder="Type your message here..." 
                className="w-full bg-transparent p-4 text-[15px] text-gray-800 focus:outline-none resize-none min-h-[80px]"
                rows={2}
              ></textarea>
              
              {/* Bottom Toolbar inside Input */}
              <div className="flex justify-between items-center px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                
                {/* Attachment Icons */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Paperclip size={20} strokeWidth={2} /></button>
                  <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><ImageIcon size={20} strokeWidth={2} /></button>
                  <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><File size={20} strokeWidth={2} /></button>
                  <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Smile size={20} strokeWidth={2} /></button>
                </div>
                
                {/* Send Button */}
                <button className="bg-[#2563EB] hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-sm shadow-blue-200">
                  <Send size={16} strokeWidth={2.5} className="ml-0.5" />
                  Send
                </button>
              </div>
            </div>
            
          </div>
          
        </div>
    </div>
  );
}