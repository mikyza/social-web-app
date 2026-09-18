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

  const safeJsonParse = async (res: Response) => {
    try {
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    } catch (e) {
      return { message: 'Unexpected server response format.' };
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('twende_token');
    const savedUser = localStorage.getItem('twende_user');
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setCurrentUser(parsedUser);
        setStkName(parsedUser.name);
      } catch (err) {
        console.error('Error parsing saved user', err);
      }
    }
    fetchPublicData();
  }, []);

  useEffect(() => {
    if (token && currentUser) {
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
        fetch(`${API_BASE_URL}/api/targets`).catch(() => null),
        fetch(`${API_BASE_URL}/api/churches`).catch(() => null)
      ]);
      
      if (targetRes && targetRes.ok) setTargetData(await safeJsonParse(targetRes));
      if (churchRes && churchRes.ok) setChurches(await safeJsonParse(churchRes));
    } catch (err) {
      console.error('Error fetching public data:', err);
    }
  };

  const fetchAuthenticatedData = async () => {
    if (!token) return;
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    };

    try {
      const summaryRes = await fetch(`${API_BASE_URL}/api/contributions/summary`, { headers }).catch(() => null);
      if (summaryRes && summaryRes.ok) setSummaryData(await safeJsonParse(summaryRes));

      const noticeRes = await fetch(`${API_BASE_URL}/api/notices`, { headers }).catch(() => null);
      if (noticeRes && noticeRes.ok) setNotices(await safeJsonParse(noticeRes));

      if (['admin', 'pastor', 'treasurer'].includes(currentUser?.role || '')) {
        const userRes = await fetch(`${API_BASE_URL}/api/admin/users`, { headers }).catch(() => null);
        if (userRes && userRes.ok) setUserList(await safeJsonParse(userRes));
        
        const payRes = await fetch(`${API_BASE_URL}/api/admin/payments`, { headers }).catch(() => null);
        if (payRes && payRes.ok) {
          setPaymentRecords(await safeJsonParse(payRes));
        } else {
          setPaymentRecords([
            { _id: 'p1', userName: 'John Doe', mobile: '0712345678', churchName: 'Mwea Central', amount: 500, method: 'STK Push', status: 'Success', date: new Date().toISOString() },
            { _id: 'p2', userName: 'Jane Smith', mobile: '0722345678', churchName: 'Kimbimbi SDA', amount: 1200, method: 'Paybill', status: 'Pending', date: new Date().toISOString() },
          ]);
        }
      }

      if (['admin', 'treasurer'].includes(currentUser?.role || '')) {
        const contactRes = await fetch(`${API_BASE_URL}/api/contact`, { headers }).catch(() => null);
        if (contactRes && contactRes.ok) setContacts(await safeJsonParse(contactRes));
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
      const data = await safeJsonParse(res);
      
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
      showAlert('Network error during login. Please ensure backend is running.', 'error');
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
      const data = await safeJsonParse(res);
      
      if (res.ok) {
        showAlert('Registration successful! Please sign in.');
        setAuthMode('login');
        setLoginEmail(regEmail);
      } else {
        showAlert(data.message || 'Registration failed', 'error');
      }
    } catch (err) {
      showAlert('Network error during registration.', 'error');
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
      const data = await safeJsonParse(res);
      
      if (res.ok) {
        showAlert(`Cart STK Push sent to ${stkPhone}! Enter PIN to complete.`);
        setCartItems([]);
      } else {
        showAlert(data.error || data.message || 'Checkout failed', 'error');
      }
    } catch (err) {
      showAlert('Error during checkout. Server may be unreachable.', 'error');
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
      const data = await safeJsonParse(res);
      
      if (res.ok) {
        showAlert(`STK Push sent to ${stkPhone}! Enter PIN to complete payment.`);
        if (data.receiptNumber) fetchReceipt(data.receiptNumber);
      } else {
        showAlert(data.error || data.message || 'STK Push failed', 'error');
      }
    } catch (err) {
      showAlert('Error triggering STK Push. Server may be down.', 'error');
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
      const data = await safeJsonParse(res);
      
      if (res.ok) {
        showAlert('Physical contribution logged successfully!');
        if (data.contribution?.receiptNumber) fetchReceipt(data.contribution.receiptNumber);
      } else {
        showAlert(data.message || 'Error recording physical contribution', 'error');
      }
    } catch (err) {
      showAlert('Network error recording physical contribution.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReceipt = async (receiptNo: string) => {
    if (!receiptNo) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/contributions/receipt/${receiptNo}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await safeJsonParse(res);
      
      if (res.ok && !data.message) {
        setActiveReceipt(data);
      } else {
        showAlert(data.message || 'Receipt not found.', 'error');
      }
    } catch (err) {
      showAlert('Error retrieving receipt from server.', 'error');
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
      } else {
        const data = await safeJsonParse(res);
        showAlert(data.message || 'Update failed', 'error');
      }
    } catch (err) {
      showAlert('Failed to update config on server.', 'error');
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
      } else {
        const data = await safeJsonParse(res);
        showAlert(data.message || 'Error creating leader', 'error');
      }
    } catch (err) {
      showAlert('Network error creating leader.', 'error');
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
      } else {
        const data = await safeJsonParse(res);
        showAlert(data.message || 'Error adding church', 'error');
      }
    } catch (err) {
      showAlert('Network error adding church.', 'error');
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
      } else {
        const data = await safeJsonParse(res);
        showAlert(data.message || 'Error registering member', 'error');
      }
    } catch (err) {
      showAlert('Network error registering youth member.', 'error');
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
      } else {
        const data = await safeJsonParse(res);
        showAlert(data.message || 'Error posting notice', 'error');
      }
    } catch (err) {
      showAlert('Network error posting notice.', 'error');
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
      } else {
        const data = await safeJsonParse(res);
        showAlert(data.message || 'Error sending message', 'error');
      }
    } catch (err) {
      showAlert('Network error sending message.', 'error');
    }
  };

  const handleRequestPasswordReset = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showAlert('Password reset request sent to Pastor & Admin.');
      } else {
        showAlert('Reset request failed on server', 'error');
      }
    } catch (err) {
      showAlert('Network error during reset request', 'error');
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
      } else {
        const data = await safeJsonParse(res);
        showAlert(data.message || 'Failed to reset password', 'error');
      }
    } catch (err) {
      showAlert('Network error resetting password.', 'error');
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
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl text-white font-medium flex items-center space-x-2 transition-all transform animate-fade-in-down ${alertMessage.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* HEADER / NAVIGATION */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-slate-900 text-2xl shadow-lg transform group-hover:rotate-6 transition-all duration-300">
              M
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Mwea West Youth</h1>
              <p className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">Twende Mission</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-2">
            <button onClick={() => setActiveTab('home')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'home' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>Home</button>
            <button onClick={() => setActiveTab('mission')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'mission' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>Mission Info</button>
            <button onClick={() => setActiveTab('summary')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'summary' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>Contributions</button>
            <button onClick={() => setActiveTab('chatwall')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'chatwall' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>Chat Wall</button>
            <button onClick={() => setActiveTab('contact')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'contact' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>Contact</button>
            {currentUser && (
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-300 hover:bg-indigo-900/50'}`}>Admin Panel</button>
            )}
          </nav>

          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-bold text-white">{currentUser.name}</span>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">{currentUser.role.replace('_', ' ')}</span>
                </div>
                <button onClick={handleLogout} className="px-5 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all duration-300 shadow-sm">Sign Out</button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="px-6 py-2.5 text-xs font-black text-slate-900 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 transform hover:-translate-y-0.5 uppercase tracking-wide">Sign In</button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* --- TAB: HOME / LANDING PAGE --- */}
        {activeTab === 'home' && (
          <div className="space-y-16">
            
            {/* 1. Hero Section */}
            <div className="relative rounded-[2rem] bg-slate-900 text-white overflow-hidden shadow-2xl border border-slate-800 min-h-[500px] flex items-center">
              {/* Vibrant Background Image Placeholder representing African Youth / Community */}
              <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Mwea West Youths Gathering" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent"></div>
              
              <div className="relative z-10 max-w-3xl p-10 md:p-16 space-y-6">
                <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-black tracking-widest uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Official District Channel</span>
                </div>
                <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                  Empowering the Youth of <span className="text-emerald-400">Mwea West</span>
                </h2>
                <p className="text-slate-300 text-base sm:text-lg font-medium leading-relaxed max-w-2xl">
                  Join the Twende Mission. We are uniting young believers across the district to drive community transformation, spiritual revival, and direct relief for families in need. Your contribution fuels our impact.
                </p>

                <div className="pt-4 flex flex-wrap gap-4">
                  <button onClick={() => document.getElementById('quick-pay')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 transform hover:-translate-y-1 uppercase tracking-wide">
                    Contribute Now
                  </button>
                  <button onClick={() => setActiveTab('mission')} className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold text-sm rounded-2xl border border-white/20 transition-all duration-300 transform hover:-translate-y-1">
                    Read Our Story
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Vision & Mission Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-10 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-300 group">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-black mb-6 group-hover:scale-110 transition-transform duration-300">🎯</div>
                <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Our Mission</h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  To mobilize, equip, and empower the youth of Mwea West District for holistic evangelical outreach. We aim to share hope through practical charity, spiritual mentorship, and active community engagement, ensuring no family is left behind during times of need.
                </p>
              </div>
              <div className="p-10 bg-slate-900 text-white rounded-[2rem] border border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <div className="w-14 h-14 bg-slate-800 text-emerald-400 rounded-2xl flex items-center justify-center text-2xl font-black mb-6 group-hover:scale-110 transition-transform duration-300">✨</div>
                <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Our Vision</h3>
                <p className="text-slate-400 leading-relaxed font-medium">
                  A united, vibrant, and purpose-driven generation of young leaders in Mwea West, recognized for their unwavering faith, socioeconomic empowerment initiatives, and transformative impact across the entire district and beyond.
                </p>
              </div>
            </div>

            {/* 3. Youth In Action Image Gallery */}
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Youths in Action</h3>
                <p className="text-slate-500 font-medium">Glimpses of our recent community outreach and fellowship.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-lg group">
                  <img src="https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=800&q=80" alt="Youth Engagement" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <span className="text-white font-bold tracking-wide">Community Outreach</span>
                  </div>
                </div>
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-lg group">
                  <img src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=800&q=80" alt="Teamwork" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <span className="text-white font-bold tracking-wide">Relief Distribution</span>
                  </div>
                </div>
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-lg group">
                  <img src="https://images.unsplash.com/photo-1526976663186-ea610cc9a128?auto=format&fit=crop&w=800&q=80" alt="Fellowship" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <span className="text-white font-bold tracking-wide">Youth Fellowship</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Target Progress Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Monetary Target */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">💰</span>
                      <p className="text-sm font-black uppercase tracking-wider text-slate-400">Financial Goal</p>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">KES {raisedCash.toLocaleString()} <span className="text-lg font-medium text-slate-400">/ {targetCash.toLocaleString()}</span></h3>
                  </div>
                  <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-2xl text-lg font-black">{cashPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner">
                  <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-1000" style={{ width: `${cashPercentage}%` }}></div>
                </div>
                <p className="text-sm text-slate-500 font-medium">Updated live upon verified PayHero & logged cash contributions.</p>
              </div>

              {/* Physical Product Target */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">🌾</span>
                      <p className="text-sm font-black uppercase tracking-wider text-slate-400">Physical Goods (Rice)</p>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{riceRaised} Kg <span className="text-lg font-medium text-slate-400">/ {riceTarget} Kg</span></h3>
                  </div>
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-2xl text-lg font-black">{ricePercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner">
                  <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${ricePercentage}%` }}></div>
                </div>
                <p className="text-sm text-slate-500 font-medium">Cash Equivalent Standard: KES {riceItem?.cashPricePerUnit || 150} per Kg</p>
              </div>
            </div>

            {/* 5. Quick Pay / Contribution Form Section */}
            <div id="quick-pay" className="bg-white rounded-[2rem] p-8 sm:p-12 border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -z-10 opacity-60"></div>
              
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Make Your Mission Contribution</h3>
                <p className="text-base text-slate-500 font-medium">Select your preferred digital payment method or officially log physical goods dropped at local churches.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Digital Payments Panel */}
                <div className="space-y-6 p-8 bg-slate-50 rounded-[2rem] border border-slate-200 shadow-inner">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h4 className="font-black text-slate-800 text-lg tracking-tight">1. Digital Payments</h4>
                    <div className="flex p-1.5 bg-slate-200/80 rounded-xl shadow-inner w-full sm:w-auto">
                      <button type="button" onClick={() => setPaymentMethodTab('stk')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${paymentMethodTab === 'stk' ? 'bg-white shadow-md text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}>STK PUSH</button>
                      <button type="button" onClick={() => setPaymentMethodTab('cart')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${paymentMethodTab === 'cart' ? 'bg-white shadow-md text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}>CART</button>
                      <button type="button" onClick={() => setPaymentMethodTab('paybill')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${paymentMethodTab === 'paybill' ? 'bg-white shadow-md text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}>PAYBILL</button>
                    </div>
                  </div>

                  {/* Common Details for Digital Auth */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Full Name</label>
                      <input type="text" placeholder="Your Name" value={stkName} onChange={(e) => setStkName(e.target.value)} required className="w-full text-sm px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Local Church</label>
                      <select value={stkChurchId} onChange={(e) => setStkChurchId(e.target.value)} required className="w-full text-sm px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm transition-all appearance-none cursor-pointer">
                        <option value="">Select church...</option>
                        {churches.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {paymentMethodTab === 'stk' && (
                    <form onSubmit={handlePayHeroSTK} className="space-y-6 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">M-Pesa Number</label>
                          <input type="text" placeholder="0712345678" value={stkPhone} onChange={(e) => setStkPhone(e.target.value)} required className="w-full text-sm px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Amount (KES)</label>
                          <input type="number" placeholder="500" value={stkAmount} onChange={(e) => setStkAmount(e.target.value ? Number(e.target.value) : '')} required className="w-full text-sm px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all" />
                        </div>
                      </div>
                      <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-slate-900/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                        {loading ? 'Triggering STK Push...' : 'Send M-Pesa Prompt Now'}
                      </button>
                    </form>
                  )}

                  {paymentMethodTab === 'cart' && (
                    <div className="space-y-5 pt-2 border-t border-slate-200 mt-4">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Select Item</label>
                          <select value={cartSelectedItem} onChange={(e) => setCartSelectedItem(e.target.value)} className="w-full text-sm px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                            <option value="Rice Contribution">Rice Contribution (KES 150)</option>
                            <option value="General Offering">General Offering (KES 500)</option>
                            <option value="Youth Camp Fee">Youth Camp Fee (KES 1000)</option>
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Qty</label>
                          <input type="number" min="1" value={cartQty} onChange={(e) => setCartQty(Number(e.target.value))} className="w-full text-sm px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 text-center" />
                        </div>
                        <button type="button" onClick={handleAddToCart} className="py-3 px-5 bg-emerald-100 text-emerald-800 font-black text-sm rounded-xl hover:bg-emerald-200 transition-colors shadow-sm">Add</button>
                      </div>
                      
                      {cartItems.length > 0 && (
                        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-3">
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">Your Contribution Cart</h5>
                          <ul className="text-sm text-slate-600 space-y-2 font-medium">
                            {cartItems.map(item => (
                              <li key={item.id} className="flex justify-between items-center">
                                <span>{item.qty}x {item.name}</span>
                                <span className="font-bold text-slate-900">KES {item.price * item.qty}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="pt-3 border-t border-slate-100 flex justify-between font-black text-emerald-700 text-lg">
                            <span>Total Due:</span>
                            <span>KES {cartTotal}</span>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">M-Pesa Number for Checkout</label>
                        <input type="text" placeholder="0712345678" value={stkPhone} onChange={(e) => setStkPhone(e.target.value)} className="w-full text-sm px-5 py-3 bg-white border border-slate-200 rounded-xl mb-4 shadow-sm focus:ring-2 focus:ring-emerald-500" />
                        <button type="button" onClick={handleCartCheckout} disabled={loading || cartItems.length === 0} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-slate-900/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                          {loading ? 'Processing Checkout...' : `Checkout Cart (KES ${cartTotal})`}
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentMethodTab === 'paybill' && (
                    <div className="space-y-6 pt-4 text-center">
                      <div className="bg-white p-8 rounded-[2rem] border-2 border-emerald-100 shadow-md">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">PayHero Paybill Number</p>
                        <h4 className="text-5xl font-black text-emerald-600 tracking-widest drop-shadow-sm">12252</h4>
                        
                        <div className="mt-8 text-left p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-sm font-medium text-slate-600">
                          <p className="flex items-center space-x-3">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                            <span>Go to M-Pesa Menu &rarr; Lipa na M-Pesa &rarr; Paybill</span>
                          </p>
                          <p className="flex items-center space-x-3">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                            <span>Enter Business No: <strong className="text-slate-900">12252</strong></span>
                          </p>
                          <p className="flex items-center space-x-3">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                            <span>Enter Account No: <strong className="text-slate-900">Your Name/Church</strong></span>
                          </p>
                          <p className="flex items-center space-x-3">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">4</span>
                            <span>Enter Amount and your PIN to complete.</span>
                          </p>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Payments are automatically verified into the system.</p>
                    </div>
                  )}
                </div>

                {/* Physical Product Log */}
                <form onSubmit={handlePhysicalContribution} className="space-y-6 p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100 shadow-inner flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-black text-slate-800 text-lg tracking-tight">2. Physical Contribution</h4>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-black px-3 py-1 rounded-lg tracking-wider uppercase border border-blue-200">Leader Approval Required</span>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Church Handover Location</label>
                        <select value={physChurchId} onChange={(e) => setPhysChurchId(e.target.value)} required className="w-full text-sm px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer appearance-none">
                          <option value="">Select drop-off location...</option>
                          {churches.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Item Contributed</label>
                          <input type="text" value={physItemName} onChange={(e) => setPhysItemName(e.target.value)} required className="w-full text-sm px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Quantity (Kg/Units)</label>
                          <input type="number" min="1" value={physQty} onChange={(e) => setPhysQty(Number(e.target.value))} required className="w-full text-sm px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm text-center" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none mt-6">
                    Submit Physical Item Record
                  </button>
                </form>
              </div>
            </div>

            {/* Receipt Quick Search */}
            <div className="bg-slate-900 p-8 md:p-10 rounded-[2rem] border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-white">
              <div className="text-center md:text-left">
                <h4 className="font-black text-2xl tracking-tight mb-2">Need your contribution receipt?</h4>
                <p className="text-sm text-slate-400 font-medium">Enter your official digital receipt number (e.g., REC-1725...) to generate a printable copy.</p>
              </div>
              <div className="flex w-full md:w-auto space-x-3">
                <input type="text" placeholder="Enter Receipt No." value={searchReceiptNo} onChange={(e) => setSearchReceiptNo(e.target.value)} className="w-full md:w-64 px-5 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-inner" />
                <button onClick={() => fetchReceipt(searchReceiptNo)} className="px-6 py-3 bg-emerald-500 text-slate-950 text-sm font-black rounded-xl hover:bg-emerald-400 transition-all shadow-lg hover:shadow-emerald-500/25">Lookup</button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: MISSION DETAILS --- */}
        {activeTab === 'mission' && (
          <div className="max-w-4xl mx-auto space-y-10 bg-white p-10 md:p-16 rounded-[2.5rem] border border-slate-100 shadow-2xl">
            <div className="text-center space-y-4">
              <span className="inline-block px-4 py-1 bg-emerald-100 text-emerald-700 font-black text-xs uppercase tracking-widest rounded-full">About The Mission</span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Mwea West Youth Evangelical Plan</h2>
            </div>

            <div className="prose prose-lg prose-slate max-w-none text-slate-600 font-medium leading-relaxed">
              <p className="text-xl text-slate-700 font-semibold mb-6 text-center">
                The <strong>Mwea West District Youth Twende Mission</strong> brings together youth members across all churches in the district to support community projects, spiritual outreach, and direct relief for families in need.
              </p>
              <p>
                Contributions received through this portal support both monetary logistics and direct physical goods distribution, including essential food supplies like rice, and funding for critical youth development camps designed to nurture the next generation of leaders.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-100">
              <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl mb-4">📊</div>
                <h4 className="font-black text-slate-800 text-lg mb-2">Transparent Accounting</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">All digital transactions are strictly cross-checked and verified automatically against PayHero logs.</p>
              </div>
              <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl mb-4">✅</div>
                <h4 className="font-black text-slate-800 text-lg mb-2">Leader Clearance</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">Physical grain and item contributions are physically verified by appointed local church leaders.</p>
              </div>
              <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl mb-4">🛡️</div>
                <h4 className="font-black text-slate-800 text-lg mb-2">Pastor Oversight</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">Comprehensive analytics and transparent reports are made accessible to ensure maximum accountability.</p>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: SUMMARY / STATS --- */}
        {activeTab === 'summary' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            <div className="bg-slate-900 text-white p-10 rounded-[2rem] shadow-xl text-center space-y-3">
              <h3 className="text-3xl font-black tracking-tight">Churchwise Contribution Summary</h3>
              <p className="text-slate-400 font-medium text-lg">Live aggregated data reflecting contributions from all participating churches across Mwea West District.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {summaryData?.churchwiseBreakdown.map((item, idx) => (
                <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-300">
                  <h4 className="font-black text-slate-800 text-xl mb-4">{item.churchName}</h4>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Raised</p>
                    <p className="text-4xl font-black text-emerald-600 tracking-tight">KES {item.totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm text-slate-500 font-medium">Verified Records</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-black">{item.count}</span>
                  </div>
                </div>
              ))}
              {(!summaryData?.churchwiseBreakdown || summaryData.churchwiseBreakdown.length === 0) && (
                <div className="col-span-full bg-white p-16 text-center text-slate-400 rounded-[2rem] border-2 border-dashed border-slate-200 text-lg font-medium">
                  No verified churchwise records available yet. Sign in or contribute to start populating the board!
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB: CHAT WALL --- */}
        {activeTab === 'chatwall' && (
          <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 max-w-3xl mx-auto space-y-6 my-12 shadow-2xl">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center font-black text-4xl shadow-inner">
              💬
            </div>
            <h3 className="text-4xl font-black text-slate-900 tracking-tight">Mwea West Chat Wall</h3>
            <p className="text-lg text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
              Our interactive youth discussion board and real-time mission chat wall is currently under construction to bring you the best experience.
            </p>
            <div className="pt-4">
              <span className="inline-block px-6 py-2.5 bg-slate-900 text-emerald-400 font-black text-sm rounded-xl uppercase tracking-widest shadow-lg">Coming Soon</span>
            </div>
          </div>
        )}

        {/* --- TAB: CONTACT US --- */}
        {activeTab === 'contact' && (
          <div className="max-w-2xl mx-auto bg-white p-10 md:p-14 rounded-[2.5rem] border border-slate-100 shadow-2xl space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Contact Mission Leadership</h3>
              <p className="text-slate-500 font-medium">Send a direct message to the Treasurer and District Admin for inquiries regarding contributions or general assistance.</p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wide">Mobile Number</label>
                <input type="text" placeholder="e.g. 0712345678" value={contactMobile} onChange={(e) => setContactMobile(e.target.value)} required className="w-full text-base px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-sm transition-all" />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wide">Message / Inquiry</label>
                <textarea rows={5} placeholder="Type your message here..." value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} required className="w-full text-base px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-sm transition-all resize-none" />
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-emerald-600/30 transition-all transform hover:-translate-y-1">
                Send Direct Message
              </button>
            </form>
          </div>
        )}

        {/* --- TAB: DASHBOARD (STRICT TWO-PANEL UI) --- */}
        {activeTab === 'dashboard' && currentUser && (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* LEFT PANEL: Sidebar Navigation */}
            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-3 bg-slate-900 rounded-[2rem] p-6 text-slate-400 shadow-2xl border border-slate-800 lg:sticky lg:top-28">
              <div className="px-2 py-4 mb-4 border-b border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block mb-2">Admin Portal</span>
                <p className="text-white font-bold text-lg truncate">{currentUser.name}</p>
                <p className="text-sm font-medium capitalize text-slate-400">{currentUser.role.replace('_', ' ')}</p>
              </div>
              
              <nav className="space-y-2 flex-1">
                <button onClick={() => setAdminPanelTab('overview')} className={`w-full text-left px-5 py-3.5 rounded-xl text-sm font-bold transition-all ${adminPanelTab === 'overview' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>Overview & Actions</button>
                
                {['admin', 'treasurer'].includes(currentUser.role) && (
                  <button onClick={() => setAdminPanelTab('payments')} className={`w-full text-left px-5 py-3.5 rounded-xl text-sm font-bold transition-all ${adminPanelTab === 'payments' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>PayHero Transactions</button>
                )}
                
                {currentUser.role === 'admin' && (
                  <>
                    <button onClick={() => setAdminPanelTab('users')} className={`w-full text-left px-5 py-3.5 rounded-xl text-sm font-bold transition-all ${adminPanelTab === 'users' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>User Management</button>
                    <button onClick={() => setAdminPanelTab('config')} className={`w-full text-left px-5 py-3.5 rounded-xl text-sm font-bold transition-all ${adminPanelTab === 'config' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>Configurations</button>
                  </>
                )}
              </nav>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <button onClick={handleRequestPasswordReset} className="w-full text-center px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors">Request Password Reset</button>
              </div>
            </div>

            {/* RIGHT PANEL: Main Content Area */}
            <div className="flex-1 w-full bg-white rounded-[2rem] p-8 md:p-12 border border-slate-100 shadow-2xl min-h-[700px]">
              
              {/* ADMIN PANEL: OVERVIEW */}
              {adminPanelTab === 'overview' && (
                <div className="space-y-10 animate-fade-in">
                  <div className="border-b border-slate-100 pb-6">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">General Overview</h3>
                    <p className="text-slate-500 font-medium mt-2">Manage communications and member registrations.</p>
                  </div>
                  
                  {/* Notice Board Creation */}
                  {['admin', 'pastor'].includes(currentUser.role) && (
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner space-y-6">
                      <div className="flex items-center space-x-3">
                        <span className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl">📢</span>
                        <h4 className="font-black text-slate-800 text-lg uppercase tracking-wide">Broadcast Notice</h4>
                      </div>
                      <form onSubmit={handlePostNotice} className="space-y-4">
                        <input type="text" placeholder="Notice Title" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} required className="w-full text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 font-bold" />
                        <textarea rows={4} placeholder="Type your full notice content here..." value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} required className="w-full text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 resize-none font-medium" />
                        <button type="submit" className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl shadow-lg hover:shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5">Publish Broadcast</button>
                      </form>
                    </div>
                  )}

                  {/* Church Leader Registration Portal */}
                  {['admin', 'church_leader'].includes(currentUser.role) && (
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner space-y-6">
                      <div className="flex items-center space-x-3">
                        <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl">👤</span>
                        <h4 className="font-black text-slate-800 text-lg uppercase tracking-wide">Register Youth Member</h4>
                      </div>
                      <form onSubmit={handleAddYouthMember} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <select value={youthChurchId} onChange={(e) => setYouthChurchId(e.target.value)} required className="text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-slate-900 cursor-pointer">
                          <option value="">Select Church</option>
                          {churches.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                        <input type="text" placeholder="Full Youth Name" value={youthName} onChange={(e) => setYouthName(e.target.value)} required className="text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-slate-900" />
                        <input type="text" placeholder="Phone Number" value={youthPhone} onChange={(e) => setYouthPhone(e.target.value)} required className="text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-slate-900" />
                        <button type="submit" className="md:col-span-3 py-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">Register Member</button>
                      </form>
                    </div>
                  )}

                  {/* Official Notices Display */}
                  <div className="space-y-6">
                    <h4 className="font-black text-slate-900 text-xl tracking-tight">Published Notices Log</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {notices.map((n) => (
                        <div key={n._id} className="p-6 bg-white rounded-[1.5rem] border border-indigo-100 shadow-sm hover:shadow-md transition-shadow space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                          <h5 className="font-black text-slate-900 text-lg">{n.title}</h5>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed">{n.content}</p>
                          <div className="flex items-center justify-between pt-2">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">By: {n.author?.name || 'Leadership'}</p>
                            <span className="text-[10px] text-indigo-400 font-bold">{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                      {notices.length === 0 && (
                        <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-[1.5rem]">
                          <p className="text-slate-400 font-medium">No official notices have been published yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN PANEL: PAYMENTS (PayHero Integration) */}
              {adminPanelTab === 'payments' && ['admin', 'treasurer'].includes(currentUser.role) && (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-6 gap-4">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">PayHero Transactions</h3>
                      <p className="text-slate-500 font-medium mt-2">Live automated payment verification logs from M-Pesa.</p>
                    </div>
                    <span className="px-4 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full uppercase tracking-widest border border-emerald-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sync Active
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                          <tr>
                            <th className="p-5 border-b border-slate-200">Contributor</th>
                            <th className="p-5 border-b border-slate-200">Mobile No.</th>
                            <th className="p-5 border-b border-slate-200">Church Location</th>
                            <th className="p-5 border-b border-slate-200">Amount</th>
                            <th className="p-5 border-b border-slate-200">Channel</th>
                            <th className="p-5 border-b border-slate-200">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {paymentRecords.map((p) => (
                            <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-5 font-bold text-slate-900">{p.userName}</td>
                              <td className="p-5 font-semibold text-slate-500">{p.mobile}</td>
                              <td className="p-5 font-semibold text-slate-600">{p.churchName}</td>
                              <td className="p-5 font-black text-emerald-600 text-base">KES {p.amount.toLocaleString()}</td>
                              <td className="p-5">
                                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-wider">{p.method}</span>
                              </td>
                              <td className="p-5">
                                {p.status === 'Success' && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg uppercase tracking-wider">Success</span>}
                                {p.status === 'Pending' && <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg uppercase tracking-wider">Pending</span>}
                                {p.status === 'Failed' && <span className="px-3 py-1 bg-rose-100 text-rose-700 text-[10px] font-black rounded-lg uppercase tracking-wider">Failed</span>}
                              </td>
                            </tr>
                          ))}
                          {paymentRecords.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-10 text-center text-slate-400 font-medium">No payment records detected in the system yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Treasurer Contacts */}
                  <div className="pt-8 border-t border-slate-100">
                    <h4 className="font-black text-slate-900 text-xl tracking-tight mb-6">Treasurer Support Inbox</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {contacts.map((msg) => (
                        <div key={msg._id} className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-200 space-y-3 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                            <span className="font-black text-slate-800 bg-slate-200 px-3 py-1 rounded-md text-sm">{msg.mobile}</span>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{new Date(msg.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600 font-medium leading-relaxed">{msg.message}</p>
                        </div>
                      ))}
                      {contacts.length === 0 && (
                        <div className="col-span-2 p-10 text-center border-2 border-dashed border-slate-200 rounded-[1.5rem]">
                          <p className="text-slate-400 font-medium">No active support inquiries received.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN PANEL: USERS */}
              {adminPanelTab === 'users' && currentUser.role === 'admin' && (
                <div className="space-y-10 animate-fade-in">
                  <div className="border-b border-slate-100 pb-6">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">System Access & Roles</h3>
                    <p className="text-slate-500 font-medium mt-2">Manage structural leadership accounts securely.</p>
                  </div>

                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner space-y-6">
                    <h4 className="font-black text-slate-800 text-lg uppercase tracking-wide">Provision Church Leader</h4>
                    <form onSubmit={handleCreateLeader} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <input type="text" placeholder="Full Name" value={leaderName} onChange={(e) => setLeaderName(e.target.value)} required className="text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-slate-900" />
                      <input type="email" placeholder="Official Email" value={leaderEmail} onChange={(e) => setLeaderEmail(e.target.value)} required className="text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-slate-900" />
                      <input type="text" placeholder="Phone Number" value={leaderPhone} onChange={(e) => setLeaderPhone(e.target.value)} required className="text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-slate-900" />
                      <select value={leaderChurchId} onChange={(e) => setLeaderChurchId(e.target.value)} required className="text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-slate-900 cursor-pointer lg:col-span-1">
                        <option value="">Assign to Church...</option>
                        {churches.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                      <input type="password" placeholder="Secure Password" value={leaderPassword} onChange={(e) => setLeaderPassword(e.target.value)} required className="text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-slate-900 lg:col-span-2" />
                      
                      <button type="submit" className="lg:col-span-3 py-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 mt-2">Provision Leader Account</button>
                    </form>
                  </div>

                  <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 shadow-sm mt-8">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                          <tr>
                            <th className="p-5 border-b border-slate-200">User Identity</th>
                            <th className="p-5 border-b border-slate-200">Email Contact</th>
                            <th className="p-5 border-b border-slate-200">Assigned Role</th>
                            <th className="p-5 border-b border-slate-200">Security Alert</th>
                            <th className="p-5 border-b border-slate-200">Admin Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {userList.map((u) => (
                            <tr key={u._id || u.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-5 font-bold text-slate-900">{u.name}</td>
                              <td className="p-5 font-medium text-slate-500">{u.email}</td>
                              <td className="p-5">
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase tracking-wider">{u.role.replace('_', ' ')}</span>
                              </td>
                              <td className="p-5">
                                {u.resetRequested ? (
                                  <span className="text-rose-600 font-black text-[10px] uppercase tracking-wider bg-rose-50 px-2 py-1 rounded">Requested</span>
                                ) : (
                                  <span className="text-slate-400 text-xs font-medium">Clear</span>
                                )}
                              </td>
                              <td className="p-5">
                                <button onClick={() => handleAdminResetPassword(u._id || u.id)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black text-[10px] uppercase tracking-wider shadow-md transition-colors">Force Reset</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN PANEL: CONFIG */}
              {adminPanelTab === 'config' && currentUser.role === 'admin' && (
                <div className="space-y-10 animate-fade-in">
                  <div className="border-b border-slate-100 pb-6">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">District Configurations</h3>
                    <p className="text-slate-500 font-medium mt-2">Adjust core financial targets and infrastructure.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Create Church */}
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner space-y-6">
                      <h4 className="font-black text-slate-800 text-lg uppercase tracking-wide">Register New Church</h4>
                      <form onSubmit={handleCreateChurch} className="flex flex-col gap-4">
                        <input type="text" placeholder="Official Church Name" value={newChurchName} onChange={(e) => setNewChurchName(e.target.value)} required className="w-full text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-slate-900" />
                        <button type="submit" className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">Add to Network</button>
                      </form>
                    </div>

                    {/* Target & Price Config */}
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner space-y-6">
                      <h4 className="font-black text-slate-800 text-lg uppercase tracking-wide">Global Financial Goal</h4>
                      <form onSubmit={handleUpdateTargetConfig} className="flex flex-col gap-4">
                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Total Monetary Target (KES)</label>
                          <input type="number" placeholder="500000" value={newMonetaryTarget} onChange={(e) => setNewMonetaryTarget(Number(e.target.value))} required className="w-full text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Rice Index Value (Per Kg)</label>
                          <input type="number" placeholder="150" value={ricePricePerUnit} onChange={(e) => setRicePricePerUnit(Number(e.target.value))} required className="w-full text-sm px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900" />
                        </div>
                        <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 mt-2">Deploy Configuration</button>
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-10 shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10"></div>
            
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{authMode === 'login' ? 'Welcome Back' : 'Join Mission'}</h3>
              <button onClick={() => setShowAuthModal(false)} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-black transition-colors">✕</button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Email Address</label>
                  <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="w-full text-sm px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-sm transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wide">Password</label>
                  <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="w-full text-sm px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-sm transition-all" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-emerald-600/30 transition-all transform hover:-translate-y-0.5 mt-2">
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
                <p className="text-sm text-center text-slate-500 font-medium">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setAuthMode('register')} className="text-emerald-600 font-black hover:underline">Register Here</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 mb-1 uppercase tracking-wider">Full Name</label>
                  <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} required className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 mb-1 uppercase tracking-wider">Email</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 mb-1 uppercase tracking-wider">Phone</label>
                    <input type="text" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} required className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 mb-1 uppercase tracking-wider">Local Church</label>
                    <select value={regChurchId} onChange={(e) => setRegChurchId(e.target.value)} className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900">
                      <option value="">Select...</option>
                      {churches.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 mb-1 uppercase tracking-wider">Password</label>
                  <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required className="w-full text-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black text-sm rounded-xl shadow-lg hover:bg-slate-800 transition-all transform hover:-translate-y-0.5 mt-2">
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
                <p className="text-sm text-center text-slate-500 font-medium">
                  Already registered?{' '}
                  <button type="button" onClick={() => setAuthMode('login')} className="text-emerald-600 font-black hover:underline">Sign In</button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- RECEIPT MODAL --- */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="text-center border-b border-slate-100 pb-6 relative">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🧾</div>
              <h3 className="text-xl font-black text-slate-900">{activeReceipt.receiptTitle}</h3>
              <p className="text-xs text-emerald-600 font-black mt-1 uppercase tracking-widest">No. {activeReceipt.receiptNumber}</p>
            </div>

            <div className="space-y-4 text-sm text-slate-600 font-medium">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400">Date</span>
                <span className="font-bold text-slate-800 text-right">{new Date(activeReceipt.date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400">Contributor</span>
                <span className="font-bold text-slate-800 text-right">{activeReceipt.contributorName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400">Church</span>
                <span className="font-bold text-slate-800 text-right">{activeReceipt.church}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400">Item Details</span>
                <span className="font-bold text-slate-800 text-right">{activeReceipt.itemName} ({activeReceipt.type})</span>
              </div>
              <div className="flex justify-between bg-slate-50 p-3 rounded-xl mt-2">
                <span className="text-slate-500 font-bold">Total Settled</span>
                <span className="font-black text-emerald-600 text-lg">
                  {activeReceipt.type === 'cash' ? `KES ${activeReceipt.amountPaid.toLocaleString()}` : `${activeReceipt.quantity} Units`}
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all">Print</button>
              <button onClick={() => setActiveReceipt(null)} className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-500 text-sm py-12 border-t border-slate-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
             <div className="w-8 h-8 rounded-lg bg-emerald-900 text-emerald-500 flex items-center justify-center font-black text-lg">M</div>
             <p className="font-bold text-slate-400">© 2026 Mwea West District Youth</p>
          </div>
          <div className="text-center md:text-right font-medium text-xs">
            <p>PayHero Auth Channel: <strong className="text-slate-300">12252</strong></p>
            <p className="text-slate-600 mt-1">Encrypted M-Pesa Callback Verification</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
