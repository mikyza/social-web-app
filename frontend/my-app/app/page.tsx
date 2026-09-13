'use client';

import React, { useState, useEffect } from 'react';

// --- CONFIGURATION ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// --- TYPES & INTERFACES ---
interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'admin' | 'pastor' | 'treasurer' | 'church_leader' | 'member';
  church?: { _id: string; name: string } | string;
  status?: string;
  resetRequested?: boolean;
  phone?: string;
}

interface Church {
  _id: string;
  name: string;
  leader?: { _id: string; name: string; email: string };
  youthMembers: { _id?: string; name: string; phone: string }[];
}

interface TargetItem {
  _id?: string;
  name: string;
  targetQuantity: number;
  currentQuantity: number;
  cashPricePerUnit: number;
}

interface Target {
  title: string;
  mainMonetaryTarget: number;
  currentAmountRaised: number;
  items: TargetItem[];
}

interface ContributionSummary {
  overallTotal: number;
  churchwiseBreakdown: { churchName: string; totalAmount: number; count: number }[];
}

interface Notice {
  _id: string;
  title: string;
  content: string;
  author: { name: string; role: string };
  targetChurch?: { name: string };
  createdAt: string;
}

interface ContactMessage {
  _id: string;
  mobile: string;
  message: string;
  createdAt: string;
}

interface Receipt {
  receiptTitle: string;
  receiptNumber: string;
  date: string;
  contributorName: string;
  church: string;
  type: string;
  itemName: string;
  quantity: number;
  amountPaid: number;
  status: string;
}

export default function TwendeMissionApp() {
  // --- AUTH & USER STATE ---
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- NAVIGATION & MODALS ---
  const [activeTab, setActiveTab] = useState<'home' | 'mission' | 'summary' | 'dashboard' | 'contact' | 'chatwall'>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [searchReceiptNo, setSearchReceiptNo] = useState('');

  // --- GENERAL APP DATA ---
  const [targetData, setTargetData] = useState<Target | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [summaryData, setSummaryData] = useState<ContributionSummary | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [userList, setUserList] = useState<User[]>([]);

  // --- FORM STATES ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regChurchId, setRegChurchId] = useState('');

  // Contribution Form
  const [stkPhone, setStkPhone] = useState('');
  const [stkAmount, setStkAmount] = useState<number | ''>('');
  const [stkChurchId, setStkChurchId] = useState('');
  const [stkItemName, setStkItemName] = useState('Cash Contribution');

  // Physical Contribution Form
  const [physItemName, setPhysItemName] = useState('Rice (Kg)');
  const [physQty, setPhysQty] = useState<number>(1);
  const [physChurchId, setPhysChurchId] = useState('');

  // Admin Config Form
  const [newMonetaryTarget, setNewMonetaryTarget] = useState<number>(500000);
  const [ricePricePerUnit, setRicePricePerUnit] = useState<number>(150);

  // Leader Creation Form
  const [leaderName, setLeaderName] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderPassword, setLeaderPassword] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [leaderChurchId, setLeaderChurchId] = useState('');

  // Church Creation Form
  const [newChurchName, setNewChurchName] = useState('');

  // Youth Registration Form
  const [youthName, setYouthName] = useState('');
  const [youthPhone, setYouthPhone] = useState('');
  const [youthChurchId, setYouthChurchId] = useState('');

  // Notice Form
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');

  // Contact Form
  const [contactMobile, setContactMobile] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  // UI Status Alerts
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Initial Load
  useEffect(() => {
    const savedToken = localStorage.getItem('twende_token');
    const savedUser = localStorage.getItem('twende_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
    }
    fetchPublicData();
  }, []);

  useEffect(() => {
    if (token) {
      fetchAuthenticatedData();
    }
  }, [token, currentUser]);

  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 5000);
  };

  // --- API CALLS ---
  const fetchPublicData = async () => {
    try {
      const [targetRes, churchRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/targets`),
        fetch(`${API_BASE_URL}/api/churches`)
      ]);
      if (targetRes.ok) setTargetData(await targetRes.json());
      if (churchRes.ok) setChurches(await churchRes.json());
    } catch (err) {
      console.error('Error fetching public data:', err);
    }
  };

  const fetchAuthenticatedData = async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const summaryRes = await fetch(`${API_BASE_URL}/api/contributions/summary`, { headers });
      if (summaryRes.ok) setSummaryData(await summaryRes.json());

      const noticeRes = await fetch(`${API_BASE_URL}/api/notices`, { headers });
      if (noticeRes.ok) setNotices(await noticeRes.json());

      if (['admin', 'pastor', 'treasurer'].includes(currentUser?.role || '')) {
        const userRes = await fetch(`${API_BASE_URL}/api/admin/users`, { headers });
        if (userRes.ok) setUserList(await userRes.json());
      }

      if (['admin', 'treasurer'].includes(currentUser?.role || '')) {
        const contactRes = await fetch(`${API_BASE_URL}/api/contact`, { headers });
        if (contactRes.ok) setContacts(await contactRes.json());
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem('twende_token', data.token);
        localStorage.setItem('twende_user', JSON.stringify(data.user));
        setShowAuthModal(false);
        showAlert(`Welcome back, ${data.user.name}!`);
      } else {
        showAlert(data.message || 'Login failed', 'error');
      }
    } catch (err) {
      showAlert('Network error during login', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, phone: regPhone, churchId: regChurchId })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Registration successful! Please sign in.');
        setAuthMode('login');
        setLoginEmail(regEmail);
      } else {
        showAlert(data.message || 'Registration failed', 'error');
      }
    } catch (err) {
      showAlert('Network error during registration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('twende_token');
    localStorage.removeItem('twende_user');
    setActiveTab('home');
    showAlert('Signed out successfully.');
  };

  // Contribution Handlers
  const handlePayHeroSTK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return setShowAuthModal(true);
    if (!stkPhone || !stkAmount || !stkChurchId) {
      return showAlert('Please fill in phone, amount, and church.', 'error');
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/contributions/payhero-stk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: stkPhone, amount: Number(stkAmount), churchId: stkChurchId, itemName: stkItemName })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(`STK Push sent to ${stkPhone}! Enter PIN to complete payment.`);
        if (data.receiptNumber) fetchReceipt(data.receiptNumber);
      } else {
        showAlert(data.error || 'STK Push failed', 'error');
      }
    } catch (err) {
      showAlert('Error triggering STK Push', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhysicalContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return setShowAuthModal(true);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/contributions/physical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemName: physItemName, quantity: Number(physQty), churchId: physChurchId })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Physical contribution logged successfully!');
        if (data.contribution?.receiptNumber) fetchReceipt(data.contribution.receiptNumber);
      } else {
        showAlert(data.message || 'Error recording physical contribution', 'error');
      }
    } catch (err) {
      showAlert('Network error recording physical contribution', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReceipt = async (receiptNo: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/contributions/receipt/${receiptNo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveReceipt(data);
      } else {
        showAlert('Receipt not found.', 'error');
      }
    } catch (err) {
      showAlert('Error retrieving receipt.', 'error');
    }
  };

  // Administrative Actions
  const handleUpdateTargetConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/targets/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mainMonetaryTarget: newMonetaryTarget,
          items: [{ name: 'Rice (Kg)', targetQuantity: 1000, cashPricePerUnit: ricePricePerUnit }]
        })
      });
      if (res.ok) {
        showAlert('Target and Price configurations updated!');
        fetchPublicData();
      }
    } catch (err) {
      showAlert('Failed to update config', 'error');
    }
  };

  const handleCreateLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/create-leader`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: leaderName, email: leaderEmail, password: leaderPassword, phone: leaderPhone, churchId: leaderChurchId })
      });
      if (res.ok) {
        showAlert('Church Leader account created successfully!');
        fetchAuthenticatedData();
      }
    } catch (err) {
      showAlert('Error creating leader', 'error');
    }
  };

  const handleCreateChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/churches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newChurchName })
      });
      if (res.ok) {
        showAlert('Church added to District network!');
        setNewChurchName('');
        fetchPublicData();
      }
    } catch (err) {
      showAlert('Error adding church', 'error');
    }
  };

  const handleAddYouthMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/churches/youth-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ churchId: youthChurchId, name: youthName, phone: youthPhone })
      });
      if (res.ok) {
        showAlert('Youth member registered!');
        setYouthName('');
        setYouthPhone('');
        fetchPublicData();
      }
    } catch (err) {
      showAlert('Error registering youth member', 'error');
    }
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: noticeTitle, content: noticeContent })
      });
      if (res.ok) {
        showAlert('Notice published to all churches!');
        setNoticeTitle('');
        setNoticeContent('');
        fetchAuthenticatedData();
      }
    } catch (err) {
      showAlert('Error posting notice', 'error');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: contactMobile, message: contactMessage })
      });
      if (res.ok) {
        showAlert('Your message has been received by Admin & Treasurer.');
        setContactMobile('');
        setContactMessage('');
      }
    } catch (err) {
      showAlert('Error sending message', 'error');
    }
  };

  const handleRequestPasswordReset = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/request-reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) showAlert('Password reset request sent to Pastor & Admin.');
    } catch (err) {
      showAlert('Reset request failed', 'error');
    }
  };

  const handleAdminResetPassword = async (userId: string) => {
    const newPassword = prompt('Enter new password for this user:');
    if (!newPassword) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, newPassword })
      });
      if (res.ok) {
        showAlert('Password reset successfully!');
        fetchAuthenticatedData();
      }
    } catch (err) {
      showAlert('Failed to reset password', 'error');
    }
  };

  // Calculations
  const raisedCash = targetData?.currentAmountRaised || 0;
  const targetCash = targetData?.mainMonetaryTarget || 500000;
  const cashPercentage = Math.min(Math.round((raisedCash / targetCash) * 100), 100);

  const riceItem = targetData?.items?.find((i) => i.name.toLowerCase().includes('rice'));
  const riceRaised = riceItem?.currentQuantity || 0;
  const riceTarget = riceItem?.targetQuantity || 1000;
  const ricePercentage = Math.min(Math.round((riceRaised / riceTarget) * 100), 100);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* ALERT NOTIFICATION */}
      {alertMessage && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-medium flex items-center space-x-2 transition-all ${alertMessage.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* HEADER / NAVIGATION */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-900 text-xl shadow-lg">
              M
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Mwea West Youth</h1>
              <p className="text-xs text-emerald-400 font-medium tracking-wide">Twende Mission Channel</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            <button onClick={() => setActiveTab('home')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'home' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>Home</button>
            <button onClick={() => setActiveTab('mission')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'mission' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>Mission</button>
            <button onClick={() => setActiveTab('summary')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'summary' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>Contributions</button>
            <button onClick={() => setActiveTab('chatwall')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'chatwall' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>Chat Wall</button>
            <button onClick={() => setActiveTab('contact')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'contact' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>Contact</button>
            {currentUser && (
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-indigo-900/50'}`}>Dashboard</button>
            )}
          </nav>

          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 capitalize">{currentUser.role.replace('_', ' ')}</span>
                <button onClick={handleLogout} className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all">Sign Out</button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="px-5 py-2.5 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-all">Sign In / Register</button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* --- TAB: HOME --- */}
        {activeTab === 'home' && (
          <div className="space-y-10">
            {/* Hero Card */}
            <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-8 md:p-12 overflow-hidden shadow-2xl border border-slate-800">
              <div className="relative z-10 max-w-2xl space-y-4">
                <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold tracking-wide uppercase">Official District Channel</span>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">Mwea West District Youth Twende Mission</h2>
                <p className="text-slate-300 text-sm sm:text-base font-normal leading-relaxed">
                  Support our evangelical and youth empowerment mission across Mwea West District. Contribute via PayHero M-Pesa STK push or donate physical products like rice.
                </p>

                <div className="pt-4 flex flex-wrap gap-3">
                  <a href="#quick-pay" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg transition-all">Contribute via M-Pesa</a>
                  <button onClick={() => setActiveTab('mission')} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl border border-slate-700 transition-all">Learn About Mission</button>
                </div>
              </div>
            </div>

            {/* Target Progress Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monetary Target */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial Target</p>
                    <h3 className="text-2xl font-black text-slate-800">KES {raisedCash.toLocaleString()} <span className="text-sm font-medium text-slate-500">/ {targetCash.toLocaleString()}</span></h3>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">{cashPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${cashPercentage}%` }}></div>
                </div>
                <p className="text-xs text-slate-500 font-medium">Updated automatically upon verified PayHero & cash contributions.</p>
              </div>

              {/* Physical Product Target */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Physical Goods Target (Rice)</p>
                    <h3 className="text-2xl font-black text-slate-800">{riceRaised} Kg <span className="text-sm font-medium text-slate-500">/ {riceTarget} Kg</span></h3>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{ricePercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${ricePercentage}%` }}></div>
                </div>
                <p className="text-xs text-slate-500 font-medium">Set Cash Equivalent: KES {riceItem?.cashPricePerUnit || 150} per Kg</p>
              </div>
            </div>

            {/* Quick Pay / Contribution Form Section */}
            <div id="quick-pay" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Make Your Mission Contribution</h3>
                <p className="text-xs sm:text-sm text-slate-500">Instant M-Pesa STK push processing or log physical church handovers.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* PayHero STK Push Form */}
                <form onSubmit={handlePayHeroSTK} className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">1. M-Pesa STK Push (PayHero)</h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Instant</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Church</label>
                    <select value={stkChurchId} onChange={(e) => setStkChurchId(e.target.value)} required className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                      <option value="">Select your local church...</option>
                      {churches.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">M-Pesa Phone Number</label>
                      <input type="text" placeholder="0712345678" value={stkPhone} onChange={(e) => setStkPhone(e.target.value)} required className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (KES)</label>
                      <input type="number" placeholder="500" value={stkAmount} onChange={(e) => setStkAmount(e.target.value ? Number(e.target.value) : '')} required className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50">
                    {loading ? 'Triggering STK Push...' : 'Send M-Pesa Prompt'}
                  </button>
                </form>

                {/* Physical Product Log */}
                <form onSubmit={handlePhysicalContribution} className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">2. Physical Contribution (Rice / Goods)</h4>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Leader Approval</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Church Handover Location</label>
                    <select value={physChurchId} onChange={(e) => setPhysChurchId(e.target.value)} required className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="">Select church location...</option>
                      {churches.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Item Contributed</label>
                      <input type="text" value={physItemName} onChange={(e) => setPhysItemName(e.target.value)} required className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity (Kg/Units)</label>
                      <input type="number" min="1" value={physQty} onChange={(e) => setPhysQty(Number(e.target.value))} required className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50">
                    Submit Physical Item Record
                  </button>
                </form>
              </div>
            </div>

            {/* Receipt Quick Search */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Need your contribution receipt?</h4>
                <p className="text-xs text-slate-500">Enter your official receipt number (e.g. REC-1725...) to generate a copy.</p>
              </div>
              <div className="flex w-full sm:w-auto space-x-2">
                <input type="text" placeholder="Enter Receipt No." value={searchReceiptNo} onChange={(e) => setSearchReceiptNo(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                <button onClick={() => fetchReceipt(searchReceiptNo)} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all">Lookup</button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: MISSION DETAILS --- */}
        {activeTab === 'mission' && (
          <div className="max-w-4xl mx-auto space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">About Twende Mission</span>
              <h2 className="text-3xl font-black text-slate-900 mt-1">Mwea West Youth Evangelical & Outreach Plan</h2>
            </div>

            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 text-sm sm:text-base leading-relaxed">
              <p>
                The <strong>Mwea West District Youth Twende Mission</strong> brings together youth members across all churches in the district to support community projects, spiritual outreach, and direct relief for families in need.
              </p>
              <p>
                Contributions received through this portal support both monetary logistics and direct physical goods distribution, including rice supply and youth development camps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm">Transparent Accounting</h4>
                <p className="text-xs text-slate-500 mt-1">All M-Pesa STK transactions are automatically cross-checked against PayHero logs.</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm">Church Leader Clearance</h4>
                <p className="text-xs text-slate-500 mt-1">Physical grain and item contributions are verified by local church leaders.</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm">District Pastor Oversight</h4>
                <p className="text-xs text-slate-500 mt-1">Comprehensive analytics and reports are made accessible churchwise.</p>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: SUMMARY / STATS --- */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Churchwise Contribution Summary</h3>
              <p className="text-xs text-slate-500">Live aggregated contributions from all churches in Mwea West District.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {summaryData?.churchwiseBreakdown.map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <h4 className="font-bold text-slate-800 text-lg">{item.churchName}</h4>
                  <p className="text-2xl font-black text-emerald-600">KES {item.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 font-medium">{item.count} total verified payments</p>
                </div>
              ))}
              {(!summaryData?.churchwiseBreakdown || summaryData.churchwiseBreakdown.length === 0) && (
                <div className="col-span-full bg-white p-8 text-center text-slate-400 rounded-2xl border border-dashed border-slate-300 text-sm">
                  No verified churchwise records available yet. Sign in or contribute to start tracking!
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB: CHAT WALL (COMING SOON) --- */}
        {activeTab === 'chatwall' && (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-2xl mx-auto space-y-4 my-12 shadow-sm">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl">
              💬
            </div>
            <h3 className="text-2xl font-black text-slate-900">Mwea West Chat Wall</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Our interactive youth discussion board and real-time mission chat wall is currently under construction.
            </p>
            <span className="inline-block px-4 py-1.5 bg-slate-900 text-emerald-400 font-bold text-xs rounded-full uppercase tracking-wider">Coming Soon</span>
          </div>
        )}

        {/* --- TAB: CONTACT US --- */}
        {activeTab === 'contact' && (
          <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Contact Mission Leadership</h3>
              <p className="text-xs text-slate-500 mt-1">Send a direct message to the Treasurer and District Admin.</p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Number</label>
                <input type="text" placeholder="0712345678" value={contactMobile} onChange={(e) => setContactMobile(e.target.value)} required className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Message / Inquiry</label>
                <textarea rows={4} placeholder="Type your message here..." value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} required className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all">
                Send Message
              </button>
            </form>
          </div>
        )}

        {/* --- TAB: DASHBOARD (ROLE BASED) --- */}
        {activeTab === 'dashboard' && currentUser && (
          <div className="space-y-8">
            {/* User Profile Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Logged in Portal</span>
                <h2 className="text-2xl font-black text-slate-900">{currentUser.name}</h2>
                <p className="text-xs text-slate-500">{currentUser.email} • Role: <strong className="capitalize">{currentUser.role.replace('_', ' ')}</strong></p>
              </div>

              <button onClick={handleRequestPasswordReset} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all">
                Request Password Reset
              </button>
            </div>

            {/* --- ADMIN CONTROLS (`adminmwea@gmail.com`) --- */}
            {currentUser.role === 'admin' && (
              <div className="space-y-8">
                {/* Notice & Church Configuration Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Create Church */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Add District Church</h4>
                    <form onSubmit={handleCreateChurch} className="flex gap-2">
                      <input type="text" placeholder="Church Name" value={newChurchName} onChange={(e) => setNewChurchName(e.target.value)} required className="flex-1 text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                      <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">Add</button>
                    </form>
                  </div>

                  {/* Target & Price Config */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Set Main Target & Price of Rice</h4>
                    <form onSubmit={handleUpdateTargetConfig} className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="Monetary Target" value={newMonetaryTarget} onChange={(e) => setNewMonetaryTarget(Number(e.target.value))} required className="text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                      <input type="number" placeholder="Rice Price/Kg" value={ricePricePerUnit} onChange={(e) => setRicePricePerUnit(Number(e.target.value))} required className="text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                      <button type="submit" className="col-span-2 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Save Configuration</button>
                    </form>
                  </div>
                </div>

                {/* Create Church Leader */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Create Church Leader Account</h4>
                  <form onSubmit={handleCreateLeader} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Full Name" value={leaderName} onChange={(e) => setLeaderName(e.target.value)} required className="text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                    <input type="email" placeholder="Email" value={leaderEmail} onChange={(e) => setLeaderEmail(e.target.value)} required className="text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                    <input type="password" placeholder="Password" value={leaderPassword} onChange={(e) => setLeaderPassword(e.target.value)} required className="text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                    <input type="text" placeholder="Phone" value={leaderPhone} onChange={(e) => setLeaderPhone(e.target.value)} required className="text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                    <select value={leaderChurchId} onChange={(e) => setLeaderChurchId(e.target.value)} required className="text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                      <option value="">Select Church</option>
                      {churches.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    <button type="submit" className="py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">Create Leader</button>
                  </form>
                </div>

                {/* User Account Management Table */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Manage Accounts & Password Resets</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                        <tr>
                          <th className="p-3">User</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Reset Requested?</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userList.map((u) => (
                          <tr key={u._id || u.id}>
                            <td className="p-3 font-semibold text-slate-800">{u.name}</td>
                            <td className="p-3">{u.email}</td>
                            <td className="p-3 capitalize">{u.role}</td>
                            <td className="p-3">
                              {u.resetRequested ? (
                                <span className="text-rose-600 font-bold">YES</span>
                              ) : (
                                <span className="text-slate-400">No</span>
                              )}
                            </td>
                            <td className="p-3 space-x-2">
                              <button onClick={() => handleAdminResetPassword(u._id || u.id)} className="px-2 py-1 bg-amber-500 text-white rounded font-bold">Reset Pass</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- PASTOR PORTAL (`pastormwea@gmail.com`) --- */}
            {(currentUser.role === 'pastor' || currentUser.role === 'admin') && (
              <div className="space-y-6">
                {/* Notice Board Creation */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Broadcast Pastor's Notice</h4>
                  <form onSubmit={handlePostNotice} className="space-y-3">
                    <input type="text" placeholder="Notice Title" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} required className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                    <textarea rows={3} placeholder="Notice content..." value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} required className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Broadcast Notice</button>
                  </form>
                </div>
              </div>
            )}

            {/* --- CHURCH LEADER PORTAL --- */}
            {(currentUser.role === 'church_leader' || currentUser.role === 'admin') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Register Church Youth Member</h4>
                <form onSubmit={handleAddYouthMember} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={youthChurchId} onChange={(e) => setYouthChurchId(e.target.value)} required className="text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                    <option value="">Select Church</option>
                    {churches.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <input type="text" placeholder="Youth Name" value={youthName} onChange={(e) => setYouthName(e.target.value)} required className="text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                  <input type="text" placeholder="Phone Number" value={youthPhone} onChange={(e) => setYouthPhone(e.target.value)} required className="text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                  <button type="submit" className="col-span-1 sm:col-span-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">Register Member</button>
                </form>
              </div>
            )}

            {/* --- TREASURER INBOX & CONTACT MESSAGES --- */}
            {(currentUser.role === 'treasurer' || currentUser.role === 'admin') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Treasurer Inquiry Inbox</h4>
                <div className="space-y-2">
                  {contacts.map((msg) => (
                    <div key={msg._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>Mobile: {msg.mobile}</span>
                        <span className="text-slate-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600">{msg.message}</p>
                    </div>
                  ))}
                  {contacts.length === 0 && <p className="text-xs text-slate-400">No contact messages received.</p>}
                </div>
              </div>
            )}

            {/* NOTICE BOARD DISPLAY */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Official Notices & Communications</h4>
              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n._id} className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                    <h5 className="font-bold text-slate-900 text-sm">{n.title}</h5>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                    <p className="text-[10px] text-indigo-600 font-medium">Posted by: {n.author?.name || 'Pastor/Admin'}</p>
                  </div>
                ))}
                {notices.length === 0 && <p className="text-xs text-slate-400">No notices published yet.</p>}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- AUTHENTICATION MODAL --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">{authMode === 'login' ? 'Sign In' : 'Register Account'}</h3>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                  <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl">
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
                <p className="text-xs text-center text-slate-500">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setAuthMode('register')} className="text-emerald-600 font-bold underline">Register</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} required className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                  <input type="text" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} required className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Local Church</label>
                  <select value={regChurchId} onChange={(e) => setRegChurchId(e.target.value)} className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl">
                    <option value="">Select local church...</option>
                    {churches.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                  <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl">
                  {loading ? 'Creating...' : 'Register'}
                </button>
                <p className="text-xs text-center text-slate-500">
                  Already registered?{' '}
                  <button type="button" onClick={() => setAuthMode('login')} className="text-emerald-600 font-bold underline">Sign In</button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- RECEIPT MODAL --- */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="text-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">{activeReceipt.receiptTitle}</h3>
              <p className="text-xs text-emerald-600 font-bold mt-0.5">Receipt #: {activeReceipt.receiptNumber}</p>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Date:</span>
                <span className="font-semibold text-slate-800">{new Date(activeReceipt.date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Contributor:</span>
                <span className="font-semibold text-slate-800">{activeReceipt.contributorName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Church:</span>
                <span className="font-semibold text-slate-800">{activeReceipt.church}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Item / Type:</span>
                <span className="font-semibold text-slate-800">{activeReceipt.itemName} ({activeReceipt.type})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Quantity / Amount:</span>
                <span className="font-black text-emerald-600 text-sm">
                  {activeReceipt.type === 'cash' ? `KES ${activeReceipt.amountPaid.toLocaleString()}` : `${activeReceipt.quantity} Units`}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-600 uppercase">{activeReceipt.status}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button onClick={() => window.print()} className="flex-1 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">Print Receipt</button>
              <button onClick={() => setActiveReceipt(null)} className="py-2 px-4 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p>© 2026 Mwea West District Youth Twende Mission Channel. All rights reserved.</p>
          <p className="text-slate-500">PayHero API Channel ID: 12252 • Verified M-Pesa Callback System</p>
        </div>
      </footer>
    </div>
  );
}
