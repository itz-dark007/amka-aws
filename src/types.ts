export type UrgencyLevel = 'urgent' | 'normal' | 'info';

export type NoticeStatus = 'published' | 'draft' | 'scheduled' | 'archived';

export type UserRole = 'super_admin' | 'department_head' | 'staff_officer' | 'viewer';

export interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'doc';
  mimeType: string;
  size: number;
  url: string; // Base64 data URI or HTTP URL
  uploadedAt: string;
}

export interface NoticeAuthor {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
}

export interface Notice {
  id: string;
  referenceNumber: string; // e.g., "AMKA/ADM/2026/042"
  title: string;
  content: string; // Markdown / rich text
  summary?: string; // Executive summary or AI generated TL;DR
  department: string;
  category: string;
  tags: string[];
  urgency: UrgencyLevel;
  status: NoticeStatus;
  isPinned: boolean;
  targetAudience: string[];
  author: NoticeAuthor;
  attachments: Attachment[];
  publishDate: string; // ISO String
  expiryDate: string | null; // ISO String or null
  viewsCount: number;
  acknowledgementsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  color: string;
  icon: string;
  contactEmail: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  designation: string;
  token?: string;
}

export interface AuditEntry {
  id: string;
  noticeId: string;
  noticeTitle: string;
  action: 'create' | 'update' | 'delete' | 'pin' | 'unpin' | 'archive' | 'restore';
  performedBy: string;
  role: string;
  timestamp: string;
  details?: string;
}

export type ParentStatus = 'pending' | 'approved' | 'rejected';

export interface ParentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  studentRollNo: string;
  studentName: string;
  relationship: 'Mother' | 'Father' | 'Guardian';
  department: string;
  status: ParentStatus;
  rejectionReason?: string;
  registeredAt: string;
  approvedAt?: string;
  approvedBy?: string;
  token?: string;
}

export type ViewMode = 'gateway' | 'admin' | 'kiosk' | 'parent';

