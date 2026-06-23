const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'local-db.json');

const seedUsers = [
  {
    id: 'local-admin-authority',
    email: 'trixcyrus666@gmail.com',
    password: 'Admin@123',
    name: 'Admin Authority',
    role: 'authority',
    department: 'Hostel Administration',
    authority_level: 1,
  },
  {
    id: 'local-authority',
    email: 'authority@example.com',
    password: 'Authority@123',
    name: 'Hostel Authority',
    role: 'authority',
    department: 'Hostel Administration',
    authority_level: 1,
  },
  {
    id: 'local-chief-authority',
    email: 'chief@example.com',
    password: 'Chief@123',
    name: 'Chief Warden',
    role: 'authority',
    department: 'Hostel Administration',
    authority_level: 2,
  },
  {
    id: 'local-student',
    email: 'student@example.com',
    password: 'Student@123',
    name: 'Demo Student',
    role: 'student',
    enroll_num: 'ENR001',
    room_num: '101',
    hostel_block: 'A',
    course: 'btech',
    year: '1',
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    writeDb({
      users: seedUsers,
      complaints: [],
      statusUpdates: [],
      sessions: {},
    });
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function publicUser(user) {
  const { password, ...safeUser } = user;
  return clone(safeUser);
}

function createToken(userId) {
  const db = readDb();
  const token = `local-${crypto.randomUUID()}`;
  db.sessions[token] = userId;
  writeDb(db);
  return token;
}

function signUp({ email, password, role, name, enroll_num, room_num, course, year }) {
  const db = readDb();
  const existing = db.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return { status: 400, data: { error: 'User already exists' } };
  }

  const user = {
    id: `local-${crypto.randomUUID()}`,
    email,
    password,
    name,
    role,
    enroll_num: enroll_num || null,
    room_num: room_num || null,
    hostel_block: role === 'student' ? 'A' : null,
    course: course || null,
    year: year || null,
    department: role === 'authority' ? 'Hostel Administration' : null,
    authority_level: role === 'authority' ? 1 : null,
  };

  db.users.push(user);
  writeDb(db);
  return { status: 201, data: { user: publicUser(user), session: null } };
}

function signIn(email, password, role) {
  const db = readDb();
  const user = db.users.find(
    (candidate) =>
      candidate.email.toLowerCase() === email.toLowerCase() &&
      candidate.password === password &&
      candidate.role === role
  );

  if (!user) {
    return { status: 401, data: { error: 'Invalid email, password, or user type' } };
  }

  const safeUser = publicUser(user);
  return {
    status: 200,
    data: {
      user: safeUser,
      profile: safeUser,
      session: { access_token: createToken(user.id) },
    },
  };
}

function checkAuth(token) {
  const db = readDb();
  const userId = db.sessions[token];
  const user = db.users.find((candidate) => candidate.id === userId);
  if (!user) {
    return { status: 401, data: { error: 'Invalid token' } };
  }
  const safeUser = publicUser(user);
  return { status: 200, data: { user: safeUser, profile: safeUser } };
}

function signOut(token) {
  if (!token) return { status: 200, data: { message: 'Signed out successfully' } };
  const db = readDb();
  delete db.sessions[token];
  writeDb(db);
  return { status: 200, data: { message: 'Signed out successfully' } };
}

function changePassword(userId, currentPassword, newPassword) {
  const db = readDb();
  const user = db.users.find((candidate) => candidate.id === userId);
  if (!user) return { status: 404, data: { error: 'User not found' } };
  if (user.password !== currentPassword) {
    return { status: 401, data: { error: 'Current password is incorrect' } };
  }
  user.password = newPassword;
  writeDb(db);
  return { status: 200, data: { message: 'Password changed successfully' } };
}

function listAuthorities() {
  const db = readDb();
  return db.users
    .filter((user) => user.role === 'authority')
    .map((user) => publicUser(user));
}

function transformComplaint(db, complaint) {
  const student = db.users.find((user) => user.id === complaint.student_id);
  const authority = db.users.find((user) => user.id === complaint.authority_id);
  return {
    id: complaint.id,
    title: complaint.title,
    description: complaint.description,
    status: complaint.status,
    category: complaint.category,
    priority: complaint.priority,
    createdAt: complaint.created_at,
    updatedAt: complaint.updated_at,
    studentId: complaint.student_id,
    studentName: student?.name || complaint.student_name || 'Unknown Student',
    studentDetails: {
      roomNumber: student?.room_num,
      hostelBlock: student?.hostel_block,
      course: student?.course,
      year: student?.year,
    },
    authorityId: complaint.authority_id,
    authorityName: authority?.name || complaint.authority_name || 'Unassigned',
    authorityDepartment: authority?.department,
    currentAuthorityLevel: complaint.current_authority_level || 1,
    escalationHistory: complaint.escalation_history || [],
    statusHistory: [],
    resolvedAt: complaint.resolved_at,
    resolutionComment: complaint.resolution_comment,
    isDisputed: complaint.resolution_disputed,
    disputeReason: complaint.dispute_reason,
  };
}

function registerComplaint(complaint) {
  const db = readDb();
  const now = new Date().toISOString();
  const authority = db.users.find((user) => user.id === complaint.authority_id);
  const row = {
    id: `local-complaint-${crypto.randomUUID()}`,
    ...complaint,
    authority_name: complaint.authority_name || authority?.name || 'Unassigned',
    current_authority_id: complaint.authority_id,
    current_authority_level: 1,
    previous_authorities: [],
    escalation_history: [],
    resolution_comment: null,
    resolved_at: null,
    resolution_disputed: false,
    dispute_reason: null,
    created_at: now,
    updated_at: now,
  };
  db.complaints.push(row);
  writeDb(db);
  return { status: 201, data: [row] };
}

function getStudentComplaints(studentId) {
  const db = readDb();
  return db.complaints
    .filter((complaint) => complaint.student_id === studentId)
    .map((complaint) => transformComplaint(db, complaint));
}

function getAuthorityComplaints(authorityId) {
  const db = readDb();
  return db.complaints
    .filter((complaint) => complaint.authority_id === authorityId || complaint.current_authority_id === authorityId)
    .map((complaint) => transformComplaint(db, complaint));
}

function updateComplaintStatus(complaintId, status, remarks, updatedBy) {
  const db = readDb();
  const complaint = db.complaints.find((candidate) => candidate.id === complaintId);
  if (!complaint) return { status: 404, data: { error: 'Complaint not found' } };

  const now = new Date().toISOString();
  complaint.status = status;
  complaint.updated_at = now;
  if (remarks) complaint.resolution_comment = remarks;
  if (status === 'resolved') complaint.resolved_at = now;

  const statusUpdate = {
    id: `local-status-${crypto.randomUUID()}`,
    complaint_id: complaintId,
    status,
    remarks,
    updated_by: updatedBy,
    created_at: now,
  };
  db.statusUpdates.push(statusUpdate);
  writeDb(db);

  return { status: 200, data: { ...complaint, statusHistory: getStatusHistory(complaintId).data } };
}

function getStatusHistory(complaintId) {
  const db = readDb();
  const complaint = db.complaints.find((candidate) => candidate.id === complaintId);
  if (!complaint) return { status: 404, data: { error: 'Complaint not found' } };

  const initial = {
    id: 'initial',
    status: 'pending',
    remarks: 'Complaint submitted',
    created_at: complaint.created_at,
    user_profiles: {
      name: complaint.student_name,
      role: 'student',
    },
  };

  const updates = db.statusUpdates
    .filter((update) => update.complaint_id === complaintId)
    .map((update) => {
      const user = db.users.find((candidate) => candidate.id === update.updated_by);
      return {
        ...update,
        user_profiles: user
          ? {
              name: user.name,
              role: user.role,
              department: user.department,
              authority_level: user.authority_level,
            }
          : null,
      };
    });

  return {
    status: 200,
    data: [initial, ...updates].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  };
}

function escalateComplaint(complaintId, reason, authorityId) {
  const db = readDb();
  const complaint = db.complaints.find((candidate) => candidate.id === complaintId);
  if (!complaint) return { status: 404, data: { error: 'Complaint not found' } };

  const currentLevel = complaint.current_authority_level || 1;
  const nextLevel = currentLevel + 1;
  const nextAuthority = db.users.find((user) => user.role === 'authority' && user.authority_level === nextLevel);
  if (!nextAuthority) {
    return { status: 400, data: { error: `No authority found at level ${nextLevel}` } };
  }

  const currentAuthority = db.users.find((user) => user.id === complaint.current_authority_id || user.id === complaint.authority_id);
  complaint.previous_authorities = complaint.previous_authorities || [];
  if (currentAuthority) {
    complaint.previous_authorities.push({
      id: currentAuthority.id,
      name: currentAuthority.name,
      department: currentAuthority.department,
      level: currentAuthority.authority_level,
      timestamp: new Date().toISOString(),
    });
  }

  complaint.escalation_history = complaint.escalation_history || [];
  complaint.escalation_history.push({
    fromLevel: currentLevel,
    toLevel: nextLevel,
    fromAuthority: currentAuthority?.name || 'Unknown',
    toAuthority: nextAuthority.name,
    reason,
    timestamp: new Date().toISOString(),
  });

  complaint.status = 'escalated';
  complaint.authority_id = nextAuthority.id;
  complaint.current_authority_id = nextAuthority.id;
  complaint.authority_name = nextAuthority.name;
  complaint.current_authority_level = nextLevel;
  complaint.updated_at = new Date().toISOString();
  db.statusUpdates.push({
    id: `local-status-${crypto.randomUUID()}`,
    complaint_id: complaintId,
    status: 'escalated',
    remarks: `Escalated to ${nextAuthority.name}: ${reason}`,
    updated_by: authorityId,
    created_at: new Date().toISOString(),
  });
  writeDb(db);
  return { status: 200, data: { message: `Complaint escalated to ${nextAuthority.name}`, complaint } };
}

function disputeResolution(complaintId, reason, studentId) {
  const db = readDb();
  const complaint = db.complaints.find((candidate) => candidate.id === complaintId);
  if (!complaint) return { status: 404, data: { error: 'Complaint not found' } };
  complaint.status = 'disputed';
  complaint.resolution_disputed = true;
  complaint.dispute_reason = reason;
  complaint.updated_at = new Date().toISOString();
  db.statusUpdates.push({
    id: `local-status-${crypto.randomUUID()}`,
    complaint_id: complaintId,
    status: 'disputed',
    remarks: reason,
    updated_by: studentId,
    created_at: new Date().toISOString(),
  });
  writeDb(db);
  return { status: 200, data: { message: 'Complaint disputed and will be reviewed', complaint } };
}

module.exports = {
  signUp,
  signIn,
  checkAuth,
  signOut,
  changePassword,
  listAuthorities,
  registerComplaint,
  getStudentComplaints,
  getAuthorityComplaints,
  updateComplaintStatus,
  getStatusHistory,
  escalateComplaint,
  disputeResolution,
  publicUser,
};
