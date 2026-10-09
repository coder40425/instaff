import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { ThemeToggle } from '../components/ThemeToggle';
import { Home, User, Calendar, MapPin, DollarSign, LogOut, Menu, X, ChevronRight, ClipboardList, Building2 } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/worker', icon: Home, label: 'Dashboard' },
  { path: '/worker/bookings', icon: Calendar, label: 'My Bookings' },
  { path: '/worker/requirements', icon: ClipboardList, label: 'My Requirements' },
  { path: '/worker/partners', icon: Building2, label: 'My Partners' },
  { path: '/worker/earnings', icon: DollarSign, label: 'Earnings' },
  { path: '/worker/location', icon: MapPin, label: 'Location' },
  { path: '/worker/profile', icon: User, label: 'Profile' },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">

      {/* Top navbar */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 h-16 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/worker" className="font-black text-lg tracking-widest">
              INSTAFF <span className="font-normal text-neutral-400 text-sm tracking-normal">Worker</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-xs font-semibold leading-none">{user?.name}</span>
              <span className="text-xs text-neutral-400 leading-none mt-0.5">Worker</span>
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex">

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-40
          bg-white dark:bg-neutral-900
          border-r border-neutral-200 dark:border-neutral-800
          transform transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:sticky lg:top-16
        `}>
          {/* User info in sidebar */}
          <div className="px-4 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-black dark:bg-white flex items-center justify-center flex-shrink-0">
                <span className="text-white dark:text-black font-bold text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{user?.name}</p>
                <p className="text-xs text-neutral-400 truncate">{user?.phone}</p>
              </div>
            </div>
          </div>

          <div className="p-3 space-y-0.5">
            {navItems.map((item) => {
              const active = location.pathname === item.path ||
                (item.path !== '/worker' && location.pathname.startsWith(`${item.path}/`));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
