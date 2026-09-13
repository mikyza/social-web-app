const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
app.set('trust proxy', true); // Fixes HTTPS callback URL resolution behind Render's reverse proxy
app.use(cors());
app.use(express.json());

// CONFIGURATION & CONSTANTS (Updated with your new PayHero credentials)
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://jesselex6_db_user:Michael2026@cluster0.d42eajr.mongodb.net/social_app?appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || 'mwea_west_twende_mission_secret_key_2026';
const PAYHERO_USERNAME = process.env.PAYHERO_USERNAME || 'Ni6WYnn5JIeC1jABeapV';
const PAYHERO_PASSWORD = process.env.PAYHERO_PASSWORD || 'pbhsSGg26GS9DIW3qsTfMwyEIZhv0X1tPEtg9X1';
const PAYHERO_CHANNEL_ID = process.env.PAYHERO_CHANNEL_ID || 11668;
const PAYBILL_NUMBER = process.env.PAYBILL_NUMBER || '400200';
const PORT = process.env.PORT || 5000;

// HELPER: PHONE SANITIZER (Formats 07... / 01... / +254... to 2547...)
function formatPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
}

// MONGOOSE CONNECT
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    seedDefaultAccounts();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// SCHEMAS & MODELS
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  role: { 
    type: String, 
    enum: ['admin', 'pastor', 'treasurer', 'church_leader', 'member'], 
    default: 'member' 
  },
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', default: null },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  resetRequested: { type: Boolean, default: false }
}, { timestamps: true });

const churchSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  youthMembers: [{
    name: { type: String, required: true },
    phone: { type: String, required: true }
  }]
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  pricePerKg: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  imageUrl: { type: String, default: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop' },
  targetQuantity: { type: Number, default: 1000 },
  currentQuantity: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const targetSchema = new mongoose.Schema({
  title: { type: String, required: true, default: 'Twende Mission Overall Target' },
  mainMonetaryTarget: { type: Number, required: true, default: 500000 },
  currentAmountRaised: { type: Number, default: 0 }
}, { timestamps: true });

const contributionSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  guestName: { type: String, default: 'Supporter' },
  guestPhone: { type: String, default: '' },
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },
  type: { type: String, enum: ['cash', 'physical', 'cart'], required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 }
  }],
  amount: { type: Number, required: true }, 
  paymentMethod: { type: String, enum: ['payhero_stk', 'paybill_manual', 'physical_handover'], required: true },
  mpesaCode: { type: String, default: '' },
  payheroReference: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
  approvedByLeader: { type: Boolean, default: false },
  approvedByAdmin: { type: Boolean, default: false }
}, { timestamps: true });

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetChurch: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', default: null },
  category: { type: String, enum: ['general', 'update', 'urgent_need'], default: 'general' },
  imageUrl: { type: String, default: '' },
  isPinned: { type: Boolean, default: false }
}, { timestamps: true });

const contactSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Church = mongoose.model('Church', churchSchema);
const Product = mongoose.model('Product', productSchema);
const Target = mongoose.model('Target', targetSchema);
const Contribution = mongoose.model('Contribution', contributionSchema);
const Notice = mongoose.model('Notice', noticeSchema);
const Contact = mongoose.model('Contact', contactSchema);

// SEED INITIAL ACCOUNTS, CHURCHES & PRODUCTS
async function seedDefaultAccounts() {
  try {
    const defaultChurches = ['Thiba', 'Ngurubani main', 'Ngurubani central', 'Kasarani', 'Nguka', 'Kiamanyeki', 'Nyaikungu', 'Kiarukungu', 'Kathigiriri'];
    for (const churchName of defaultChurches) {
      const churchExists = await Church.findOne({ name: churchName });
      if (!churchExists) {
        await Church.create({ name: churchName });
      }
    }

    const adminExists = await User.findOne({ email: 'adminmwea@gmail.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin@Mwea2026', 10);
      await User.create({
        name: 'Main Admin Mwea',
        email: 'adminmwea@gmail.com',
        password: hashedPassword,
        role: 'admin'
      });
    }

    const pastorExists = await User.findOne({ email: 'pastormwea@gmail.com' });
    if (!pastorExists) {
      const hashedPassword = await bcrypt.hash('Pastor@Mwea2026', 10);
      await User.create({
        name: 'District Pastor Mwea',
        email: 'pastormwea@gmail.com',
        password: hashedPassword,
        role: 'pastor'
      });
    }

    const targetExists = await Target.findOne();
    if (!targetExists) {
      await Target.create({
        title: 'Mwea West Youth Twende Mission 2026',
        mainMonetaryTarget: 500000,
        currentAmountRaised: 0
      });
    }

    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await Product.create([
        {
          name: 'Pishori Rice',
          description: 'High-quality Mwea Grade 1 Pishori Rice',
          pricePerKg: 150,
          unit: 'kg',
          imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop',
          targetQuantity: 2000
        },
        {
          name: 'Cooking Oil',
          description: 'Fortified Vegetable Cooking Oil for Youth Camp',
          pricePerKg: 280,
          unit: 'Litre',
          imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop',
          targetQuantity: 500
        },
        {
          name: 'Sugar',
          description: 'White Table Sugar',
          pricePerKg: 160,
          unit: 'kg',
          imageUrl: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500&auto=format&fit=crop',
          targetQuantity: 500
        }
      ]);
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

// MIDDLEWARES
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      req.user = null;
    }
  }
  next();
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, churchId } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: formatPhone(phone),
      church: churchId || null,
      role: 'member'
    });

    res.status(201).json({ message: 'Registration successful', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate('church');
    if (!user) return res.status(404).json({ message: 'Invalid credentials' });
    if (user.status === 'suspended') return res.status(403).json({ message: 'Account is suspended. Contact admin.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role, email: user.email, church: user.church }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, church: user.church } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN USERS ROUTE
app.get('/api/admin/users', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const users = await User.find().populate('church', 'name').select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TARGETS ROUTES
app.get('/api/targets', async (req, res) => {
  try {
    const targets = await Target.find();
    res.json(targets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/targets/:id', authenticate, authorize(['admin', 'treasurer']), async (req, res) => {
  try {
    const target = await Target.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(target);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CONTACT ROUTES
app.post('/api/contact', async (req, res) => {
  try {
    const { mobile, message } = req.body;
    if (!mobile || !message) return res.status(400).json({ error: 'Mobile and message are required' });
    const contact = await Contact.create({ mobile: formatPhone(mobile), message });
    res.status(201).json({ message: 'Message sent successfully', contact });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contact', authenticate, authorize(['admin', 'pastor']), async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PHYSICAL PRODUCTS CRUD (ADMIN & PUBLIC)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { name, description, pricePerKg, unit, imageUrl, targetQuantity } = req.body;
    const product = await Product.create({
      name, description, pricePerKg, unit: unit || 'kg', imageUrl, targetQuantity
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Product archived successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PAYBILL CONFIGURATION & VERIFICATION ROUTE
app.get('/api/paybill/info', (req, res) => {
  res.json({
    paybillNumber: PAYBILL_NUMBER,
    accountFormat: 'TWENDE-[CHURCH_NAME]',
    instructions: '1. Go to M-Pesa > Lipa na M-Pesa > Paybill.\n2. Enter Business No: ' + PAYBILL_NUMBER + '\n3. Enter Account Name: TWENDE-YOURCHURCH\n4. Enter Amount and M-Pesa PIN.\n5. Paste the M-Pesa Code below for instant verification.'
  });
});

app.post('/api/contributions/paybill-verify', optionalAuth, async (req, res) => {
  try {
    const { mpesaCode, phone, churchId, amount, items, guestName } = req.body;
    if (!mpesaCode || !churchId || !amount) {
      return res.status(400).json({ error: 'M-Pesa code, church selection, and amount are required' });
    }

    const existingCode = await Contribution.findOne({ mpesaCode: mpesaCode.toUpperCase().trim() });
    if (existingCode) {
      return res.status(400).json({ error: 'This M-Pesa code has already been submitted for verification' });
    }

    const receiptNumber = 'REC-PB-' + Date.now();
    const contribution = await Contribution.create({
      receiptNumber,
      contributor: req.user ? req.user.id : null,
      guestName: guestName || 'Paybill Supporter',
      guestPhone: formatPhone(phone),
      church: churchId,
      type: items && items.length > 0 ? 'cart' : 'cash',
      items: items || [],
      amount: Number(amount),
      paymentMethod: 'paybill_manual',
      mpesaCode: mpesaCode.toUpperCase().trim(),
      status: 'pending'
    });

    res.status(201).json({
      message: 'M-Pesa transaction code submitted successfully! Pending verification by Treasurer/Admin.',
      receiptNumber,
      contribution
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BASIC PAYHERO STK PUSH
app.post('/api/contributions/payhero-stk', optionalAuth, async (req, res) => {
  try {
    const { phone, amount, churchId, guestName } = req.body;
    const formattedPhone = formatPhone(phone);

    if (!formattedPhone || !amount || !churchId) {
      return res.status(400).json({ error: 'Phone number, amount, and church selection are required' });
    }

    const receiptNumber = 'REC-STK-' + Date.now();
    const contribution = await Contribution.create({
      receiptNumber,
      contributor: req.user ? req.user.id : null,
      guestName: guestName || 'STK Supporter',
      guestPhone: formattedPhone,
      church: churchId,
      type: 'cash',
      amount: Number(amount),
      paymentMethod: 'payhero_stk',
      status: 'pending'
    });

    const payheroPayload = {
      amount: Number(amount),
      phone_number: formattedPhone,
      channel_id: Number(PAYHERO_CHANNEL_ID),
      provider: 'm-pesa',
      external_reference: receiptNumber,
      callback_url: `${req.protocol}://${req.get('host')}/api/contributions/payhero-callback`
    };

    const response = await axios.post('https://backend.payhero.co.ke/api/v2/payments', payheroPayload, {
      auth: { username: PAYHERO_USERNAME, password: PAYHERO_PASSWORD }
    });

    contribution.payheroReference = response.data.reference || receiptNumber;
    await contribution.save();

    res.json({ message: 'STK Push sent successfully!', receiptNumber, payheroResponse: response.data });
  } catch (err) {
    const payheroError = err.response?.data;
    console.error('PayHero STK Error:', payheroError || err.message);
    const errorMessage = typeof payheroError === 'string' ? payheroError :
      payheroError?.message || payheroError?.error || err.message || 'PayHero STK Push failed';
    res.status(500).json({ error: errorMessage });
  }
});

// QUICK SUPPORT (SINGLE STK PUSH)
app.post('/api/contributions/quick-support', optionalAuth, async (req, res) => {
  try {
    const { phone, churchId, productId, quantity, customAmount, guestName } = req.body;
    const formattedPhone = formatPhone(phone);

    if (!formattedPhone || !churchId) {
      return res.status(400).json({ error: 'Phone number and Church selection are required' });
    }

    let totalAmount = 0;
    let selectedItems = [];

    if (productId) {
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ error: 'Selected product not found' });
      totalAmount = product.pricePerKg * Number(quantity || 1);
      selectedItems.push({
        product: product._id,
        productName: product.name,
        quantity: Number(quantity || 1),
        unitPrice: product.pricePerKg,
        subtotal: totalAmount
      });
    } else {
      totalAmount = Number(customAmount || 0);
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Valid contribution amount is required' });
    }

    const receiptNumber = 'REC-' + Date.now();
    const contribution = await Contribution.create({
      receiptNumber,
      contributor: req.user ? req.user.id : null,
      guestName: guestName || 'Quick Supporter',
      guestPhone: formattedPhone,
      church: churchId,
      type: productId ? 'physical' : 'cash',
      items: selectedItems,
      amount: totalAmount,
      paymentMethod: 'payhero_stk',
      status: 'pending'
    });

    const payheroPayload = {
      amount: totalAmount,
      phone_number: formattedPhone,
      channel_id: Number(PAYHERO_CHANNEL_ID),
      provider: 'm-pesa',
      external_reference: receiptNumber,
      callback_url: `${req.protocol}://${req.get('host')}/api/contributions/payhero-callback`
    };

    const response = await axios.post('https://backend.payhero.co.ke/api/v2/payments', payheroPayload, {
      auth: { username: PAYHERO_USERNAME, password: PAYHERO_PASSWORD }
    });

    contribution.payheroReference = response.data.reference || receiptNumber;
    await contribution.save();

    res.json({ message: 'STK Push sent to phone!', receiptNumber, payheroResponse: response.data });
  } catch (err) {
    const payheroError = err.response?.data;
    console.error('PayHero Quick Support Error:', payheroError || err.message);
    const errorMessage = typeof payheroError === 'string' ? payheroError :
      payheroError?.message || payheroError?.error || err.message || 'PayHero STK Push failed';
    res.status(500).json({ error: errorMessage });
  }
});

// MULTI-PRODUCT CART CHECKOUT
app.post('/api/contributions/cart-checkout', optionalAuth, async (req, res) => {
  try {
    const { phone, churchId, cartItems, paymentMethod, mpesaCode, guestName } = req.body;
    const formattedPhone = formatPhone(phone);

    if (!churchId || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Church selection and at least one product in cart are required' });
    }

    let calculatedTotal = 0;
    const structuredItems = [];

    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        const itemSubtotal = product.pricePerKg * Number(item.quantity || 1);
        calculatedTotal += itemSubtotal;
        structuredItems.push({
          product: product._id,
          productName: product.name,
          quantity: Number(item.quantity || 1),
          unitPrice: product.pricePerKg,
          subtotal: itemSubtotal
        });
      }
    }

    const receiptNumber = 'REC-CART-' + Date.now();

    if (paymentMethod === 'payhero_stk') {
      if (!formattedPhone) return res.status(400).json({ error: 'Phone number required for STK Push' });

      const contribution = await Contribution.create({
        receiptNumber,
        contributor: req.user ? req.user.id : null,
        guestName: guestName || 'Cart Supporter',
        guestPhone: formattedPhone,
        church: churchId,
        type: 'cart',
        items: structuredItems,
        amount: calculatedTotal,
        paymentMethod: 'payhero_stk',
        status: 'pending'
      });

      const response = await axios.post('https://backend.payhero.co.ke/api/v2/payments', {
        amount: calculatedTotal,
        phone_number: formattedPhone,
        channel_id: Number(PAYHERO_CHANNEL_ID),
        provider: 'm-pesa',
        external_reference: receiptNumber,
        callback_url: `${req.protocol}://${req.get('host')}/api/contributions/payhero-callback`
      }, {
        auth: { username: PAYHERO_USERNAME, password: PAYHERO_PASSWORD }
      });

      contribution.payheroReference = response.data.reference || receiptNumber;
      await contribution.save();

      return res.json({ message: 'Cart checkout STK Push initiated!', receiptNumber, contribution });

    } else if (paymentMethod === 'paybill_manual') {
      if (!mpesaCode) return res.status(400).json({ error: 'M-Pesa code required for Paybill submission' });

      const contribution = await Contribution.create({
        receiptNumber,
        contributor: req.user ? req.user.id : null,
        guestName: guestName || 'Cart Supporter',
        guestPhone: formattedPhone,
        church: churchId,
        type: 'cart',
        items: structuredItems,
        amount: calculatedTotal,
        paymentMethod: 'paybill_manual',
        mpesaCode: mpesaCode.toUpperCase().trim(),
        status: 'pending'
      });

      return res.status(201).json({ message: 'Cart Paybill code submitted for verification', receiptNumber, contribution });
    } else {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
  } catch (err) {
    const payheroError = err.response?.data;
    console.error('PayHero Cart Checkout Error:', payheroError || err.message);
    const errorMessage = typeof payheroError === 'string' ? payheroError : payheroError?.message || err.message;
    res.status(500).json({ error: errorMessage });
  }
});

// PAYHERO CALLBACK WEBHOOK
app.post('/api/contributions/payhero-callback', async (req, res) => {
  try {
    const { external_reference, status, amount } = req.body;
    if (status === 'SUCCESS' || status === 'Success') {
      const contribution = await Contribution.findOne({ receiptNumber: external_reference });
      if (contribution && contribution.status === 'pending') {
        contribution.status = 'verified';
        await contribution.save();

        const target = await Target.findOne();
        if (target) {
          target.currentAmountRaised += Number(amount || contribution.amount);
          await target.save();
        }

        for (const item of contribution.items) {
          if (item.product) {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { currentQuantity: item.quantity }
            });
          }
        }
      }
    }
    res.json({ status: 'Callback processed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN AUDIT & LIVE PAYHERO LOGS
app.get('/api/admin/payment-logs', authenticate, authorize(['admin', 'treasurer']), async (req, res) => {
  try {
    const localLogs = await Contribution.find()
      .populate('church', 'name')
      .populate('contributor', 'name email phone')
      .sort({ createdAt: -1 });

    let payheroLiveLogs = [];
    try {
      const liveRes = await axios.get('https://backend.payhero.co.ke/api/v2/payments', {
        auth: { username: PAYHERO_USERNAME, password: PAYHERO_PASSWORD }
      });
      payheroLiveLogs = liveRes.data;
    } catch (e) {
      payheroLiveLogs = { note: 'Could not fetch live PayHero dashboard logs' };
    }

    res.json({ localContributions: localLogs, payheroLiveLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN PAYMENTS
app.get('/api/admin/payments', authenticate, authorize(['admin', 'treasurer']), async (req, res) => {
  try {
    const payments = await Contribution.find()
      .populate('church', 'name')
      .populate('contributor', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VERIFICATION & CLEARANCE
app.put('/api/contributions/verify/:id', authenticate, authorize(['admin', 'treasurer']), async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ message: 'Contribution record not found' });

    if (contribution.status !== 'verified') {
      contribution.status = 'verified';
      contribution.approvedByAdmin = true;
      await contribution.save();

      const target = await Target.findOne();
      if (target) {
        target.currentAmountRaised += contribution.amount;
        await target.save();
      }

      for (const item of contribution.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { currentQuantity: item.quantity }
          });
        }
      }
    }

    res.json({ message: 'Contribution verified and target updated successfully', contribution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ANNOUNCEMENTS / NOTICE BOARD
app.get('/api/notices', async (req, res) => {
  try {
    const { churchId } = req.query;
    let filter = {};
    if (churchId) {
      filter = { $or: [{ targetChurch: churchId }, { targetChurch: null }] };
    }
    const notices = await Notice.find(filter)
      .populate('author', 'name role')
      .populate('targetChurch', 'name')
      .sort({ isPinned: -1, createdAt: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notices', authenticate, authorize(['admin', 'pastor']), async (req, res) => {
  try {
    const { title, content, targetChurch, category, imageUrl, isPinned } = req.body;
    const notice = await Notice.create({
      title, content, author: req.user.id, targetChurch: targetChurch || null, category, imageUrl, isPinned
    });
    res.status(201).json(notice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notices/:id', authenticate, authorize(['admin', 'pastor']), async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(notice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notices/:id', authenticate, authorize(['admin', 'pastor']), async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SUMMARY & TARGET ROUTES
app.get('/api/contributions/summary', async (req, res) => {
  try {
    const totalRaised = await Contribution.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const churchWise = await Contribution.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: '$church', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'churches', localField: '_id', foreignField: '_id', as: 'churchDetails' } },
      { $unwind: '$churchDetails' },
      { $project: { churchName: '$churchDetails.name', totalAmount: 1, count: 1 } }
    ]);

    const target = await Target.findOne();

    res.json({
      overallTotal: totalRaised[0]?.total || 0,
      mainTarget: target?.mainMonetaryTarget || 500000,
      churchwiseBreakdown: churchWise
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/churches', async (req, res) => {
  try {
    const churches = await Church.find().populate('leader', 'name email phone');
    res.json(churches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SERVER LISTEN
app.listen(PORT, () => {
  console.log(`Mwea West Youth Server running on port ${PORT}`);
});
