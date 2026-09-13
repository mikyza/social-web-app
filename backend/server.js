const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURATION & CONSTANTS
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://jesselex6_db_user:Michael2026@cluster0.d42eajr.mongodb.net/social_app?appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || 'mwea_west_twende_mission_secret_key_2026';
const PAYHERO_USERNAME = '1qgQv9XeW96uF42JQGrK';
const PAYHERO_CHANNEL_ID = 12252;
const PORT = process.env.PORT || 5000;

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

const targetSchema = new mongoose.Schema({
  title: { type: String, required: true, default: 'Twende Mission Overall Target' },
  mainMonetaryTarget: { type: Number, required: true, default: 0 },
  currentAmountRaised: { type: Number, default: 0 },
  items: [{
    name: { type: String, required: true }, // e.g., "Rice (Kg)", "Tents"
    targetQuantity: { type: Number, default: 0 },
    currentQuantity: { type: Number, default: 0 },
    cashPricePerUnit: { type: Number, default: 0 } // Price set by admin for cash equivalents
  }]
}, { timestamps: true });

const contributionSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },
  type: { type: String, enum: ['cash', 'physical'], required: true },
  itemName: { type: String, default: 'Cash Contribution' },
  amount: { type: Number, required: true }, // Cash value or equivalent cash value
  quantity: { type: Number, default: 1 }, // Useful for physical items like bags of rice
  paymentMethod: { type: String, enum: ['payhero_stk', 'physical_handover'], required: true },
  payheroReference: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
  approvedByLeader: { type: Boolean, default: false },
  approvedByAdmin: { type: Boolean, default: false }
}, { timestamps: true });

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetChurch: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', default: null } // Null for all churches
}, { timestamps: true });

const contactSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Church = mongoose.model('Church', churchSchema);
const Target = mongoose.model('Target', targetSchema);
const Contribution = mongoose.model('Contribution', contributionSchema);
const Notice = mongoose.model('Notice', noticeSchema);
const Contact = mongoose.model('Contact', contactSchema);

// SEED INITIAL ACCOUNTS
async function seedDefaultAccounts() {
  try {
    const adminExists = await User.findOne({ email: 'adminmwea@gmail.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin@Mwea2026', 10);
      await User.create({
        name: 'Main Admin Mwea',
        email: 'adminmwea@gmail.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Seeded default Admin account: adminmwea@gmail.com');
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
      console.log('Seeded default Pastor account: pastormwea@gmail.com');
    }

    const targetExists = await Target.findOne();
    if (!targetExists) {
      await Target.create({
        title: 'Mwea West Youth Twende Mission 2026',
        mainMonetaryTarget: 500000,
        currentAmountRaised: 0,
        items: [{ name: 'Rice (Kg)', targetQuantity: 1000, currentQuantity: 0, cashPricePerUnit: 150 }]
      });
      console.log('Seeded default mission target');
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

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
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
      phone,
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

app.post('/api/auth/request-reset', authenticate, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { resetRequested: true });
    res.json({ message: 'Password reset request sent to Admin/Pastor' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN MANAGEMENT ROUTES (adminmwea@gmail.com Exclusive)
app.get('/api/admin/users', authenticate, authorize(['admin', 'pastor']), async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('church');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/create-leader', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { name, email, password, phone, churchId } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const leader = await User.create({
      name, email, password: hashedPassword, phone, church: churchId, role: 'church_leader'
    });
    if (churchId) {
      await Church.findByIdAndUpdate(churchId, { leader: leader._id });
    }
    res.status(201).json({ message: 'Church Leader account created', leader });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/user-status/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { status, role } = req.body;
    const updatedUser = await User.findByIdAndUpdate(req.params.id, { status, role }, { new: true });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reset-password', authenticate, authorize(['admin', 'pastor']), async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { password: hashedPassword, resetRequested: false });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/user/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHURCH & YOUTH MANAGEMENT
app.post('/api/churches', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const church = await Church.create(req.body);
    res.status(201).json(church);
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

app.post('/api/churches/youth-member', authenticate, authorize(['admin', 'church_leader']), async (req, res) => {
  try {
    const { churchId, name, phone } = req.body;
    const church = await Church.findById(churchId);
    if (!church) return res.status(404).json({ message: 'Church not found' });

    church.youthMembers.push({ name, phone });
    await church.save();
    res.json({ message: 'Youth member registered', church });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TARGET & ITEM PRICING CONFIGURATION
app.get('/api/targets', async (req, res) => {
  try {
    const target = await Target.findOne();
    res.json(target);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/targets/config', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { mainMonetaryTarget, items } = req.body;
    let target = await Target.findOne();
    if (!target) {
      target = new Target({ mainMonetaryTarget, items });
    } else {
      if (mainMonetaryTarget) target.mainMonetaryTarget = mainMonetaryTarget;
      if (items) target.items = items;
    }
    await target.save();
    res.json(target);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PAYHERO STK PUSH & CONTRIBUTIONS
app.post('/api/contributions/payhero-stk', authenticate, async (req, res) => {
  try {
    const { phone, amount, churchId, itemName } = req.body;
    const receiptNumber = 'REC-' + Date.now();

    const contribution = await Contribution.create({
      receiptNumber,
      contributor: req.user.id,
      church: churchId,
      type: 'cash',
      itemName: itemName || 'Cash Contribution',
      amount,
      paymentMethod: 'payhero_stk',
      status: 'pending'
    });

    // PayHero STK Push API call
    const payheroPayload = {
      amount: amount,
      phone_number: phone,
      channel_id: PAYHERO_CHANNEL_ID,
      provider: 'm-pesa',
      external_reference: receiptNumber,
      callback_url: `${req.protocol}://${req.get('host')}/api/contributions/payhero-callback`
    };

    const response = await axios.post('https://backend.payhero.co.ke/api/v2/payments', payheroPayload, {
      auth: { username: PAYHERO_USERNAME, password: '' }
    });

    contribution.payheroReference = response.data.reference || receiptNumber;
    await contribution.save();

    res.json({ message: 'STK Push initiated successfully', receiptNumber, payheroResponse: response.data });
  } catch (err) {
    res.status(500).json({ error: err.response ? err.response.data : err.message });
  }
});

// PAYHERO WEBHOOK / CALLBACK VERIFICATION
app.post('/api/contributions/payhero-callback', async (req, res) => {
  try {
    const { external_reference, status, amount } = req.body;
    if (status === 'SUCCESS' || status === 'Success') {
      const contribution = await Contribution.findOne({ receiptNumber: external_reference });
      if (contribution && contribution.status === 'pending') {
        contribution.status = 'verified';
        await contribution.save();

        // Update overall target
        const target = await Target.findOne();
        if (target) {
          target.currentAmountRaised += Number(amount || contribution.amount);
          await target.save();
        }
      }
    }
    res.json({ status: 'Callback processed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PHYSICAL PRODUCT CONTRIBUTIONS (Rice/Goods)
app.post('/api/contributions/physical', authenticate, authorize(['admin', 'church_leader']), async (req, res) => {
  try {
    const { itemName, quantity, churchId, contributorId } = req.body;
    const target = await Target.findOne();
    const itemConfig = target?.items.find(i => i.name.toLowerCase() === itemName.toLowerCase());

    const cashValue = itemConfig ? itemConfig.cashPricePerUnit * quantity : 0;
    const receiptNumber = 'REC-PHYS-' + Date.now();

    const contribution = await Contribution.create({
      receiptNumber,
      contributor: contributorId || req.user.id,
      church: churchId,
      type: 'physical',
      itemName,
      quantity,
      amount: cashValue,
      paymentMethod: 'physical_handover',
      status: 'pending',
      approvedByLeader: req.user.role === 'church_leader' || req.user.role === 'admin'
    });

    res.status(201).json({ message: 'Physical contribution recorded, awaiting final verification', contribution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TREASURER & ADMIN CLEARANCE / VERIFICATION ROUTE
app.put('/api/contributions/verify/:id', authenticate, authorize(['admin', 'treasurer']), async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ message: 'Contribution record not found' });

    if (contribution.status !== 'verified') {
      contribution.status = 'verified';
      contribution.approvedByAdmin = true;
      await contribution.save();

      // Deduct/Update Target
      const target = await Target.findOne();
      if (target) {
        target.currentAmountRaised += contribution.amount;
        const item = target.items.find(i => i.name.toLowerCase() === contribution.itemName.toLowerCase());
        if (item) item.currentQuantity += contribution.quantity;
        await target.save();
      }
    }

    res.json({ message: 'Payment/Item successfully verified and target updated', contribution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OVERALL & CHURCHWISE ANALYTICS (Accessible to all signed-in users)
app.get('/api/contributions/summary', authenticate, async (req, res) => {
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

    res.json({
      overallTotal: totalRaised[0]?.total || 0,
      churchwiseBreakdown: churchWise
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RECEIPT GENERATION
app.get('/api/contributions/receipt/:receiptNumber', authenticate, async (req, res) => {
  try {
    const contribution = await Contribution.findOne({ receiptNumber: req.params.receiptNumber })
      .populate('contributor', 'name email phone')
      .populate('church', 'name');

    if (!contribution) return res.status(404).json({ message: 'Receipt not found' });

    res.json({
      receiptTitle: 'Mwea West Youth Twende Mission Receipt',
      receiptNumber: contribution.receiptNumber,
      date: contribution.createdAt,
      contributorName: contribution.contributor.name,
      church: contribution.church.name,
      type: contribution.type,
      itemName: contribution.itemName,
      quantity: contribution.quantity,
      amountPaid: contribution.amount,
      status: contribution.status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NOTICE BOARD (PASTOR & ADMIN)
app.post('/api/notices', authenticate, authorize(['admin', 'pastor']), async (req, res) => {
  try {
    const notice = await Notice.create({ ...req.body, author: req.user.id });
    res.status(201).json(notice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notices', authenticate, async (req, res) => {
  try {
    const notices = await Notice.find().populate('author', 'name role').populate('targetChurch', 'name');
    res.json(notices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CONTACT MESSAGES (Admin & Treasurer Exclusive)
app.post('/api/contact', async (req, res) => {
  try {
    const { mobile, message } = req.body;
    const contactMsg = await Contact.create({ mobile, message });
    res.status(201).json({ message: 'Message sent successfully', contactMsg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contact', authenticate, authorize(['admin', 'treasurer']), async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHAT WALL PLACEHOLDER
app.get('/api/chat-wall', (req, res) => {
  res.json({ status: 'Coming Soon', message: 'Mwea West District Chat Wall is coming soon.' });
});

// SERVER LISTEN
app.listen(PORT, () => {
  console.log(`Mwea West Youth Server running on port ${PORT}`);
});
