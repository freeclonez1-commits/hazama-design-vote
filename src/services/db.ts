import type { User, VoteSession, Design, Variant, Vote, ImportLog } from '../types/models';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db, isFirebaseEnabled } from './firebaseService';

// Vector SVG T-Shirt generator for visual mockup stability
export function getMockTshirtSvg(color: string, view: 'f' | 'b', code: string): string {
  const tshirtPath = "M 50 15 L 65 18 C 68 20 70 24 72 27 L 78 35 L 70 41 L 66 38 L 66 85 C 66 88 64 90 60 90 L 40 90 C 36 90 34 88 34 85 L 34 38 L 30 41 L 22 35 L 28 27 C 30 24 32 20 35 18 Z";
  
  const colorsMap: Record<string, string> = {
    black: '#1C1C1E',
    white: '#F5F5F7',
    grey: '#8E8E93',
    navy: '#1D2E44',
    beige: '#E5D3B3',
    red: '#FF3B30',
    blue: '#007AFF',
    green: '#34C759',
    brown: '#A2845E',
    pink: '#FF2D55',
    purple: '#AF52DE',
    yellow: '#FFCC00',
    orange: '#FF9500'
  };

  const fillColor = colorsMap[color] || '#E5E5EA';
  const strokeColor = color === 'white' ? '#C7C7CC' : '#48484A';
  const textColor = (color === 'white' || color === 'beige' || color === 'yellow') ? '#1D1D1F' : '#FFFFFF';
  const textLabel = view === 'f' ? 'Mặt trước (Front)' : 'Mặt sau (Back)';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <rect width="100" height="100" fill="#F2F2F7" rx="16"/>
      <!-- Shadow -->
      <path d="${tshirtPath}" fill="rgba(0,0,0,0.1)" transform="translate(1, 2)"/>
      <!-- Tshirt Body -->
      <path d="${tshirtPath}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5"/>
      <!-- Neckline -->
      <path d="M 43 15 C 43 19 57 19 57 15 Z" fill="#F2F2F7" stroke="${strokeColor}" stroke-width="1.5"/>
      <!-- Graphic/Print Design mockup -->
      <g transform="translate(0, 5)">
        <rect x="42" y="32" width="16" height="18" fill="rgba(0,0,0,0.06)" rx="2"/>
        <text x="50" y="42" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="4.5" font-weight="800" text-anchor="middle">HAZAMA</text>
        <circle cx="50" cy="46" r="1.5" fill="${textColor}" opacity="0.6"/>
      </g>
      <!-- Label -->
      <rect x="25" y="66" width="50" height="14" fill="rgba(0,0,0,0.2)" rx="7"/>
      <text x="50" y="73" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="4.5" font-weight="600" text-anchor="middle">${code}</text>
      <text x="50" y="78" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="3" text-anchor="middle" opacity="0.9">${textLabel}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Key Constants for local storage
const KEYS = {
  USERS: 'hazama_users',
  SESSIONS: 'hazama_sessions',
  DESIGNS: 'hazama_designs',
  VARIANTS: 'hazama_variants',
  VOTES: 'hazama_votes',
  IMPORT_LOGS: 'hazama_import_logs'
};

// Helper utilities for local storage fetch/save
const getStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    // Corrupted localStorage — return default safely
    return defaultValue;
  }
};

const setStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      console.error('⚠️ localStorage quota exceeded. Ảnh quá lớn hoặc quá nhiều file được upload. Hãy xóa bớt dữ liệu hoặc dùng Firebase Storage.');
      throw new Error('QUOTA_EXCEEDED');
    }
    throw e;
  }
};

// Pre-populate data if empty
export async function initializeMockData(): Promise<void> {
  const users = getStorage<User[]>(KEYS.USERS, []);
  
  // Force a one-time database reset if they have old vector mock data
  const designs = getStorage<Design[]>(KEYS.DESIGNS, []);
  const oldDesignExists = designs.some(d => d.id === 'design_s1_01' && d.name !== 'Hazama Breakout Classic Tee');
  
  if (oldDesignExists) {
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.SESSIONS);
    localStorage.removeItem(KEYS.DESIGNS);
    localStorage.removeItem(KEYS.VARIANTS);
    localStorage.removeItem(KEYS.VOTES);
    localStorage.removeItem(KEYS.IMPORT_LOGS);
    window.location.reload();
    return;
  }

  if (users.length > 0) return; // already initialized

  const now = new Date().toISOString();
  const initialVariants: Variant[] = [];

  // Create initial users
  const initialUsers: User[] = [
    {
      uid: 'admin_1',
      email: 'admin@hazama.com',
      name: 'Nguyễn Minh Quân (Admin)',
      role: 'Designer',
      permission: 'Admin',
      createdAt: now,
      updatedAt: now
    },
    {
      uid: 'ceo_1',
      email: 'ceo@hazama.com',
      name: 'Trần Việt Anh',
      role: 'CEO',
      permission: 'Voter',
      createdAt: now,
      updatedAt: now
    },
    {
      uid: 'user_ads',
      email: 'ads@gmail.com',
      name: 'Lê Hoàng Hải',
      role: 'Ads',
      permission: 'Voter',
      createdAt: now,
      updatedAt: now
    },
    {
      uid: 'user_hr',
      email: 'hr@gmail.com',
      name: 'Phạm Thu Thảo',
      role: 'HR',
      permission: 'Voter',
      createdAt: now,
      updatedAt: now
    },
    {
      uid: 'user_kt',
      email: 'ke-toan@gmail.com',
      name: 'Nguyễn Thị Hương',
      role: 'Kế toán',
      permission: 'Voter',
      createdAt: now,
      updatedAt: now
    }
  ];

  const addVariants = (designId: string, code: string, color: string, addBack = true) => {
    const vfId = `${designId}_${color}_f`;
    const fUrl = getMockTshirtSvg(color, 'f', code);
    initialVariants.push({
      id: vfId,
      designId,
      color,
      view: 'f',
      imageUrl: fUrl,
      originalFileName: `${code.slice(-2)}-${color}-f.png`,
      sortOrder: initialVariants.length
    });

    if (addBack) {
      const vbId = `${designId}_${color}_b`;
      const bUrl = getMockTshirtSvg(color, 'b', code);
      initialVariants.push({
        id: vbId,
        designId,
        color,
        view: 'b',
        imageUrl: bUrl,
        originalFileName: `${code.slice(-2)}-${color}-b.png`,
        sortOrder: initialVariants.length
      });
    }
  };

  // Create 3 sessions: Published, Draft, Closed
  const d1 = new Date();
  d1.setDate(d1.getDate() + 3); // 3 days remaining

  const d2 = new Date();
  d2.setDate(d2.getDate() + 7); // 7 days remaining

  const d3 = new Date();
  d3.setDate(d3.getDate() - 1); // Closed yesterday

  const initialSessions: VoteSession[] = [
    {
      id: 'session_summer_2026',
      title: 'Bình chọn BST T-Shirt Basic Summer 2026',
      collection: 'Summer Basic',
      deadline: d1.toISOString(),
      maxVotesPerUser: 3,
      status: 'published',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'session_winter_2026',
      title: 'Bình chọn Thiết kế Áo nỉ Winter Cozy 2026',
      collection: 'Cozy Winter',
      deadline: d2.toISOString(),
      maxVotesPerUser: 2,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'session_spring_2026',
      title: 'Bình chọn BST Polo Spring Classy 2026',
      collection: 'Spring Classy',
      deadline: d3.toISOString(),
      maxVotesPerUser: 2,
      status: 'closed',
      createdAt: now,
      updatedAt: now
    }
  ];

  // Create designs & variants for Session 1 (Summer 2026)
  const initialDesigns: Design[] = [
    {
      id: 'design_s1_01',
      sessionId: 'session_summer_2026',
      code: 'HZ-260701-01',
      name: 'Hazama Breakout Classic Tee',
      coverImageUrl: '',
      status: 'pending',
      sortOrder: 0,
      createdAt: now
    },
    {
      id: 'design_s1_02',
      sessionId: 'session_summer_2026',
      code: 'HZ-260701-02',
      name: 'Hazama Chrome Olive Tee',
      coverImageUrl: '',
      status: 'pending',
      sortOrder: 1,
      createdAt: now
    },
    {
      id: 'design_s1_03',
      sessionId: 'session_summer_2026',
      code: 'HZ-260701-03',
      name: 'Hazama Breakout Tee',
      coverImageUrl: '',
      status: 'pending',
      sortOrder: 2,
      createdAt: now
    },
    {
      id: 'design_s1_04',
      sessionId: 'session_summer_2026',
      code: 'HZ-260701-04',
      name: 'Hazama Baby Burger Tee',
      coverImageUrl: '',
      status: 'pending',
      sortOrder: 3,
      createdAt: now
    }
  ];

  initialVariants.push(...[
    // Design 01: Hazama Breakout Classic Tee (Black & White)
    {
      id: 'design_s1_01_black_f',
      designId: 'design_s1_01',
      color: 'black',
      view: 'f',
      imageUrl: 'https://bizweb.dktcdn.net/thumb/1024x1024/100/558/373/products/d6656e0f-3903-461e-a078-f201d44db01c.jpg?v=1782112587603',
      originalFileName: 'breakout-classic-black-f.jpg',
      sortOrder: 0
    },
    {
      id: 'design_s1_01_black_b',
      designId: 'design_s1_01',
      color: 'black',
      view: 'b',
      imageUrl: 'https://bizweb.dktcdn.net/thumb/1024x1024/100/558/373/products/8db0100e-8b7d-4965-901e-78a1c9b95873.jpg?v=1782112587603',
      originalFileName: 'breakout-classic-black-b.jpg',
      sortOrder: 1
    },
    {
      id: 'design_s1_01_white_f',
      designId: 'design_s1_01',
      color: 'white',
      view: 'f',
      imageUrl: 'https://bizweb.dktcdn.net/thumb/1024x1024/100/558/373/products/33a852d1-f9db-4352-81be-d3b5a42570e2.jpg?v=1782098751927',
      originalFileName: 'breakout-classic-white-f.jpg',
      sortOrder: 2
    },
    {
      id: 'design_s1_01_white_b',
      designId: 'design_s1_01',
      color: 'white',
      view: 'b',
      imageUrl: 'https://bizweb.dktcdn.net/thumb/1024x1024/100/558/373/products/e95ea4b9-633f-4964-a082-5661741a1f5d.jpg?v=1782098751927',
      originalFileName: 'breakout-classic-white-b.jpg',
      sortOrder: 3
    },

    // Design 02: Hazama Chrome Olive Tee (Black)
    {
      id: 'design_s1_02_black_f',
      designId: 'design_s1_02',
      color: 'black',
      view: 'f',
      imageUrl: 'https://bizweb.dktcdn.net/thumb/1024x1024/100/558/373/products/90bdb4ea-f45e-40ac-b387-fd227bb8eaca.jpg?v=1782099578973',
      originalFileName: 'chrome-olive-black-f.jpg',
      sortOrder: 4
    },
    {
      id: 'design_s1_02_black_b',
      designId: 'design_s1_02',
      color: 'black',
      view: 'b',
      imageUrl: 'https://bizweb.dktcdn.net/thumb/1024x1024/100/558/373/products/4fc9826a-c538-4cc9-b3fa-04ebbf4f3af0.jpg?v=1782099578973',
      originalFileName: 'chrome-olive-black-b.jpg',
      sortOrder: 5
    },

    // Design 03: Hazama Breakout Tee (Black)
    {
      id: 'design_s1_03_black_f',
      designId: 'design_s1_03',
      color: 'black',
      view: 'f',
      imageUrl: 'https://bizweb.dktcdn.net/thumb/1024x1024/100/558/373/products/db2f504b-1358-451a-95ec-dfc13f8fa8bd.jpg?v=1782098216907',
      originalFileName: 'breakout-black-f.jpg',
      sortOrder: 6
    },
    {
      id: 'design_s1_03_black_b',
      designId: 'design_s1_03',
      color: 'black',
      view: 'b',
      imageUrl: 'https://bizweb.dktcdn.net/thumb/1024x1024/100/558/373/products/c76bfd3d-f59f-4a78-b9d7-f4777112a61e.jpg?v=1782098216907',
      originalFileName: 'breakout-black-b.jpg',
      sortOrder: 7
    },

    // Design 04: Hazama Baby Burger Tee (Black)
    {
      id: 'design_s1_04_black_f',
      designId: 'design_s1_04',
      color: 'black',
      view: 'f',
      imageUrl: 'https://bizweb.dktcdn.net/thumb/1024x1024/100/558/373/products/797a1808-24c3-4403-b44a-113d702cace0.jpg?v=1781840010140',
      originalFileName: 'baby-burger-black-f.jpg',
      sortOrder: 8
    },
    {
      id: 'design_s1_04_black_b',
      designId: 'design_s1_04',
      color: 'black',
      view: 'b',
      imageUrl: 'https://bizweb.dktcdn.net/thumb/1024x1024/100/558/373/products/3a48fc1e-da56-4358-aebf-18b01083cb3c.jpg?v=1781840010140',
      originalFileName: 'baby-burger-black-b.jpg',
      sortOrder: 9
    }
  ] as Variant[]);

  // Update cover images based on first front variant
  initialDesigns.forEach(d => {
    const firstFront = initialVariants.find(v => v.designId === d.id && v.view === 'f');
    if (firstFront) {
      d.coverImageUrl = firstFront.imageUrl;
    }
  });

  // Designs for Session 3 (Spring 2026 - Closed)
  const initialDesignsS3: Design[] = [
    {
      id: 'design_s3_01',
      sessionId: 'session_spring_2026',
      code: 'HZ-260210-01',
      name: 'Polo Classic Slim',
      coverImageUrl: '',
      status: 'selected',
      sortOrder: 0,
      createdAt: now
    },
    {
      id: 'design_s3_02',
      sessionId: 'session_spring_2026',
      code: 'HZ-260210-02',
      name: 'Polo Sport Zip',
      coverImageUrl: '',
      status: 'pending',
      sortOrder: 1,
      createdAt: now
    }
  ];

  addVariants('design_s3_01', 'HZ-260210-01', 'navy');
  addVariants('design_s3_01', 'HZ-260210-01', 'white');
  addVariants('design_s3_02', 'HZ-260210-02', 'grey');
  addVariants('design_s3_02', 'HZ-260210-02', 'black');

  initialDesignsS3.forEach(d => {
    const firstFront = initialVariants.find(v => v.designId === d.id && v.view === 'f');
    if (firstFront) {
      d.coverImageUrl = firstFront.imageUrl;
    }
  });

  // Create initial votes for Summer 2026 session to make charts/leaderboards look amazing
  const initialVotes: Vote[] = [
    {
      id: 'vote_v1',
      sessionId: 'session_summer_2026',
      userId: 'user_ceo',
      userEmail: 'ceo@hazama.com',
      userNameAtVote: 'Trần Việt Anh',
      userRoleAtVote: 'CEO',
      selectedDesignIds: ['design_s1_01', 'design_s1_02'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'vote_v2',
      sessionId: 'session_summer_2026',
      userId: 'user_ads',
      userEmail: 'ads@gmail.com',
      userNameAtVote: 'Lê Hoàng Hải',
      userRoleAtVote: 'Ads',
      selectedDesignIds: ['design_s1_01', 'design_s1_03'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'vote_v3',
      sessionId: 'session_summer_2026',
      userId: 'user_hr',
      userEmail: 'hr@gmail.com',
      userNameAtVote: 'Phạm Thu Thảo',
      userRoleAtVote: 'HR',
      selectedDesignIds: ['design_s1_02', 'design_s1_03'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'vote_v4',
      sessionId: 'session_summer_2026',
      userId: 'user_kt',
      userEmail: 'ke-toan@gmail.com',
      userNameAtVote: 'Nguyễn Thị Hương',
      userRoleAtVote: 'Kế toán',
      selectedDesignIds: ['design_s1_01', 'design_s1_02', 'design_s1_03'],
      createdAt: now,
      updatedAt: now
    },
    // Adding extra voters to simulate analytics
    {
      id: 'vote_v5',
      sessionId: 'session_summer_2026',
      userId: 'mock_voter_1',
      userEmail: 'voter1@gmail.com',
      userNameAtVote: 'Vũ Minh Lâm',
      userRoleAtVote: 'Designer',
      selectedDesignIds: ['design_s1_01', 'design_s1_02'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'vote_v6',
      sessionId: 'session_summer_2026',
      userId: 'mock_voter_2',
      userEmail: 'voter2@gmail.com',
      userNameAtVote: 'Phan Quốc Khánh',
      userRoleAtVote: 'Designer',
      selectedDesignIds: ['design_s1_03'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'vote_v7',
      sessionId: 'session_summer_2026',
      userId: 'mock_voter_3',
      userEmail: 'voter3@gmail.com',
      userNameAtVote: 'Đinh Tiến Đạt',
      userRoleAtVote: 'Ads',
      selectedDesignIds: ['design_s1_01'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'vote_v8',
      sessionId: 'session_summer_2026',
      userId: 'mock_voter_4',
      userEmail: 'voter4@gmail.com',
      userNameAtVote: 'Đào Tuyết Mai',
      userRoleAtVote: 'HR',
      selectedDesignIds: ['design_s1_02', 'design_s1_03'],
      createdAt: now,
      updatedAt: now
    }
  ];

  // Save all pre-populated values
  setStorage(KEYS.USERS, initialUsers);
  setStorage(KEYS.SESSIONS, initialSessions);
  setStorage(KEYS.DESIGNS, [...initialDesigns, ...initialDesignsS3]);
  setStorage(KEYS.VARIANTS, initialVariants);
  setStorage(KEYS.VOTES, initialVotes);
  setStorage(KEYS.IMPORT_LOGS, []);

  // Seed Firestore database if enabled and empty
  if (isFirebaseEnabled && db) {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      if (usersSnap.empty) {
        console.log("🔥 Firestore database is empty. Seeding initial data...");
        for (const u of initialUsers) {
          await setDoc(doc(db, 'users', u.uid), u);
        }
        for (const s of initialSessions) {
          await setDoc(doc(db, 'vote_sessions', s.id), s);
        }
        const allDesigns = [...initialDesigns, ...initialDesignsS3];
        for (const d of allDesigns) {
          await setDoc(doc(db, 'designs', d.id), d);
        }
        for (const v of initialVariants) {
          await setDoc(doc(db, 'variants', v.id), v);
        }
        for (const vt of initialVotes) {
          await setDoc(doc(db, 'votes', vt.id), vt);
        }
        console.log("🔥 Firestore seeding complete!");
      }
    } catch (e) {
      console.error("🔥 Error seeding Firestore:", e);
    }
  }
}

// ----------------------------------------------------
// DATABASE API (Firestore simulation)
// ----------------------------------------------------

export const dbService = {
  // Users APIs
  async getUser(uid: string): Promise<User | null> {
    if (isFirebaseEnabled && db) {
      try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        return docSnap.exists() ? (docSnap.data() as User) : null;
      } catch (e) {
        console.error("Firestore getUser error:", e);
      }
    }
    const users = getStorage<User[]>(KEYS.USERS, []);
    return users.find(u => u.uid === uid) || null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    if (isFirebaseEnabled && db) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          return snap.docs[0].data() as User;
        }
        return null;
      } catch (e) {
        console.error("Firestore getUserByEmail error:", e);
      }
    }
    const users = getStorage<User[]>(KEYS.USERS, []);
    return users.find(u => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
  },

  async saveUser(user: User): Promise<User> {
    const now = new Date().toISOString();
    const updatedUser = { ...user, updatedAt: now };

    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'users', user.uid), updatedUser);
        return updatedUser;
      } catch (e) {
        console.error("Firestore saveUser error:", e);
      }
    }

    const users = getStorage<User[]>(KEYS.USERS, []);
    const idx = users.findIndex(u => u.uid === user.uid);
    if (idx >= 0) {
      users[idx] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    setStorage(KEYS.USERS, users);
    return updatedUser;
  },

  async listUsers(): Promise<User[]> {
    if (isFirebaseEnabled && db) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        return snap.docs.map(d => d.data() as User);
      } catch (e) {
        console.error("Firestore listUsers error:", e);
      }
    }
    return getStorage<User[]>(KEYS.USERS, []);
  },

  // Sessions APIs
  async listSessions(): Promise<VoteSession[]> {
    if (isFirebaseEnabled && db) {
      try {
        const snap = await getDocs(collection(db, 'vote_sessions'));
        return snap.docs.map(d => d.data() as VoteSession);
      } catch (e) {
        console.error("Firestore listSessions error:", e);
      }
    }
    return getStorage<VoteSession[]>(KEYS.SESSIONS, []);
  },

  async getSession(id: string): Promise<VoteSession | null> {
    if (isFirebaseEnabled && db) {
      try {
        const docSnap = await getDoc(doc(db, 'vote_sessions', id));
        return docSnap.exists() ? (docSnap.data() as VoteSession) : null;
      } catch (e) {
        console.error("Firestore getSession error:", e);
      }
    }
    const sessions = getStorage<VoteSession[]>(KEYS.SESSIONS, []);
    return sessions.find(s => s.id === id) || null;
  },

  async saveSession(session: VoteSession): Promise<VoteSession> {
    const now = new Date().toISOString();
    const updated = { ...session, updatedAt: now };

    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'vote_sessions', session.id), updated);
        return updated;
      } catch (e) {
        console.error("Firestore saveSession error:", e);
      }
    }

    const sessions = getStorage<VoteSession[]>(KEYS.SESSIONS, []);
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = updated;
    } else {
      sessions.push(updated);
    }
    setStorage(KEYS.SESSIONS, sessions);
    return updated;
  },

  async deleteSession(id: string): Promise<void> {
    if (isFirebaseEnabled && db) {
      try {
        await deleteDoc(doc(db, 'vote_sessions', id));
        
        // cascade deletes
        const designsSnap = await getDocs(query(collection(db, 'designs'), where('sessionId', '==', id)));
        for (const dDoc of designsSnap.docs) {
          await deleteDoc(dDoc.ref);
          const variantsSnap = await getDocs(query(collection(db, 'variants'), where('designId', '==', dDoc.id)));
          for (const vDoc of variantsSnap.docs) {
            await deleteDoc(vDoc.ref);
          }
        }
        const votesSnap = await getDocs(query(collection(db, 'votes'), where('sessionId', '==', id)));
        for (const vDoc of votesSnap.docs) {
          await deleteDoc(vDoc.ref);
        }
        const logsSnap = await getDocs(query(collection(db, 'import_logs'), where('sessionId', '==', id)));
        for (const lDoc of logsSnap.docs) {
          await deleteDoc(lDoc.ref);
        }
        return;
      } catch (e) {
        console.error("Firestore deleteSession error:", e);
      }
    }

    // Delete session
    const sessions = getStorage<VoteSession[]>(KEYS.SESSIONS, []);
    setStorage(KEYS.SESSIONS, sessions.filter(s => s.id !== id));
    
    // Delete related designs
    const designs = getStorage<Design[]>(KEYS.DESIGNS, []);
    const sessionDesigns = designs.filter(d => d.sessionId === id);
    const sessionDesignIds = sessionDesigns.map(d => d.id);
    setStorage(KEYS.DESIGNS, designs.filter(d => d.sessionId !== id));

    // Delete related variants
    const variants = getStorage<Variant[]>(KEYS.VARIANTS, []);
    setStorage(KEYS.VARIANTS, variants.filter(v => !sessionDesignIds.includes(v.designId)));

    // Delete related votes
    const votes = getStorage<Vote[]>(KEYS.VOTES, []);
    setStorage(KEYS.VOTES, votes.filter(v => v.sessionId !== id));

    // Delete related import logs
    const logs = getStorage<ImportLog[]>(KEYS.IMPORT_LOGS, []);
    setStorage(KEYS.IMPORT_LOGS, logs.filter(l => l.sessionId !== id));
  },

  // Designs APIs
  async listDesigns(sessionId: string): Promise<Design[]> {
    if (isFirebaseEnabled && db) {
      try {
        const q = query(collection(db, 'designs'), where('sessionId', '==', sessionId));
        const snap = await getDocs(q);
        return snap.docs
          .map(d => d.data() as Design)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      } catch (e) {
        console.error("Firestore listDesigns error:", e);
      }
    }

    const designs = getStorage<Design[]>(KEYS.DESIGNS, []);
    return designs
      .filter(d => d.sessionId === sessionId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async saveDesigns(newDesigns: Design[]): Promise<void> {
    if (isFirebaseEnabled && db) {
      try {
        for (const d of newDesigns) {
          await setDoc(doc(db, 'designs', d.id), d);
        }
        return;
      } catch (e) {
        console.error("Firestore saveDesigns error:", e);
      }
    }

    const designs = getStorage<Design[]>(KEYS.DESIGNS, []);
    newDesigns.forEach(nd => {
      const idx = designs.findIndex(d => d.id === nd.id);
      if (idx >= 0) {
        designs[idx] = nd;
      } else {
        designs.push(nd);
      }
    });
    setStorage(KEYS.DESIGNS, designs);
  },

  async saveDesign(design: Design): Promise<Design> {
    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'designs', design.id), design);
        return design;
      } catch (e) {
        console.error("Firestore saveDesign error:", e);
      }
    }

    const designs = getStorage<Design[]>(KEYS.DESIGNS, []);
    const idx = designs.findIndex(d => d.id === design.id);
    if (idx >= 0) {
      designs[idx] = design;
    } else {
      designs.push(design);
    }
    setStorage(KEYS.DESIGNS, designs);
    return design;
  },

  async deleteDesign(designId: string): Promise<void> {
    if (isFirebaseEnabled && db) {
      try {
        await deleteDoc(doc(db, 'designs', designId));
        const variantsSnap = await getDocs(query(collection(db, 'variants'), where('designId', '==', designId)));
        for (const vDoc of variantsSnap.docs) {
          await deleteDoc(vDoc.ref);
        }
        return;
      } catch (e) {
        console.error("Firestore deleteDesign error:", e);
      }
    }

    const designs = getStorage<Design[]>(KEYS.DESIGNS, []);
    setStorage(KEYS.DESIGNS, designs.filter(d => d.id !== designId));

    const variants = getStorage<Variant[]>(KEYS.VARIANTS, []);
    setStorage(KEYS.VARIANTS, variants.filter(v => v.designId !== designId));
  },

  // Variants APIs
  async listVariants(designId: string): Promise<Variant[]> {
    if (isFirebaseEnabled && db) {
      try {
        const q = query(collection(db, 'variants'), where('designId', '==', designId));
        const snap = await getDocs(q);
        return snap.docs
          .map(d => d.data() as Variant)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      } catch (e) {
        console.error("Firestore listVariants error:", e);
      }
    }

    const variants = getStorage<Variant[]>(KEYS.VARIANTS, []);
    return variants
      .filter(v => v.designId === designId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async listAllVariants(): Promise<Variant[]> {
    if (isFirebaseEnabled && db) {
      try {
        const snap = await getDocs(collection(db, 'variants'));
        return snap.docs.map(d => d.data() as Variant);
      } catch (e) {
        console.error("Firestore listAllVariants error:", e);
      }
    }
    return getStorage<Variant[]>(KEYS.VARIANTS, []);
  },

  async saveVariants(newVariants: Variant[]): Promise<void> {
    if (isFirebaseEnabled && db) {
      try {
        for (const v of newVariants) {
          await setDoc(doc(db, 'variants', v.id), v);
        }
        return;
      } catch (e) {
        console.error("Firestore saveVariants error:", e);
      }
    }

    const variants = getStorage<Variant[]>(KEYS.VARIANTS, []);
    newVariants.forEach(nv => {
      const idx = variants.findIndex(v => v.id === nv.id);
      if (idx >= 0) {
        variants[idx] = nv;
      } else {
        variants.push(nv);
      }
    });
    setStorage(KEYS.VARIANTS, variants);
  },

  async deleteVariant(variantId: string): Promise<void> {
    if (isFirebaseEnabled && db) {
      try {
        await deleteDoc(doc(db, 'variants', variantId));
        return;
      } catch (e) {
        console.error("Firestore deleteVariant error:", e);
      }
    }

    const variants = getStorage<Variant[]>(KEYS.VARIANTS, []);
    setStorage(KEYS.VARIANTS, variants.filter(v => v.id !== variantId));
  },

  // Votes APIs
  async listVotes(sessionId: string): Promise<Vote[]> {
    if (isFirebaseEnabled && db) {
      try {
        const q = query(collection(db, 'votes'), where('sessionId', '==', sessionId));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as Vote);
      } catch (e) {
        console.error("Firestore listVotes error:", e);
      }
    }
    const votes = getStorage<Vote[]>(KEYS.VOTES, []);
    return votes.filter(v => v.sessionId === sessionId);
  },

  async saveVote(vote: Vote): Promise<Vote> {
    const now = new Date().toISOString();
    
    if (isFirebaseEnabled && db) {
      try {
        const q = query(
          collection(db, 'votes'),
          where('sessionId', '==', vote.sessionId),
          where('userEmail', '==', vote.userEmail.toLowerCase())
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docRef = snap.docs[0].ref;
          const updated = { ...vote, id: docRef.id, updatedAt: now };
          await setDoc(docRef, updated);
          return updated;
        } else {
          const newId = `vote_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          const created = { ...vote, id: newId, createdAt: now, updatedAt: now };
          await setDoc(doc(db, 'votes', newId), created);
          return created;
        }
      } catch (e) {
        console.error("Firestore saveVote error:", e);
      }
    }

    const votes = getStorage<Vote[]>(KEYS.VOTES, []);
    const idx = votes.findIndex(v => v.sessionId === vote.sessionId && v.userEmail.toLowerCase() === vote.userEmail.toLowerCase());
    
    let finalVote: Vote;
    if (idx >= 0) {
      finalVote = { ...vote, updatedAt: now };
      votes[idx] = finalVote;
    } else {
      finalVote = { ...vote, id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, createdAt: now, updatedAt: now };
      votes.push(finalVote);
    }
    setStorage(KEYS.VOTES, votes);
    return finalVote;
  },

  subscribeVotes(sessionId: string, callback: (votes: Vote[]) => void): () => void {
    if (isFirebaseEnabled && db) {
      try {
        const q = query(collection(db, 'votes'), where('sessionId', '==', sessionId));
        const unsubscribe = onSnapshot(q, (snap) => {
          const votes = snap.docs.map(d => d.data() as Vote);
          callback(votes);
        }, (err) => {
          console.error("Firestore onSnapshot error in subscribeVotes:", err);
        });
        return unsubscribe;
      } catch (e) {
        console.error("Firestore subscribeVotes subscription error:", e);
        // Fall through to localStorage polling below
      }
    }

    // Fallback: local storage polling (3s)
    let lastVotesStr = '';
    const poll = () => {
      const votes = getStorage<Vote[]>(KEYS.VOTES, []);
      const sessionVotes = votes.filter(v => v.sessionId === sessionId);
      const str = JSON.stringify(sessionVotes);
      if (str !== lastVotesStr) {
        lastVotesStr = str;
        callback(sessionVotes);
      }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  },

  // Xóa toàn bộ votes của 1 session — dùng khi reset/công bố lại từ đầu
  async clearVotesBySession(sessionId: string): Promise<void> {
    if (isFirebaseEnabled && db) {
      try {
        const q = query(collection(db, 'votes'), where('sessionId', '==', sessionId));
        const snap = await getDocs(q);
        const deletes = snap.docs.map(d => deleteDoc(doc(db!, 'votes', d.id)));
        await Promise.all(deletes);
        return;
      } catch (e) {
        console.error('Firestore clearVotesBySession error:', e);
        // Fall through to localStorage fallback
      }
    }
    // LocalStorage fallback
    const all = getStorage<Vote[]>(KEYS.VOTES, []);
    setStorage(KEYS.VOTES, all.filter(v => v.sessionId !== sessionId));
  },

  // Import Logs APIs (Lấy tối đa 20 log mới nhất)
  async listImportLogs(sessionId: string): Promise<ImportLog[]> {
    if (isFirebaseEnabled && db) {
      try {
        const q = query(collection(db, 'import_logs'), where('sessionId', '==', sessionId));
        const snap = await getDocs(q);
        return snap.docs
          .map(d => d.data() as ImportLog)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 20);
      } catch (e) {
        console.error("Firestore listImportLogs error:", e);
      }
    }

    const logs = getStorage<ImportLog[]>(KEYS.IMPORT_LOGS, []);
    return logs
      .filter(l => l.sessionId === sessionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);
  },

  async saveImportLogs(newLogs: ImportLog[]): Promise<void> {
    if (isFirebaseEnabled && db) {
      try {
        for (const log of newLogs) {
          await setDoc(doc(db, 'import_logs', log.id), log);
        }
        return;
      } catch (e) {
        console.error("Firestore saveImportLogs error:", e);
      }
    }

    const logs = getStorage<ImportLog[]>(KEYS.IMPORT_LOGS, []);
    setStorage(KEYS.IMPORT_LOGS, [...newLogs, ...logs]);
  },

  // Reset entire database to pre-populated mock state
  async resetDatabase(): Promise<void> {
    if (isFirebaseEnabled && db) {
      try {
        // Bypassed Firestore deletion for safety
        console.log("Firestore reset bypassed. LocalStorage cleared.");
      } catch (e) {}
    }
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.SESSIONS);
    localStorage.removeItem(KEYS.DESIGNS);
    localStorage.removeItem(KEYS.VARIANTS);
    localStorage.removeItem(KEYS.VOTES);
    localStorage.removeItem(KEYS.IMPORT_LOGS);
    await initializeMockData(); // Fixed: must await to ensure data is ready before callers proceed
  }
};
