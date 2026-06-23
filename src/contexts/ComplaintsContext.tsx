import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type ComplaintStatus = 'pending' | 'received' | 'in_progress' | 'resolved' | 'rejected' | 'escalated' | 'disputed';
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

interface StudentDetails {
  roomNumber?: string;
  hostelBlock?: string;
  course?: string;
  year?: string;
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
  authorityDepartment?: string;
  status: ComplaintStatus;
  createdAt: Date;
  attachments?: string[];
  statusHistory: StatusUpdate[];
  currentAuthorityLevel: number;
  escalationHistory: EscalationHistoryItem[];
  studentDetails?: StudentDetails;
  resolvedAt?: Date | null;
  resolutionComment?: string;
  isDisputed?: boolean;
  disputeReason?: string;
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

export function ComplaintsProvider({ children }: { children: ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const { user } = useAuth();

  // Fetch complaints based on user role
  useEffect(() => {
    const fetchComplaints = async () => {
      if (!user?.id) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const endpoint = user.role === 'student'
          ? `http://localhost:3000/api/student-complaints/${user.id}`
          : `http://localhost:3000/api/authority-complaints/${user.id}`;

        console.log('Fetching complaints from:', endpoint);

        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log('Complaints data:', data);

        if (response.ok) {
          setComplaints(data);
        } else {
          console.error('Error fetching complaints:', data);
        }
      } catch (error) {
        console.error('Error fetching complaints:', error);
      }
    };

    fetchComplaints();
  }, [user?.id, user?.role]);

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
