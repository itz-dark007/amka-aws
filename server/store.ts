import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { Notice, AuditEntry, User, Department, ParentUser } from '../src/types';
import { INITIAL_NOTICES, INITIAL_DEPARTMENTS, DEMO_USERS, INITIAL_AUDIT_LOGS, INITIAL_PARENTS } from './data';
import {
  isDynamoConfigured,
  ensureTable,
  putNoticeToDynamo,
  deleteNoticeFromDynamo,
  fetchAllNoticesFromDynamo,
  putAuditToDynamo,
  fetchAllAuditsFromDynamo,
  putParentToDynamo,
  fetchAllParentsFromDynamo,
} from './dynamodb';

const DATA_DIR = path.join(process.cwd(), 'data');
const NOTICES_FILE = path.join(DATA_DIR, 'notices.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');
const PARENTS_FILE = path.join(DATA_DIR, 'parents.json');

class NoticeStore {
  private notices: Notice[] = [];
  private auditLogs: AuditEntry[] = [];
  private parents: ParentUser[] = [];
  private sseClients: Set<Response> = new Set();
  private departments: Department[] = INITIAL_DEPARTMENTS;
  private users: User[] = DEMO_USERS;
  private dynamoSynced = false;

  constructor() {
    this.initStore();
  }

  private initStore() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(NOTICES_FILE)) {
        const raw = fs.readFileSync(NOTICES_FILE, 'utf-8');
        this.notices = JSON.parse(raw);
      } else {
        this.notices = [...INITIAL_NOTICES];
        this.saveNoticesToDisk();
      }

      if (fs.existsSync(AUDIT_FILE)) {
        const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
        this.auditLogs = JSON.parse(raw);
      } else {
        this.auditLogs = [...INITIAL_AUDIT_LOGS];
        this.saveAuditToDisk();
      }

      if (fs.existsSync(PARENTS_FILE)) {
        const raw = fs.readFileSync(PARENTS_FILE, 'utf-8');
        this.parents = JSON.parse(raw);
      } else {
        this.parents = [...INITIAL_PARENTS];
        this.saveParentsToDisk();
      }

      // Check auto-expiry on startup and setup interval
      this.checkExpiredNotices();
      setInterval(() => this.checkExpiredNotices(), 60000);

      // Asynchronously connect & synchronize with AWS DynamoDB if configured
      this.initDynamoSync();
    } catch (err) {
      console.error('Error initializing store:', err);
      this.notices = [...INITIAL_NOTICES];
      this.auditLogs = [...INITIAL_AUDIT_LOGS];
      this.parents = [...INITIAL_PARENTS];
    }
  }

  public async initDynamoSync() {
    if (!isDynamoConfigured()) {
      return;
    }

    try {
      console.log('[Store] AWS DynamoDB credentials detected. Verifying table...');
      const tableCheck = await ensureTable();
      if (!tableCheck.ready) {
        console.warn('[Store] DynamoDB table not ready yet:', tableCheck.error);
        return;
      }

      // 1. Sync Notices
      const dynamoNotices = await fetchAllNoticesFromDynamo();
      if (dynamoNotices && dynamoNotices.length > 0) {
        console.log(`[Store] Loaded ${dynamoNotices.length} notices from AWS DynamoDB.`);
        this.notices = dynamoNotices;
        this.saveNoticesToDisk();
      } else {
        // DynamoDB is empty, seed from current store
        console.log(`[Store] Seeding ${this.notices.length} local notices to AWS DynamoDB...`);
        for (const n of this.notices) {
          await putNoticeToDynamo(n);
        }
      }

      // 2. Sync Audit Logs
      const dynamoAudits = await fetchAllAuditsFromDynamo();
      if (dynamoAudits && dynamoAudits.length > 0) {
        console.log(`[Store] Loaded ${dynamoAudits.length} audit logs from AWS DynamoDB.`);
        this.auditLogs = dynamoAudits;
        this.saveAuditToDisk();
      } else {
        console.log(`[Store] Seeding ${this.auditLogs.length} audit logs to AWS DynamoDB...`);
        for (const a of this.auditLogs) {
          await putAuditToDynamo(a);
        }
      }

      // 3. Sync Parents
      const dynamoParents = await fetchAllParentsFromDynamo();
      if (dynamoParents && dynamoParents.length > 0) {
        console.log(`[Store] Loaded ${dynamoParents.length} parent records from AWS DynamoDB.`);
        this.parents = dynamoParents;
        this.saveParentsToDisk();
      } else {
        console.log(`[Store] Seeding ${this.parents.length} parent records to AWS DynamoDB...`);
        for (const p of this.parents) {
          await putParentToDynamo(p);
        }
      }

      this.dynamoSynced = true;
      console.log('[Store] Successfully synchronized with AWS DynamoDB.');
    } catch (err: any) {
      console.error('[Store] Error during DynamoDB synchronization:', err?.message || err);
    }
  }

  public async pushDummyDataToDynamo(): Promise<{
    success: boolean;
    noticesCount: number;
    auditsCount: number;
    parentsCount: number;
  }> {
    if (!isDynamoConfigured()) {
      throw new Error('AWS DynamoDB is not configured. Please set credentials in environment.');
    }

    const tableCheck = await ensureTable();
    if (!tableCheck.ready) {
      throw new Error(`DynamoDB table is not ready: ${tableCheck.error}`);
    }

    // Merge dummy/initial notices into current store
    for (const initial of INITIAL_NOTICES) {
      const existingIdx = this.notices.findIndex((n) => n.id === initial.id);
      if (existingIdx === -1) {
        this.notices.push(initial);
      }
    }

    // Merge dummy/initial audit entries into current store
    for (const initial of INITIAL_AUDIT_LOGS) {
      const existingIdx = this.auditLogs.findIndex((a) => a.id === initial.id);
      if (existingIdx === -1) {
        this.auditLogs.push(initial);
      }
    }

    // Merge dummy/initial parents into current store
    for (const initial of INITIAL_PARENTS) {
      const existingIdx = this.parents.findIndex((p) => p.id === initial.id);
      if (existingIdx === -1) {
        this.parents.push(initial);
      }
    }

    // Write back to local cache
    this.saveNoticesToDisk();
    this.saveAuditToDisk();
    this.saveParentsToDisk();

    // Push all notices to AWS DynamoDB
    let pushedNotices = 0;
    for (const notice of this.notices) {
      const ok = await putNoticeToDynamo(notice);
      if (ok) pushedNotices++;
    }

    // Push all audit logs to AWS DynamoDB
    let pushedAudits = 0;
    for (const audit of this.auditLogs) {
      const ok = await putAuditToDynamo(audit);
      if (ok) pushedAudits++;
    }

    // Push all parent applications to AWS DynamoDB
    let pushedParents = 0;
    for (const parent of this.parents) {
      const ok = await putParentToDynamo(parent);
      if (ok) pushedParents++;
    }

    console.log(`[Store] Pushed dummy data to AWS DynamoDB: ${pushedNotices} notices, ${pushedAudits} audits, ${pushedParents} parents.`);

    this.broadcast('store_synced', {
      noticesCount: this.notices.length,
      parentsCount: this.parents.length,
    });

    return {
      success: true,
      noticesCount: pushedNotices,
      auditsCount: pushedAudits,
      parentsCount: pushedParents,
    };
  }

  private saveNoticesToDisk() {
    try {
      fs.writeFileSync(NOTICES_FILE, JSON.stringify(this.notices, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write notices to disk:', err);
    }
  }

  private saveAuditToDisk() {
    try {
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(this.auditLogs, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write audit logs to disk:', err);
    }
  }

  private saveParentsToDisk() {
    try {
      fs.writeFileSync(PARENTS_FILE, JSON.stringify(this.parents, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write parents to disk:', err);
    }
  }

  public checkExpiredNotices() {
    const now = new Date().toISOString();
    let hasChanges = false;

    this.notices.forEach((notice) => {
      if (notice.status === 'published' && notice.expiryDate && notice.expiryDate < now) {
        notice.status = 'archived';
        notice.updatedAt = now;
        hasChanges = true;
        this.addAuditEntry({
          id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          noticeId: notice.id,
          noticeTitle: notice.title,
          action: 'archive',
          performedBy: 'System Auto-Archive Daemon',
          role: 'system',
          timestamp: now,
          details: `Notice automatically archived past expiry timestamp (${notice.expiryDate})`,
        });
      }
    });

    if (hasChanges) {
      this.saveNoticesToDisk();
      this.broadcast('notice_expired_batch', { timestamp: now });
    }
  }

  public registerSSEClient(res: Response) {
    this.sseClients.add(res);

    // Initial sync event
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to AMKA Real-Time Sync Network', clientsCount: this.sseClients.size })}\n\n`);

    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  public broadcast(eventType: string, payload: any) {
    const data = JSON.stringify({
      event: eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    for (const client of this.sseClients) {
      try {
        client.write(`event: ${eventType}\ndata: ${data}\n\n`);
      } catch (err) {
        console.warn('Failed to send SSE to client, removing:', err);
        this.sseClients.delete(client);
      }
    }
  }

  public getDepartments(): Department[] {
    return this.departments;
  }

  public getUsers(): User[] {
    return this.users;
  }

  public getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  public getUserByToken(token: string): User | undefined {
    return this.users.find((u) => u.token === token);
  }

  public getAuditLogs(): AuditEntry[] {
    return [...this.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addAuditEntry(entry: AuditEntry) {
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
    this.saveAuditToDisk();
    if (isDynamoConfigured()) {
      putAuditToDynamo(entry).catch((err) => console.error('[DynamoDB] audit error:', err));
    }
  }

  public getNotices(filter?: {
    status?: string;
    department?: string;
    category?: string;
    urgency?: string;
    search?: string;
    includeArchived?: boolean;
  }): Notice[] {
    let result = [...this.notices];

    if (filter) {
      if (filter.status && filter.status !== 'all') {
        result = result.filter((n) => n.status === filter.status);
      } else if (!filter.includeArchived) {
        result = result.filter((n) => n.status !== 'archived');
      }

      if (filter.department && filter.department !== 'all') {
        result = result.filter((n) => n.department === filter.department);
      }

      if (filter.category && filter.category !== 'all') {
        result = result.filter((n) => n.category === filter.category);
      }

      if (filter.urgency && filter.urgency !== 'all') {
        result = result.filter((n) => n.urgency === filter.urgency);
      }

      if (filter.search && filter.search.trim()) {
        const query = filter.search.toLowerCase().trim();
        result = result.filter(
          (n) =>
            n.title.toLowerCase().includes(query) ||
            n.content.toLowerCase().includes(query) ||
            (n.summary && n.summary.toLowerCase().includes(query)) ||
            n.referenceNumber.toLowerCase().includes(query) ||
            n.department.toLowerCase().includes(query) ||
            n.tags.some((t) => t.toLowerCase().includes(query))
        );
      }
    }

    // Sort order:
    // 1. Pinned items first
    // 2. Urgent urgency first within pinned / unpinned
    // 3. Most recent publishDate
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const urgencyWeight: Record<string, number> = { urgent: 3, normal: 2, info: 1 };
      const uA = urgencyWeight[a.urgency] || 0;
      const uB = urgencyWeight[b.urgency] || 0;
      if (uA !== uB) return uB - uA;

      return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
    });

    return result;
  }

  public getNoticeById(id: string): Notice | undefined {
    if (!id) return undefined;
    const clean = id.trim();
    let decoded = clean;
    try {
      decoded = decodeURIComponent(clean);
    } catch {
      // ignore
    }
    return this.notices.find(
      (n) =>
        n.id === clean ||
        n.id === decoded ||
        n.referenceNumber === clean ||
        n.referenceNumber === decoded ||
        n.id.toLowerCase() === clean.toLowerCase() ||
        n.id.toLowerCase() === decoded.toLowerCase() ||
        n.referenceNumber.toLowerCase() === clean.toLowerCase() ||
        n.referenceNumber.toLowerCase() === decoded.toLowerCase()
    );
  }

  public createNotice(data: Partial<Notice>, user: User): Notice {
    const now = new Date().toISOString();
    const deptObj = this.departments.find((d) => d.name === data.department || d.id === data.department);
    const deptCode = deptObj ? deptObj.code : 'GEN';
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const ref = data.referenceNumber?.trim() || `AMKA/${deptCode}/2026/${randomSeq}`;

    const newNotice: Notice = {
      id: 'not_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      referenceNumber: ref,
      title: data.title?.trim() || 'Untitled Notice',
      content: data.content || '',
      summary: data.summary || (data.content ? data.content.slice(0, 140) + '...' : ''),
      department: data.department || user.department,
      category: data.category || 'General',
      tags: data.tags && data.tags.length > 0 ? data.tags : ['Notice'],
      urgency: data.urgency || 'normal',
      status: data.status || 'published',
      isPinned: Boolean(data.isPinned),
      targetAudience: data.targetAudience && data.targetAudience.length > 0 ? data.targetAudience : ['All Students', 'Faculty'],
      author: {
        id: user.id,
        name: user.name,
        designation: user.designation,
        department: user.department,
        email: user.email,
      },
      attachments: data.attachments || [],
      publishDate: data.publishDate || now,
      expiryDate: data.expiryDate || null,
      viewsCount: 0,
      acknowledgementsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.notices.unshift(newNotice);
    this.saveNoticesToDisk();
    if (isDynamoConfigured()) {
      putNoticeToDynamo(newNotice).catch((err) => console.error('[DynamoDB] createNotice error:', err));
    }

    this.addAuditEntry({
      id: 'aud_' + Date.now(),
      noticeId: newNotice.id,
      noticeTitle: newNotice.title,
      action: 'create',
      performedBy: user.name,
      role: user.role,
      timestamp: now,
      details: `Created notice with status: ${newNotice.status}, urgency: ${newNotice.urgency}`,
    });

    this.broadcast('notice_created', newNotice);
    return newNotice;
  }

  public updateNotice(id: string, updates: Partial<Notice>, user: User): Notice | null {
    const idx = this.notices.findIndex((n) => n.id === id);
    if (idx === -1) return null;

    const current = this.notices[idx];
    const now = new Date().toISOString();

    const updated: Notice = {
      ...current,
      ...updates,
      id: current.id, // Immutable ID
      createdAt: current.createdAt,
      updatedAt: now,
    };

    this.notices[idx] = updated;
    this.saveNoticesToDisk();
    if (isDynamoConfigured()) {
      putNoticeToDynamo(updated).catch((err) => console.error('[DynamoDB] updateNotice error:', err));
    }

    this.addAuditEntry({
      id: 'aud_' + Date.now(),
      noticeId: updated.id,
      noticeTitle: updated.title,
      action: 'update',
      performedBy: user.name,
      role: user.role,
      timestamp: now,
      details: `Updated fields: ${Object.keys(updates).join(', ')}`,
    });

    this.broadcast('notice_updated', updated);
    return updated;
  }

  public togglePin(id: string, user: User): Notice | null {
    const notice = this.notices.find((n) => n.id === id);
    if (!notice) return null;

    notice.isPinned = !notice.isPinned;
    notice.updatedAt = new Date().toISOString();
    this.saveNoticesToDisk();
    if (isDynamoConfigured()) {
      putNoticeToDynamo(notice).catch((err) => console.error('[DynamoDB] togglePin error:', err));
    }

    this.addAuditEntry({
      id: 'aud_' + Date.now(),
      noticeId: notice.id,
      noticeTitle: notice.title,
      action: notice.isPinned ? 'pin' : 'unpin',
      performedBy: user.name,
      role: user.role,
      timestamp: notice.updatedAt,
      details: notice.isPinned ? 'Pinned notice to top bulletin' : 'Unpinned notice',
    });

    this.broadcast('notice_pinned', { id: notice.id, isPinned: notice.isPinned });
    return notice;
  }

  public archiveNotice(id: string, user: User): Notice | null {
    const notice = this.notices.find((n) => n.id === id);
    if (!notice) return null;

    notice.status = 'archived';
    notice.updatedAt = new Date().toISOString();
    this.saveNoticesToDisk();

    this.addAuditEntry({
      id: 'aud_' + Date.now(),
      noticeId: notice.id,
      noticeTitle: notice.title,
      action: 'archive',
      performedBy: user.name,
      role: user.role,
      timestamp: notice.updatedAt,
      details: 'Notice manually archived by staff',
    });

    this.broadcast('notice_archived', { id: notice.id });
    return notice;
  }

  public deleteNotice(id: string, user: User): boolean {
    if (!id) return true;
    const clean = id.trim();
    let decoded = clean;
    try {
      decoded = decodeURIComponent(clean);
    } catch {
      // ignore
    }

    const idx = this.notices.findIndex(
      (n) =>
        n.id === clean ||
        n.id === decoded ||
        n.referenceNumber === clean ||
        n.referenceNumber === decoded ||
        n.id.toLowerCase() === clean.toLowerCase() ||
        n.id.toLowerCase() === decoded.toLowerCase() ||
        n.referenceNumber.toLowerCase() === clean.toLowerCase() ||
        n.referenceNumber.toLowerCase() === decoded.toLowerCase()
    );

    if (idx === -1) {
      // Notice is already deleted or not present - idempotent success
      return true;
    }

    const [removed] = this.notices.splice(idx, 1);
    this.saveNoticesToDisk();
    if (isDynamoConfigured()) {
      deleteNoticeFromDynamo(removed.id).catch((err) => console.error('[DynamoDB] deleteNotice error:', err));
    }

    this.addAuditEntry({
      id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      noticeId: removed.id,
      noticeTitle: removed.title,
      action: 'delete',
      performedBy: user.name,
      role: user.role,
      timestamp: new Date().toISOString(),
      details: 'Notice permanently deleted from repository',
    });

    this.broadcast('notice_deleted', { id: removed.id });
    return true;
  }

  public incrementViews(id: string) {
    const notice = this.notices.find((n) => n.id === id);
    if (notice) {
      notice.viewsCount = (notice.viewsCount || 0) + 1;
      this.saveNoticesToDisk();
      if (isDynamoConfigured()) {
        putNoticeToDynamo(notice).catch((err) => console.error('[DynamoDB] incrementViews error:', err));
      }
    }
  }

  public toggleAcknowledge(id: string): number {
    const notice = this.notices.find((n) => n.id === id);
    if (notice) {
      notice.acknowledgementsCount = (notice.acknowledgementsCount || 0) + 1;
      this.saveNoticesToDisk();
      if (isDynamoConfigured()) {
        putNoticeToDynamo(notice).catch((err) => console.error('[DynamoDB] toggleAcknowledge error:', err));
      }
      this.broadcast('notice_updated', notice);
      return notice.acknowledgementsCount;
    }
    return 0;
  }

  // ==================== PARENT APPROVAL & PORTAL METHODS ====================

  public getParents(status?: string): ParentUser[] {
    if (status && status !== 'all') {
      return this.parents.filter((p) => p.status === status);
    }
    return [...this.parents];
  }

  public getParentById(id: string): ParentUser | undefined {
    return this.parents.find((p) => p.id === id);
  }

  public getParentByEmail(email: string): ParentUser | undefined {
    return this.parents.find((p) => p.email.toLowerCase() === (email || '').trim().toLowerCase());
  }

  public getParentByToken(token: string): ParentUser | undefined {
    return this.parents.find((p) => p.token === token);
  }

  public registerParent(data: Partial<ParentUser>): { parent?: ParentUser; error?: string } {
    if (!data.name?.trim()) return { error: 'Full name is required.' };
    if (!data.email?.trim()) return { error: 'Valid email address is required.' };
    if (!data.studentRollNo?.trim()) return { error: 'Student Roll / Registration Number is required.' };
    if (!data.studentName?.trim()) return { error: 'Student Full Name is required.' };

    const email = data.email.trim().toLowerCase();
    const existing = this.parents.find((p) => p.email.toLowerCase() === email);
    if (existing) {
      if (existing.status === 'pending') {
        return { error: 'An application with this email is already awaiting administrative approval by the Registrar.' };
      } else if (existing.status === 'approved') {
        return { error: 'An account with this email is already approved. Please switch to Parent Login.' };
      }
    }

    const now = new Date().toISOString();
    const newParent: ParentUser = {
      id: 'parent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: data.name.trim(),
      email,
      phone: data.phone?.trim() || '',
      studentRollNo: data.studentRollNo.trim().toUpperCase(),
      studentName: data.studentName.trim(),
      relationship: data.relationship || 'Guardian',
      department: data.department || 'Academic Affairs',
      status: 'pending',
      registeredAt: now,
      token: 'token_parent_' + Math.random().toString(36).substring(2, 10),
    };

    this.parents.unshift(newParent);
    this.saveParentsToDisk();
    if (isDynamoConfigured()) {
      putParentToDynamo(newParent).catch((err) => console.error('[DynamoDB] registerParent error:', err));
    }

    this.addAuditEntry({
      id: 'aud_' + Date.now(),
      noticeId: 'system',
      noticeTitle: `Parent Registration: ${newParent.name} (${newParent.relationship} of ${newParent.studentName})`,
      action: 'create',
      performedBy: newParent.name,
      role: 'parent_applicant',
      timestamp: now,
      details: `New guardian verification request submitted for student roll: ${newParent.studentRollNo}. Requires administrative approval.`,
    });

    this.broadcast('parent_registered', newParent);
    return { parent: newParent };
  }

  public approveParent(id: string, adminUser: User): ParentUser | null {
    const parent = this.parents.find((p) => p.id === id);
    if (!parent) return null;

    const now = new Date().toISOString();
    parent.status = 'approved';
    parent.approvedAt = now;
    parent.approvedBy = `${adminUser.name} (${adminUser.designation})`;
    parent.rejectionReason = undefined;
    if (!parent.token) {
      parent.token = 'token_parent_' + Math.random().toString(36).substring(2, 10);
    }

    this.saveParentsToDisk();
    if (isDynamoConfigured()) {
      putParentToDynamo(parent).catch((err) => console.error('[DynamoDB] approveParent error:', err));
    }

    this.addAuditEntry({
      id: 'aud_' + Date.now(),
      noticeId: 'system',
      noticeTitle: `Parent Approved: ${parent.name}`,
      action: 'update',
      performedBy: adminUser.name,
      role: adminUser.role,
      timestamp: now,
      details: `Approved guardian access for student ${parent.studentName} (${parent.studentRollNo})`,
    });

    this.broadcast('parent_approved', parent);
    return parent;
  }

  public rejectParent(id: string, reason: string, adminUser: User): ParentUser | null {
    const parent = this.parents.find((p) => p.id === id);
    if (!parent) return null;

    const now = new Date().toISOString();
    parent.status = 'rejected';
    parent.rejectionReason = reason || 'Verification failed against institutional student roster.';

    this.saveParentsToDisk();
    if (isDynamoConfigured()) {
      putParentToDynamo(parent).catch((err) => console.error('[DynamoDB] rejectParent error:', err));
    }

    this.addAuditEntry({
      id: 'aud_' + Date.now(),
      noticeId: 'system',
      noticeTitle: `Parent Registration Declined: ${parent.name}`,
      action: 'update',
      performedBy: adminUser.name,
      role: adminUser.role,
      timestamp: now,
      details: `Declined parent request. Reason: ${parent.rejectionReason}`,
    });

    this.broadcast('parent_rejected', parent);
    return parent;
  }

  public loginParent(email: string, rollOrPhone?: string): {
    success: boolean;
    parent?: ParentUser;
    token?: string;
    status?: 'approved' | 'pending' | 'rejected' | 'not_found';
    message: string;
  } {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanKey = (rollOrPhone || '').trim().toUpperCase();

    const parent = this.parents.find(
      (p) =>
        p.email.toLowerCase() === cleanEmail ||
        (cleanKey && (p.studentRollNo.toUpperCase() === cleanKey || (p.phone && p.phone.replace(/\D/g, '') === cleanKey.replace(/\D/g, ''))))
    );

    if (!parent) {
      return {
        success: false,
        status: 'not_found',
        message: 'No parent account registered with this email or student roll number. Please submit an application for registration.',
      };
    }

    if (parent.status === 'pending') {
      return {
        success: false,
        status: 'pending',
        parent,
        message: `Your registration for ${parent.studentName} (${parent.studentRollNo}) is currently pending administrative verification by the Registrar Office. Access will be activated once verified.`,
      };
    }

    if (parent.status === 'rejected') {
      return {
        success: false,
        status: 'rejected',
        parent,
        message: `Your parent verification application was declined: ${parent.rejectionReason || 'Institutional records mismatch'}. Please contact the Academic Administration Office.`,
      };
    }

    // Approved!
    return {
      success: true,
      status: 'approved',
      parent,
      token: parent.token,
      message: `Welcome to AMKA Parent Portal, ${parent.name}.`,
    };
  }
}

export const store = new NoticeStore();
