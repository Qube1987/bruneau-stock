import { Home, Package, ClipboardList, FileDown, Upload, Plus } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Accueil', href: '/', icon: Home },
  { name: 'Inventaire', href: '/inventory', icon: ClipboardList },
  { name: 'Ajouter un produit', href: '/add-product', icon: Plus },
  { name: 'Export / Ruptures', href: '/export', icon: FileDown },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'inline-flex items-center px-4 text-sm font-medium',
                    'border-b-2 transition-colors hover:border-gray-300 hover:text-gray-700',
                    location.pathname === item.href
                      ? 'border-[#E72C63] text-[#E72C63]'
                      : 'border-transparent text-gray-500'
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              ))}
            </div>
            <div className="flex items-center">
              <img
                src="/stock-android-chrome-512x512_(1).png"
                alt="Stock Management"
                className="h-10 w-auto"
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}