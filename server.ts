import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createDefaultSchoolStore } from './src/constants/initialSeedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.APP_PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data', 'schools');

// Ensure persistent storage directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[Server] Could not create data directory, using in-memory store:', e);
}

// 1. Security Headers Middleware (Anti-XSS, Anti-Sniffing, Anti-Clickjacking)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
});

// 2. IP Rate Limiter to prevent DoS / Brute-force attacks on API endpoints
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimitBucket>();

function apiRateLimiter(limit: number = 240, windowMs: number = 60000) {
  return (req: Request, res: Response, next: () => void) => {
    if (!req.path.startsWith('/api/')) return next();
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let bucket = rateLimits.get(ip);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + windowMs };
      rateLimits.set(ip, bucket);
    } else {
      bucket.count++;
    }

    if (bucket.count > limit) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Trop de requêtes, veuillez patienter quelques secondes.' });
    }
    next();
  };
}

// Nettoyage régulier des compteurs de rate limit
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateLimits.entries()) {
    if (now > bucket.resetAt) rateLimits.delete(ip);
  }
}, 300000);

app.use(apiRateLimiter(300, 60000));
app.use(express.json({ limit: '10mb' }));

// Protection contre la pollution de prototype
function sanitizePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') return obj.replace(/\0/g, '') as unknown as T;
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizePayload) as unknown as T;
  }
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    clean[key] = sanitizePayload((obj as any)[key]);
  }
  return clean;
}

// In-memory cache + active SSE clients per school code
interface SchoolStore {
  settings?: any;
  students?: any[];
  classes?: any[];
  subjects?: any[];
  teachers?: any[];
  grades?: any[];
  payments?: any[];
  attendance?: any[];
  expenses?: any[];
  exam_sessions?: any[];
  exam_slots?: any[];
  updatedAt?: string;
}

const memoryStores = new Map<string, SchoolStore>();
const sseClients = new Map<string, Set<Response>>();

function sanitizeCode(code: string): string {
  return (code || 'ECOLE-PRINCIPALE')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 64) || 'ECOLE-PRINCIPALE';
}

function getFilePath(code: string): string {
  const cleanCode = sanitizeCode(code);
  const targetFile = `${cleanCode}.json`;
  const resolved = path.resolve(DATA_DIR, targetFile);
  const root = path.resolve(DATA_DIR);
  if (!resolved.startsWith(root)) {
    throw new Error('Access denied: Invalid path traversal attempt');
  }
  return resolved;
}

function hasMeaningfulData(store: any): boolean {
  if (!store || typeof store !== 'object') return false;
  const hasStudents = Array.isArray(store.students) && store.students.length > 0;
  const hasClasses = Array.isArray(store.classes) && store.classes.length > 0;
  const hasSettings = store.settings && typeof store.settings === 'object' && Boolean(store.settings.schoolName);
  return Boolean(hasStudents || hasClasses || hasSettings);
}

function loadSchoolData(code: string): SchoolStore {
  const cleanCode = sanitizeCode(code);
  if (memoryStores.has(cleanCode)) {
    const cached = memoryStores.get(cleanCode)!;
    if (hasMeaningfulData(cached)) {
      return cached;
    }
  }

  const filePath = getFilePath(cleanCode);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (hasMeaningfulData(parsed)) {
        memoryStores.set(cleanCode, parsed);
        return parsed;
      }
    } catch (e) {
      console.warn(`[Server] Error reading file for ${cleanCode}:`, e);
    }
  }

  // Auto-initialize with official reference school store if empty or not existing
  const defaultStore = createDefaultSchoolStore() as SchoolStore;
  if (cleanCode !== 'ECOLE-PRINCIPALE') {
    defaultStore.settings = {
      ...defaultStore.settings,
      schoolName: `Établissement [${cleanCode}]`
    };
  }
  saveSchoolData(cleanCode, defaultStore);
  return defaultStore;
}

function saveSchoolData(code: string, data: SchoolStore): void {
  const cleanCode = sanitizeCode(code);
  data.updatedAt = new Date().toISOString();
  memoryStores.set(cleanCode, data);

  try {
    const filePath = getFilePath(cleanCode);
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);
  } catch (e) {
    try {
      const filePath = getFilePath(cleanCode);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`[Server] Could not persist data for ${cleanCode} to disk:`, err);
    }
  }
}

function broadcastToSchool(code: string, eventType: string, payload: any, senderId?: string): void {
  const cleanCode = sanitizeCode(code);
  const clients = sseClients.get(cleanCode);
  if (!clients || clients.size === 0) return;

  const dataStr = `event: ${eventType}\ndata: ${JSON.stringify({ ...payload, senderId, timestamp: Date.now() })}\n\n`;
  for (const res of clients) {
    try {
      res.write(dataStr);
    } catch (err) {
      clients.delete(res);
    }
  }
}

// ---------------------- API SYNC ENDPOINTS ----------------------

// 1. Real-time Server-Sent Events (SSE) Stream
app.get('/api/sync/events', (req: Request, res: Response) => {
  const schoolCode = sanitizeCode((req.query.school as string) || 'ECOLE-PRINCIPALE');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (!sseClients.has(schoolCode)) {
    sseClients.set(schoolCode, new Set());
  }
  const clients = sseClients.get(schoolCode)!;
  clients.add(res);

  // Send initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ schoolCode, clientsCount: clients.size, time: Date.now() })}\n\n`);

  // Heartbeat every 20s to keep connection alive through proxies/firewalls
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeatTimer);
      clients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    clients.delete(res);
  });
});

// 2. Fetch full current state for a school
app.get('/api/sync/state', (req: Request, res: Response) => {
  const schoolCode = sanitizeCode((req.query.school as string) || 'ECOLE-PRINCIPALE');
  const store = loadSchoolData(schoolCode);
  res.json({ success: true, schoolCode, store });
});

const ALLOWED_MUTATIONS = new Set<string>([
  'SYNC_SETTINGS',
  'SYNC_DOC',
  'DELETE_DOC',
  'CLEAR_COLLECTION',
  'SYNC_PAYMENT',
  'SYNC_EXPENSE',
  'DELETE_EXPENSE'
]);

const ALLOWED_COLLECTIONS = new Set<string>([
  'students',
  'classes',
  'subjects',
  'teachers',
  'grades',
  'payments',
  'attendance',
  'expenses',
  'exam_sessions',
  'exam_slots'
]);

// 3. Bootstrap cloud/server store if empty with initial client data
app.post('/api/sync/bootstrap', (req: Request, res: Response) => {
  try {
    const { schoolCode, seedData: rawSeed } = req.body;
    const cleanCode = sanitizeCode(schoolCode);
    const current = loadSchoolData(cleanCode);

    const hasData = hasMeaningfulData(current);

    if (!hasData && rawSeed && typeof rawSeed === 'object') {
      const seedData = sanitizePayload(rawSeed);
      saveSchoolData(cleanCode, {
        settings: seedData.settings || current.settings || null,
        students: Array.isArray(seedData.students) && seedData.students.length > 0 ? seedData.students : (current.students || []),
        classes: Array.isArray(seedData.classes) && seedData.classes.length > 0 ? seedData.classes : (current.classes || []),
        subjects: Array.isArray(seedData.subjects) && seedData.subjects.length > 0 ? seedData.subjects : (current.subjects || []),
        teachers: Array.isArray(seedData.teachers) && seedData.teachers.length > 0 ? seedData.teachers : (current.teachers || []),
        grades: Array.isArray(seedData.grades) && seedData.grades.length > 0 ? seedData.grades : (current.grades || []),
        payments: Array.isArray(seedData.payments) && seedData.payments.length > 0 ? seedData.payments : (current.payments || []),
        attendance: Array.isArray(seedData.attendance) && seedData.attendance.length > 0 ? seedData.attendance : (current.attendance || []),
        expenses: Array.isArray(seedData.expenses) ? seedData.expenses : (current.expenses || []),
        exam_sessions: Array.isArray(seedData.exam_sessions) ? seedData.exam_sessions : (current.exam_sessions || []),
        exam_slots: Array.isArray(seedData.exam_slots) ? seedData.exam_slots : (current.exam_slots || []),
        updatedAt: new Date().toISOString()
      });
      broadcastToSchool(cleanCode, 'state_reset', { schoolCode: cleanCode, store: loadSchoolData(cleanCode) });
      return res.json({ success: true, bootstrapped: true });
    }

    return res.json({ success: true, bootstrapped: false, currentStore: current });
  } catch (err: any) {
    console.error('[Server Error /api/sync/bootstrap]:', err?.message || err);
    return res.status(500).json({ error: 'Erreur interne lors du bootstrap' });
  }
});

// 4. Push complete school data (or manual cloud push)
app.post('/api/sync/push', (req: Request, res: Response) => {
  try {
    const { schoolCode, data: rawData, senderId } = req.body;
    const cleanCode = sanitizeCode(schoolCode);

    if (!rawData || typeof rawData !== 'object') {
      return res.status(400).json({ error: 'Missing data payload' });
    }

    const data = sanitizePayload(rawData);
    const current = loadSchoolData(cleanCode);

    saveSchoolData(cleanCode, {
      settings: data.settings || current.settings || null,
      students: Array.isArray(data.students) ? data.students : (current.students || []),
      classes: Array.isArray(data.classes) ? data.classes : (current.classes || []),
      subjects: Array.isArray(data.subjects) ? data.subjects : (current.subjects || []),
      teachers: Array.isArray(data.teachers) ? data.teachers : (current.teachers || []),
      grades: Array.isArray(data.grades) ? data.grades : (current.grades || []),
      payments: Array.isArray(data.payments) ? data.payments : (current.payments || []),
      attendance: Array.isArray(data.attendance) ? data.attendance : (current.attendance || []),
      expenses: Array.isArray(data.expenses) ? data.expenses : (current.expenses || []),
      exam_sessions: Array.isArray(data.exam_sessions) ? data.exam_sessions : (current.exam_sessions || []),
      exam_slots: Array.isArray(data.exam_slots) ? data.exam_slots : (current.exam_slots || []),
      updatedAt: new Date().toISOString()
    });

    broadcastToSchool(cleanCode, 'state_updated', { schoolCode: cleanCode, store: loadSchoolData(cleanCode) }, senderId);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[Server Error /api/sync/push]:', err?.message || err);
    return res.status(500).json({ error: 'Erreur interne lors de la sauvegarde' });
  }
});

// 5. Atomic mutations (adding a payment, editing student, adding note, updating attendance, etc.)
app.post('/api/sync/mutate', (req: Request, res: Response) => {
  try {
    const { schoolCode, mutationType, payload: rawPayload, senderId } = req.body;
    if (!mutationType || !ALLOWED_MUTATIONS.has(mutationType)) {
      return res.status(400).json({ error: 'Type de mutation non autorisé' });
    }

    const payload = sanitizePayload(rawPayload);
    const cleanCode = sanitizeCode(schoolCode);
    const store = loadSchoolData(cleanCode);

    switch (mutationType) {
      case 'SYNC_SETTINGS':
        if (payload && typeof payload === 'object') {
          store.settings = { ...(store.settings || {}), ...payload };
        }
        break;

      case 'SYNC_DOC': {
        const { collectionName, item } = payload || {};
        if (!collectionName || !ALLOWED_COLLECTIONS.has(collectionName) || !item || !item.id) {
          return res.status(400).json({ error: 'Collection ou élément manquant' });
        }
        let coll = (store as any)[collectionName] as any[] | undefined;
        if (!Array.isArray(coll)) {
          coll = [];
          (store as any)[collectionName] = coll;
        }

        if (collectionName === 'grades') {
          // De-duplicate matching grade
          const matchIdx = coll.findIndex(g =>
            g.id === item.id ||
            (g.studentId === item.studentId &&
             g.subjectId === item.subjectId &&
             g.term === item.term &&
             g.type === item.type &&
             g.academicYear === item.academicYear)
          );
          if (matchIdx >= 0) {
            coll[matchIdx] = { ...coll[matchIdx], ...item };
          } else {
            coll.push(item);
          }
        } else if (collectionName === 'attendance') {
          // De-duplicate attendance for student on the same date
          const matchIdx = coll.findIndex(r =>
            r.id === item.id ||
            (r.studentId === item.studentId && r.date === item.date)
          );
          if (matchIdx >= 0) {
            coll[matchIdx] = { ...coll[matchIdx], ...item };
          } else {
            coll.push(item);
          }
        } else {
          const idx = coll.findIndex(i => i.id === item.id);
          if (idx >= 0) {
            coll[idx] = { ...coll[idx], ...item };
          } else {
            coll.push(item);
          }
        }
        break;
      }

      case 'DELETE_DOC': {
        const { collectionName, id } = payload || {};
        if (!collectionName || !ALLOWED_COLLECTIONS.has(collectionName) || !id) {
          return res.status(400).json({ error: 'Collection ou identifiant invalide' });
        }
        const coll = (store as any)[collectionName] as any[] | undefined;
        if (Array.isArray(coll)) {
          (store as any)[collectionName] = coll.filter(i => i.id !== id);
        }
        break;
      }

      case 'CLEAR_COLLECTION': {
        const { collectionName } = payload || {};
        if (!collectionName || !ALLOWED_COLLECTIONS.has(collectionName)) {
          return res.status(400).json({ error: 'Collection invalide' });
        }
        if (Array.isArray((store as any)[collectionName])) {
          (store as any)[collectionName] = [];
        }
        break;
      }

      case 'SYNC_PAYMENT': {
        if (!Array.isArray(store.payments)) store.payments = [];
        const payment = payload;
        if (!payment || !payment.id) {
          return res.status(400).json({ error: 'Paiement invalide' });
        }
        const idx = store.payments.findIndex(p => p.id === payment.id);
        if (idx >= 0) {
          store.payments[idx] = { ...store.payments[idx], ...payment };
        } else {
          store.payments.push(payment);
        }
        // Sort newest payments first
        store.payments.sort((a, b) => 
          (b.paymentDate || '').localeCompare(a.paymentDate || '') ||
          (b.receiptNumber || '').localeCompare(a.receiptNumber || '') ||
          (b.id || '').localeCompare(a.id || '')
        );
        break;
      }

      case 'SYNC_EXPENSE': {
        if (!Array.isArray(store.expenses)) store.expenses = [];
        const expense = payload;
        if (!expense || !expense.id) {
          return res.status(400).json({ error: 'Dépense invalide' });
        }
        const idx = store.expenses.findIndex(e => e.id === expense.id);
        if (idx >= 0) {
          store.expenses[idx] = { ...store.expenses[idx], ...expense };
        } else {
          store.expenses.push(expense);
        }
        break;
      }

      case 'DELETE_EXPENSE': {
        if (Array.isArray(store.expenses) && payload?.id) {
          store.expenses = store.expenses.filter(e => e.id !== payload.id);
        }
        break;
      }

      default:
        return res.status(400).json({ error: 'Action non supportée' });
    }

    saveSchoolData(cleanCode, store);

    // Broadcast mutation to all other devices in real-time
    broadcastToSchool(cleanCode, 'mutation', { mutationType, payload }, senderId);

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[Server Error /api/sync/mutate]:', err?.message || err);
    return res.status(500).json({ error: 'Erreur interne lors de la mutation' });
  }
});

// 6. Server Health & Stats
app.get('/api/sync/status', (req: Request, res: Response) => {
  const schoolCode = sanitizeCode((req.query.school as string) || 'ECOLE-PRINCIPALE');
  const clients = sseClients.get(schoolCode);
  res.json({
    status: 'online',
    schoolCode,
    activeConnectedClients: clients ? clients.size : 0,
    timestamp: new Date().toISOString()
  });
});

// ---------------------- VITE DEV / PRODUCTION MIDDLEWARE ----------------------

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa'
    });
    app.get('/@vite/client', async (_req: Request, res: Response, next: () => void) => {
      try {
        const result = await vite.transformRequest('/@vite/client');
        if (result?.code) {
          const patched = result.code.replace(
            'transport.connect(createHMRHandler(handleMessage));',
            '/* HMR disabled */'
          );
          res.setHeader('Content-Type', 'application/javascript');
          return res.send(patched);
        }
      } catch {
        // Fallback to default Vite middleware
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SomaSikolo] Server running on http://0.0.0.0:${PORT} (Real-time Cross-Device Sync active)`);
  });
}

startServer().catch(err => {
  console.error('[SomaSikolo] Server startup failed:', err);
  process.exit(1);
});
