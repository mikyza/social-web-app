'use client';

import React, { useState, useEffect } from 'react';

// --- CONFIGURATION ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://social-web-app-c1gd.onrender.com';

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

interface PaymentRecord {
  _id: string;
  userName: string;
  mobile: string;
  churchName: string;
  amount: number;
  method: string;
  status: string;
  date: string;
}

export default function TwendeMissionApp() {
  // --- AUTH & USER STATE ---
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- NAVIGATION & MODALS ---
  const [activeTab, setActiveTab] = useState<'home' | 'mission' | 'summary' | 'dashboard' | 'contact' | 'chatwall'>('home');
  const [adminPanelTab, setAdminPanelTab] = useState<'overview' | 'payments' | 'users' | 'config'>('overview');
  const [paymentMethodTab, setPaymentMethodTab] = useState<'stk' | 'paybill' | 'cart'>('stk');
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
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);

  // --- FORM STATES ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regChurchId, setRegChurchId] = useState('');

  // Contribution Form (STK)
  const [stkName, setStkName] = useState('');
  const [stkPhone, setStkPhone] = useState('');
  const [stkAmount, setStkAmount] = useState<number | ''>('');
  const [stkChurchId, setStkChurchId] = useState('');
  const [stkItemName, setStkItemName] = useState('Cash Contribution');

  // Cart Form
  const [cartItems, setCartItems] = useState<{ id: number; name: string; price: number; qty: number }[]>([]);
  const [cartSelectedItem, setCartSelectedItem] = useState('Rice Contribution');
  const [cartQty, setCartQty] = useState(1);

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
      setStkName(JSON.parse(savedUser).name);
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
        
        // Fetch PayHero Payment Statuses
        const payRes = await fetch(`${API_BASE_URL}/api/admin/payments`, { headers }).catch(() => null);
        if (payRes && payRes.ok) {
          setPaymentRecords(await payRes.json());
        } else {
          // Dummy data fallback for preview if endpoint doesn't exist yet
          setPaymentRecords([
            { _id: 'p1', userName: 'John Doe', mobile: '0712345678', churchName: 'Mwea Central', amount: 500, method: 'STK Push', status: 'Success', date: new Date().toISOString() },
            { _id: 'p2', userName: 'Jane Smith', mobile: '0722345678', churchName: 'Kimbimbi SDA', amount: 1200, method: 'Paybill', status: 'Pending', date: new Date().toISOString() },
          ]);
        }
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
        setStkName(data.user.name);
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
    setStkName('');
    localStorage.removeItem('twende_token');
    localStorage.removeItem('twende_user');
    setActiveTab('home');
    showAlert('Signed out successfully.');
  };

  // Cart Handlers
  const handleAddToCart = () => {
    const priceMap: Record<string, number> = {
      'Rice Contribution': 150,
      'Youth Camp Fee': 1000,
      'General Offering': 500
    };
    const price = priceMap[cartSelectedItem] || 100;
    setCartItems([...cartItems, { id: Date.now(), name: cartSelectedItem, price, qty: cartQty }]);
    setCartQty(1);
    showAlert('Added to cart!');
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCartCheckout = async () => {
    if (!token) return setShowAuthModal(true);
    if (!stkPhone || !stkChurchId) return showAlert('Please fill phone and church details below to checkout.', 'error');
    if (cartItems.length === 0) return showAlert('Cart is empty', 'error');

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/contributions/payhero-stk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: stkName, phone: stkPhone, amount: cartTotal, churchId: stkChurchId, itemName: 'Cart Checkout Multiple Items', method: 'cart' })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(`Cart STK Push sent to ${stkPhone}! Enter PIN to complete.`);
        setCartItems([]);
      } else {
        showAlert(data.error || 'Checkout failed', 'error');
      }
    } catch (err) {
      showAlert('Error during checkout', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Contribution Handlers
  const handlePayHeroSTK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return setShowAuthModal(true);
    if (!stkPhone || !stkAmount || !stkChurchId || !stkName) {
      return showAlert('Please fill in name, phone, amount, and church.', 'error');
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/contributions/payhero-stk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: stkName, phone: stkPhone, amount: Number(stkAmount), churchId: stkChurchId, itemName: stkItemName, method: 'stk' })
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
                  Support our evangelical and youth empowerment mission across Mwea West District. Contribute via PayHero M-Pesa STK push, Paybill, Cart, or donate physical products like rice.
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
                <p className="text-xs sm:text-sm text-slate-500">Select your preferred digital payment method or log physical goods.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Digital Payments Panel */}
                <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">1. Digital Payments</h4>
                    <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg">
                      <button type="button" onClick={() => setPaymentMethodTab('stk')} className={`px-3 py-1 text-[10px] font-bold rounded ${paymentMethodTab === 'stk' ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-800'}`}>STK</button>
                      <button type="button" onClick={() => setPaymentMethodTab('cart')} className={`px-3 py-1 text-[10px] font-bold rounded ${paymentMethodTab === 'cart' ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-800'}`}>CART</button>
                      <button type="button" onClick={() => setPaymentMethodTab('paybill')} className={`px-3 py-1 text-[10px] font-bold rounded ${paymentMethodTab === 'paybill' ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-800'}`}>PAYBILL</button>
                    </div>
                  </div>

                  {/* Common Details for Digital Auth */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                      <input type="text" placeholder="Your Name" value={stkName} onChange={(e) => setStkName(e.target.value)} required className="w-full text-sm px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Church</label>
                      <select value={stkChurchId} onChange={(e) => setStkChurchId(e.target.value)} required className="w-full text-sm px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                        <option value="">Select church...</option>
                        {churches.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {paymentMethodTab === 'stk' && (
                    <form onSubmit={handlePayHeroSTK} className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">M-Pesa Number</label>
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
                  )}

                  {paymentMethodTab === 'cart' && (
                    <div className="space-y-4 pt-2 border-t border-slate-200 mt-2">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Select Item</label>
                          <select value={cartSelectedItem} onChange={(e) => setCartSelectedItem(e.target.value)} className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none">
                            <option value="Rice Contribution">Rice Contribution (KES 150)</option>
                            <option value="General Offering">General Offering (KES 500)</option>
                            <option value="Youth Camp Fee">Youth Camp Fee (KES 1000)</option>
                          </select>
                        </div>
                        <div className="w-20">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Qty</label>
                          <input type="number" min="1" value={cartQty} onChange={(e) => setCartQty(Number(e.target.value))} className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none" />
                        </div>
                        <button type="button" onClick={handleAddToCart} className="py-2 px-4 bg-slate-800 text-white font-bold text-sm rounded-xl hover:bg-slate-700">Add</button>
                      </div>
                      
                      {cartItems.length > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                          <h5 className="text-xs font-bold text-slate-700">Your Cart</h5>
                          <ul className="text-xs text-slate-600 space-y-1">
                            {cartItems.map(item => (
                              <li key={item.id} className="flex justify-between">
                                <span>{item.qty}x {item.name}</span>
                                <span>KES {item.price * item.qty}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-800">
                            <span>Total:</span>
                            <span>KES {cartTotal}</span>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">M-Pesa Number for Checkout</label>
                        <input type="text" placeholder="0712345678" value={stkPhone} onChange={(e) => setStkPhone(e.target.value)} className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl mb-3 focus:outline-none" />
                        <button type="button" onClick={handleCartCheckout} disabled={loading || cartItems.length === 0} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50">
                          {loading ? 'Processing Checkout...' : `Checkout Cart (KES ${cartTotal})`}
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentMethodTab === 'paybill' && (
                    <div className="space-y-4 pt-4 text-center">
                      <div className="bg-white p-6 rounded-xl border border-emerald-200">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">PayHero Paybill Number</p>
                        <h4 className="text-4xl font-black text-slate-900 tracking-widest my-2">12252</h4>
                        <div className="mt-4 text-left p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-sm">
                          <p><strong>Step 1:</strong> Go to M-Pesa Menu -> Lipa na M-Pesa -> Paybill</p>
                          <p><strong>Step 2:</strong> Enter Business No: <strong>12252</strong></p>
                          <p><strong>Step 3:</strong> Enter Account No: <strong>Your Name/Church</strong></p>
                          <p><strong>Step 4:</strong> Enter Amount and your PIN.</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Payments made via Paybill are verified automatically into the system.</p>
                    </div>
                  )}
                </div>

                {/* Physical Product Log */}
                <form onSubmit={handlePhysicalContribution} className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">2. Physical Contribution</h4>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Leader Approval</span>
                    </div>

                    <div className="space-y-4">
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
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 mt-4">
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

        {/* --- TAB: DASHBOARD (TWO-PANEL UI) --- */}
        {activeTab === 'dashboard' && currentUser && (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Panel Sidebar */}
            <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2 bg-slate-900 rounded-3xl p-4 text-sm font-semibold text-slate-400 shadow-xl border border-slate-800 h-fit">
              <div className="px-4 py-3 mb-2 border-b border-slate-700">
                <span className="text-[10px] uppercase tracking-widest text-emerald-500 block mb-1">Portal</span>
                <p className="text-white truncate">{currentUser.name}</p>
                <p className="text-xs font-normal capitalize">{currentUser.role.replace('_', ' ')}</p>
              </div>
              <button onClick={() => setAdminPanelTab('overview')} className={`text-left px-4 py-3 rounded-xl transition-all ${adminPanelTab === 'overview' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>Overview & Actions</button>
              
              {['admin', 'treasurer'].includes(currentUser.role) && (
                <button onClick={() => setAdminPanelTab('payments')} className={`text-left px-4 py-3 rounded-xl transition-all ${adminPanelTab === 'payments' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>PayHero Transactions</button>
              )}
              
              {currentUser.role === 'admin' && (
                <>
                  <button onClick={() => setAdminPanelTab('users')} className={`text-left px-4 py-3 rounded-xl transition-all ${adminPanelTab === 'users' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>User Management</button>
                  <button onClick={() => setAdminPanelTab('config')} className={`text-left px-4 py-3 rounded-xl transition-all ${adminPanelTab === 'config' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>Configurations</button>
                </>
              )}
              <div className="mt-4 pt-4 border-t border-slate-700">
                <button onClick={handleRequestPasswordReset} className="w-full text-left px-4 py-2 hover:bg-slate-800 rounded-xl text-xs text-slate-300">Request Password Reset</button>
              </div>
            </div>

            {/* Right Panel Main Content */}
            <div className="flex-1 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm min-h-[600px]">
              
              {/* ADMIN PANEL: OVERVIEW */}
              {adminPanelTab === 'overview' && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-4">General Overview</h3>
                  
                  {/* Notice Board Creation */}
                  {['admin', 'pastor'].includes(currentUser.role) && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Broadcast Notice</h4>
                      <form onSubmit={handlePostNotice} className="space-y-3">
                        <input type="text" placeholder="Notice Title" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} required className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl" />
                        <textarea rows={3} placeholder="Notice content..." value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} required className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl" />
                        <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-sm">Broadcast Notice</button>
                      </form>
                    </div>
                  )}

                  {/* Church Leader Registration Portal */}
                  {['admin', 'church_leader'].includes(currentUser.role) && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Register Church Youth Member</h4>
                      <form onSubmit={handleAddYouthMember} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select value={youthChurchId} onChange={(e) => setYouthChurchId(e.target.value)} required className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl">
                          <option value="">Select Church</option>
                          {churches.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                        <input type="text" placeholder="Youth Name" value={youthName} onChange={(e) => setYouthName(e.target.value)} required className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl" />
                        <input type="text" placeholder="Phone Number" value={youthPhone} onChange={(e) => setYouthPhone(e.target.value)} required className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl" />
                        <button type="submit" className="md:col-span-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm">Register Member</button>
                      </form>
                    </div>
                  )}

                  {/* Official Notices Disply */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Published Notices</h4>
                    <div className="space-y-3">
                      {notices.map((n) => (
                        <div key={n._id} className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-1.5">
                          <h5 className="font-bold text-slate-900 text-sm">{n.title}</h5>
                          <p className="text-sm text-slate-600 leading-relaxed">{n.content}</p>
                          <p className="text-xs text-indigo-600 font-bold mt-2">Posted by: {n.author?.name || 'Leadership'}</p>
                        </div>
                      ))}
                      {notices.length === 0 && <p className="text-sm text-slate-400">No notices published yet.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN PANEL: PAYMENTS (PayHero Integration) */}
              {adminPanelTab === 'payments' && ['admin', 'treasurer'].includes(currentUser.role) && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">PayHero Transactions</h3>
                      <p className="text-xs text-slate-500">Live payment verification logs (STK, Paybill, Cart)</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">Sync Active</span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-800 font-bold uppercase text-xs tracking-wider">
                        <tr>
                          <th className="p-4 border-b border-slate-200">User Name</th>
                          <th className="p-4 border-b border-slate-200">Mobile No.</th>
                          <th className="p-4 border-b border-slate-200">Church</th>
                          <th className="p-4 border-b border-slate-200">Amount</th>
                          <th className="p-4 border-b border-slate-200">Method</th>
                          <th className="p-4 border-b border-slate-200">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paymentRecords.map((p) => (
                          <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-900">{p.userName}</td>
                            <td className="p-4 font-medium text-slate-500">{p.mobile}</td>
                            <td className="p-4 font-medium text-slate-700">{p.churchName}</td>
                            <td className="p-4 font-black text-emerald-600">KES {p.amount.toLocaleString()}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">{p.method}</span>
                            </td>
                            <td className="p-4">
                              {p.status === 'Success' && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">Success</span>}
                              {p.status === 'Pending' && <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">Pending</span>}
                              {p.status === 'Failed' && <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase">Failed</span>}
                            </td>
                          </tr>
                        ))}
                        {paymentRecords.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">No payment records found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Treasurer Contacts */}
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-4">Treasurer Support Messages</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {contacts.map((msg) => (
                        <div key={msg._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-2">
                          <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200 pb-2">
                            <span>{msg.mobile}</span>
                            <span className="text-slate-400 text-xs font-medium">{new Date(msg.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600">{msg.message}</p>
                        </div>
                      ))}
                      {contacts.length === 0 && <p className="text-sm text-slate-400">No support inquiries received.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN PANEL: USERS */}
              {adminPanelTab === 'users' && currentUser.role === 'admin' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-4">User & Account Management</h3>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Create Church Leader Account</h4>
                    <form onSubmit={handleCreateLeader} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <input type="text" placeholder="Full Name" value={leaderName} onChange={(e) => setLeaderName(e.target.value)} required className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl" />
                      <input type="email" placeholder="Email" value={leaderEmail} onChange={(e) => setLeaderEmail(e.target.value)} required className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl" />
                      <input type="password" placeholder="Password" value={leaderPassword} onChange={(e) => setLeaderPassword(e.target.value)} required className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl" />
                      <input type="text" placeholder="Phone" value={leaderPhone} onChange={(e) => setLeaderPhone(e.target.value)} required className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl" />
                      <select value={leaderChurchId} onChange={(e) => setLeaderChurchId(e.target.value)} required className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl">
                        <option value="">Select Church</option>
                        {churches.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                      <button type="submit" className="lg:col-span-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm mt-2">Create Leader</button>
                    </form>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 mt-6">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-800 font-bold uppercase text-xs tracking-wider">
                        <tr>
                          <th className="p-4 border-b border-slate-200">User</th>
                          <th className="p-4 border-b border-slate-200">Email</th>
                          <th className="p-4 border-b border-slate-200">Role</th>
                          <th className="p-4 border-b border-slate-200">Reset Auth</th>
                          <th className="p-4 border-b border-slate-200">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userList.map((u) => (
                          <tr key={u._id || u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-900">{u.name}</td>
                            <td className="p-4 text-slate-500">{u.email}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase">{u.role.replace('_', ' ')}</span>
                            </td>
                            <td className="p-4">
                              {u.resetRequested ? (
                                <span className="text-rose-600 font-black text-xs">REQUESTED</span>
                              ) : (
                                <span className="text-slate-400 text-xs">Clear</span>
                              )}
                            </td>
                            <td className="p-4">
                              <button onClick={() => handleAdminResetPassword(u._id || u.id)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-bold text-xs shadow-sm">Reset Pass</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ADMIN PANEL: CONFIG */}
              {adminPanelTab === 'config' && currentUser.role === 'admin' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-4">District Configurations</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Create Church */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Add District Church</h4>
                      <form onSubmit={handleCreateChurch} className="flex flex-col gap-3">
                        <input type="text" placeholder="New Church Name" value={newChurchName} onChange={(e) => setNewChurchName(e.target.value)} required className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                        <button type="submit" className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm">Register Church</button>
                      </form>
                    </div>

                    {/* Target & Price Config */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Set Mission Target</h4>
                      <form onSubmit={handleUpdateTargetConfig} className="flex flex-col gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Monetary Target (KES)</label>
                          <input type="number" placeholder="500000" value={newMonetaryTarget} onChange={(e) => setNewMonetaryTarget(Number(e.target.value))} required className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Rice Cash Equivalent (Per Kg)</label>
                          <input type="number" placeholder="150" value={ricePricePerUnit} onChange={(e) => setRicePricePerUnit(Number(e.target.value))} required className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl" />
                        </div>
                        <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-sm mt-1">Save Configuration</button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

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
