import { useAuth } from '@/contexts/AuthContext';
import { useComplaints } from '@/contexts/ComplaintsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGreeting } from '@/utils/dateUtils';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { getStudentComplaints } = useComplaints();

  const complaints = getStudentComplaints(user?.id || '');

  const stats = {
    total: complaints.length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
    inReview: complaints.filter((c) => c.status === 'in-progress' || c.status === 'received').length,
    pending: complaints.filter((c) => c.status === 'pending').length,
  };

  const statCards = [
    {
      title: 'Total Complaints',
      value: stats.total,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'In Review',
      value: stats.inReview,
      icon: Clock,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <StudentLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Hello {user?.name}, {getGreeting()}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back to your complaint dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {complaints.length > 0 ? (
              <div className="space-y-4">
                {complaints.slice(0, 5).map((complaint) => (
                  <div
                    key={complaint.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{complaint.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {complaint.category} • Assigned to {complaint.authorityName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          complaint.status === 'resolved'
                            ? 'bg-success/10 text-success'
                            : complaint.status === 'in-progress'
                            ? 'bg-info/10 text-info'
                            : complaint.status === 'pending'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {complaint.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No complaints registered yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
