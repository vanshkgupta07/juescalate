import { createContext, useContext, useState, ReactNode } from 'react';

export type ComplaintStatus = 'pending' | 'received' | 'in-progress' | 'resolved' | 'rejected' | 'escalated';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ComplaintCategory = 'electricity' | 'plumbing' | 'internet' | 'cleaning' | 'furniture' | 'other';

interface EscalationHistoryItem {
  fromLevel: number;
  toLevel: number;
  fromAuthority: string;
  toAuthority: string;
  reason: string;
  timestamp: Date;
}

export interface StatusUpdate {
  id: string;
  status: ComplaintStatus;
  remarks: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface Complaint {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  authorityId: string;
  authorityName: string;
  status: ComplaintStatus;
  createdAt: Date;
  attachments?: string[];
  statusHistory: StatusUpdate[];
  currentAuthorityLevel: number;
  escalationHistory: EscalationHistoryItem[];
}

interface ComplaintsContextType {
  complaints: Complaint[];
  addComplaint: (complaint: Omit<Complaint, 'id' | 'createdAt' | 'statusHistory' | 'currentAuthorityLevel' | 'escalationHistory'>) => void;
  updateComplaintStatus: (complaintId: string, status: ComplaintStatus, remarks: string, authorityName: string) => void;
  escalateComplaint: (complaintId: string, toAuthorityId: string, toAuthorityName: string, reason: string, fromAuthorityName: string) => void;
  getStudentComplaints: (studentId: string) => Complaint[];
  getAuthorityComplaints: (authorityId: string) => Complaint[];
}

const ComplaintsContext = createContext<ComplaintsContextType | undefined>(undefined);

// Mock initial complaints
const mockComplaints: Complaint[] = [
  {
    id: 'C001',
    studentId: '1',
    studentName: 'Rahul Kumar',
    title: 'Ceiling fan not working',
    description: 'The ceiling fan in my room has stopped working since yesterday. It makes a humming sound but does not rotate.',
    category: 'electricity',
    priority: 'high',
    authorityId: '3',
    authorityName: 'Amit Singh',
    status: 'in-progress',
    createdAt: new Date('2024-01-15'),
    currentAuthorityLevel: 1,
    escalationHistory: [],
    statusHistory: [
      {
        id: 'U001',
        status: 'received',
        remarks: 'Complaint received. Will inspect within 24 hours.',
        updatedAt: new Date('2024-01-15'),
        updatedBy: 'Amit Singh',
      },
      {
        id: 'U002',
        status: 'in-progress',
        remarks: 'Technician assigned. Parts ordered.',
        updatedAt: new Date('2024-01-16'),
        updatedBy: 'Amit Singh',
      },
    ],
  },
  {
    id: 'C002',
    studentId: '1',
    studentName: 'Rahul Kumar',
    title: 'Water leakage in bathroom',
    description: 'There is continuous water leakage from the bathroom tap even when fully closed.',
    category: 'plumbing',
    priority: 'medium',
    authorityId: '2',
    authorityName: 'Dr. Priya Sharma',
    status: 'escalated',
    createdAt: new Date('2024-01-10'),
    currentAuthorityLevel: 2,
    escalationHistory: [
      {
        fromLevel: 1,
        toLevel: 2,
        fromAuthority: 'Mr. Raj Kumar',
        toAuthority: 'Dr. Priya Sharma',
        reason: 'Issue requires higher level approval',
        timestamp: new Date('2024-01-11'),
      }
    ],
    statusHistory: [
      {
        id: 'U003',
        status: 'received',
        remarks: 'Forwarded to plumber.',
        updatedAt: new Date('2024-01-10'),
        updatedBy: 'Mr. Raj Kumar',
      },
      {
        id: 'U004',
        status: 'escalated',
        remarks: 'Issue requires higher level approval',
        updatedAt: new Date('2024-01-11'),
        updatedBy: 'Mr. Raj Kumar',
      },
    ],
  },
];

export function ComplaintsProvider({ children }: { children: ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>(mockComplaints);

  const addComplaint = (newComplaint: Omit<Complaint, 'id' | 'createdAt' | 'statusHistory' | 'currentAuthorityLevel' | 'escalationHistory'>) => {
    const complaint: Complaint = {
      ...newComplaint,
      id: `C${String(complaints.length + 1).padStart(3, '0')}`,
      createdAt: new Date(),
      statusHistory: [],
      currentAuthorityLevel: 1,
      escalationHistory: [],
    };
    setComplaints([...complaints, complaint]);
  };

  const updateComplaintStatus = (
    complaintId: string,
    status: ComplaintStatus,
    remarks: string,
    authorityName: string
  ) => {
    setComplaints(
      complaints.map((complaint) => {
        if (complaint.id === complaintId) {
          const statusUpdate: StatusUpdate = {
            id: `U${String(complaint.statusHistory.length + 1).padStart(3, '0')}`,
            status,
            remarks,
            updatedAt: new Date(),
            updatedBy: authorityName,
          };
          return {
            ...complaint,
            status,
            statusHistory: [...complaint.statusHistory, statusUpdate],
          };
        }
        return complaint;
      })
    );
  };

  const getStudentComplaints = (studentId: string) => {
    return complaints.filter((c) => c.studentId === studentId);
  };

  const getAuthorityComplaints = (authorityId: string) => {
    return complaints.filter((c) => c.authorityId === authorityId);
  };

  const escalateComplaint = (
    complaintId: string,
    toAuthorityId: string,
    toAuthorityName: string,
    reason: string,
    fromAuthorityName: string
  ) => {
    setComplaints(
      complaints.map((complaint) => {
        if (complaint.id === complaintId) {
          const newLevel = complaint.currentAuthorityLevel + 1;
          const escalation: EscalationHistoryItem = {
            fromLevel: complaint.currentAuthorityLevel,
            toLevel: newLevel,
            fromAuthority: complaint.authorityName,
            toAuthority: toAuthorityName,
            reason,
            timestamp: new Date(),
          };
          
          const statusUpdate: StatusUpdate = {
            id: `U${String(complaint.statusHistory.length + 1).padStart(3, '0')}`,
            status: 'escalated',
            remarks: `Escalated to ${toAuthorityName}: ${reason}`,
            updatedAt: new Date(),
            updatedBy: fromAuthorityName,
          };

          return {
            ...complaint,
            status: 'escalated',
            authorityId: toAuthorityId,
            authorityName: toAuthorityName,
            currentAuthorityLevel: newLevel,
            escalationHistory: [...complaint.escalationHistory, escalation],
            statusHistory: [...complaint.statusHistory, statusUpdate],
          };
        }
        return complaint;
      })
    );
  };

  return (
    <ComplaintsContext.Provider
      value={{
        complaints,
        addComplaint,
        updateComplaintStatus,
        escalateComplaint,
        getStudentComplaints,
        getAuthorityComplaints,
      }}
    >
      {children}
    </ComplaintsContext.Provider>
  );
}

export function useComplaints() {
  const context = useContext(ComplaintsContext);
  if (context === undefined) {
    throw new Error('useComplaints must be used within a ComplaintsProvider');
  }
  return context;
}
