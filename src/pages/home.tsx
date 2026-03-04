import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Search, Minus, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CameraScanner } from '@/components/ui/camera-scanner';
import { cn } from '@/lib/utils';
import { getProducts, updateProduct, incrementUsageCount } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ProductWithDetails } from '@/types';

const TOP_PRODUCTS_COUNT = 6;

export function HomePage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: products = [] } = useQuery<ProductWithDetails[]>({
    queryKey: ['products'],
    queryFn: () => getProducts({}),
    enabled: !!session,
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProductWithDetails> }) =>
      updateProduct(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Top products sorted by usage_count descending
  const topProducts = [...products]
    .sort((a, b) => ((b as any).usage_count ?? 0) - ((a as any).usage_count ?? 0))
    .slice(0, TOP_PRODUCTS_COUNT)
    .filter((p) => ((p as any).usage_count ?? 0) > 0);

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.code_article && product.code_article.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleQuantityChange = async (
    productId: string,
    field: 'depot_quantity' | 'paul_truck_quantity' | 'quentin_truck_quantity',
    newValue: number
  ) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const finalValue = Math.max(0, newValue);

    setIsUpdating(true);
    try {
      await updateProductMutation.mutateAsync({
        id: productId,
        updates: { [field]: finalValue },
      });
      // Track usage for quick-access ranking (non-blocking)
      incrementUsageCount(productId);
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderProductCard = (product: ProductWithDetails) => (
    <div
      key={product.id}
      className="p-4 rounded-lg border border-gray-200 bg-white"
    >
      <div className="mb-3">
        <div className="font-medium text-gray-900">{product.name}</div>
        <div className="text-sm text-gray-500">
          {`${product.subcategory?.category?.name} › ${product.subcategory?.name}`}
        </div>
        {product.code_article && (
          <div className="text-xs text-gray-400 mt-0.5 font-mono">{product.code_article}</div>
        )}
      </div>

      {/* Stock dépôt uniquement */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-center">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Dépôt</h4>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleQuantityChange(product.id, 'depot_quantity', product.depot_quantity - 1)}
              disabled={isUpdating || product.depot_quantity <= 0}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white',
                'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-[#E72C63] transition-colors'
              )}
            >
              <Minus className="h-4 w-4 text-gray-600" />
            </button>
            <input
              type="number"
              min="0"
              value={product.depot_quantity}
              onChange={(e) => handleQuantityChange(product.id, 'depot_quantity', parseInt(e.target.value) || 0)}
              className={cn(
                'block w-20 rounded-lg border px-2 py-1.5 text-center text-xl font-bold',
                'focus:border-[#E72C63] focus:ring-[#E72C63] transition-colors',
                product.depot_quantity < product.min_quantity
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-gray-300 text-[#29235C]'
              )}
              disabled={isUpdating}
            />
            <button
              type="button"
              onClick={() => handleQuantityChange(product.id, 'depot_quantity', product.depot_quantity + 1)}
              disabled={isUpdating}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white',
                'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-[#E72C63] transition-colors'
              )}
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </button>
          </div>
          {product.depot_quantity < product.min_quantity && (
            <div className="text-xs text-red-500 mt-1.5 font-medium">
              ⚠ Min : {product.min_quantity}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Quick Access Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-[#29235C]">Accès Rapide</h2>

        {/* Search bar */}
        <div className="mb-4">
          <label htmlFor="quick-search" className="mb-2 block text-sm font-medium text-gray-700">
            Rechercher un article
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                id="quick-search"
                name="quick-search"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Tapez le nom ou la référence..."
                className={cn(
                  'block w-full rounded-md border-gray-300 pl-10 pr-3 py-2 shadow-sm',
                  'focus:border-[#E72C63] focus:ring-[#E72C63] sm:text-sm'
                )}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsScannerOpen(true)}
              className="px-3 py-2 flex items-center gap-2"
              title="Scanner QR code"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Scanner</span>
            </Button>
          </div>
        </div>

        <CameraScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanResult={(text) => {
            handleSearch(text);
            setIsScannerOpen(false);
          }}
        />

        {/* Top products shortcuts — visible only when no search */}
        {!searchTerm && topProducts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-[#E72C63]" />
              <h3 className="text-sm font-semibold text-gray-700">Les plus utilisés</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {topProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSearchTerm(product.name)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium',
                    'border-[#29235C]/20 bg-[#29235C]/5 text-[#29235C]',
                    'hover:bg-[#29235C]/10 hover:border-[#29235C]/40',
                    'transition-all duration-150 cursor-pointer',
                    product.depot_quantity < product.min_quantity &&
                    'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                  )}
                >
                  <span>{product.name}</span>
                  <span className={cn(
                    'text-xs font-bold tabular-nums',
                    product.depot_quantity < product.min_quantity ? 'text-red-600' : 'text-[#E72C63]'
                  )}>
                    {product.depot_quantity}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchTerm && searchTerm.length >= 2 && filteredProducts.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700">Résultats de recherche</h3>
            <div className="space-y-2">
              {filteredProducts.map((product) => renderProductCard(product))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {filteredProducts.length} produit(s) trouvé(s)
            </div>
          </div>
        )}

        {searchTerm && searchTerm.length >= 2 && filteredProducts.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500">Aucun produit trouvé pour "{searchTerm}"</p>
          </div>
        )}

        {/* No search: show all products (fallback if no top products yet) */}
        {!searchTerm && topProducts.length === 0 && (
          <div className="text-center py-6 text-sm text-gray-400">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Les produits les plus utilisés apparaîtront ici.</p>
          </div>
        )}
      </div>
    </div>
  );
}