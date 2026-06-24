import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http:///api/api';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'authority'>('student');
  const [name, setName] = useState('');
  
  // Student specific fields
  const [enrollNum, setEnrollNum] = useState('');
  const [roomNum, setRoomNum] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: any = {
        email,
        password,
        role,
        name,
      };

      if (role === 'student') {
        payload.enroll_num = enrollNum;
        payload.room_num = roomNum;
        payload.course = course;
        payload.year = year;
      }

      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Registration Successful',
          description: 'Your account has been created. You can now login.',
        });
        navigate('/login');
      } else {
        toast({
          title: 'Registration Failed',
          description: data.error || 'An error occurred during registration.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to the server.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-primary rounded-full">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">JUescalate - Register</CardTitle>
          <CardDescription>
            Create an account to manage and resolve hostel complaints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Register As</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as 'student' | 'authority')}>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2 p-2 rounded-lg border border-border flex-1">
                    <RadioGroupItem value="student" id="student_role" />
                    <Label htmlFor="student_role" className="cursor-pointer">Student</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-lg border border-border flex-1">
                    <RadioGroupItem value="authority" id="authority_role" />
                    <Label htmlFor="authority_role" className="cursor-pointer">Hostel Authority</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {role === 'student' && (
              <div className="grid grid-cols-2 gap-4 border-t pt-4 border-border">
                <div className="space-y-2">
                  <Label htmlFor="enrollNum">Enrollment Number</Label>
                  <Input
                    id="enrollNum"
                    placeholder="ENR12345"
                    value={enrollNum}
                    onChange={(e) => setEnrollNum(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomNum">Room Number</Label>
                  <Input
                    id="roomNum"
                    placeholder="101"
                    value={roomNum}
                    onChange={(e) => setRoomNum(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Input
                    id="course"
                    placeholder="B.Tech"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year of Study</Label>
                  <Input
                    id="year"
                    placeholder="2"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Registering...' : 'Register'}
              </Button>
              <div className="text-center text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-semibold">
                  Sign In
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
