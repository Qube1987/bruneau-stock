import { Home, Package, ClipboardList, FileDown, Plus, Bell, BellOff, User, ChevronDown, LogOut, AlertTriangle, X, Settings } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { PushSettings } from './PushSettings';
import { useAuth } from '@/lib/auth';
import { getOutOfStockProducts } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

const navigation = [
  { name: 'Accueil', href: '/', icon: Home },
  { name: 'Inventaire', href: '/inventory', icon: ClipboardList },
  { name: 'Ajouter un produit', href: '/add-product', icon: Plus },
  { name: 'Export / Ruptures', href: '/export', icon: FileDown },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showPushSettings, setShowPushSettings] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifPanelRef.current && !notifPanelRef.current.contains(event.target as Node)) {
        setShowNotifPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchOutOfStock = async () => {
    try {
      const products = await getOutOfStockProducts();
      setOutOfStockCount(products.length);
      return products;
    } catch (err) {
      console.error('Error fetching out of stock products:', err);
      return [];
    }
  };

  const fetchOutOfStockList = async () => {
    setLoadingNotifs(true);
    try {
      const products = await getOutOfStockProducts();
      setOutOfStockProducts(products.slice(0, 20));
      setOutOfStockCount(products.length);
    } catch (err) {
      console.error('Error fetching out of stock list:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchOutOfStock();

    const channel = supabase
      .channel('stock-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_products' }, () => {
        fetchOutOfStock();
        if (showNotifPanel) fetchOutOfStockList();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [showNotifPanel]);

  const handleBellClick = () => {
    if (!showNotifPanel) {
      fetchOutOfStockList();
    }
    setShowNotifPanel(!showNotifPanel);
  };

  const getStockLevel = (product: Product) => {
    const locations: string[] = [];
    if (product.depot_quantity < product.min_quantity) {
      locations.push(`Dépôt: ${product.depot_quantity}`);
    }
    if (product.paul_truck_quantity < product.min_quantity) {
      locations.push(`Paul: ${product.paul_truck_quantity}`);
    }
    if (product.quentin_truck_quantity < product.min_quantity) {
      locations.push(`Quentin: ${product.quentin_truck_quantity}`);
    }
    return locations.join(' • ');
  };

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
              {/* Bell button with dropdown panel */}
              <div className="relative" ref={notifPanelRef}>
                <button
                  onClick={handleBellClick}
                  className="relative p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Produits en rupture"
                >
                  <Bell className={`h-5 w-5 ${outOfStockCount > 0 ? 'text-[#29235C]' : 'text-gray-700'}`} />
                  {outOfStockCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-sm"
                      style={{ animation: 'badgePulse 2s ease-in-out infinite' }}
                    >
                      {outOfStockCount > 99 ? '99+' : outOfStockCount}
                    </span>
                  )}
                  <style>{`
                    @keyframes badgePulse {
                      0%, 100% { transform: scale(1); }
                      50% { transform: scale(1.1); }
                    }
                    @keyframes notifSlideIn {
                      from { opacity: 0; transform: translateY(-8px) scale(0.98); }
                      to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                  `}</style>
                </button>

                {/* Notification dropdown panel */}
                {showNotifPanel && (
                  <div
                    className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-full sm:mt-2 w-auto sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
                    style={{ animation: 'notifSlideIn 0.2s ease-out' }}
                  >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-white">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <h3 className="text-base font-bold text-gray-900">Ruptures de stock</h3>
                        {outOfStockCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                            {outOfStockCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setShowPushSettings(true);
                            setShowNotifPanel(false);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Paramètres Push"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowNotifPanel(false)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto overscroll-contain">
                      {loadingNotifs ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29235C]"></div>
                        </div>
                      ) : outOfStockProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                          <div className="p-4 bg-gray-50 rounded-full mb-4">
                            <BellOff className="h-8 w-8 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">Aucune rupture de stock</p>
                          <p className="text-xs text-gray-400 mt-1">Tous les produits sont approvisionnés !</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {outOfStockProducts.map((product) => (
                            <button
                              key={product.id}
                              onClick={() => {
                                navigate('/export');
                                setShowNotifPanel(false);
                              }}
                              className="w-full text-left px-5 py-3.5 hover:bg-red-50/50 transition-all duration-150"
                            >
                              <div className="flex gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                  <Package className={`h-5 w-5 ${product.depot_quantity === 0 ? 'text-red-500' : 'text-orange-500'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {product.name}
                                    </p>
                                    <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                      Min: {product.min_quantity}
                                    </span>
                                  </div>
                                  {(product.marque || product.fournisseur) && (
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                      {[product.marque, product.fournisseur].filter(Boolean).join(' — ')}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-1 mt-1.5">
                                    <AlertTriangle className="h-3 w-3 text-red-400" />
                                    <span className="text-[11px] font-medium text-red-500">
                                      {getStockLevel(product)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {outOfStockProducts.length > 0 && (
                      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                        <button
                          onClick={() => {
                            navigate('/export');
                            setShowNotifPanel(false);
                          }}
                          className="w-full text-center text-sm font-medium text-[#29235C] hover:text-[#1f1a4d] transition-colors"
                        >
                          Voir toutes les ruptures →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

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