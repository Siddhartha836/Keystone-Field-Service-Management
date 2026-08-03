const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory data store for live serverless backend
let workOrders = [
  {
    id: 1001,
    code: 'WO-1001',
    title: 'AC Unit Blowing Warm Air',
    description: 'Rooftop HVAC compressor failed at HQ Tower. Inspect refrigerant levels and electrical capacitor.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    slaDueAt: new Date(Date.now() + 14400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    customer: { id: 1, name: 'Meridian Commercial Properties' },
    site: { id: 1, name: 'HQ Office Tower', address: '123 Main St, NY' },
    assignedTo: { id: 3, name: 'Dave Tech (HVAC)', email: 'tech1@keystone.com' },
    timeLogs: [
      { id: 1, minutesSpent: 45, note: 'Diagnosed electrical capacitor failure', createdAt: new Date(Date.now() - 7200000).toISOString() }
    ],
    partUsages: [
      { id: 1, part: { name: 'Compressor Capacitor 45uF' }, quantity: 1, createdAt: new Date(Date.now() - 7200000).toISOString() }
    ]
  },
  {
    id: 1002,
    code: 'WO-1002',
    title: 'Main Lobby Water Leak',
    description: 'Pipe burst near ground floor main atrium entrance.',
    priority: 'EMERGENCY',
    status: 'ASSIGNED',
    slaDueAt: new Date(Date.now() + 7200000).toISOString(),
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    updatedAt: new Date(Date.now() - 21600000).toISOString(),
    customer: { id: 1, name: 'Meridian Commercial Properties' },
    site: { id: 2, name: 'Metro Innovation Campus', address: '456 Tech Ave, CA' },
    assignedTo: { id: 4, name: 'Mike Tech (Plumbing)', email: 'tech2@keystone.com' },
    timeLogs: [],
    partUsages: []
  },
  {
    id: 1003,
    code: 'WO-1003',
    title: 'Flickering Lights in Office 12B',
    description: 'Ballast failure on 12th floor lighting circuit.',
    priority: 'LOW',
    status: 'ASSIGNED',
    slaDueAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    customer: { id: 2, name: 'Nexus Commercial RE' },
    site: { id: 3, name: 'Eastside Warehouse', address: '789 Industrial Pkwy, MA' },
    assignedTo: { id: 3, name: 'Dave Tech (HVAC)', email: 'tech1@keystone.com' },
    timeLogs: [],
    partUsages: []
  },
  {
    id: 1004,
    code: 'WO-1004',
    title: 'Elevator B Inspection & Maintenance',
    description: 'Scheduled monthly hydraulic check and door sensor calibration.',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    slaDueAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    customer: { id: 2, name: 'Nexus Commercial RE' },
    site: { id: 4, name: 'Westside Mall Center', address: '101 Shopping Way, CA' },
    assignedTo: { id: 4, name: 'Mike Tech (Plumbing)', email: 'tech2@keystone.com' },
    timeLogs: [
      { id: 2, minutesSpent: 120, note: 'Hydraulic pressure verified and sensors calibrated', createdAt: new Date(Date.now() - 90000000).toISOString() }
    ],
    partUsages: []
  }
];

let customers = [
  { id: 1, name: 'Meridian Commercial Properties', contactEmail: 'ops@meridian.com' },
  { id: 2, name: 'Nexus Commercial RE', contactEmail: 'contact@nexusre.com' },
  { id: 3, name: 'Apex Retail Holdings', contactEmail: 'support@apexretail.com' }
];

let sites = [
  { id: 1, name: 'HQ Office Tower', address: '123 Main St, NY', customerName: 'Meridian Commercial Properties' },
  { id: 2, name: 'Metro Innovation Campus', address: '456 Tech Ave, CA', customerName: 'Meridian Commercial Properties' },
  { id: 3, name: 'Eastside Warehouse', address: '789 Industrial Pkwy, MA', customerName: 'Nexus Commercial RE' },
  { id: 4, name: 'Westside Mall Center', address: '101 Shopping Way, CA', customerName: 'Apex Retail Holdings' }
];

let technicians = [
  { id: 3, name: 'Dave Tech (HVAC)', email: 'tech1@keystone.com' },
  { id: 4, name: 'Mike Tech (Plumbing)', email: 'tech2@keystone.com' }
];

let userProfiles = {
  'manager@keystone.com': { name: 'John Manager', email: 'manager@keystone.com', role: 'MANAGER', phone: '+1 (555) 019-2834', isOnDuty: true },
  'dispatcher@keystone.com': { name: 'Sarah Dispatcher', email: 'dispatcher@keystone.com', role: 'DISPATCHER', phone: '+1 (555) 019-8877', isOnDuty: true },
  'tech1@keystone.com': { name: 'Dave Tech (HVAC)', email: 'tech1@keystone.com', role: 'TECHNICIAN', phone: '+1 (555) 234-5678', isOnDuty: true },
  'customer@keystone.com': { name: 'Alice Customer (Meridian)', email: 'customer@keystone.com', role: 'CUSTOMER', phone: '+1 (555) 998-1122', isOnDuty: false }
};

let expensesStore = [
  { id: 1, workOrderId: 1001, amount: 45.50, category: 'Fuel/Travel', note: 'Transit to HQ Tower', createdAt: new Date(Date.now() - 7200000).toISOString() }
];

// Helper to extract email from token or return default
function getUserEmail(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload.sub || 'manager@keystone.com';
      }
    } catch (e) {}
  }
  return 'manager@keystone.com';
}

// Router helper to handle both /api/* and direct routes
const router = express.Router();

// Auth Endpoints
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const userEmail = username || 'manager@keystone.com';
  let role = 'MANAGER';
  let name = 'John Manager';

  if (userEmail.includes('tech')) {
    role = 'TECHNICIAN';
    name = 'Dave Tech (HVAC)';
  } else if (userEmail.includes('customer')) {
    role = 'CUSTOMER';
    name = 'Alice Customer (Meridian)';
  } else if (userEmail.includes('dispatcher')) {
    role = 'DISPATCHER';
    name = 'Sarah Dispatcher';
  }

  // Create fake valid JWT token header.payload.signature
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: userEmail, name, role, iat: Math.floor(Date.now()/1000) })).toString('base64url');
  const token = `${header}.${payload}.signature`;

  res.json({ token, email: userEmail, name, role });
});

router.post('/auth/register', (req, res) => {
  const { email, name, role } = req.body;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: email, name: name || 'User', role: role || 'CUSTOMER', iat: Math.floor(Date.now()/1000) })).toString('base64url');
  const token = `${header}.${payload}.signature`;
  res.json({ token, email, name, role: role || 'CUSTOMER' });
});

// Work Orders Endpoints
router.get('/work-orders', (req, res) => {
  res.json(workOrders);
});

router.get('/work-orders/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const wo = workOrders.find(w => w.id === id);
  if (wo) {
    res.json(wo);
  } else {
    res.status(404).json({ message: 'Work order not found' });
  }
});

router.post('/work-orders', (req, res) => {
  const { title, description, priority, siteId } = req.body;
  const siteObj = sites.find(s => s.id === parseInt(siteId)) || sites[0];
  const newWo = {
    id: Date.now(),
    code: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
    title: title || 'New Maintenance Request',
    description: description || 'Service request created by customer',
    priority: priority || 'MEDIUM',
    status: 'NEW',
    slaDueAt: new Date(Date.now() + 43200000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customer: { id: 1, name: siteObj.customerName || 'Meridian Commercial Properties' },
    site: siteObj,
    timeLogs: [],
    partUsages: []
  };
  workOrders.unshift(newWo);
  res.status(201).json(newWo);
});

router.post('/work-orders/:id/status', (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const wo = workOrders.find(w => w.id === id);
  if (wo) {
    wo.status = status;
    wo.updatedAt = new Date().toISOString();
    res.json(wo);
  } else {
    res.status(404).json({ message: 'Work order not found' });
  }
});

router.post('/work-orders/:id/assign', (req, res) => {
  const id = parseInt(req.params.id);
  const { technicianId } = req.body;
  const tech = technicians.find(t => t.id === parseInt(technicianId)) || technicians[0];
  const wo = workOrders.find(w => w.id === id);
  if (wo) {
    wo.assignedTo = tech;
    if (wo.status === 'NEW') wo.status = 'ASSIGNED';
    wo.updatedAt = new Date().toISOString();
    res.json(wo);
  } else {
    res.status(404).json({ message: 'Work order not found' });
  }
});

router.post('/work-orders/:id/time', (req, res) => {
  const id = parseInt(req.params.id);
  const { minutes, note } = req.body;
  const wo = workOrders.find(w => w.id === id);
  if (wo) {
    const log = {
      id: Date.now(),
      minutesSpent: parseInt(minutes) || 30,
      note: note || 'Labor time logged',
      createdAt: new Date().toISOString()
    };
    if (!wo.timeLogs) wo.timeLogs = [];
    wo.timeLogs.push(log);
    wo.updatedAt = new Date().toISOString();
    res.json(wo);
  } else {
    res.status(404).json({ message: 'Work order not found' });
  }
});

router.post('/work-orders/:id/parts', (req, res) => {
  const id = parseInt(req.params.id);
  const { partId, qtyUsed } = req.body;
  const wo = workOrders.find(w => w.id === id);
  if (wo) {
    const usage = {
      id: Date.now(),
      part: { id: parseInt(partId) || 1, name: 'Replacement Spare Part' },
      quantity: parseInt(qtyUsed) || 1,
      createdAt: new Date().toISOString()
    };
    if (!wo.partUsages) wo.partUsages = [];
    wo.partUsages.push(usage);
    wo.updatedAt = new Date().toISOString();
    res.json(wo);
  } else {
    res.status(404).json({ message: 'Work order not found' });
  }
});

// Users Endpoints
router.get('/users/profile', (req, res) => {
  const email = getUserEmail(req);
  const prof = userProfiles[email] || { name: 'John Manager', email, role: 'MANAGER', phone: '+1 (555) 019-2834', isOnDuty: true };
  res.json(prof);
});

router.put('/users/profile', (req, res) => {
  const email = getUserEmail(req);
  const { name, phone, avatarUrl } = req.body;
  const current = userProfiles[email] || { name: 'John Manager', email, role: 'MANAGER', phone: '+1 (555) 019-2834', isOnDuty: true };
  const updated = { ...current, name: name || current.name, phone: phone || current.phone, avatarUrl };
  userProfiles[email] = updated;
  res.json(updated);
});

router.post('/users/duty', (req, res) => {
  const email = getUserEmail(req);
  const { isOnDuty } = req.body;
  const current = userProfiles[email] || { name: 'Dave Tech (HVAC)', email, role: 'TECHNICIAN', phone: '+1 (555) 234-5678', isOnDuty: false };
  current.isOnDuty = isOnDuty;
  userProfiles[email] = current;
  res.json({ message: 'Duty status updated', isOnDuty });
});

router.get('/users/technicians', (req, res) => {
  res.json(technicians);
});

router.get('/users/expenses/:jobId', (req, res) => {
  const jobId = parseInt(req.params.jobId);
  const list = expensesStore.filter(e => e.workOrderId === jobId);
  res.json(list);
});

router.post('/users/expenses', (req, res) => {
  const { workOrderId, amount, category, note } = req.body;
  const exp = {
    id: Date.now(),
    workOrderId: parseInt(workOrderId),
    amount: parseFloat(amount) || 0,
    category: category || 'General',
    note: note || '',
    createdAt: new Date().toISOString()
  };
  expensesStore.push(exp);
  res.status(201).json(exp);
});

// Customers & Sites Endpoints
router.get('/customers', (req, res) => {
  res.json(customers);
});

router.post('/customers', (req, res) => {
  const { name, contactEmail } = req.body;
  const newCust = { id: Date.now(), name, contactEmail };
  customers.push(newCust);
  res.status(201).json(newCust);
});

router.get('/customers/:id/sites', (req, res) => {
  const custId = parseInt(req.params.id);
  const cust = customers.find(c => c.id === custId);
  const list = sites.filter(s => s.customerName === (cust ? cust.name : ''));
  res.json(list.length > 0 ? list : sites);
});

router.post('/customers/:id/sites', (req, res) => {
  const custId = parseInt(req.params.id);
  const cust = customers.find(c => c.id === custId);
  const { name, address } = req.body;
  const newSite = {
    id: Date.now(),
    name,
    address,
    customerName: cust ? cust.name : 'Commercial Client'
  };
  sites.push(newSite);
  res.status(201).json(newSite);
});

// Mount router on both root / and /api
app.use('/.netlify/functions/api', router);
app.use('/api', router);
app.use('/', router);

module.exports.handler = serverless(app);
