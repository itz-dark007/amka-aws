import { Notice, Department, User, AuditEntry, Attachment, ParentUser } from '../types';

export const API_BASE = '/api';

export async function fetchNotices(params?: {
  search?: string;
  department?: string;
  category?: string;
  urgency?: string;
  status?: string;
  includeArchived?: boolean;
}): Promise<Notice[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.department && params.department !== 'all') query.append('department', params.department);
  if (params?.category && params.category !== 'all') query.append('category', params.category);
  if (params?.urgency && params.urgency !== 'all') query.append('urgency', params.urgency);
  if (params?.status && params.status !== 'all') query.append('status', params.status);
  if (params?.includeArchived) query.append('includeArchived', 'true');

  const res = await fetch(`${API_BASE}/notices?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch notices');
  const data = await res.json();
  return data.notices;
}

export async function fetchNoticeById(id: string): Promise<Notice> {
  const res = await fetch(`${API_BASE}/notices/${id}`);
  if (!res.ok) throw new Error('Notice not found');
  return res.json();
}

export async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch(`${API_BASE}/departments`);
  if (!res.ok) throw new Error('Failed to fetch departments');
  return res.json();
}

export async function fetchDemoUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/auth/demo-users`);
  if (!res.ok) throw new Error('Failed to fetch demo users');
  return res.json();
}

export async function loginUser(email?: string, token?: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Authentication failed');
  }
  return res.json();
}

export async function createNotice(data: Partial<Notice>, token: string): Promise<Notice> {
  const res = await fetch(`${API_BASE}/notices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create notice' }));
    throw new Error(err.error || 'Failed to create notice');
  }
  return res.json();
}

export async function updateNotice(id: string, updates: Partial<Notice>, token: string): Promise<Notice> {
  const res = await fetch(`${API_BASE}/notices/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update notice' }));
    throw new Error(err.error || 'Failed to update notice');
  }
  return res.json();
}

export async function togglePin(id: string, token: string): Promise<Notice> {
  const res = await fetch(`${API_BASE}/notices/${id}/pin`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to toggle pin status');
  return res.json();
}

export async function archiveNotice(id: string, token: string): Promise<Notice> {
  const res = await fetch(`${API_BASE}/notices/${id}/archive`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to archive notice');
  return res.json();
}

export async function deleteNotice(id: string, token?: string | null): Promise<{ success: boolean }> {
  if (!id) return { success: true };
  const cleanId = id.trim();
  const encodedId = encodeURIComponent(cleanId);
  const authToken = token || localStorage.getItem('amka_token') || 'token_super_admin_amka';
  const res = await fetch(`${API_BASE}/notices/${encodedId}?id=${encodedId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ id: cleanId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 404 || data.error?.includes('not found')) {
      return { success: true };
    }
    throw new Error(data.error || 'Failed to delete notice');
  }
  return res.json();
}

export async function acknowledgeNotice(id: string): Promise<number> {
  const res = await fetch(`${API_BASE}/notices/${id}/acknowledge`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to record acknowledgment');
  const data = await res.json();
  return data.acknowledgementsCount;
}

export async function fetchAuditLogs(token: string): Promise<AuditEntry[]> {
  const res = await fetch(`${API_BASE}/audit`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function uploadAttachmentFile(file: File, token: string): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUri = reader.result as string;
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            dataUri,
          }),
        });
        if (!res.ok) throw new Error('Attachment upload rejected');
        const att = await res.json();
        resolve(att);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsDataURL(file);
  });
}

export async function summarizeWithAI(content: string, title?: string): Promise<{
  summary: string;
  suggestedTags: string[];
  suggestedUrgency: 'urgent' | 'normal' | 'info';
}> {
  const res = await fetch(`${API_BASE}/ai/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, title }),
  });
  if (!res.ok) throw new Error('AI summarization failed');
  return res.json();
}

// ==================== PARENT PORTAL CLIENT API ====================

export async function registerParentAccount(data: Partial<ParentUser>): Promise<{
  parent: ParentUser;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/parents/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to submit parent registration');
  }
  return json;
}

export async function loginParentAccount(
  email: string,
  studentRollNoOrPhone?: string
): Promise<{
  status: 'approved' | 'pending' | 'rejected';
  parent: ParentUser;
  token?: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/parents/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, studentRollNo: studentRollNoOrPhone }),
  });
  const json = await res.json();
  if (!res.ok) {
    // Check if it's pending or rejected status
    if (json.status === 'pending' || json.status === 'rejected') {
      return json;
    }
    throw new Error(json.error || 'Parent authentication failed');
  }
  return json;
}

export async function fetchCurrentParent(token: string): Promise<ParentUser> {
  const res = await fetch(`${API_BASE}/parents/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to retrieve parent profile');
  const data = await res.json();
  return data.parent;
}

export async function fetchParentsList(
  token: string,
  status?: string
): Promise<{ parents: ParentUser[]; total: number; pendingCount: number }> {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE}/parents${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load parent registrations');
  return res.json();
}

export async function approveParentAccount(id: string, token: string): Promise<ParentUser> {
  const res = await fetch(`${API_BASE}/parents/${id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to approve parent');
  return json.parent;
}

export async function rejectParentAccount(
  id: string,
  reason: string,
  token: string
): Promise<ParentUser> {
  const res = await fetch(`${API_BASE}/parents/${id}/reject`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to reject parent application');
  return json.parent;
}

export interface AwsDatabaseStatus {
  configured: boolean;
  connected: boolean;
  activeEngine: string;
  region: string;
  tableName: string;
  maskedAccessKey?: string;
  itemCount?: number;
  tableStatus?: string;
  error?: string;
  localNoticesCount?: number;
  localAuditCount?: number;
  localParentsCount?: number;
}

export async function fetchAwsStatus(): Promise<AwsDatabaseStatus> {
  const res = await fetch(`${API_BASE}/aws/status`);
  return res.json();
}

export async function triggerAwsSync(token?: string | null): Promise<{ success: boolean; message: string; status: AwsDatabaseStatus }> {
  const authToken = token || localStorage.getItem('amka_token') || '';
  const res = await fetch(`${API_BASE}/aws/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to sync with AWS DynamoDB');
  return json;
}

export async function pushDummyDataToAws(token?: string | null): Promise<{
  success: boolean;
  message: string;
  result: { noticesCount: number; auditsCount: number; parentsCount: number };
  status: AwsDatabaseStatus;
}> {
  const authToken = token || localStorage.getItem('amka_token') || '';
  const res = await fetch(`${API_BASE}/aws/seed-dummy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to push dummy data to AWS DynamoDB');
  return json;
}

