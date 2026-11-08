import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data', 'schools');

// Ensure persistent storage directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[Server] Could not create data directory, using in-memory store:', e);
}

app.use(express.json({ limit: '50mb' }));

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
  updatedAt?: string;
}

const memoryStores = new Map<string, SchoolStore>();
const sseClients = new Map<string, Set<Response>>();

function sanitizeCode(code: string): string {
  return (code || 'ECOLE-PRINCIPALE').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'ECOLE-PRINCIPALE';
}

function getFilePath(code: string): string {
  return path.join(DATA_DIR, `${sanitizeCode(code)}.json`);
}

function loadSchoolData(code: string): SchoolStore {
  const cleanCode = sanitizeCode(code);
  if (memoryStores.has(cleanCode)) {
    return memoryStores.get(cleanCode)!;
  }

  const filePath = getFilePath(cleanCode);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      memoryStores.set(cleanCode, parsed);
      return parsed;
    } catch (e) {
      console.warn(`[Server] Error reading file for ${cleanCode}:`, e);
    }
  }

  const emptyStore: SchoolStore = {
    settings: null,
    students: [],
    classes: [],
    subjects: [],
    teachers: [],
    grades: [],
    payments: [],
    attendance: [],
    expenses: [],
    updatedAt: new Date().toISOString()
  };
  memoryStores.set(cleanCode, emptyStore);
  return emptyStore;
}

function saveSchoolData(code: string, data: SchoolStore): void {
  const cleanCode = sanitizeCode(code);
  data.updatedAt = new Date().toISOString();
  memoryStores.set(cleanCode, data);

  try {
    const filePath = getFilePath(cleanCode);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`[Server] Could not persist data for ${cleanCode} to disk:`, e);
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

// 3. Bootstrap cloud/server store if empty with initial client data
app.post('/api/sync/bootstrap', (req: Request, res: Response) => {
  const { schoolCode, seedData } = req.body;
  const cleanCode = sanitizeCode(schoolCode);
  const current = loadSchoolData(cleanCode);

  const hasData = (current.students && current.students.length > 0) ||
                  (current.payments && current.payments.length > 0) ||
                  (current.classes && current.classes.length > 0);

  if (!hasData && seedData) {
    saveSchoolData(cleanCode, {
      settings: seedData.settings || null,
      students: seedData.students || [],
      classes: seedData.classes || [],
      subjects: seedData.subjects || [],
      teachers: seedData.teachers || [],
      grades: seedData.grades || [],
      payments: seedData.payments || [],
      attendance: seedData.attendance || [],
      expenses: seedData.expenses || [],
      updatedAt: new Date().toISOString()
    });
    broadcastToSchool(cleanCode, 'state_reset', { schoolCode: cleanCode, store: loadSchoolData(cleanCode) });
    return res.json({ success: true, bootstrapped: true });
  }

  res.json({ success: true, bootstrapped: false, currentStore: current });
});

// 4. Push complete school data (or manual cloud push)
app.post('/api/sync/push', (req: Request, res: Response) => {
  const { schoolCode, data, senderId } = req.body;
  const cleanCode = sanitizeCode(schoolCode);

  if (!data) {
    return res.status(400).json({ error: 'Missing data payload' });
  }

  saveSchoolData(cleanCode, {
    settings: data.settings,
    students: data.students || [],
    classes: data.classes || [],
    subjects: data.subjects || [],
    teachers: data.teachers || [],
    grades: data.grades || [],
    payments: data.payments || [],
    attendance: data.attendance || [],
    expenses: data.expenses || [],
    updatedAt: new Date().toISOString()
  });

  broadcastToSchool(cleanCode, 'state_updated', { schoolCode: cleanCode, store: loadSchoolData(cleanCode) }, senderId);
  res.json({ success: true });
});

// 5. Atomic mutations (adding a payment, editing student, adding note, updating attendance, etc.)
app.post('/api/sync/mutate', (req: Request, res: Response) => {
  const { schoolCode, mutationType, payload, senderId } = req.body;
  const cleanCode = sanitizeCode(schoolCode);
  const store = loadSchoolData(cleanCode);

  switch (mutationType) {
    case 'SYNC_SETTINGS':
      store.settings = payload;
      break;

    case 'SYNC_DOC': {
      const { collectionName, item } = payload;
      const coll = (store as any)[collectionName] as any[] | undefined;
      if (Array.isArray(coll)) {
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
      const { collectionName, id } = payload;
      const coll = (store as any)[collectionName] as any[] | undefined;
      if (Array.isArray(coll)) {
        (store as any)[collectionName] = coll.filter(i => i.id !== id);
      }
      break;
    }

    case 'CLEAR_COLLECTION': {
      const { collectionName } = payload;
      if (Array.isArray((store as any)[collectionName])) {
        (store as any)[collectionName] = [];
      }
      break;
    }

    case 'SYNC_PAYMENT': {
      if (!Array.isArray(store.payments)) store.payments = [];
      const payment = payload;
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
      console.warn(`[Server] Unknown mutationType: ${mutationType}`);
  }

  saveSchoolData(cleanCode, store);

  // Broadcast mutation to all other devices in real-time
  broadcastToSchool(cleanCode, 'mutation', { mutationType, payload }, senderId);

  res.json({ success: true });
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
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa'
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
