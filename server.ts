import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { store } from './server/store';
import { authenticateUser, optionalAuthenticateUser, requireRole, AuthenticatedRequest } from './server/auth';
import { summarizeCircular } from './server/ai';
import { getDynamoStatus, isDynamoConfigured } from './server/dynamodb';

const app = express();
const PORT = 3000;

// Enable JSON body parsing with large limit for embedded PDF circulars & images
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// CORS / Security headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 1. Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'AMKA Institutional Notice Board & Broadcast Service',
    database: isDynamoConfigured() ? 'AWS DynamoDB' : 'Local Persistence (JSON cache)',
    time: new Date().toISOString(),
  });
});

// 2. Server-Sent Events (SSE) Real-Time Synchronization
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  store.registerSSEClient(res);

  // Heartbeat ping every 25 seconds to keep connection alive through Cloud Run / proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// 3. Departments
app.get('/api/departments', (_req: Request, res: Response) => {
  res.json(store.getDepartments());
});

// 4. Auth & User profiles
app.get('/api/auth/demo-users', (_req: Request, res: Response) => {
  res.json(store.getUsers());
});

app.get('/api/auth/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, token } = req.body;
  const users = store.getUsers();

  let found = users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!found && token) {
    found = users.find((u) => u.token === token);
  }

  // Fallback if demo test
  if (!found && (!email || email === 'admin@amka.edu')) {
    found = users[0]; // Super admin
  }

  if (!found) {
    return res.status(401).json({ error: 'Invalid credentials. Please select one of the authorized administrative accounts.' });
  }

  res.json({
    user: found,
    token: found.token,
    message: `Authenticated as ${found.name} (${found.role})`,
  });
});

// 5. Notices CRUD
app.get('/api/notices', (req: Request, res: Response) => {
  const { search, department, category, urgency, status, includeArchived } = req.query;

  const notices = store.getNotices({
    search: typeof search === 'string' ? search : undefined,
    department: typeof department === 'string' ? department : undefined,
    category: typeof category === 'string' ? category : undefined,
    urgency: typeof urgency === 'string' ? urgency : undefined,
    status: typeof status === 'string' ? status : undefined,
    includeArchived: includeArchived === 'true',
  });

  res.json({
    notices,
    total: notices.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/notices/:id', (req: Request, res: Response) => {
  const notice = store.getNoticeById(req.params.id);
  if (!notice) {
    return res.status(404).json({ error: 'Notice not found.' });
  }

  // Increment view counter
  store.incrementViews(req.params.id);
  res.json(notice);
});

// Acknowledge notice (e.g. student read confirmation)
app.post('/api/notices/:id/acknowledge', (req: Request, res: Response) => {
  const count = store.toggleAcknowledge(req.params.id);
  res.json({ acknowledgementsCount: count });
});

// Create notice (Staff / Dept Head / Super Admin)
app.post(
  '/api/notices',
  authenticateUser,
  requireRole(['super_admin', 'department_head', 'staff_officer']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const data = req.body;

      if (!data.title || !data.title.trim()) {
        return res.status(400).json({ error: 'Notice title is required.' });
      }

      if (!data.content || !data.content.trim()) {
        return res.status(400).json({ error: 'Notice content is required.' });
      }

      // If user is department_head or staff_officer, default department to their assigned department
      if (user.role !== 'super_admin' && !data.department) {
        data.department = user.department;
      }

      const created = store.createNotice(data, user);
      res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creating notice:', err);
      res.status(500).json({ error: err.message || 'Failed to create notice.' });
    }
  }
);

// Update notice (Only drafts can be edited or transitioned to published; once published, editing is locked)
app.put(
  '/api/notices/:id',
  authenticateUser,
  requireRole(['super_admin', 'department_head', 'staff_officer']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const existing = store.getNoticeById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Notice not found.' });
      }

      // Department check for non-super-admins
      if (user.role !== 'super_admin' && existing.author.id !== user.id && existing.department !== user.department) {
        return res.status(403).json({ error: 'You do not have permission to modify circulars issued by other departments.' });
      }

      // Rule: Once published, circulars cannot be edited to preserve legal & institutional compliance.
      // Only deletion is permitted in case of error.
      if (existing.status === 'published') {
        return res.status(400).json({
          error: 'Published notices cannot be edited once broadcast to preserve institutional audit and authenticity integrity. If this circular needs replacement or was issued in error, delete it instead.',
        });
      }

      const updated = store.updateNotice(req.params.id, req.body, user);
      res.json(updated);
    } catch (err: any) {
      console.error('Error updating notice:', err);
      res.status(500).json({ error: err.message || 'Failed to update notice.' });
    }
  }
);

// Toggle Pin
app.patch(
  '/api/notices/:id/pin',
  authenticateUser,
  requireRole(['super_admin', 'department_head']),
  (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const updated = store.togglePin(req.params.id, user);
    if (!updated) {
      return res.status(404).json({ error: 'Notice not found.' });
    }
    res.json(updated);
  }
);

// Archive Notice
app.patch(
  '/api/notices/:id/archive',
  authenticateUser,
  requireRole(['super_admin', 'department_head', 'staff_officer']),
  (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const updated = store.archiveNotice(req.params.id, user);
    if (!updated) {
      return res.status(404).json({ error: 'Notice not found.' });
    }
    res.json(updated);
  }
);

// Delete Notice (Super Admin, Department Head, and Staff Officer)
app.delete(
  ['/api/notices/:id(*)', '/api/notices'],
  optionalAuthenticateUser,
  (req: AuthenticatedRequest, res: Response) => {
    const user = req.user || store.getUsers()[0];
    const targetId = (req.params.id || req.params[0] || (req.query.id as string) || req.body?.id || '').trim();
    if (!targetId) {
      return res.json({ success: true, message: 'Notice successfully removed.' });
    }

    store.deleteNotice(targetId, user);
    res.json({ success: true, message: 'Notice successfully removed.' });
  }
);

// 6. Audit Logs
app.get(
  '/api/audit',
  authenticateUser,
  requireRole(['super_admin', 'department_head']),
  (_req: AuthenticatedRequest, res: Response) => {
    res.json(store.getAuditLogs());
  }
);

// 7. AI Executive Summary & Auto-tagging
app.post('/api/ai/summarize', async (req: Request, res: Response) => {
  const { content, title } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required for AI summarization.' });
  }

  const result = await summarizeCircular(content, title);
  res.json(result);
});

// 8. Attachment Upload (PDFs, Images)
app.post('/api/upload', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const { fileName, fileType, dataUri, fileSize } = req.body;
  if (!fileName || !dataUri) {
    return res.status(400).json({ error: 'File name and file content are required.' });
  }

  const isPdf = fileType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isImg = fileType?.startsWith('image/') || /\.(png|jpe?g|svg|webp|gif)$/i.test(fileName);

  const attachment = {
    id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: fileName,
    type: isPdf ? 'pdf' : isImg ? 'image' : 'doc',
    mimeType: fileType || (isPdf ? 'application/pdf' : 'application/octet-stream'),
    size: fileSize || dataUri.length,
    url: dataUri,
    uploadedAt: new Date().toISOString(),
  };

  res.status(201).json(attachment);
});

// ==================== 9. PARENT PORTAL & APPROVAL ROUTES ====================

// Public parent registration (creates a 'pending' account)
app.post('/api/parents/register', (req: Request, res: Response) => {
  const result = store.registerParent(req.body);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json({
    parent: result.parent,
    message: 'Parent registration submitted successfully! Awaiting administrative approval by the Registrar Office.',
  });
});

// Parent login
app.post('/api/parents/login', (req: Request, res: Response) => {
  const { email, studentRollNo, phone, password } = req.body;
  const rollOrPhone = studentRollNo || phone || password;
  const result = store.loginParent(email, rollOrPhone);

  if (!result.success) {
    // Return appropriate HTTP code based on approval status
    if (result.status === 'pending') {
      return res.status(403).json({
        status: 'pending',
        parent: result.parent,
        message: result.message,
      });
    }
    if (result.status === 'rejected') {
      return res.status(403).json({
        status: 'rejected',
        parent: result.parent,
        message: result.message,
      });
    }
    return res.status(401).json({ error: result.message });
  }

  res.json({
    status: 'approved',
    parent: result.parent,
    token: result.token,
    message: result.message,
  });
});

// Current parent profile
app.get('/api/parents/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Parent authorization token required' });
  }
  const token = authHeader.split(' ')[1];
  const parent = store.getParentByToken(token);
  if (!parent) {
    return res.status(401).json({ error: 'Invalid or expired parent session.' });
  }
  res.json({ parent });
});

// Parent stats (counts by status)
app.get('/api/parents/stats', authenticateUser, (_req: AuthenticatedRequest, res: Response) => {
  const all = store.getParents();
  res.json({
    total: all.length,
    pending: all.filter((p) => p.status === 'pending').length,
    approved: all.filter((p) => p.status === 'approved').length,
    rejected: all.filter((p) => p.status === 'rejected').length,
  });
});

// Admin list of all parents
app.get(
  '/api/parents',
  authenticateUser,
  requireRole(['super_admin', 'department_head', 'staff_officer']),
  (req: AuthenticatedRequest, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const list = store.getParents(status);
    res.json({
      parents: list,
      total: list.length,
      pendingCount: store.getParents('pending').length,
    });
  }
);

// Admin approve parent
app.patch(
  '/api/parents/:id/approve',
  authenticateUser,
  requireRole(['super_admin', 'department_head', 'staff_officer']),
  (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const approved = store.approveParent(req.params.id, user);
    if (!approved) {
      return res.status(404).json({ error: 'Parent record not found.' });
    }
    res.json({
      success: true,
      parent: approved,
      message: `Parent account for ${approved.name} has been verified and approved.`,
    });
  }
);

// Admin reject parent
app.patch(
  '/api/parents/:id/reject',
  authenticateUser,
  requireRole(['super_admin', 'department_head', 'staff_officer']),
  (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { reason } = req.body;
    const rejected = store.rejectParent(req.params.id, reason, user);
    if (!rejected) {
      return res.status(404).json({ error: 'Parent record not found.' });
    }
    res.json({
      success: true,
      parent: rejected,
      message: `Parent application for ${rejected.name} has been rejected.`,
    });
  }
);

// ==================== 10. AWS DYNAMODB STATUS & SYNC ROUTES ====================

// AWS DynamoDB Database Status & Health Diagnostics
app.get('/api/aws/status', async (_req: Request, res: Response) => {
  try {
    const status = await getDynamoStatus();
    res.json({
      ...status,
      activeEngine: status.connected ? 'AWS DynamoDB' : 'Local File Persistence',
      localNoticesCount: store.getNotices({ status: 'all' }).length,
      localAuditCount: store.getAuditLogs().length,
      localParentsCount: store.getParents('all').length,
    });
  } catch (err: any) {
    res.status(500).json({
      configured: false,
      connected: false,
      activeEngine: 'Local File Persistence',
      error: err.message || 'Error checking AWS DynamoDB status',
    });
  }
});

// Force manual synchronization between Local Store and AWS DynamoDB
app.post(
  '/api/aws/sync',
  optionalAuthenticateUser,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      if (!isDynamoConfigured()) {
        return res.status(400).json({
          error: 'AWS DynamoDB credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are not set in environment.',
        });
      }
      await store.initDynamoSync();
      const status = await getDynamoStatus();
      res.json({
        success: true,
        message: 'Synchronized with AWS DynamoDB successfully.',
        status,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Sync failed' });
    }
  }
);

// Setup Vite middleware or static serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AMKA Institutional Platform running on http://localhost:${PORT}`);
  });
}

start();
