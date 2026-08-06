'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// --- TypeScript Interfaces ---
interface DirectMessage {
  id: string;
  fromUserId: string;
  content: string;
  mediaUrl?: string;
  timestamp: string;
  status?: 'sending' | 'delivered';
}

interface GroupPost {
  id: string;
  authorId: string;
  groupId: string;
  content: string;
  mediaUrl?: string;
  timestamp: string;
}

export default function SocialHub() {
  // --- State Management ---
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'dm' | 'group'>('dm');
  
  // DM State
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [targetUserId, setTargetUserId] = useState('user_456'); // Mock target user
  const [isTyping, setIsTyping] = useState(false);
  
  // Group State
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [groupInput, setGroupInput] = useState('');
  const [activeGroupId, setActiveGroupId] = useState('group_general');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Refs for managing timeouts without triggering re-renders
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const remoteTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Socket Initialization & Event Listeners ---
  useEffect(() => {
    // UPDATED: Using your Render backend URL directly as the fallback
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://social-web-app-c1gd.onrender.com'; 
    
    const socketInstance = io(socketUrl, {
      auth: {
        token: 'mock_jwt_session_token', // Replace with actual session token from your auth provider
      },
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setSocket(socketInstance);
      socketInstance.emit('group:join', activeGroupId);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('dm:receive', (data: Omit<DirectMessage, 'id'> & { messageId: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          fromUserId: data.fromUserId,
          content: data.content,
          mediaUrl: data.mediaUrl,
          timestamp: data.timestamp,
        },
      ]);
    });

    socketInstance.on('dm:typing_status', (data: { fromUserId: string; isTyping: boolean }) => {
      setIsTyping(data.isTyping);
      
      if (data.isTyping) {
        if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
        remoteTypingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    });

    socketInstance.on('dm:ack', (data: { messageId: string, status: string }) => {
      setMessages((prev) => 
        prev.map(msg => 
          msg.id.startsWith('optimistic_') && msg.status === 'sending' 
            ? { ...msg, id: data.messageId, status: 'delivered' as const } 
            : msg
        )
      );
    });

    socketInstance.on('group:new_post', (data: Omit<GroupPost, 'id'> & { postId: string }) => {
      setPosts((prev) => [
        {
          id: data.postId,
          authorId: data.authorId,
          groupId: data.groupId,
          content: data.content,
          mediaUrl: data.mediaUrl,
          timestamp: data.timestamp,
        },
        ...prev,
      ]);
    });

    return () => {
      socketInstance.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
    };
  }, [activeGroupId]);

  useEffect(() => {
    if (activeTab === 'dm') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // --- Action Handlers ---
  const handleSendDM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !dmInput.trim()) return;

    const payload = {
      toUserId: targetUserId,
      content: dmInput,
    };

    socket.emit('dm:send', payload);
    socket.emit('dm:typing', { toUserId: targetUserId, isTyping: false });

    setMessages((prev) => [
      ...prev,
      {
        id: `optimistic_${Date.now()}`,
        fromUserId: 'me',
        content: dmInput,
        timestamp: new Date().toISOString(),
        status: 'sending',
      },
    ]);
    setDmInput('');
  };

  const handleSendGroupPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !groupInput.trim()) return;

    socket.emit('group:post', {
      groupId: activeGroupId,
      content: groupInput,
    });

    setGroupInput('');
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDmInput(e.target.value);
    if (socket) {
      socket.emit('dm:typing', {
        toUserId: targetUserId,
        isTyping: e.target.value.length > 0,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (e.target.value.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('dm:typing', { toUserId: targetUserId, isTyping: false });
        }, 2000);
      }
    }
  };

  // --- UI Render ---
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar Navigation - UPDATED: Responsive Widths & Mobile Adjustments */}
      <aside className="w-20 md:w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20 shrink-0 transition-all duration-300">
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col items-center md:items-start">
          {/* Mobile Logo */}
          <h1 className="md:hidden text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 tracking-tight">
            SH
          </h1>
          {/* Desktop Logo */}
          <h1 className="hidden md:block text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 tracking-tight">
            SocialHub
          </h1>
          
          <div className="flex items-center mt-3 text-xs md:text-sm font-medium text-slate-500 justify-center md:justify-start w-full">
            <span className={`w-2.5 h-2.5 rounded-full md:mr-2.5 shadow-sm ${isConnected ? 'bg-emerald-500 shadow-emerald-200' : 'bg-rose-500 shadow-rose-200'}`}></span>
            <span className="hidden md:inline">{isConnected ? 'System Connected' : 'Reconnecting...'}</span>
          </div>
        </div>
        
        <nav className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto">
          <p className="hidden md:block px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Communication</p>
          
          <button
            onClick={() => setActiveTab('dm')}
            className={`w-full text-left px-3 md:px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center md:justify-start ${
              activeTab === 'dm' 
                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm ring-1 ring-indigo-100' 
                : 'text-slate-600 hover:bg-slate-100 font-medium'
            }`}
          >
            <svg className="w-6 h-6 md:w-5 md:h-5 md:mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            <span className="hidden md:inline">Direct Messages</span>
          </button>
          
          <button
            onClick={() => setActiveTab('group')}
            className={`w-full text-left px-3 md:px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center md:justify-start ${
              activeTab === 'group' 
                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm ring-1 ring-indigo-100' 
                : 'text-slate-600 hover:bg-slate-100 font-medium'
            }`}
          >
            <svg className="w-6 h-6 md:w-5 md:h-5 md:mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            <span className="hidden md:inline">Group Wall</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
        {activeTab === 'dm' ? (
          // --- DIRECT MESSAGING VIEW ---
          <div className="flex flex-col h-full w-full">
            {/* DM Header */}
            <header className="px-4 md:px-6 py-3 md:py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm z-10 flex items-center justify-between sticky top-0 shrink-0">
              <div className="flex items-center">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-base md:text-lg mr-3 shadow-inner">
                  {targetUserId.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">{targetUserId}</h2>
                  <p className="text-[10px] md:text-xs font-medium text-slate-500 h-4">
                    {isTyping ? <span className="text-indigo-500 animate-pulse">typing...</span> : 'Online'}
                  </p>
                </div>
              </div>
            </header>
            
            {/* Messages Stream */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6">
              {messages.map((msg) => {
                const isMe = msg.fromUserId === 'me';
                return (
                  <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {/* UPDATED: Adjusted mobile max-width for bubbles */}
                    <div
                      className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-md px-4 py-2.5 md:px-5 md:py-3 rounded-2xl shadow-sm ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-[14px] md:text-[15px] leading-relaxed break-words">{msg.content}</p>
                      <span className={`text-[10px] mt-1 md:mt-2 flex items-center font-medium ${isMe ? 'justify-end text-indigo-200' : 'justify-start text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && msg.status === 'delivered' && (
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* DM Input Form */}
            <form onSubmit={handleSendDM} className="p-3 md:p-4 bg-white border-t border-slate-200 flex gap-2 md:gap-3 items-center shrink-0">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={dmInput}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="w-full pl-4 pr-10 py-3 md:pl-5 md:pr-12 md:py-3.5 bg-slate-100 border-transparent rounded-full focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm md:text-base text-slate-700 placeholder-slate-400 shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={!dmInput.trim()}
                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:active:scale-100 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shrink-0"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </form>
          </div>
        ) : (
          // --- GROUP WALL FEED VIEW ---
          <div className="flex flex-col h-full overflow-y-auto custom-scrollbar w-full">
            {/* Group Header */}
            <header className="px-4 md:px-6 py-3 md:py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm z-10 sticky top-0 shrink-0">
              <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">#{activeGroupId}</h2>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium">Company-wide discussion board</p>
            </header>

            <div className="max-w-3xl w-full mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pb-12">
              {/* Post Composer */}
              <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                <form onSubmit={handleSendGroupPost} className="flex flex-col">
                  <textarea
                    value={groupInput}
                    onChange={(e) => setGroupInput(e.target.value)}
                    placeholder="Share something with the group..."
                    className="w-full p-4 md:p-5 border-none focus:ring-0 resize-none text-sm md:text-base text-slate-700 placeholder-slate-400 min-h-[100px] md:min-h-[120px]"
                  />
                  <div className="bg-slate-50 px-4 md:px-5 py-2 md:py-3 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex gap-1 md:gap-2">
                      <button type="button" className="p-1.5 md:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                         <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={!groupInput.trim()}
                      className="px-4 md:px-6 py-1.5 md:py-2 bg-indigo-600 text-white text-sm md:text-base rounded-lg font-semibold shadow-sm hover:bg-indigo-700 hover:shadow disabled:opacity-50 transition-all"
                    >
                      Publish
                    </button>
                  </div>
                </form>
              </div>

              {/* Feed Stream */}
              <div className="space-y-4 md:space-y-5">
                {posts.map((post) => (
                  <article key={post.id} className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3 md:mb-4">
                      <div className="w-9 h-9 md:w-11 md:h-11 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full mr-3 md:mr-4 shadow-inner flex items-center justify-center text-white font-bold text-sm md:text-base">
                        {post.authorId.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-[14px] md:text-[15px]">{post.authorId}</h3>
                        <p className="text-[10px] md:text-[12px] font-medium text-slate-400">
                          {new Date(post.timestamp).toLocaleDateString()} at {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[14px] md:text-[15px]">{post.content}</p>
                  </article>
                ))}
                
                {posts.length === 0 && (
                  <div className="text-center py-12 md:py-16 px-4 bg-white/50 border border-slate-200 border-dashed rounded-xl md:rounded-2xl">
                    <svg className="w-10 h-10 md:w-12 md:h-12 mx-auto text-slate-300 mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-1">It's quiet here</h3>
                    <p className="text-slate-500 text-xs md:text-sm">Be the first to share an update with the {activeGroupId} group.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
