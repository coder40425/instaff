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

interface LoginForm {
  phone: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      const response = await authService.login(data);
      login(response.token, response.user);
      toast.success('Login successful!');

      if (response.user.role === 'CUSTOMER') {
        navigate('/customer');
      } else if (response.user.role === 'WORKER') {
        navigate('/worker');
      } else if (response.user.role === 'ADMIN') {
        navigate('/admin');
      } else if (response.user.role === 'PARTNER') {
        navigate('/partner');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
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
            Connecting homes<br />with trusted hands.
          </h1>
          <p className="text-neutral-400 text-base leading-relaxed max-w-sm">
            Book verified maids, cooks, drivers, nurses and more — instantly or scheduled, at your doorstep.
          </p>
        </div>
        <div className="flex gap-6 text-neutral-500 text-xs">
          <span>Verified Workers</span>
          <span>·</span>
          <span>Instant Booking</span>
          <span>·</span>
          <span>Trusted Platform</span>
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
            <CardTitle className="text-xl font-bold text-black dark:text-white">Welcome back</CardTitle>
            <CardDescription className="text-neutral-500 dark:text-neutral-400 text-sm">
              Sign in to manage your bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  placeholder="Enter your password"
                  className="h-10 text-sm"
                  {...register('password', { required: 'Password is required' })}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-white font-semibold text-sm mt-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin dark:border-black/30 dark:border-t-black" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">Don't have an account? </span>
              <button
                type="button"
                onClick={() => navigate('/auth/register')}
                className="text-black dark:text-white font-semibold hover:underline underline-offset-2"
              >
                Register
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
