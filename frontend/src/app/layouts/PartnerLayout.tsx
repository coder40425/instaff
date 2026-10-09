import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { path: '/partner', icon: Home, label: 'Dashboard' },
  { path: '/partner/profile', icon: UserRound, label: 'Profile' },
  { path: '/partner/workers', icon: UsersRound, label: 'My Workers' },
  { path: '/partner/requirements', icon: ClipboardList, label: 'Requirements' },
  { path: '/partner/assignments', icon: CheckCircle2, label: 'Assignments' },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
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
      <nav className="sticky top-0 z-50 flex h-16 items-center border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/partner" className="text-lg font-black tracking-widest">
              INSTAFF <span className="text-sm font-normal tracking-normal text-neutral-400">Partner</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="mr-1 hidden flex-col items-end sm:flex">
              <span className="text-xs font-semibold leading-none">{user?.name}</span>
              <span className="mt-0.5 text-xs leading-none text-neutral-400">Partner</span>
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex">
        {mobileMenuOpen && (
          <button
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          />
        )}

        <aside
          className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 transform border-r border-neutral-200 bg-white transition-transform duration-200 ease-in-out dark:border-neutral-800 dark:bg-neutral-900 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:sticky lg:top-16 lg:translate-x-0`}
        >
          <div className="border-b border-neutral-100 px-4 py-4 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black dark:bg-white">
                <span className="text-sm font-bold text-white dark:text-black">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.name}</p>
                <p className="truncate text-xs text-neutral-400">{user?.phone}</p>
              </div>
            </div>
          </div>

          <div className="h-[calc(100%-5.5rem)] space-y-0.5 overflow-y-auto p-3">
            {navItems.map((item) => {
              const active = item.path === '/partner'
                ? location.pathname === item.path
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                  }`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="h-3 w-3 opacity-60" />}
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
