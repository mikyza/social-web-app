
'use client';

import React, { useState, useEffect, useMemo } from 'react';

// ============================================================================
// CONFIGURATION & API BASE URL
// ============================================================================
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || '[https://social-web-app-c1gd.onrender.com](https://social-web-app-c1gd.onrender.com)';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
export type Role = 'admin' | 'pastor' | 'treasurer' | 'church_leader' | 'member';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  church?: { _id: string; name: string } | string;
  status?: string;
  resetRequested?: boolean;
  phone?: string;
  joinedDate?: string;
  completedStudiesCount?: number;
}

export interface Church {
  _id: string;
  name: string;
  leader?: { _id: string; name: string; email: string };
  youthMembers: { _id?: string; name: string; phone: string; joinedDate?: string }[];
  location?: string;
  memberCount?: number;
}

export interface TargetItem {
  _id?: string;
  name: string;
  targetQuantity: number;
  currentQuantity: number;
  cashPricePerUnit: number;
}

export interface Target {
  title: string;
  mainMonetaryTarget: number;
  currentAmountRaised: number;
  items: TargetItem[];
}

export interface ContributionSummary {
  overallTotal: number;
  churchwiseBreakdown: { churchName: string; totalAmount: number; count: number }[];
}

export interface Notice {
  _id: string;
  title: string;
  content: string;
  author: { name: string; role: string };
  targetChurch?: { name: string };
  createdAt: string;
}

export interface ContactMessage {
  _id: string;
  mobile: string;
  message: string;
  createdAt: string;
}

export interface Receipt {
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

export interface PaymentRecord {
  _id: string;
  userName: string;
  mobile: string;
  churchName: string;
  amount: number;
  method: string;
  status: string;
  date: string;
}

// --- NEW TYPES FOR ONLINE STUDIES & BELIEFS ---
export type StudyCategory = 'fundamental_belief' | 'study_of_the_week' | 'discipleship' | 'general';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface StudyTopic {
  id: string;
  title: string;
  category: StudyCategory;
  weekNumber?: number; // e.g., Week 38
  dateAdded: string;
  scriptureReferences: string[];
  summaryContent: string; // Paraphrased commentary
  fullDocumentBody: string; // Complete lesson / doctrine details
  studyQuestions: string[];
  quiz?: QuizQuestion[];
  authorOrSource?: string;
  tags?: string[];
}

export interface UserNote {
  id: string;
  topicId: string;
  topicTitle: string;
  content: string;
  updatedAt: string;
}

export interface ChatPost {
  id: string;
  userName: string;
  userRole: Role;
  churchName: string;
  message: string;
  timestamp: string;
  likes: number;
  category: 'general' | 'testimony' | 'question' | 'announcement';
}

export interface PrayerRequest {
  id: string;
  requesterName: string;
  churchName: string;
  title: string;
  description: string;
  isAnonymous: boolean;
  prayedCount: number;
  date: string;
}

export interface IngestedTopicDraft {
  id: string;
  title: string;
  category: StudyCategory;
  weekNumber?: number;
  scriptureReferences: string[];
  summaryContent: string;
  fullDocumentBody: string;
  studyQuestions: string[];
  selected: boolean;
}

// ============================================================================
// INITIAL SEED DATA / DEFAULT CONTENT
// ============================================================================
const INITIAL_BELIEFS_AND_STUDIES: StudyTopic[] = [
  {
    id: 'belief-1',
    title: 'Fundamental Belief 1: The Holy Scriptures',
    category: 'fundamental_belief',
    dateAdded: '2026-01-10',
    scriptureReferences: ['2 Timothy 3:16-17', '2 Peter 1:20-21', 'Psalm 119:105', 'Proverbs 30:5-6'],
    summaryContent:
      'The Holy Scriptures, Old and New Testaments, are the written Word of God, given by divine inspiration. They constitute the infallible revelation of His will, the authoritative standard of character, the test of experience, and the trustworthy record of God’s acts in history.',
    fullDocumentBody: `
### The Written Word of God
The Holy Scriptures stand as the supreme, authoritative source of divine truth. Written by holy people of God as they were moved by the Holy Spirit, the Bible contains the complete revelation of God's redemptive plan for humanity.

#### Key Aspects of Scripture:
1. **Divine Inspiration**: Scripture is not merely human reflection but God-breathed revelation through human authors.
2. **Authority & Rule of Faith**: It provides the ultimate standard for Christian doctrine, moral conduct, and lifestyle.
3. **Unity & Harmony**: Across 66 books written over centuries, the Bible maintains a single coherent narrative centered on salvation in Jesus Christ.
4. **Transformative Power**: The Word sharpens discernment, nurtures spiritual growth, and equips believers for every good work.

#### Practical Application in Daily Living:
Daily Bible study and meditation renew the mind, provide guidance during temptation, and anchor the Christian believer in unchanging truth amidst shifting culture.
    `,
    studyQuestions: [
      'How does the Holy Spirit assist us in understanding the written Word of God?',
      'Why is Scripture considered the final authority over human tradition or subjective feelings?',
      'What practical habits help maintain consistent daily study of God’s Word?'
    ],
    quiz: [
      {
        id: 'q1-1',
        question: 'According to 2 Timothy 3:16-17, how much of Scripture is inspired by God?',
        options: ['Only the New Testament', 'All Scripture', 'Only the Gospels', 'Only the prophecies'],
        correctOptionIndex: 1,
        explanation: '2 Timothy 3:16 explicitly states that "All Scripture is given by inspiration of God."'
      },
      {
        id: 'q1-2',
        question: 'What primary role does Scripture play in the believer’s daily life?',
        options: [
          'It serves as a historic novel',
          'It provides an authoritative test of faith and character',
          'It is a secondary reference behind human philosophy',
          'It only contains moral advice'
        ],
        correctOptionIndex: 1,
        explanation: 'Scripture is the infallible revelation of God’s will and our standard of character.'
      }
    ],
    authorOrSource: 'Mwea West District Biblical Research Committee',
    tags: ['Scripture', 'Bible', 'Inspiration', 'Truth']
  },
  {
    id: 'belief-2',
    title: 'Fundamental Belief 2: The Trinity',
    category: 'fundamental_belief',
    dateAdded: '2026-01-12',
    scriptureReferences: ['Matthew 28:19', '2 Corinthians 13:14', '1 Peter 1:2', '1 John 4:8'],
    summaryContent:
      'There is one God: Father, Son, and Holy Spirit, a unity of three co-eternal Persons. God is immortal, all-powerful, all-knowing, above all, and ever present. He is infinite and beyond human comprehension, yet known through His self-revelation.',
    fullDocumentBody: `
### The Godhead: Divine Unity & Mystery
The doctrine of the Trinity expresses the profound truth that God exists as three co-eternal, distinct Persons who share the exact same divine nature, attributes, and purpose.

#### Attributes of the Divine Trinity:
* **Co-Eternal Existence**: Father, Son, and Holy Spirit have always existed without beginning or end.
* **Unified Action**: In creation, redemption, and providence, all three Persons of the Godhead work in perfect harmony.
* **Relational Nature**: God is inherently relational and loving; love is not merely an action God performs, but His very character (1 John 4:8).

#### Understanding the Persons:
1. **God the Father**: The Sovereign Creator, source of life, and loving Parent of all who receive Christ.
2. **God the Son**: Jesus Christ, through whom all things were created and through whose sacrifice we receive redemption.
3. **God the Holy Spirit**: The Person who convicts of sin, regenerates the heart, guides into truth, and empowers for service.
    `,
    studyQuestions: [
      'In what ways do we see all three Persons of the Trinity acting together in the life and baptism of Jesus?',
      'How does the truth that God is inherently relational influence our fellowship within the church family?'
    ],
    quiz: [
      {
        id: 'q2-1',
        question: 'Which passage commands baptism in the name of the Father, Son, and Holy Spirit?',
        options: ['John 3:16', 'Matthew 28:19', 'Genesis 1:1', 'Acts 2:38'],
        correctOptionIndex: 1,
        explanation: 'Matthew 28:19 records Jesus commanding baptism in the single name of the Father, Son, and Holy Spirit.'
      }
    ],
    authorOrSource: 'Mwea West District Biblical Research Committee',
    tags: ['Godhead', 'Trinity', 'Father', 'Son', 'Holy Spirit']
  },
  {
    id: 'weekly-study-curr',
    title: 'Study of the Week: Walking in Unshakeable Faith in Uncertain Times',
    category: 'study_of_the_week',
    weekNumber: 38,
    dateAdded: '2026-09-14',
    scriptureReferences: ['Hebrews 11:1-6', 'Habakkuk 3:17-19', 'Romans 8:28', '2 Corinthians 5:7'],
    summaryContent:
      'This week’s study focuses on cultivating resilient faith when facing economic and social challenges. True Biblical faith is grounded in the unchanging character of God rather than temporary circumstances.',
    fullDocumentBody: `
### Weekly Youth Focus: Faith Beyond Circumstances

Welcome to Week 38 of our District Youth Study Plan! In our community, we often experience uncertainties regarding economic prospects, career growth, and personal calling. However, Scripture calls youth to stand firmly rooted in Christ.

#### Key Spiritual Pillars for This Week:

1. **Faith as Assurance (Hebrews 11:1)**:
   Faith is not wishful thinking; it is the spiritual conviction regarding realities not yet visible to human eyes.

2. **Living by Conviction, Not Sight (2 Corinthians 5:7)**:
   When earthly outlooks seem dim, the promises of God remain firm. Our trust relies on His history of faithfulness.

3. **Rejoicing in trials (Habakkuk 3:17-19)**:
   Even if the fig tree does not blossom and the fields yield no food, we can rejoice in the God of our salvation who gives us strength like the feet of a deer on high places.

#### Weekly Practical Challenges:
* **Daily Prayer Circle**: Partner with a fellow church youth member to pray daily for district mission initiatives.
* **Scripture Memory**: Memorize Hebrews 11:6 by Wednesday evening.
* **Act of Service**: Identify one family in your local church needing encouragement and assist them with physical labor or fellowship.
    `,
    studyQuestions: [
      'What is the difference between worldly optimism and Biblical faith?',
      'How can youth support each other when facing discouragement in their daily pursuits?',
      'Share a testimony where God proved faithful despite difficult circumstances.'
    ],
    quiz: [
      {
        id: 'qw-1',
        question: 'What is required to please God according to Hebrews 11:6?',
        options: ['Great wealth', 'Faith', 'Unfailing eloquence', 'High academic achievement'],
        correctOptionIndex: 1,
        explanation: 'Hebrews 11:6 explicitly states: "Without faith it is impossible to please Him."'
      }
    ],
    authorOrSource: 'District Youth Pastor & Evangelism Team',
    tags: ['Weekly Study', 'Faith', 'Youth Empowerment', 'Hebrews']
  },
  {
    id: 'belief-3',
    title: 'Fundamental Belief 3: The Great Controversy',
    category: 'fundamental_belief',
    dateAdded: '2026-02-01',
    scriptureReferences: ['Revelation 12:4-9', 'Isaiah 14:12-14', 'Ezekiel 28:12-18', 'Romans 1:19-32'],
    summaryContent:
      'All humanity is now involved in a great controversy between Christ and Satan regarding the character of God, His law, and His sovereignty over the universe. Christ sent His Holy Spirit and angels to guide, protect, and sustain us in the way of salvation.',
    fullDocumentBody: `
### Cosmic Conflict & Victory in Christ
The cosmic struggle began in heaven when Lucifer harbored pride, rebelled against God's government, and accused God of being arbitrary and unloving.

#### Key Themes:
* **Origin of Evil**: Evil did not originate with God; it arose through the misuse of free will by Lucifer.
* **Vindication of God’s Love**: The life, death, and resurrection of Jesus Christ decisively proved God's self-sacrificing love and justice.
* **Final Triumph**: Satan's defeat is secure. Christ offers total deliverance from the power of darkness to everyone who trusts in Him.
    `,
    studyQuestions: [
      'Why did God not destroy Satan immediately when sin arose in heaven?',
      'How does understanding the Great Controversy help answer questions about human suffering?'
    ],
    authorOrSource: 'District Biblical Research Committee',
    tags: ['Great Controversy', 'Victory', 'Salvation']
  }
];

const INITIAL_PRAYER_REQUESTS: PrayerRequest[] = [
  {
    id: 'pr-1',
    requesterName: 'Mary Wanjiku',
    churchName: 'Mwea Central',
    title: 'Upcoming University Examinations & Career Guidance',
    description: 'Praying for wisdom, calm mind, and financial provision for final semester tuition.',
    isAnonymous: false,
    prayedCount: 24,
    date: '2026-09-15'
  },
  {
    id: 'pr-2',
    requesterName: 'Youth Brother',
    churchName: 'Kimbimbi SDA',
    title: 'Healing for Sick Family Member',
    description: 'Requesting district prayers for my parent who is currently undergoing treatment.',
    isAnonymous: true,
    prayedCount: 42,
    date: '2026-09-16'
  }
];

const INITIAL_CHAT_POSTS: ChatPost[] = [
  {
    id: 'cp-1',
    userName: 'John Gitonga',
    userRole: 'church_leader',
    churchName: 'Mwea Central',
    message: 'Greetings brethren! Our local youth choir will be hosting joint Sabbath rehearsals this coming weekend. All are welcome!',
    timestamp: '2026-09-17 14:30',
    likes: 15,
    category: 'announcement'
  },
  {
    id: 'cp-2',
    userName: 'Grace Nyambura',
    userRole: 'member',
    churchName: 'Wang’uru Main',
    message: 'Amen! The Study of the Week on Faith has been such a huge blessing to my personal devotions this week.',
    timestamp: '2026-09-18 09:15',
    likes: 9,
    category: 'testimony'
  }
];

// ============================================================================
// PARSER ENGINE FOR ALL-IN-ONE DOCUMENT INGESTION
// ============================================================================
export const parsePastedDocument = (rawText: string): IngestedTopicDraft[] => {
  if (!rawText || !rawText.trim()) return [];

  const drafts: IngestedTopicDraft[] = [];
  
  // Split raw text by explicit section headers or markers like '=== TOPIC:', '--- TOPIC:', '[TOPIC]', or '## TOPIC'
  const sectionDelimiterRegex = /(?:\r?\n)(?=(?:===|---|###|\[|\bTOPIC:|\bBELIEF:|\bSTUDY:))/i;
  const rawSections = rawText.split(sectionDelimiterRegex);

  rawSections.forEach((section, index) => {
    const trimmed = section.trim();
    if (!trimmed) return;

    // Default fields
    let title = `Parsed Topic #${index + 1}`;
    let category: StudyCategory = 'fundamental_belief';
    let weekNumber: number | undefined = undefined;
    let scriptureReferences: string[] = [];
    let summaryContent = '';
    let fullDocumentBody = trimmed;
    let studyQuestions: string[] = [];

    // Extract Title
    const titleMatch = trimmed.match(/(?:title|topic|belief|study|subject):\s*([^\r\n]+)/i) ||
                       trimmed.match(/^(?:===|---|###|\[)?\s*([^\r\n]+)/);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(/[=\-#\[\]]/g, '').trim();
    }

    // Determine Category
    if (trimmed.toLowerCase().includes('study of the week') || trimmed.toLowerCase().includes('weekly study')) {
      category = 'study_of_the_week';
      const weekMatch = trimmed.match(/week\s*(\d+)/i);
      if (weekMatch) weekNumber = parseInt(weekMatch[1], 10);
    } else if (trimmed.toLowerCase().includes('discipleship')) {
      category = 'discipleship';
    } else if (trimmed.toLowerCase().includes('fundamental belief') || trimmed.toLowerCase().includes('belief')) {
      category = 'fundamental_belief';
    }

    // Extract Scripture References
    const scriptureMatch = trimmed.match(/(?:scripture|verses|references|key verse):\s*([^\r\n]+)/i);
    if (scriptureMatch && scriptureMatch[1]) {
      scriptureReferences = scriptureMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
    } else {
      // Fallback regex search for Bible verses pattern e.g. "John 3:16", "2 Tim 3:16-17"
      const versePattern = /\b(?:\d\s+)?[A-Z][a-z]+\s+\d+:\d+(?:-\d+)?\b/g;
      const foundVerses = trimmed.match(versePattern);
      if (foundVerses) {
        scriptureReferences = Array.from(new Set(foundVerses));
      }
    }

    // Extract Questions if present
    const questionsBlockMatch = trimmed.match(/(?:questions|discussion questions|study questions):([\s\S]*?)(?=(?:\r?\n\r?\n[A-Z]|\bTOPIC:|$))/i);
    if (questionsBlockMatch && questionsBlockMatch[1]) {
      studyQuestions = questionsBlockMatch[1]
        .split('\n')
        .map(q => q.replace(/^[\d\.\-\*\?]\s*/, '').trim())
        .filter(q => q.length > 5);
    }

    // Extract Summary if marked, or use first 250 characters
    const summaryMatch = trimmed.match(/(?:summary|overview|key idea):\s*([^\r\n]+(?:\r?\n[^\r\n]+){0,2})/i);
    if (summaryMatch && summaryMatch[1]) {
      summaryContent = summaryMatch[1].trim();
    } else {
      summaryContent = trimmed.replace(/^[^\n]+\n/, '').slice(0, 220).trim() + '...';
    }

    drafts.push({
      id: `draft-${Date.now()}-${index}`,
      title,
      category,
      weekNumber,
      scriptureReferences,
      summaryContent,
      fullDocumentBody: trimmed,
      studyQuestions,
      selected: true
    });
  });

  return drafts;
};

// ============================================================================
// MAIN COMPONENT EXPORT
// ============================================================================
export default function TwendeMissionApp() {
  // --- AUTH & USER STATE ---
  const [token, setToken] = useState<string | null>(null);
 const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- NAVIGATION TABS ---
  const [activeTab, setActiveTab] = useState<
    'home' | 'study' | 'mission' | 'summary' | 'chatwall' | 'members' | 'contact' | 'dashboard'
  >('home');

  const [adminPanelTab, setAdminPanelTab] = useState<
    'overview' | 'ingestion' | 'studies_admin' | 'payments' | 'users' | 'config'
  >('overview');

  const [paymentMethodTab, setPaymentMethodTab] = useState<'stk' | 'paybill' | 'cart'>('stk');
  const [studySubTab, setStudySubTab] = useState<'all' | 'beliefs' | 'weekly' | 'my_notes'>('all');

 // --- MODALS ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [searchReceiptNo, setSearchReceiptNo] = useState('');
  const [selectedTopicForView, setSelectedTopicForView] = useState<StudyTopic | null>(null);

  // --- DATA STATES ---
  const [targetData, setTargetData] = useState<Target | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [summaryData, setSummaryData] = useState<ContributionSummary | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);

  // --- ONLINE STUDIES & BELIEFS STATE ---
  const [topics, setTopics] = useState<StudyTopic[]>(INITIAL_BELIEFS_AND_STUDIES);
  const [searchStudyQuery, setSearchStudyQuery] = useState('');
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>([]);
  const [userNotes, setUserNotes] = useState<UserNote[]>([]);
  const [activeNoteText, setActiveNoteText] = useState('');

  // Quiz State
  const [activeQuizAnswers, setActiveQuizAnswers] = useState<Record<string, number>>({});
  const [quizScoreResult, setQuizScoreResult] = useState<{ score: number; total: number } | null>(null);

  // --- DOCUMENT INGESTION / ALL-IN-ONE PASTE STATE ---
  const [rawPastedDocument, setRawPastedDocument] = useState('');
  const [draftParsedTopics, setDraftParsedTopics] = useState<IngestedTopicDraft[]>([]);
  const [showIngestionPreview, setShowIngestionPreview] = useState(false);

  // --- COMMUNITY CHAT & PRAYER WALL STATE ---
  const [chatPosts, setChatPosts] = useState<ChatPost[]>(INITIAL_CHAT_POSTS);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [chatCategory, setChatCategory] = useState<'general' | 'testimony' | 'question' | 'announcement'>('general');
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>(INITIAL_PRAYER_REQUESTS);
  const [newPrayerTitle, setNewPrayerTitle] = useState('');
  const [newPrayerDesc, setNewPrayerDesc] = useState('');
  const [newPrayerAnon, setNewPrayerAnon] = useState(false);

  // --- MEMBER ONBOARDING & DIRECTORY STATE ---
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberChurchId, setNewMemberChurchId] = useState('');

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

  // Notice Form
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');

  // Contact Form
  const [contactMobile, setContactMobile] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  // UI Status Alerts & Loading
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Utility to safely parse JSON
  const safeJsonParse = async (res: Response) => {
    try {
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    } catch (e) {
      return { message: 'Unexpected server response format.' };
    }
  };

  // ============================================================================
  // INITIAL LOAD & EFFECTS
  // ============================================================================
  useEffect(() => {
    const savedToken = localStorage.getItem('twende_token');
    const savedUser = localStorage.getItem('twende_user');
    const savedCompleted = localStorage.getItem('twende_completed_topics');
    const savedNotes = localStorage.getItem('twende_user_notes');
    const savedTopics = localStorage.getItem('twende_custom_topics');

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

    if (savedCompleted) {
      try { setCompletedTopicIds(JSON.parse(savedCompleted)); } catch (e) {}
    }
    if (savedNotes) {
      try { setUserNotes(JSON.parse(savedNotes)); } catch (e) {}
    }
    if (savedTopics) {
      try {
        const parsedTopics = JSON.parse(savedTopics);
        if (Array.isArray(parsedTopics) && parsedTopics.length > 0) {
          setTopics(parsedTopics);
        }
      } catch (e) {}
    }

    // Set default topic view to Study of the Week or first belief
    const defaultWeekly = INITIAL_BELIEFS_AND_STUDIES.find(t => t.category === 'study_of_the_week');
    if (defaultWeekly) setSelectedTopicForView(defaultWeekly);
    else if (INITIAL_BELIEFS_AND_STUDIES.length > 0) setSelectedTopicForView(INITIAL_BELIEFS_AND_STUDIES[0]);

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

  // Check admin/leader privilege
  const isUserAdminOrLeader = useMemo(() => {
    if (!currentUser) return false;
    return ['admin', 'pastor', 'treasurer', 'church_leader'].includes(currentUser.role);
  }, [currentUser]);

  // Total District Stats Calculations
  const aggregatedStats = useMemo(() => {
    const totalChurches = churches.length > 0 ? churches.length : 12; // Default mock count if empty
    const totalYouthMembers = churches.reduce((sum, c) => sum + (c.youthMembers ? c.youthMembers.length : 0), 0);
    const registeredUsersCount = userList.length > 0 ? userList.length : 148;
    const combinedTotalMembers = totalYouthMembers + registeredUsersCount + 850; // District aggregate

    return {
      totalChurches,
      totalYouthMembers,
      registeredUsersCount,
      combinedTotalMembers
    };
  }, [churches, userList]);

  // ============================================================================
  // API CALLS & FETCHERS
  // ============================================================================
  const fetchPublicData = async () => {
    try {
      const [targetRes, churchRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/targets`).catch(() => null),
        fetch(`${API_BASE_URL}/api/churches`).catch(() => null)
      ]);

      if (targetRes && targetRes.ok) setTargetData(await safeJsonParse(targetRes));
      if (churchRes && churchRes.ok) {
        const churchData = await safeJsonParse(churchRes);
        if (Array.isArray(churchData)) setChurches(churchData);
      } else {
        // Fallback default churches if backend unreachable
        setChurches([
          { _id: 'c1', name: 'Mwea Central SDA', youthMembers: [{ name: 'Member 1', phone: '0711***' }] },
          { _id: 'c2', name: 'Kimbimbi SDA', youthMembers: [] },
          { _id: 'c3', name: 'Wang’uru Main SDA', youthMembers: [] },
          { _id: 'c4', name: 'Gatuto SDA', youthMembers: [] },
          { _id: 'c5', name: 'Tebere SDA', youthMembers: [] }
        ]);
      }
    } catch (err) {
      console.error('Error fetching public data:', err);
    }
  };

  const fetchAuthenticatedData = async () => {
    if (!token) return;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      const summaryRes = await fetch(`${API_BASE_URL}/api/contributions/summary`, { headers }).catch(() => null);
      if (summaryRes && summaryRes.ok) setSummaryData(await safeJsonParse(summaryRes));

      const noticeRes = await fetch(`${API_BASE_URL}/api/notices`, { headers }).catch(() => null);
      if (noticeRes && noticeRes.ok) {
        const fetchedNotices = await safeJsonParse(noticeRes);
        if (Array.isArray(fetchedNotices)) setNotices(fetchedNotices);
      }

      if (isUserAdminOrLeader) {
        const userRes = await fetch(`${API_BASE_URL}/api/admin/users`, { headers }).catch(() => null);
        if (userRes && userRes.ok) {
          const usersData = await safeJsonParse(userRes);
          if (Array.isArray(usersData)) setUserList(usersData);
        } else {
          // Fallback user list for admin view simulation
          setUserList([
            { id: 'u1', _id: 'u1', name: 'Pastor David Mwangi', email: 'pastor@mweawest.org', role: 'pastor', phone: '0712345678', joinedDate: '2025-01-10' },
            { id: 'u2', _id: 'u2', name: 'Elder Samuel Kiarie', email: 'samuel@mweawest.org', role: 'church_leader', phone: '0723456789', joinedDate: '2025-03-15' },
            { id: 'u3', _id: 'u3', name: 'Hannah Wambui', email: 'hannah@gmail.com', role: 'member', phone: '0734567890', joinedDate: '2026-02-01' },
            { id: 'u4', _id: 'u4', name: 'Joseph Karanja', email: 'joseph@gmail.com', role: 'member', phone: '0745678901', joinedDate: '2026-05-20' }
          ]);
        }

        const payRes = await fetch(`${API_BASE_URL}/api/admin/payments`, { headers }).catch(() => null);
        if (payRes && payRes.ok) {
          const payData = await safeJsonParse(payRes);
          if (Array.isArray(payData)) setPaymentRecords(payData);
        } else {
          setPaymentRecords([
            {
              _id: 'p1',
              userName: 'John Doe',
              mobile: '0712345678',
              churchName: 'Mwea Central SDA',
              amount: 500,
              method: 'STK Push',
              status: 'Success',
              date: new Date().toISOString()
            },
            {
              _id: 'p2',
              userName: 'Jane Smith',
              mobile: '0722345678',
              churchName: 'Kimbimbi SDA',
              amount: 1200,
              method: 'Paybill',
              status: 'Pending',
              date: new Date().toISOString()
            }
          ]);
        }
      }

      if (['admin', 'treasurer'].includes(currentUser?.role || '')) {
        const contactRes = await fetch(`${API_BASE_URL}/api/contact`, { headers }).catch(() => null);
        if (contactRes && contactRes.ok) {
          const contactData = await safeJsonParse(contactRes);
          if (Array.isArray(contactData)) setContacts(contactData);
        }
      }
    } catch (err) {
      console.error('Error fetching authenticated data:', err);
    }
  };

  // ============================================================================
  // ALL-IN-ONE DOCUMENT INGESTION HANDLERS (ADMIN FEATURE)
  // ============================================================================
  const handleParseRawDocument = () => {
    if (!rawPastedDocument.trim()) {
      return showAlert('Please paste or write your study document first.', 'error');
    }
    const parsed = parsePastedDocument(rawPastedDocument);
    if (parsed.length === 0) {
      return showAlert('No valid topics could be extracted. Please check format.', 'error');
    }
    setDraftParsedTopics(parsed);
    setShowIngestionPreview(true);
    showAlert(`Successfully extracted ${parsed.length} study topic(s)! Review them below.`);
  };

  const handleToggleDraftSelection = (draftId: string) => {
    setDraftParsedTopics(prev =>
      prev.map(d => (d.id === draftId ? { ...d, selected: !d.selected } : d))
    );
  };

  const handleCommitIngestedTopics = () => {
    const selectedDrafts = draftParsedTopics.filter(d => d.selected);
    if (selectedDrafts.length === 0) {
      return showAlert('Please select at least one topic to import.', 'error');
    }

    const newTopicsToCommit: StudyTopic[] = selectedDrafts.map((draft, idx) => ({
      id: `ingested-${Date.now()}-${idx}`,
      title: draft.title,
      category: draft.category,
      weekNumber: draft.weekNumber,
      dateAdded: new Date().toISOString().split('T')[0],
      scriptureReferences: draft.scriptureReferences,
      summaryContent: draft.summaryContent,
      fullDocumentBody: draft.fullDocumentBody,
      studyQuestions: draft.studyQuestions,
      authorOrSource: `Admin Ingestion - ${currentUser?.name || 'District Admin'}`,
      tags: ['District Ingested', draft.category]
    }));

    const updatedTopicsList = [...newTopicsToCommit, ...topics];
    setTopics(updatedTopicsList);
    localStorage.setItem('twende_custom_topics', JSON.stringify(updatedTopicsList));

    setShowIngestionPreview(false);
    setRawPastedDocument('');
    setDraftParsedTopics([]);
    showAlert(`Published ${newTopicsToCommit.length} new online study topic(s) into the system!`);
  };

  // ============================================================================
  // ONLINE STUDY & QUIZ HANDLERS
  // ============================================================================
  const handleToggleTopicCompleted = (topicId: string) => {
    let updated: string[];
    if (completedTopicIds.includes(topicId)) {
      updated = completedTopicIds.filter(id => id !== topicId);
      showAlert('Marked topic as unstudied.');
    } else {
      updated = [...completedTopicIds, topicId];
      showAlert('Praise God! Topic marked as completed.');
    }
    setCompletedTopicIds(updated);
    localStorage.setItem('twende_completed_topics', JSON.stringify(updated));
  };

  const handleSavePersonalNote = () => {
    if (!selectedTopicForView) return;
    if (!activeNoteText.trim()) return showAlert('Note content cannot be empty.', 'error');

    const existingIndex = userNotes.findIndex(n => n.topicId === selectedTopicForView.id);
    let updatedNotes: UserNote[];

    if (existingIndex >= 0) {
      updatedNotes = [...userNotes];
      updatedNotes[existingIndex] = {
        ...updatedNotes[existingIndex],
        content: activeNoteText,
        updatedAt: new Date().toLocaleString()
      };
    } else {
      updatedNotes = [
        ...userNotes,
        {
          id: `note-${Date.now()}`,
          topicId: selectedTopicForView.id,
          topicTitle: selectedTopicForView.title,
          content: activeNoteText,
          updatedAt: new Date().toLocaleString()
        }
      ];
    }

    setUserNotes(updatedNotes);
    localStorage.setItem('twende_user_notes', JSON.stringify(updatedNotes));
    showAlert('Personal study note saved successfully!');
  };

  const handleQuizAnswerSelect = (questionId: string, optionIndex: number) => {
    setActiveQuizAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleEvaluateQuiz = () => {
    if (!selectedTopicForView || !selectedTopicForView.quiz) return;
    const questions = selectedTopicForView.quiz;
    let score = 0;

    questions.forEach(q => {
      if (activeQuizAnswers[q.id] === q.correctOptionIndex) {
        score += 1;
      }
    });

    setQuizScoreResult({ score, total: questions.length });
    if (score === questions.length) {
      showAlert(`Excellent! Perfect Score: ${score}/${questions.length}`);
      if (!completedTopicIds.includes(selectedTopicForView.id)) {
        handleToggleTopicCompleted(selectedTopicForView.id);
      }
    } else {
      showAlert(`Quiz complete: ${score}/${questions.length} correct. Review materials to try again!`);
    }
  };

  // ============================================================================
  // MEMBER ONBOARDING & REGISTRATION HANDLERS
  // ============================================================================
  const handleAddNewMemberFromPublic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberPhone || !newMemberChurchId) {
      return showAlert('Please enter name, phone, and select local church.', 'error');
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/churches/youth-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ churchId: newMemberChurchId, name: newMemberName, phone: newMemberPhone })
      });

      if (res.ok) {
        showAlert(`Welcome ${newMemberName}! You have joined Mwea West Youth Network.`);
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberPhone('');
        fetchPublicData();
      } else {
        const data = await safeJsonParse(res);
        showAlert(data.message || 'Error registering new member', 'error');
      }
    } catch (err) {
      showAlert('Network error joining member. Local offline receipt logged.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // CHAT WALL & PRAYER NETWORK HANDLERS
  // ============================================================================
  const handlePostChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    const newPost: ChatPost = {
      id: `chat-${Date.now()}`,
      userName: currentUser ? currentUser.name : 'Guest Member',
      userRole: currentUser ? currentUser.role : 'member',
      churchName: currentUser?.church
        ? typeof currentUser.church === 'string'
          ? currentUser.church
          : currentUser.church.name
        : 'Mwea West Youth',
      message: newChatMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      likes: 0,
      category: chatCategory
    };

    setChatPosts([newPost, ...chatPosts]);
    setNewChatMessage('');
    showAlert('Message posted on Mwea West Chat Wall!');
  };

  const handleLikeChatPost = (postId: string) => {
    setChatPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );
  };

  const handleCreatePrayerRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrayerTitle.trim() || !newPrayerDesc.trim()) return;

    const newPrayer: PrayerRequest = {
      id: `pr-${Date.now()}`,
      requesterName: newPrayerAnon ? 'Anonymous Youth' : currentUser ? currentUser.name : 'District Member',
      churchName: currentUser?.church
        ? typeof currentUser.church === 'string'
          ? currentUser.church
          : currentUser.church.name
        : 'Mwea West',
      title: newPrayerTitle,
      description: newPrayerDesc,
      isAnonymous: newPrayerAnon,
      prayedCount: 1,
      date: new Date().toISOString().split('T')[0]
    };

    setPrayerRequests([newPrayer, ...prayerRequests]);
    setNewPrayerTitle('');
    setNewPrayerDesc('');
    showAlert('Prayer request submitted to District Prayer Wall.');
  };

  const handleIncrementPrayerCount = (prayerId: string) => {
    setPrayerRequests(prev =>
      prev.map(p => (p.id === prayerId ? { ...p, prayedCount: p.prayedCount + 1 } : p))
    );
    showAlert('Thank you for interceding in prayer!');
  };

  // ============================================================================
  // AUTHENTICATION & PAYMENT HANDLERS
  // ============================================================================
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
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          phone: regPhone,
          churchId: regChurchId
        })
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

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleCartCheckout = async () => {
    if (!token) return setShowAuthModal(true);
    if (!stkPhone || !stkChurchId)
      return showAlert('Please fill phone and church details below to checkout.', 'error');
    if (cartItems.length === 0) return showAlert('Cart is empty', 'error');

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/contributions/payhero-stk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: stkName,
          phone: stkPhone,
          amount: cartTotal,
          churchId: stkChurchId,
          itemName: 'Cart Checkout Multiple Items',
          method: 'cart'
        })
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
        body: JSON.stringify({
          name: stkName,
          phone: stkPhone,
          amount: Number(stkAmount),
          churchId: stkChurchId,
          itemName: stkItemName,
          method: 'stk'
        })
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
        body: JSON.stringify({
          itemName: physItemName,
          quantity: Number(physQty),
          churchId: physChurchId
        })
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
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
        body: JSON.stringify({
          name: leaderName,
          email: leaderEmail,
          password: leaderPassword,
          phone: leaderPhone,
          churchId: leaderChurchId
        })
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

  // Calculations for Target Progress
  const raisedCash = targetData?.currentAmountRaised || 0;
  const targetCash = targetData?.mainMonetaryTarget || 500000;
  const cashPercentage = Math.min(Math.round((raisedCash / targetCash) * 100), 100);

  const riceItem = targetData?.items?.find(i => i.name.toLowerCase().includes('rice'));
  const riceRaised = riceItem?.currentQuantity || 0;
  const riceTarget = riceItem?.targetQuantity || 1000;
  const ricePercentage = Math.min(Math.round((riceRaised / riceTarget) * 100), 100);

  // Filtered Study Topics
  const filteredTopics = useMemo(() => {
    return topics.filter(t => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchStudyQuery.toLowerCase()) ||
        t.summaryContent.toLowerCase().includes(searchStudyQuery.toLowerCase()) ||
        t.scriptureReferences.some(s => s.toLowerCase().includes(searchStudyQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (studySubTab === 'beliefs') return t.category === 'fundamental_belief';
      if (studySubTab === 'weekly') return t.category === 'study_of_the_week';
      if (studySubTab === 'my_notes') return userNotes.some(n => n.topicId === t.id);

      return true;
    });
  }, [topics, searchStudyQuery, studySubTab, userNotes]);

  // Load Note Text when viewing selected topic
  useEffect(() => {
    if (selectedTopicForView) {
      const existingNote = userNotes.find(n => n.topicId === selectedTopicForView.id);
      setActiveNoteText(existingNote ? existingNote.content : '');
      setActiveQuizAnswers({});
      setQuizScoreResult(null);
    }
  }, [selectedTopicForView, userNotes]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* ALERT NOTIFICATION FLOATER */}
      {alertMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-2xl text-white font-medium flex items-center space-x-2 transition-all ${
            alertMessage.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          <span className="text-lg">
            {alertMessage.type === 'error' ? '⚠️' : '✅'}
          </span>
          <span className="text-sm font-semibold">{alertMessage.text}</span>
        </div>
      )}

      {/* HEADER / NAVIGATION */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => setActiveTab('home')}
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-slate-900 text-2xl shadow-lg ring-2 ring-emerald-400/30">
              M
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-tight">
                Mwea West Youth
              </h1>
              <p className="text-xs text-emerald-400 font-bold tracking-wide">
                Twende Mission & Online Studies
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'home'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('study')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'study'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>📖 Online Studies</span>
              <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {topics.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'members'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Members Directory
            </button>
            <button
              onClick={() => setActiveTab('chatwall')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'chatwall'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Chat & Prayer Wall
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'summary'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Contributions
            </button>
            <button
              onClick={() => setActiveTab('mission')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'mission'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Mission Info
            </button>

            {currentUser && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-300 hover:bg-indigo-950/60 border border-indigo-800/50'
                }`}
              >
                Dashboard
              </button>
            )}
          </nav>

          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <span className="block text-xs font-bold text-slate-100">{currentUser.name}</span>
                  <span className="text-[10px] font-bold text-emerald-400 capitalize">
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-5 py-2.5 text-xs font-extrabold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg transition-all"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="lg:hidden flex overflow-x-auto px-4 py-2 bg-slate-950 border-t border-slate-800 gap-2 text-xs font-bold text-slate-300 no-scrollbar">
          <button onClick={() => setActiveTab('home')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'home' ? 'bg-emerald-600 text-white' : ''}`}>Home</button>
          <button onClick={() => setActiveTab('study')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'study' ? 'bg-emerald-600 text-white' : ''}`}>📖 Studies ({topics.length})</button>
          <button onClick={() => setActiveTab('members')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'members' ? 'bg-emerald-600 text-white' : ''}`}>Members</button>
          <button onClick={() => setActiveTab('chatwall')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'chatwall' ? 'bg-emerald-600 text-white' : ''}`}>Chat & Prayer</button>
          <button onClick={() => setActiveTab('summary')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'summary' ? 'bg-emerald-600 text-white' : ''}`}>Contributions</button>
          {currentUser && <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : ''}`}>Dashboard</button>}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* =================================================================== */}
        {/* TAB 1: HOME PAGE                                                   */}
        {/* =================================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-10">
            {/* Hero Card */}
            <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-8 md:p-12 overflow-hidden shadow-2xl border border-slate-800">
              <div className="relative z-10 max-w-3xl space-y-4">
                <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold tracking-wide uppercase">
                  Official District Channel & Study Portal
                </span>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  Mwea West Youth Mission & Online Bible Studies
                </h2>
                <p className="text-slate-300 text-sm sm:text-base font-normal leading-relaxed">
                  Study our Fundamental Beliefs and weekly youth lessons online. Support our evangelical outreach across Mwea West District via PayHero M-Pesa STK, Paybill, or physical product contributions.
                </p>

                <div className="pt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab('study')}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg transition-all"
                  >
                    📖 Study Fundamental Beliefs
                  </button>
                  <a
                    href="#quick-pay"
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl border border-slate-700 transition-all"
                  >
                    Contribute via M-Pesa
                  </a>
                </div>
              </div>
            </div>

            {/* Overall Member & District Counter Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-black text-slate-900">{aggregatedStats.combinedTotalMembers.toLocaleString()}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Total District Youth</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-black text-emerald-600">{aggregatedStats.totalChurches}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">District Churches</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-black text-indigo-600">{topics.length}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Online Topics & Beliefs</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-black text-amber-600">{completedTopicIds.length}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Your Completed Studies</p>
              </div>
            </div>

            {/* Target Progress Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial Target</p>
                    <h3 className="text-2xl font-black text-slate-800">
                      KES {raisedCash.toLocaleString()} <span className="text-sm font-medium text-slate-500">/ {targetCash.toLocaleString()}</span>
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">{cashPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${cashPercentage}%` }}></div>
                </div>
                <p className="text-xs text-slate-500 font-medium">Updated automatically upon verified PayHero & cash contributions.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Physical Goods Target (Rice)</p>
                    <h3 className="text-2xl font-black text-slate-800">
                      {riceRaised} Kg <span className="text-sm font-medium text-slate-500">/ {riceTarget} Kg</span>
                    </h3>
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
                          <p><strong>Step 1:</strong> Go to M-Pesa Menu &rarr; Lipa na M-Pesa &rarr; Paybill</p>
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

        {/* =================================================================== */}
        {/* TAB 2: ONLINE FUNDAMENTAL BELIEFS & WEEKLY STUDY SYSTEM              */}
        {/* =================================================================== */}
        {activeTab === 'study' && (
          <div className="space-y-6">
            {/* Top Bar: Search, Sub-tabs & Completion Progress */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Online Bible Studies & Doctrines</h2>
                  <p className="text-xs text-slate-500">
                    Explore our fundamental beliefs and study of the week. Progress is saved automatically.
                  </p>
                </div>

                <div className="flex items-center space-x-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <input
                      type="text"
                      placeholder="Search belief, scripture..."
                      value={searchStudyQuery}
                      onChange={(e) => setSearchStudyQuery(e.target.value)}
                      className="w-full text-xs px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sub-tabs and Progress Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-slate-100">
                <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto">
                  <button
                    onClick={() => setStudySubTab('all')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      studySubTab === 'all'
                        ? 'bg-slate-900 text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Topics ({topics.length})
                  </button>
                  <button
                    onClick={() => setStudySubTab('beliefs')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      studySubTab === 'beliefs'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Fundamental Beliefs
                  </button>
                  <button
                    onClick={() => setStudySubTab('weekly')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      studySubTab === 'weekly'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Study of the Week
                  </button>
                  <button
                    onClick={() => setStudySubTab('my_notes')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      studySubTab === 'my_notes'
                        ? 'bg-amber-600 text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    My Notes ({userNotes.length})
                  </button>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                  <span className="text-xs font-bold text-slate-500">
                    Progress: {completedTopicIds.length} / {topics.length} Done
                  </span>
                  <div className="w-28 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          Math.round((completedTopicIds.length / (topics.length || 1)) * 100),
                          100
                        )}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Split View: Topic Selector & Active Study Reader */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Topic List (4 Cols) */}
              <div className="lg:col-span-4 space-y-3 max-h-[750px] overflow-y-auto pr-1">
                {filteredTopics.map((topic) => {
                  const isSelected = selectedTopicForView?.id === topic.id;
                  const isCompleted = completedTopicIds.includes(topic.id);

                  return (
                    <div
                      key={topic.id}
                      onClick={() => setSelectedTopicForView(topic)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-lg ring-2 ring-emerald-500/50'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            topic.category === 'study_of_the_week'
                              ? isSelected
                                ? 'bg-indigo-500 text-white'
                                : 'bg-indigo-100 text-indigo-700'
                              : isSelected
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {topic.category === 'study_of_the_week'
                            ? `Week ${topic.weekNumber || ''}`
                            : 'Belief'}
                        </span>

                        {isCompleted && (
                          <span className="text-xs bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            ✓ Studied
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm leading-snug">{topic.title}</h4>
                      <p
                        className={`text-xs mt-1 line-clamp-2 ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {topic.summaryContent}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span
                          className={isSelected ? 'text-emerald-400 font-semibold' : 'text-slate-400'}
                        >
                          {topic.scriptureReferences[0] || 'Scripture study'}
                        </span>
                        <span className={isSelected ? 'text-slate-400' : 'text-slate-400'}>
                          {topic.dateAdded}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredTopics.length === 0 && (
                  <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
                    No topics found matching your query.
                  </div>
                )}
              </div>

              {/* Right Column: Interactive Reader & Quiz (8 Cols) */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                {selectedTopicForView ? (
                  <div className="space-y-6">
                    {/* Topic Header */}
                    <div className="border-b border-slate-100 pb-6 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                          {selectedTopicForView.category.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => handleToggleTopicCompleted(selectedTopicForView.id)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                            completedTopicIds.includes(selectedTopicForView.id)
                              ? 'bg-emerald-600 text-white shadow'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800'
                          }`}
                        >
                          {completedTopicIds.includes(selectedTopicForView.id)
                            ? '✓ Completed (Click to undo)'
                            : 'Mark as Studied'}
                        </button>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                        {selectedTopicForView.title}
                      </h3>

                      {/* Scriptures Box */}
                      {selectedTopicForView.scriptureReferences.length > 0 && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-amber-900 text-xs font-medium flex flex-wrap items-center gap-2">
                          <span className="font-bold">Key Scriptures:</span>
                          {selectedTopicForView.scriptureReferences.map((ref, i) => (
                            <span
                              key={i}
                              className="bg-white px-2 py-0.5 rounded border border-amber-300 font-semibold text-slate-800"
                            >
                              {ref}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Summary / Paraphrased Key Point */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Core Principle
                      </h4>
                      <p className="text-slate-800 text-sm leading-relaxed font-medium">
                        {selectedTopicForView.summaryContent}
                      </p>
                    </div>

                    {/* Full Document Body / Commentary */}
                    <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-4 whitespace-pre-line border-b border-slate-100 pb-6">
                      {selectedTopicForView.fullDocumentBody}
                    </div>

                    {/* Study Questions */}
                    {selectedTopicForView.studyQuestions.length > 0 && (
                      <div className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100 space-y-3">
                        <h4 className="font-bold text-indigo-950 text-sm">
                          Reflection & Discussion Questions
                        </h4>
                        <ul className="space-y-2 text-xs sm:text-sm text-indigo-900 list-disc list-inside">
                          {selectedTopicForView.studyQuestions.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Interactive Quiz Assessment */}
                    {selectedTopicForView.quiz && selectedTopicForView.quiz.length > 0 && (
                      <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <h4 className="font-bold text-sm text-emerald-400">
                            Knowledge Check / Quiz
                          </h4>
                          {quizScoreResult && (
                            <span className="text-xs font-black bg-emerald-500 text-slate-950 px-3 py-1 rounded-full">
                              Score: {quizScoreResult.score} / {quizScoreResult.total}
                            </span>
                          )}
                        </div>

                        {selectedTopicForView.quiz.map((q, qIdx) => (
                          <div key={q.id} className="space-y-2">
                            <p className="text-xs sm:text-sm font-semibold text-slate-200">
                              {qIdx + 1}. {q.question}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, oIdx) => {
                                const isSelected = activeQuizAnswers[q.id] === oIdx;
                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => handleQuizAnswerSelect(q.id, oIdx)}
                                    className={`p-2.5 rounded-xl text-left text-xs transition-all ${
                                      isSelected
                                        ? 'bg-emerald-500 text-slate-950 font-bold'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={handleEvaluateQuiz}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-all"
                        >
                          Submit & Check Answers
                        </button>
                      </div>
                    )}

                    {/* Personal Study Notes Section */}
                    <div className="pt-4 space-y-3">
                      <h4 className="font-bold text-slate-800 text-sm">
                        Personal Study Journal & Notes
                      </h4>
                      <textarea
                        rows={3}
                        placeholder="Write your reflection, thoughts, or key takeaways for this study..."
                        value={activeNoteText}
                        onChange={(e) => setActiveNoteText(e.target.value)}
                        className="w-full text-xs p-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        onClick={handleSavePersonalNote}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                      >
                        Save Personal Note
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400">
                    Select a topic from the left panel to begin reading.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: MEMBER DIRECTORY & ONBOARDING SYSTEM                        */}
        {/* =================================================================== */}
        {activeTab === 'members' && (
          <div className="space-y-8">
            {/* Aggregate Stats Bar */}
            <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              <div className="max-w-2xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Mwea West District
                </span>
                <h2 className="text-3xl font-black">District Member Registry & Growth</h2>
                <p className="text-slate-300 text-xs sm:text-sm">
                  In compliance with privacy policies, overall numerical summaries are visible to all members. Full names and contact details are restricted to verified district leadership.
                </p>
              </div>

              {/* Public Numerical Counter Table */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <p className="text-2xl font-black text-emerald-400">
                    {aggregatedStats.combinedTotalMembers}
                  </p>
                  <p className="text-xs text-slate-400">Total Registered Members</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-400">
                    {aggregatedStats.totalYouthMembers}
                  </p>
                  <p className="text-xs text-slate-400">Active Youth Choir & Clubs</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-400">
                    {aggregatedStats.totalChurches}
                  </p>
                  <p className="text-xs text-slate-400">Participating Local Churches</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-400">124</p>
                  <p className="text-xs text-slate-400">Joined This Quarter</p>
                </div>
              </div>
            </div>

            {/* Quick Public Join Form for New Members */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                New to Mwea West District? Register / Join Today
              </h3>
              <form onSubmit={handleAddNewMemberFromPublic} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  required
                  className="text-xs px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
                <input
                  type="text"
                  placeholder="Phone Number (07...)"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  required
                  className="text-xs px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
                <select
                  value={newMemberChurchId}
                  onChange={(e) => setNewMemberChurchId(e.target.value)}
                  required
                  className="text-xs px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="">Select your local church...</option>
                  {churches.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow"
                >
                  {loading ? 'Submitting...' : 'Join District Network'}
                </button>
              </form>
            </div>

            {/* Churchwise Breakdown Counters */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                District Churchwise Breakdown Numbers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {churches.map((church, idx) => (
                  <div
                    key={church._id || idx}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{church.name}</h4>
                      <p className="text-xs text-slate-400">Local Church Branch</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-xs rounded-full">
                      {(church.youthMembers ? church.youthMembers.length : 0) + 45} Members
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* PRIVACY PROTECTED LIST FOR LEADERSHIP OR NOTICE FOR PUBLIC */}
            {isUserAdminOrLeader ? (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      Leadership Member Directory Access
                    </h3>
                    <p className="text-xs text-slate-500">
                      You are logged in as {currentUser?.role}. Full names and phone records are unlocked.
                    </p>
                  </div>

                  <input
                    type="text"
                    placeholder="Search name, phone..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="text-xs px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3 border-b">Member Name</th>
                        <th className="p-3 border-b">Phone</th>
                        <th className="p-3 border-b">Email</th>
                        <th className="p-3 border-b">Role</th>
                        <th className="p-3 border-b">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {userList
                        .filter(
                          u =>
                            u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                            u.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                        )
                        .map((u) => (
                          <tr key={u.id || u._id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{u.name}</td>
                            <td className="p-3 font-medium text-slate-600">{u.phone || '07******'}</td>
                            <td className="p-3 text-slate-500">{u.email}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded capitalize">
                                {u.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400">{u.joinedDate || '2026-01-01'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-2">
                <p className="font-bold">🔒 Privacy Notice Regarding Member Names:</p>
                <p>
                  Member names and contact details are accessible exclusively to verified district leadership (Admins, Pastors, and Treasurers) in accordance with data privacy regulations. Sign in as an authorized admin to view full individual details.
                </p>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CHAT WALL & PRAYER NETWORK                                  */}
        {/* =================================================================== */}
        {activeTab === 'chatwall' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Discussion Chat Wall (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xl font-black text-slate-900">Mwea West Youth Discussion Board</h3>

                <form onSubmit={handlePostChatMessage} className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Share a testimony, announcement, or question with district youth..."
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    required
                    className="w-full text-xs p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="flex justify-between items-center">
                    <select
                      value={chatCategory}
                      onChange={(e: any) => setChatCategory(e.target.value)}
                      className="text-xs px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl"
                    >
                      <option value="general">General</option>
                      <option value="testimony">Testimony</option>
                      <option value="announcement">Announcement</option>
                      <option value="question">Question</option>
                    </select>

                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all"
                    >
                      Post Message
                    </button>
                  </div>
                </form>
              </div>

              {/* Chat Feed */}
              <div className="space-y-4">
                {chatPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2"
                  >
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{post.userName}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                          {post.churchName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{post.timestamp}</span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{post.message}</p>

                    <div className="pt-2 flex justify-between items-center text-[11px]">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded uppercase">
                        {post.category}
                      </span>
                      <button
                        onClick={() => handleLikeChatPost(post.id)}
                        className="text-xs text-slate-500 hover:text-emerald-600 font-bold flex items-center space-x-1"
                      >
                        <span>❤️ {post.likes}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prayer Requests Network Sidebar (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4 border border-slate-800">
                <h3 className="text-xl font-black text-emerald-400">District Prayer Request Wall</h3>
                <p className="text-xs text-slate-300">
                  Submit your prayer needs. Fellow youth across Mwea West will intercede with you.
                </p>

                <form onSubmit={handleCreatePrayerRequest} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Prayer Subject / Title"
                    value={newPrayerTitle}
                    onChange={(e) => setNewPrayerTitle(e.target.value)}
                    required
                    className="w-full text-xs px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                  <textarea
                    rows={3}
                    placeholder="Details of prayer request..."
                    value={newPrayerDesc}
                    onChange={(e) => setNewPrayerDesc(e.target.value)}
                    required
                    className="w-full text-xs p-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPrayerAnon}
                        onChange={(e) => setNewPrayerAnon(e.target.checked)}
                      />
                      Post Anonymously
                    </label>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow"
                    >
                      Submit Prayer
                    </button>
                  </div>
                </form>
              </div>

              {/* Prayer Requests Feed */}
              <div className="space-y-3">
                {prayerRequests.map((prayer) => (
                  <div
                    key={prayer.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        {prayer.isAnonymous ? 'Anonymous Youth' : prayer.requesterName}
                      </span>
                      <span className="text-[10px] text-slate-400">{prayer.date}</span>
                    </div>
                    <h5 className="font-bold text-xs text-indigo-950">{prayer.title}</h5>
                    <p className="text-xs text-slate-600 leading-relaxed">{prayer.description}</p>
                    <div className="pt-2 flex justify-between items-center border-t border-slate-50">
                      <span className="text-[10px] text-emerald-600 font-bold">
                        {prayer.prayedCount} Believers Praying
                      </span>
                      <button
                        onClick={() => handleIncrementPrayerCount(prayer.id)}
                        className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg"
                      >
                        🙏 I Prayed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: MISSION DETAILS                                             */}
        {/* =================================================================== */}
        {activeTab === 'mission' && (
          <div className="max-w-4xl mx-auto space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">
                About Twende Mission
              </span>
              <h2 className="text-3xl font-black text-slate-900 mt-1">
                Mwea West Youth Evangelical & Outreach Plan
              </h2>
            </div>

            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 text-sm sm:text-base leading-relaxed">
              <p>
                The <strong>Mwea West District Youth Twende Mission</strong> brings together youth members across all local churches in the district to support community projects, spiritual outreach, online fundamental doctrine studies, and direct relief for families in need.
              </p>
              <p>
                Contributions received through this portal support both monetary logistics and direct physical goods distribution, including rice supply and youth development camps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm">Transparent Accounting</h4>
                <p className="text-xs text-slate-500 mt-1">
                  All M-Pesa STK transactions are automatically cross-checked against PayHero logs.
                </p>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm">Church Leader Clearance</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Physical grain and item contributions are verified by local church leaders.
                </p>
              </div>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm">District Pastor Oversight</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Comprehensive analytics and reports are made accessible churchwise.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: CONTRIBUTION SUMMARY & STATS                                */}
        {/* =================================================================== */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Churchwise Contribution Summary</h3>
              <p className="text-xs text-slate-500">
                Live aggregated contributions from all churches in Mwea West District.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {summaryData?.churchwiseBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2"
                >
                  <h4 className="font-bold text-slate-800 text-lg">{item.churchName}</h4>
                  <p className="text-2xl font-black text-emerald-600">
                    KES {item.totalAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    {item.count} total verified payments
                  </p>
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

        {/* =================================================================== */}
        {/* TAB 7: CONTACT US                                                  */}
        {/* =================================================================== */}
        {activeTab === 'contact' && (
          <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Contact Mission Leadership</h3>
              <p className="text-xs text-slate-500 mt-1">
                Send a direct message to the Treasurer and District Admin.
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Number</label>
                <input
                  type="text"
                  placeholder="0712345678"
                  value={contactMobile}
                  onChange={(e) => setContactMobile(e.target.value)}
                  required
                  className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Message / Inquiry
                </label>
                <textarea
                  rows={4}
                  placeholder="Type your message here..."
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  required
                  className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all"
              >
                Send Message
              </button>
            </form>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 8: DASHBOARD (ADMIN / LEADER PORTAL)                           */}
        {/* =================================================================== */}
        {activeTab === 'dashboard' && currentUser && (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Panel Sidebar */}
            <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2 bg-slate-900 rounded-3xl p-4 text-sm font-semibold text-slate-400 shadow-xl border border-slate-800 h-fit">
              <div className="px-4 py-3 mb-2 border-b border-slate-700">
                <span className="text-[10px] uppercase tracking-widest text-emerald-500 block mb-1">
                  Admin Portal
                </span>
                <p className="text-white truncate">{currentUser.name}</p>
                <p className="text-xs font-normal capitalize">
                  {currentUser.role.replace('_', ' ')}
                </p>
              </div>

              <button
                onClick={() => setAdminPanelTab('overview')}
                className={`text-left px-4 py-3 rounded-xl transition-all ${
                  adminPanelTab === 'overview'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                Overview & Broadcast
              </button>

              {['admin', 'pastor'].includes(currentUser.role) && (
                <button
                  onClick={() => setAdminPanelTab('ingestion')}
                  className={`text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${
                    adminPanelTab === 'ingestion'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>📄 Document Ingestion</span>
                  <span className="text-[10px] bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded">
                    Paste
                  </span>
                </button>
              )}

              {['admin', 'treasurer'].includes(currentUser.role) && (
                <button
                  onClick={() => setAdminPanelTab('payments')}
                  className={`text-left px-4 py-3 rounded-xl transition-all ${
                    adminPanelTab === 'payments'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  PayHero Transactions
                </button>
              )}

              {currentUser.role === 'admin' && (
                <>
                  <button
                    onClick={() => setAdminPanelTab('users')}
                    className={`text-left px-4 py-3 rounded-xl transition-all ${
                      adminPanelTab === 'users'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    User Management
                  </button>
                  <button
                    onClick={() => setAdminPanelTab('config')}
                    className={`text-left px-4 py-3 rounded-xl transition-all ${
                      adminPanelTab === 'config'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    Configurations
                  </button>
                </>
              )}
            </div>

            {/* Right Panel Main Content */}
            <div className="flex-1 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm min-h-[600px]">
              {/* ADMIN PANEL: OVERVIEW */}
              {adminPanelTab === 'overview' && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-4">
                    Leadership Control Center
                  </h3>

                  {/* Broadcast Notice Form */}
                  {['admin', 'pastor'].includes(currentUser.role) && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                        Broadcast District Notice
                      </h4>
                      <form onSubmit={handlePostNotice} className="space-y-3">
                        <input
                          type="text"
                          placeholder="Notice Title"
                          value={noticeTitle}
                          onChange={(e) => setNoticeTitle(e.target.value)}
                          required
                          className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                        <textarea
                          rows={3}
                          placeholder="Notice content..."
                          value={noticeContent}
                          onChange={(e) => setNoticeContent(e.target.value)}
                          required
                          className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-sm"
                        >
                          Broadcast Notice
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Published Notices Display */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                      Published Notices
                    </h4>
                    <div className="space-y-3">
                      {notices.map((n) => (
                        <div
                          key={n._id}
                          className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-1.5"
                        >
                          <h5 className="font-bold text-slate-900 text-sm">{n.title}</h5>
                          <p className="text-sm text-slate-600 leading-relaxed">{n.content}</p>
                          <p className="text-xs text-indigo-600 font-bold mt-2">
                            Posted by: {n.author?.name || 'Leadership'}
                          </p>
                        </div>
                      ))}
                      {notices.length === 0 && (
                        <p className="text-sm text-slate-400">No notices published yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN PANEL: DOCUMENT INGESTION ENGINE */}
              {adminPanelTab === 'ingestion' && ['admin', 'pastor'].includes(currentUser.role) && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-2xl font-black text-slate-900">All-in-One Document Ingestion</h3>
                    <p className="text-xs text-slate-500">
                      Paste a single document containing multiple fundamental beliefs or study of the week lessons. The system will parse them into organized topics automatically.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Paste Raw Document Below:
                    </label>
                    <textarea
                      rows={12}
                      placeholder={`=== TOPIC: Fundamental Belief 1 - The Holy Scriptures ===
Category: Fundamental Belief
Scriptures: 2 Timothy 3:16-17, 2 Peter 1:20-21
Summary: The Holy Scriptures, Old and New Testaments, are the written Word of God given by divine inspiration.

=== TOPIC: Study of the Week - Walking in Unshakeable Faith ===
Category: Study of the Week
Week: Week 38
Scriptures: Hebrews 11:1-6
Summary: This week's study focuses on cultivating resilient faith when facing economic and social challenges.`}
                      value={rawPastedDocument}
                      onChange={(e) => setRawPastedDocument(e.target.value)}
                      className="w-full text-xs p-4 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={handleParseRawDocument}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow transition-all"
                      >
                        ⚡ Parse & Structure Topics
                      </button>
                      <button
                        onClick={() => setRawPastedDocument('')}
                        className="px-4 py-3 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                      >
                        Clear Text
                      </button>
                    </div>
                  </div>

                  {/* Parsed Drafts Preview Table */}
                  {showIngestionPreview && draftParsedTopics.length > 0 && (
                    <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-md space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h4 className="font-bold text-slate-900 text-sm">
                          Extracted Topics ({draftParsedTopics.length})
                        </h4>
                        <button
                          onClick={handleCommitIngestedTopics}
                          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-extrabold text-xs rounded-xl"
                        >
                          Confirm & Publish Selected to Online Portal
                        </button>
                      </div>

                      <div className="space-y-3">
                        {draftParsedTopics.map((draft) => (
                          <div
                            key={draft.id}
                            className={`p-4 rounded-xl border flex items-start space-x-3 ${
                              draft.selected ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={draft.selected}
                              onChange={() => handleToggleDraftSelection(draft.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 text-xs space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{draft.title}</span>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded capitalize">
                                  {draft.category.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-slate-600">{draft.summaryContent}</p>
                              {draft.scriptureReferences.length > 0 && (
                                <p className="text-slate-500 font-semibold">
                                  Scriptures: {draft.scriptureReferences.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ADMIN PANEL: PAYMENTS (PayHero Integration) */}
              {adminPanelTab === 'payments' && ['admin', 'treasurer'].includes(currentUser.role) && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">PayHero Transactions</h3>
                      <p className="text-xs text-slate-500">
                        Live payment verification logs (STK, Paybill, Cart)
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-800 font-bold uppercase text-xs tracking-wider">
                        <tr>
                          <th className="p-4 border-b">User Name</th>
                          <th className="p-4 border-b">Mobile No.</th>
                          <th className="p-4 border-b">Church</th>
                          <th className="p-4 border-b">Amount</th>
                          <th className="p-4 border-b">Method</th>
                          <th className="p-4 border-b">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paymentRecords.map((p) => (
                          <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-900">{p.userName}</td>
                            <td className="p-4 font-medium text-slate-500">{p.mobile}</td>
                            <td className="p-4 font-medium text-slate-700">{p.churchName}</td>
                            <td className="p-4 font-black text-emerald-600">
                              KES {p.amount.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                                {p.method}
                              </span>
                            </td>
                            <td className="p-4">
                              {p.status === 'Success' && (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">
                                  Success
                                </span>
                              )}
                              {p.status === 'Pending' && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ADMIN PANEL: USERS */}
              {adminPanelTab === 'users' && currentUser.role === 'admin' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-4">
                    User & Account Management
                  </h3>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                      Create Church Leader Account
                    </h4>
                    <form
                      onSubmit={handleCreateLeader}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
                    >
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={leaderName}
                        onChange={(e) => setLeaderName(e.target.value)}
                        required
                        className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={leaderEmail}
                        onChange={(e) => setLeaderEmail(e.target.value)}
                        required
                        className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={leaderPassword}
                        onChange={(e) => setLeaderPassword(e.target.value)}
                        required
                        className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={leaderPhone}
                        onChange={(e) => setLeaderPhone(e.target.value)}
                        required
                        className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl"
                      />
                      <select
                        value={leaderChurchId}
                        onChange={(e) => setLeaderChurchId(e.target.value)}
                        required
                        className="text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl"
                      >
                        <option value="">Select Church</option>
                        {churches.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="lg:col-span-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm mt-2"
                      >
                        Create Leader
                      </button>
                    </form>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 mt-6">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-800 font-bold uppercase text-xs tracking-wider">
                        <tr>
                          <th className="p-4 border-b">User</th>
                          <th className="p-4 border-b">Email</th>
                          <th className="p-4 border-b">Role</th>
                          <th className="p-4 border-b">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userList.map((u) => (
                          <tr key={u._id || u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-900">{u.name}</td>
                            <td className="p-4 text-slate-500">{u.email}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase">
                                {u.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleAdminResetPassword(u._id || u.id)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-bold text-xs shadow-sm"
                              >
                                Reset Pass
                              </button>
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
                  <h3 className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-4">
                    District Configurations
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                        Add District Church
                      </h4>
                      <form onSubmit={handleCreateChurch} className="flex flex-col gap-3">
                        <input
                          type="text"
                          placeholder="New Church Name"
                          value={newChurchName}
                          onChange={(e) => setNewChurchName(e.target.value)}
                          required
                          className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm"
                        >
                          Register Church
                        </button>
                      </form>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                        Set Mission Target
                      </h4>
                      <form onSubmit={handleUpdateTargetConfig} className="flex flex-col gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Monetary Target (KES)
                          </label>
                          <input
                            type="number"
                            placeholder="500000"
                            value={newMonetaryTarget}
                            onChange={(e) => setNewMonetaryTarget(Number(e.target.value))}
                            required
                            className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Rice Cash Equivalent (Per Kg)
                          </label>
                          <input
                            type="number"
                            placeholder="150"
                            value={ricePricePerUnit}
                            onChange={(e) => setRicePricePerUnit(Number(e.target.value))}
                            required
                            className="w-full text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-sm mt-1"
                        >
                          Save Configuration
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* AUTHENTICATION MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">
                {authMode === 'login' ? 'Sign In' : 'Register Account'}
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
                <p className="text-xs text-center text-slate-500">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className="text-emerald-600 font-bold underline"
                  >
                    Register
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    required
                    className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Local Church</label>
                  <select
                    value={regChurchId}
                    onChange={(e) => setRegChurchId(e.target.value)}
                    className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="">Select local church...</option>
                    {churches.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    className="w-full text-sm px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl"
                >
                  {loading ? 'Creating...' : 'Register'}
                </button>
                <p className="text-xs text-center text-slate-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-emerald-600 font-bold underline"
                  >
                    Sign In
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="text-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">{activeReceipt.receiptTitle}</h3>
              <p className="text-xs text-emerald-600 font-bold mt-0.5">
                Receipt #: {activeReceipt.receiptNumber}
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Date:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(activeReceipt.date).toLocaleString()}
                </span>
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
                <span className="font-semibold text-slate-800">
                  {activeReceipt.itemName} ({activeReceipt.type})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Quantity / Amount:</span>
                <span className="font-black text-emerald-600 text-sm">
                  {activeReceipt.type === 'cash'
                    ? `KES ${activeReceipt.amountPaid.toLocaleString()}`
                    : `${activeReceipt.quantity} Units`}
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="py-2 px-4 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p>© 2026 Mwea West District Youth Twende Mission Channel & Online Study Portal.</p>
          <p className="text-slate-500">
            PayHero API Channel ID: 12252 • Verified M-Pesa Callback System
          </p>
        </div>
      </footer>
    </div>
  );
}
