import { Home, Package, ClipboardList, FileDown, Plus, Bell, BellOff, User, ChevronDown, LogOut, AlertTriangle, X, Settings, CheckCheck, Check, Clock } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { PushSettings } from './PushSettings';
import { useAuth } from '@/lib/auth';
import { useStockNotifications } from '@/hooks/useStockNotifications';

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
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    outOfStockCount,
    loading: loadingNotifs,
    markAsRead,
    markAllAsRead,
  } = useStockNotifications();

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

  const handleBellClick = () => {
    setShowNotifPanel(!showNotifPanel);
  };

  const getStockLevel = (notif: { depotQuantity: number; paulTruckQuantity: number; quentinTruckQuantity: number; minQuantity: number }) => {
    const locations: string[] = [];
    if (notif.depotQuantity < notif.minQuantity) {
      locations.push(`Dépôt: ${notif.depotQuantity}`);
    }
    if (notif.paulTruckQuantity < notif.minQuantity) {
      locations.push(`Paul: ${notif.paulTruckQuantity}`);
    }
    if (notif.quentinTruckQuantity < notif.minQuantity) {
      locations.push(`Quentin: ${notif.quentinTruckQuantity}`);
    }
    return locations.join(' • ');
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
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
                  title="Notifications de ruptures"
                >
                  <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-[#29235C]' : 'text-gray-700'}`} />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-sm"
                      style={{ animation: 'badgePulse 2s ease-in-out infinite' }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
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
                        <Bell className="h-5 w-5 text-[#29235C]" />
                        <h3 className="text-base font-bold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="p-2 text-gray-400 hover:text-[#29235C] hover:bg-[#29235C]/10 rounded-lg transition-colors"
                            title="Tout marquer comme lu"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </button>
                        )}
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

                    {/* Info bar: total ruptures count */}
                    {outOfStockCount > 0 && (
                      <div className="px-5 py-2.5 bg-red-50/50 border-b border-red-100/50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          <span className="text-xs font-medium text-red-700">
                            {outOfStockCount} produit{outOfStockCount > 1 ? 's' : ''} en rupture actuellement
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            navigate('/export');
                            setShowNotifPanel(false);
                          }}
                          className="text-xs font-semibold text-[#29235C] hover:text-[#1f1a4d] transition-colors"
                        >
                          Voir tout →
                        </button>
                      </div>
                    )}

                    {/* Notification List */}
                    <div className="max-h-[380px] overflow-y-auto overscroll-contain">
                      {loadingNotifs ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29235C]"></div>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                          <div className="p-4 bg-gray-50 rounded-full mb-4">
                            <BellOff className="h-8 w-8 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">Aucune nouvelle notification</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Les nouvelles ruptures de stock apparaîtront ici
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`w-full text-left px-5 py-3.5 transition-all duration-150 ${notif.read
                                  ? 'bg-white hover:bg-gray-50'
                                  : 'bg-red-50/60 hover:bg-red-50 border-l-[3px] border-l-red-500'
                                }`}
                            >
                              <div className="flex gap-3">
                                <button
                                  onClick={() => {
                                    navigate('/export');
                                    setShowNotifPanel(false);
                                  }}
                                  className="flex gap-3 flex-1 min-w-0 text-left"
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    <Package className={`h-5 w-5 ${notif.depotQuantity === 0 ? 'text-red-500' : 'text-orange-500'}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className={`text-sm leading-snug ${!notif.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                                        🆕 Nouvelle rupture
                                      </p>
                                      {!notif.read && (
                                        <span className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-red-500"></span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-700 mt-0.5 font-medium truncate">
                                      {notif.productName}
                                    </p>
                                    {(notif.marque || notif.fournisseur) && (
                                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                        {[notif.marque, notif.fournisseur].filter(Boolean).join(' — ')}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1 mt-1.5">
                                      <AlertTriangle className="h-3 w-3 text-red-400" />
                                      <span className="text-[11px] font-medium text-red-500">
                                        {getStockLevel(notif)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Clock className="h-3 w-3 text-gray-400" />
                                      <span className="text-[11px] text-gray-400">
                                        {formatTimeAgo(notif.timestamp)}
                                      </span>
                                      <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                        Min: {notif.minQuantity}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                                {/* Mark as read button */}
                                {!notif.read && (
                                  <div className="flex-shrink-0 flex items-start">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notif.id);
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Marquer comme lu"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
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