import { useState } from 'react';
import { FileText, Send } from 'lucide-react';
import { initialMessages } from '../services/mockData';
import type { Message } from '../types';

export default function Communications() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [activeChannel, setActiveChannel] = useState('#general');

  const channels = [
    { id: '#general', name: 'General Announcements' },
    { id: '#field-staff', name: 'Field Specimen Collectors' },
    { id: '#lab-staff', name: 'Laboratory Diagnostics' },
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: `MSG00${messages.length + 1}`,
      senderId: 'ADMIN',
      senderName: 'Nisha Sharma (Admin)',
      senderRole: 'Admin Director',
      content: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMsg]);
    setInputText('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', height: 'calc(100vh - 130px)' }}>
      {/* Channels List */}
      <div className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Chat Channels</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {channels.map((chan) => {
            const isActive = activeChannel === chan.id;
            return (
              <button
                key={chan.id}
                onClick={() => setActiveChannel(chan.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: isActive ? '600' : '500',
                  transition: 'var(--transition)',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{chan.id}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{chan.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{activeChannel}</h4>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Broadcast announcements and monitor employee messaging.
            </span>
          </div>
          <span className="badge badge-info">Active Connection</span>
        </div>

        {/* Message Stream */}
        <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((m) => {
            const isAdmin = m.senderId === 'ADMIN';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                  flexDirection: isAdmin ? 'row-reverse' : 'row',
                  maxWidth: '70%',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isAdmin ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: 'white',
                  }}
                >
                  {isAdmin ? 'A' : m.senderName.charAt(0)}
                </div>

                {/* Message Balloon */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.senderName}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{m.timestamp}</span>
                  </div>
                  
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: isAdmin ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isAdmin ? 'rgba(59,130,246,0.3)' : 'var(--border-glass)'}`,
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      wordBreak: 'break-word',
                    }}
                  >
                    <p>{m.content}</p>

                    {/* Render attachment if exists */}
                    {m.file && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '12px',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <FileText size={16} style={{ color: 'var(--accent-secondary)' }} />
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{m.file.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.file.size}</div>
                        </div>
                        <a
                          href={m.file.url}
                          style={{
                            color: 'var(--accent-primary)',
                            fontWeight: 'bold',
                            fontSize: '11px',
                          }}
                          onClick={(e) => e.preventDefault()}
                        >
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} style={{ padding: '16px', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Type your announcement or chat message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{ flexGrow: 1 }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Send <Send size={14} /></span>
          </button>
        </form>
      </div>
    </div>
  );
}
