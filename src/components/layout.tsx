import { Home, Package, ClipboardList, FileDown, Upload, Plus, Bell, User, ChevronDown, LogOut } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { PushSettings } from './PushSettings';
import { useAuth } from '@/lib/auth';

const navigation = [
  { name: 'Accueil', href: '/', icon: Home },
  { name: 'Inventaire', href: '/inventory', icon: ClipboardList },
  { name: 'Ajouter un produit', href: '/add-product', icon: Plus },
  { name: 'Export / Ruptures', href: '/export', icon: FileDown },
];

export function Layout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showPushSettings, setShowPushSettings] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2 flex-shrink-0">
                <img
                  src="/BRUNEAU_PROTECTION_LOGO_SansDate_QUADRI.png"
                  alt="Bruneau Protection"
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold text-[#29235C] hidden sm:block">
                  STK
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      location.pathname === item.href
                        ? 'bg-[#29235C]/10 text-[#29235C]'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPushSettings(true)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Notifications Push"
              >
                <Bell className="h-5 w-5 text-gray-700" />
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Menu utilisateur"
                >
                  <User className="h-5 w-5 text-gray-700" />
                  <ChevronDown className={`h-4 w-4 text-gray-700 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm text-gray-900 font-medium">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        signOut();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile navigation */}
          <div className="flex sm:hidden overflow-x-auto no-scrollbar py-2 -mx-4 px-4">
            <div className="flex space-x-2 min-w-max">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    location.pathname === item.href
                      ? 'bg-[#29235C]/10 text-[#29235C]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {showPushSettings && (
        <PushSettings onClose={() => setShowPushSettings(false)} />
      )}
    </div>
  );
}