import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getOutOfStockProducts } from '@/lib/api';
import type { Product } from '@/types';

export interface StockNotification {
    id: string;
    productId: string;
    productName: string;
    marque: string | null;
    fournisseur: string | null;
    minQuantity: number;
    depotQuantity: number;
    paulTruckQuantity: number;
    quentinTruckQuantity: number;
    timestamp: string;
    read: boolean;
}

const STORAGE_KEY = 'stock_notifications';
const KNOWN_RUPTURES_KEY = 'stock_known_ruptures';

function loadFromStorage<T>(key: string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    } catch {
        return fallback;
    }
}

function saveToStorage<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function useStockNotifications() {
    const [notifications, setNotifications] = useState<StockNotification[]>(() =>
        loadFromStorage<StockNotification[]>(STORAGE_KEY, [])
    );
    const [loading, setLoading] = useState(true);
    const [outOfStockCount, setOutOfStockCount] = useState(0);
    const initialLoadDone = useRef(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Sync notifications to localStorage whenever they change
    useEffect(() => {
        saveToStorage(STORAGE_KEY, notifications);
    }, [notifications]);

    const checkForNewRuptures = useCallback(async () => {
        try {
            setLoading(true);
            const outOfStockProducts = await getOutOfStockProducts();
            setOutOfStockCount(outOfStockProducts.length);

            // Get the previously known rupture product IDs
            const knownRuptureIds: string[] = loadFromStorage(KNOWN_RUPTURES_KEY, []);

            // On first ever load (no known ruptures stored yet), just record current state
            // without creating notifications for everything already in rupture
            if (!initialLoadDone.current && knownRuptureIds.length === 0 && outOfStockProducts.length > 0) {
                const currentIds = outOfStockProducts.map((p: Product) => p.id);
                saveToStorage(KNOWN_RUPTURES_KEY, currentIds);
                initialLoadDone.current = true;
                return;
            }
            initialLoadDone.current = true;

            // Find NEW ruptures (products that are in rupture now but weren't known before)
            const newRuptures = outOfStockProducts.filter(
                (p: Product) => !knownRuptureIds.includes(p.id)
            );

            if (newRuptures.length > 0) {
                const now = new Date().toISOString();
                const newNotifs: StockNotification[] = newRuptures.map((product: Product) => ({
                    id: `rupture_${product.id}_${Date.now()}`,
                    productId: product.id,
                    productName: product.name,
                    marque: product.marque,
                    fournisseur: product.fournisseur,
                    minQuantity: product.min_quantity,
                    depotQuantity: product.depot_quantity,
                    paulTruckQuantity: product.paul_truck_quantity,
                    quentinTruckQuantity: product.quentin_truck_quantity,
                    timestamp: now,
                    read: false,
                }));

                setNotifications(prev => {
                    // Remove any existing notification for the same product (avoid duplicates)
                    const filtered = prev.filter(
                        n => !newRuptures.some((p: Product) => p.id === n.productId)
                    );
                    return [...newNotifs, ...filtered];
                });
            }

            // Update known ruptures to current state
            const currentIds = outOfStockProducts.map((p: Product) => p.id);
            saveToStorage(KNOWN_RUPTURES_KEY, currentIds);

            // Clean up old notifications for products that are no longer in rupture
            // (they've been restocked) — mark them but keep them for history
            setNotifications(prev => {
                // Keep max 50 notifications and remove ones older than 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return prev
                    .filter(n => new Date(n.timestamp) > thirtyDaysAgo)
                    .slice(0, 50);
            });
        } catch (error) {
            console.error('Error checking for new ruptures:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = useCallback((notifId: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === notifId ? { ...n, read: true } : n)
        );
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const dismissNotification = useCallback((notifId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
    }, []);

    // Initial load
    useEffect(() => {
        checkForNewRuptures();
    }, [checkForNewRuptures]);

    // Real-time subscription to stock changes
    useEffect(() => {
        const channel = supabase
            .channel('stock-notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_products' }, () => {
                checkForNewRuptures();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [checkForNewRuptures]);

    // Periodic refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(checkForNewRuptures, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [checkForNewRuptures]);

    return {
        notifications,
        unreadCount,
        outOfStockCount,
        loading,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        refresh: checkForNewRuptures,
    };
}
