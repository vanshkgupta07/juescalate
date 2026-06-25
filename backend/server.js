const express = require('express');
const cors = require('cors');
const path = require('path');
const { signUp, supabaseSignIn, supabaseCheckAuth, signOut } = require('./auth');
const { changePassword } = require('./changepass');
const { registerComplaint } = require('./registerComplaint');
const { updateComplaintStatus } = require('./updateComplaintStatus');
const { fetchStudentComplaints, fetchAuthorityComplaints } = require('./fetchComplaints');
const { fetchStatusHistory } = require('./fetchStatusHistory');
const { disputeResolution } = require('./disputeResolution');
const { handleEscalation } = require('./handleEscalation');
const fetchAuthorities = require('./fetchAuthorities');
const { deleteComplaint } = require('./deleteComplaint');

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',  // Vite default dev server
    'http://localhost:3000',  // Common local development port
    'http://localhost:8080',  // Additional localhost port
    'http://localhost:8081',  // Vite dev server actual port
    'https://juescalate.vercel.app',  // Production frontend URL
    /\.vercel\.app$/,  // Any Vercel preview deployments
    /\.onrender\.com$/,  // Any Render deployments
  ],

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

// Pre-flight requests
app.options('*', cors(corsOptions));

app.use(express.json());

// Authentication routes
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, role, name, enroll_num, room_num, course, year } = req.body;
  if (!email || !password || !role || !name) {
    return res.status(400).json({ error: 'Email, password, role, and name are required' });
  }
  if (!['student', 'authority'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role provided' });
  }
  const result = await signUp(email, password, role, name, enroll_num, room_num, course, year);
  res.status(result.status).json(result.data);
});

app.post('/api/auth/signin', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }
  if (!['student', 'authority'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role provided' });
  }
  const result = await supabaseSignIn(email, password, role);
  res.status(result.status).json(result.data);
});

app.post('/api/auth/check', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const result = await supabaseCheckAuth(token);
  res.status(result.status).json(result.data);
});

app.post('/api/auth/signout', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const result = await signOut(token);
  res.status(result.status).json(result.data);
});

app.post('/api/auth/changepassword', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { currentPassword, newPassword } = req.body;
  if (!token || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Token, current password, and new password are required' });
  }
  // Get user id from token
  const authResult = await supabaseCheckAuth(token);
  if (authResult.status !== 200 || !authResult.data.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const userId = authResult.data.user.id;
  const result = await changePassword(userId, currentPassword, newPassword);
  res.status(result.status).json(result.data);
});

app.post('/api/register-complaint', async (req, res) => {
  const complaint = req.body;
  
  // Log the incoming request for debugging
  console.log('Received complaint data:', complaint);
  
  // Check for both authorityId and authority_id to handle different cases
  const hasAuthorityId = complaint.authorityId || complaint.authority_id;
  
  if (!complaint || !complaint.studentId || !complaint.title || !complaint.description || !hasAuthorityId) {
    console.log('Missing fields:', {
      studentId: complaint.studentId,
      title: complaint.title,
      description: complaint.description,
      authorityId: complaint.authorityId,
      authority_id: complaint.authority_id
    });
    return res.status(400).json({ error: 'Missing required complaint fields' });
  }
  
  const result = await registerComplaint({
    ...complaint,
    // Normalize authority field
    authorityId: complaint.authorityId || complaint.authority_id,
    createdAt: new Date().toISOString(),
  });
  res.status(result.status).json(result.data);
});

app.post('/api/update-complaint-status', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }

  const authResult = await supabaseCheckAuth(token);
  if (authResult.status !== 200) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { complaintId, status, remarks } = req.body;
  if (!complaintId || !status) {
    return res.status(400).json({ error: 'Complaint ID and status are required' });
  }

  const userId = authResult.data.user.id;
  console.log('Updating complaint status:', { complaintId, status, remarks, userId });
  const result = await updateComplaintStatus(complaintId, status, remarks, userId);
  res.status(result.status).json(result.data);
});

// Fetch complaint status history
app.get('/api/complaint-status-history/:complaintId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }

  const authResult = await supabaseCheckAuth(token);
  if (authResult.status !== 200) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { complaintId } = req.params;
  if (!complaintId) {
    return res.status(400).json({ error: 'Complaint ID is required' });
  }

  const result = await fetchStatusHistory(complaintId);
  res.status(result.status).json(result.data);
});

// Delete a complaint
app.delete('/api/complaint/:complaintId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }

  const authResult = await supabaseCheckAuth(token);
  if (authResult.status !== 200) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { complaintId } = req.params;
  const studentId = authResult.data.user.id;
  
  const result = await deleteComplaint(complaintId, studentId);
  res.status(result.status).json(result.data);
});

app.get('/api/student-complaints/:studentId', async (req, res) => {
  const { studentId } = req.params;
  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required' });
  }
  const result = await fetchStudentComplaints(studentId);
  res.status(result.status).json(result.data);
});

app.get('/api/authority-complaints/:authorityId', async (req, res) => {
  const { authorityId } = req.params;
  if (!authorityId) {
    return res.status(400).json({ error: 'Authority ID is required' });
  }
  const result = await fetchAuthorityComplaints(authorityId);
  res.status(result.status).json(result.data);
});

// Handle complaint escalation
app.post('/api/escalate-complaint', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }

  const authResult = await supabaseCheckAuth(token);
  if (authResult.status !== 200) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { complaintId, reason } = req.body;
  if (!complaintId || !reason) {
    return res.status(400).json({ error: 'Complaint ID and reason are required' });
  }

  const userId = authResult.data.user.id;
  console.log('Processing complaint escalation:', { complaintId, reason, userId });
  const result = await handleEscalation(complaintId, reason, userId);
  res.status(result.status).json(result.data);
});

// Handle dispute resolution
app.post('/api/dispute-resolution', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }

  const authResult = await supabaseCheckAuth(token);
  if (authResult.status !== 200) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { complaintId, reason } = req.body;
  if (!complaintId || !reason) {
    return res.status(400).json({ error: 'Complaint ID and reason are required' });
  }

  const userId = authResult.data.user.id;
  console.log('Processing dispute resolution:', { complaintId, reason, userId });
  const result = await disputeResolution(complaintId, reason, userId);
  res.status(result.status).json(result.data);
});

// Fetch all authorities
app.get('/api/authorities', async (req, res) => {
  try {
    console.log('Received request for authorities');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Authorization token is required' });
    }
    
    console.log('Checking auth token...');
    const authResult = await supabaseCheckAuth(token);
    if (authResult.status !== 200) {
      console.log('Invalid token:', authResult);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log('Token valid, fetching authorities...');
    return await fetchAuthorities(req, res);
  } catch (error) {
    console.error('Error in /api/authorities endpoint:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});
// Serve frontend static files in production
const frontendPath = path.join(__dirname, '..', 'dist');
app.use(express.static(frontendPath));

// Catch-all: serve index.html for any non-API route (React Router support)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(port, () => {
  console.log('Server is running on port ' + port);
});

module.exports = app;
