import { useState } from 'react';
import { useComplaints, ComplaintStatus } from '@/contexts/ComplaintsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/utils/dateUtils';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ComplaintDetailDialogProps {
  complaintId: string | null;
  open: boolean;
  onClose: () => void;
  isAuthority: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://juescalate-api.vercel.app/api';

const ComplaintDetailDialog = ({ complaintId, open, onClose, isAuthority }: ComplaintDetailDialogProps) => {
  const { complaints, updateComplaintStatus } = useComplaints();
  const { user } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<ComplaintStatus>('received');
  const [remarks, setRemarks] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const complaint = complaints.find((c) => c.id === complaintId);

  if (!complaint) return null;

  const handleSubmitUpdate = async () => {
    if (!remarks.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide remarks for the status update.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/update-complaint-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          complaintId: complaint.id,
          status,
          remarks,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Status Updated',
          description: 'The complaint status has been updated successfully.',
        });
        setStatus('received');
        setRemarks('');
        onClose();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update status.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEscalate = async () => {
    if (!escalationReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for escalation.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/escalate-complaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          complaintId: complaint.id,
          reason: escalationReason,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Complaint Escalated',
          description: 'The complaint has been escalated to the next authority level.',
        });
        setEscalationReason('');
        setIsEscalating(false);
        onClose();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to escalate complaint.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for disputing the resolution.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/dispute-resolution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          complaintId: complaint.id,
          reason: disputeReason,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Resolution Disputed',
          description: 'Your dispute has been recorded and will be reviewed.',
        });
        setDisputeReason('');
        setIsDisputing(false);
        onClose();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to submit dispute.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-warning text-warning-foreground';
      case 'medium':
        return 'bg-info text-info-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complaint Details - {complaint.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Complaint Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">{complaint.title}</h3>
              <div className="flex flex-wrap gap-2">
                <Badge className={getPriorityColor(complaint.priority)}>
                  {complaint.priority} priority
                </Badge>
                <Badge variant="outline">{complaint.category}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Student:</span>
                <p className="font-medium">{complaint.studentName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Assigned To:</span>
                <p className="font-medium">{complaint.authorityName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Submitted:</span>
                <p className="font-medium">{formatDateTime(complaint.createdAt)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Current Status:</span>
                <p className="font-medium capitalize">{complaint.status}</p>
              </div>
            </div>

            <div>
              <span className="text-muted-foreground text-sm">Description:</span>
              <p className="mt-1 p-4 bg-muted/30 rounded-lg">{complaint.description}</p>
            </div>
          </div>

          <Separator />

          {/* Status History */}
              {/* Status History */}
          <div>
            <h4 className="font-semibold mb-3">Status History</h4>
            {complaint.statusHistory.length > 0 ? (
              <div className="space-y-3">
                {complaint.statusHistory.map((update) => (
                  <div key={update.id} className="p-4 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium capitalize">{update.status}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(update.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm">{update.remarks}</p>
                    <p className="text-xs text-muted-foreground">Updated by: {update.updatedBy}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No updates yet</p>
            )}
          </div>

          <Separator />

          {/* Escalation History */}
          <div>
            <h4 className="font-semibold mb-3">Complaint Tracking</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Level {complaint.currentAuthorityLevel}</Badge>
                <span className="text-sm">Currently handled by {complaint.authorityName}</span>
              </div>

              {complaint.escalationHistory.length > 0 ? (
                <div className="space-y-3 mt-3">
                  {complaint.escalationHistory.map((escalation, index) => (
                    <div key={index} className="p-4 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">
                          Level {escalation.fromLevel} → Level {escalation.toLevel}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(escalation.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">
                        Escalated from {escalation.fromAuthority} to {escalation.toAuthority}
                      </p>
                      <p className="text-sm text-muted-foreground">Reason: {escalation.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  No escalations - Complaint is being handled at the initial level
                </p>
              )}
            </div>
          </div>

          <Separator />          {/* Update Form (Authority Only) */}
          {isAuthority && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold">Submit Update</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="status">New Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as ComplaintStatus)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Official Remarks</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Provide details about the status update..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex gap-4">
                  <Button onClick={handleSubmitUpdate} className="flex-1">
                    Submit Update
                  </Button>

                  <AlertDialog open={isEscalating} onOpenChange={setIsEscalating}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        Escalate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Escalate Complaint</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will escalate the complaint to the next authority level. Please provide a reason for escalation.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Textarea
                        value={escalationReason}
                        onChange={(e) => setEscalationReason(e.target.value)}
                        placeholder="Reason for escalation..."
                        className="mt-4"
                        rows={4}
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setEscalationReason('')}>Cancel</AlertDialogCancel>
                        <Button onClick={handleEscalate}>Confirm Escalation</Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </>
          )}

          {/* Dispute Button (Student Only, for Resolved Complaints) */}
          {!isAuthority && complaint.status === 'resolved' && (
            <>
              <Separator />
              <div className="space-y-4">
                <AlertDialog open={isDisputing} onOpenChange={setIsDisputing}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Dispute Resolution
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Dispute Resolution</AlertDialogTitle>
                      <AlertDialogDescription>
                        If you are not satisfied with the resolution, you can dispute it. Please provide a detailed reason.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Reason for dispute..."
                      className="mt-4"
                      rows={4}
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDisputeReason('')}>Cancel</AlertDialogCancel>
                      <Button onClick={handleDispute}>Submit Dispute</Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComplaintDetailDialog;
