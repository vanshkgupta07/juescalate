import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Eye } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import StudentLayout from '@/components/StudentLayout';
import ComplaintDetailDialog from '@/components/ComplaintDetailDialog';

type Authority = {
  id: string;
  name: string;
  department: string;
};

type ComplaintCategory = 'electricity' | 'plumbing' | 'internet' | 'cleaning' | 'furniture' | 'other';
type ComplaintPriority = 'high' | 'urgent';

const StudentComplaints = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electricity' as ComplaintCategory,
    priority: 'medium' as ComplaintPriority,
    authorityId: '',
    customCategory: '',
  });

  const [complaints, setComplaints] = useState([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);

  // Fetch authorities
  useEffect(() => {
    const fetchAuthorities = async () => {
      if (!user?.id) return;
      const token = localStorage.getItem('token');
      try {
        console.log('Fetching authorities with token:', token ? 'Token exists' : 'No token');
        const response = await fetch('https://juescalate-api.vercel.app/api/authorities', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Authorities data:', data);
        
        if (response.ok) {
          setAuthorities(data);
          console.log('Authorities set in state:', data);
        } else {
          console.error('Error response:', data);
          toast({
            title: 'Error',
            description: data.error || 'Failed to load authorities.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching authorities:', error);
        toast({
          title: 'Error',
          description: 'Failed to load authorities. Please try again.',
          variant: 'destructive',
        });
      }
    };

    fetchAuthorities();
  }, [user?.id]);

  useEffect(() => {
    const fetchComplaints = async () => {
      if (!user?.id) return;
      const token = localStorage.getItem('token');
      const response = await fetch(`https://juescalate-api.vercel.app/api/student-complaints/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setComplaints(data);
      }
    };
    fetchComplaints();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

      if (!formData.authorityId) {
      toast({
        title: 'Error',
        description: 'Please select an authority to assign the complaint to.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.category === 'other' && !formData.customCategory.trim()) {
      toast({
        title: 'Error',
        description: 'Please specify the category.',
        variant: 'destructive',
      });
      return;
    }    const authority = authorities.find((a) => a.id === formData.authorityId);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://juescalate-api.vercel.app/api/register-complaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          studentId: user?.id || '',
          studentName: user?.name || '',
          authority_id: formData.authorityId,
          authorityName: authority?.name || '',
          status: 'pending',
          category: formData.category === 'other' ? formData.customCategory : formData.category,
          priority: formData.priority,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Complaint Registered',
          description: 'Your complaint has been successfully submitted.',
        });
        setFormData({
          title: '',
          description: '',
          category: 'electricity',
          priority: 'high',
          authorityId: '',
          customCategory: '',
        });
        setIsDialogOpen(false);
        // Optionally, refresh complaints list here
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to register complaint.',
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

  return (
    <StudentLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Complaints</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your hostel complaints
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-muted-foreground mt-1">
                Debug: {authorities.length} authorities loaded
              </div>
            )}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Register New Complaint
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register New Complaint</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief summary of the issue"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide detailed explanation of the issue"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value as ComplaintCategory })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electricity">Electricity</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="internet">Internet</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.category === 'other' && (
                      <div className="mt-2">
                        <Input
                          placeholder="Specify category"
                          value={formData.customCategory}
                          onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value as ComplaintPriority })}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authority">Assign to Authority *</Label>
                  <Select
                    value={formData.authorityId}
                    onValueChange={(value) => setFormData({ ...formData, authorityId: value })}
                  >
                    <SelectTrigger id="authority">
                      <SelectValue placeholder="Select authority" />
                    </SelectTrigger>
                    <SelectContent>
                      {authorities.map((authority) => (
                        <SelectItem key={authority.id} value={authority.id}>
                          {authority.name} - {authority.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full">
                  Submit Complaint
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            {complaints.length > 0 ? (
              <div className="space-y-4">
                {complaints.map((complaint) => (
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
                        {complaint.category} • {complaint.priority} priority
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Assigned to {complaint.authorityName} • {formatDate(complaint.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          complaint.status === 'resolved'
                            ? 'bg-success/10 text-success'
                            : complaint.status === 'in-progress'
                            ? 'bg-info/10 text-info'
                            : complaint.status === 'received'
                            ? 'bg-secondary/10 text-secondary'
                            : complaint.status === 'pending'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {complaint.status}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => setSelectedComplaintId(complaint.id)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No complaints found. Register your first complaint!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ComplaintDetailDialog
        complaintId={selectedComplaintId}
        open={!!selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        isAuthority={false}
      />
    </StudentLayout>
  );
};

export default StudentComplaints;
