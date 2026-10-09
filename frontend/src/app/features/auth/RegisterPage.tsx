import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { authService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { PARTNER_TYPES, type PartnerType } from '../../types/partner';

interface RegisterForm {
  name: string;
  phone: string;
  password: string;
  partnerType?: PartnerType;
}

type RegistrationRole = 'CUSTOMER' | 'WORKER' | 'PARTNER';

const partnerTypeLabel = (value: PartnerType) =>
  value.split('_').map((word) => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RegistrationRole>('CUSTOMER');
  const [selectedPartnerType, setSelectedPartnerType] = useState<PartnerType>('FREELANCER');
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      const response = await authService.register({
        name: data.name,
        phone: data.phone,
        password: data.password,
        role: selectedRole,
        ...(selectedRole === 'PARTNER' ? { partnerType: selectedPartnerType } : {}),
      });
      login(response.token, response.user);
      toast.success('Registration successful!');

      if (response.user.role === 'CUSTOMER') {
        navigate('/customer');
      } else if (response.user.role === 'WORKER') {
        navigate('/worker');
      } else if (response.user.role === 'PARTNER') {
        navigate('/partner');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-neutral-950">

      {/* Left panel — brand */}
      <div className="hidden md:flex md:w-1/2 bg-black flex-col justify-between p-12">
        <div>
          <span className="text-white text-2xl font-black tracking-widest">INSTAFF</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-white text-4xl font-bold leading-tight">
            Your home deserves<br />the best staff.
          </h1>
          <p className="text-neutral-400 text-base leading-relaxed max-w-sm">
            Join thousands of households and workers already using Instaff to simplify home staffing across India.
          </p>
        </div>
        <div className="space-y-2">
          {['Background-verified workers', 'Instant & scheduled bookings', 'Transparent pricing'].map((point) => (
            <div key={point} className="flex items-center gap-2 text-neutral-400 text-xs">
              <span className="w-1 h-1 rounded-full bg-neutral-400 flex-shrink-0" />
              {point}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-neutral-50 dark:bg-neutral-900">

        {/* Mobile-only brand */}
        <div className="md:hidden mb-8 text-center">
          <span className="text-3xl font-black tracking-widest text-black dark:text-white">INSTAFF</span>
          <p className="text-neutral-500 text-sm mt-1">Trusted home staffing, on demand</p>
        </div>

        <Card className="w-full max-w-sm border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-950">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-black dark:text-white">Create account</CardTitle>
            <CardDescription className="text-neutral-500 dark:text-neutral-400 text-sm">
              Get started with Instaff today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  className="h-10 text-sm"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  className="h-10 text-sm"
                  {...register('phone', { required: 'Phone number is required' })}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  className="h-10 text-sm"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  I am registering as
                </Label>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as RegistrationRole)}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">
                      <div className="flex flex-col">
                        <span>Customer</span>
                        <span className="text-xs text-neutral-400">I want to hire staff</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="WORKER">
                      <div className="flex flex-col">
                        <span>Worker</span>
                        <span className="text-xs text-neutral-400">I want to offer my services</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="PARTNER">
                      <div className="flex flex-col">
                        <span>Partner</span>
                        <span className="text-xs text-neutral-400">I manage a workforce and client requirements</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="EMPLOYER" disabled>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400">Employer</span>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole === 'PARTNER' && (
                <div className="space-y-1.5">
                  <Label htmlFor="partnerType" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Partner type
                  </Label>
                  <Select value={selectedPartnerType} onValueChange={(value) => setSelectedPartnerType(value as PartnerType)}>
                    <SelectTrigger id="partnerType" className="h-10 text-sm">
                      <SelectValue placeholder="Select partner type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTNER_TYPES.map((partnerType) => (
                        <SelectItem key={partnerType} value={partnerType}>{partnerTypeLabel(partnerType)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Partner accounts require approval before workforce and requirement operations are available.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-white font-semibold text-sm mt-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin dark:border-black/30 dark:border-t-black" />
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">Already have an account? </span>
              <button
                type="button"
                onClick={() => navigate('/auth/login')}
                className="text-black dark:text-white font-semibold hover:underline underline-offset-2"
              >
                Sign In
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-neutral-400 text-center">
          © {new Date().getFullYear()} Instaff. All rights reserved.
        </p>
      </div>
    </div>
  );
}
