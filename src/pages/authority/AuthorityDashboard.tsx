import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getGreeting, formatDate } from '@/utils/dateUtils';
import { Eye, UserPlus, ClipboardList, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import AuthorityLayout from '@/components/AuthorityLayout';
import ComplaintDetailDialog from '@/components/ComplaintDetailDialog';
import AddUserDialog from '@/components/AddUserDialog';

const AuthorityDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    inProgress: 0,
    pending: 0,
    disputed: 0
  });

  useEffect(() => {
    const fetchComplaints = async () => {
      if (!user?.id) return;
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http:///api/api'}/authority-complaints/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setComplaints(data);
        // Calculate statistics
        const total = data.length;
        const resolved = data.filter(c => c.status === 'resolved').length;
        const inProgress = data.filter(c => c.status === 'in_progress').length;
        const pending = data.filter(c => c.status === 'pending').length;
        const disputed = data.filter(c => c.status === 'disputed').length;
        setStats({ total, resolved, inProgress, pending, disputed });
      }
    };
    fetchComplaints();
  }, [user?.id]);

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const isAdmin = user?.email === 'trixcyrus666@gmail.com';

  return (
    <AuthorityLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">
              Hello {user?.name}, {getGreeting()}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back to your complaint dashboard
            </p>
          </div>
          {isAdmin && (
            <Button 
              onClick={() => setIsAddUserOpen(true)}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Complaints</p>
                  <h2 className="text-2xl font-bold mt-1">{stats.total}</h2>
                </div>
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                  <h2 className="text-2xl font-bold mt-1 text-green-600">{stats.resolved}</h2>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Review</p>
                  <h2 className="text-2xl font-bold mt-1 text-blue-600">{stats.inProgress}</h2>
                </div>
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <h2 className="text-2xl font-bold mt-1 text-yellow-600">{stats.pending}</h2>
                </div>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Disputed</p>
                  <h2 className="text-2xl font-bold mt-1 text-red-600">{stats.disputed}</h2>
                </div>
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest complaint assignments and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {complaints.length > 0 ? (
              <div className="space-y-4">
                {complaints.slice(0, 5).map((complaint) => (
                  <div
                    key={complaint.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors gap-4"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{complaint.title}</h4>
                        <span className="text-xs text-muted-foreground">#{complaint.id}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Student: {complaint.studentName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {complaint.category} • {complaint.priority} priority • {formatDate(complaint.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          complaint.status === 'resolved'
                            ? 'bg-success/10 text-success'
                            : complaint.status === 'in_progress'
                            ? 'bg-info/10 text-info'
                            : complaint.status === 'received'
                            ? 'bg-secondary/10 text-secondary'
                            : complaint.status === 'disputed'
                            ? 'bg-destructive/10 text-destructive'
                            : complaint.status === 'pending'
                            ? 'bg-warning/10 text-warning'
                            : complaint.status === 'escalated'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {complaint.status}
                      </span>
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-2"
                        onClick={() => setSelectedComplaintId(complaint.id)}
                      >
                        <Eye className="h-4 w-4" />
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No complaints assigned to you at the moment.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ComplaintDetailDialog
        complaintId={selectedComplaintId}
        open={!!selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        isAuthority={true}
      />

      <AddUserDialog
        open={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
      />
    </AuthorityLayout>
  );
};

export default AuthorityDashboard;
