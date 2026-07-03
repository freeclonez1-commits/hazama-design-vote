export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'CEO' | 'Designer' | 'Ads' | 'HR' | 'Kế toán';
  permission: 'Admin' | 'Voter' | 'Viewer' | 'Pending';
  createdAt: string;
  updatedAt: string;
}

export interface VoteSession {
  id: string;
  title: string;
  collection: string;
  deadline: string; // ISO datetime string
  maxVotesPerUser: number;
  status: 'draft' | 'review' | 'published' | 'closed' | 'approved' | 'archived';
  approvedWinnerIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Design {
  id: string;
  sessionId: string;
  code: string; // HZ-YYMMDD-XX
  name: string;
  coverImageUrl: string;
  status: 'pending' | 'selected' | 'rejected' | 'need_edit';
  sortOrder: number;
  createdAt: string;
}

export interface Variant {
  id: string;
  designId: string;
  color: string; // lowercase English
  view: 'f' | 'b'; // front or back
  imageUrl: string; // base64 or storage url
  originalFileName: string;
  sortOrder: number;
}

export interface Vote {
  id: string;
  sessionId: string;
  userId: string;
  userEmail: string;
  userNameAtVote: string;
  userRoleAtVote: 'CEO' | 'Designer' | 'Ads' | 'HR' | 'Kế toán';
  selectedDesignIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ImportLog {
  id: string;
  sessionId: string;
  fileName: string;
  status: 'valid' | 'skipped';
  reason: string;
  createdAt: string;
}
