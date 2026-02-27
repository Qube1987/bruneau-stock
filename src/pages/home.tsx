import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Search, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CameraScanner } from '@/components/ui/camera-scanner';
import { cn } from '@/lib/utils';
import { getProducts, updateProduct } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ProductWithDetails } from '@/types';

export function HomePage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
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

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      const foundProduct = products.find(product =>
        product.name.toLowerCase().includes(term.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(term.toLowerCase()))
      );
      if (foundProduct) {
        setSelectedProduct(foundProduct);
      }
    } else {
      setSelectedProduct(null);
    }
  };

  const handleQuantityChange = async (
    productId: string,
    field: 'depot_quantity' | 'paul_truck_quantity' | 'quentin_truck_quantity',
    newValue: number
  ) => {
    // Find the product in the products array
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const finalValue = Math.max(0, newValue);

    setIsUpdating(true);
    try {
      await updateProductMutation.mutateAsync({
        id: productId,
        updates: { [field]: finalValue },
      });

      // Update local state if this product is selected
      if (selectedProduct && selectedProduct.id === productId) {
        setSelectedProduct(prev => prev ? { ...prev, [field]: finalValue } : null);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProductSelect = (product: ProductWithDetails) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
  };

  return (
    <div className="space-y-8">
      {/* Quick Access Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-[#29235C]">Accès Rapide</h2>
        
        <div className="mb-6">
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
                placeholder="Tapez le nom d'un article..."
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

        {/* Search Results */}
        {searchTerm && searchTerm.length >= 3 && filteredProducts.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-gray-700">Résultats de recherche</h3>
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-4 rounded-lg border border-gray-200 bg-white"
                >
                  <div className="mb-3">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      {`${product.subcategory?.category?.name} > ${product.subcategory?.name}`}
                    </div>
                    {product.description && (
                      <div className="text-xs text-gray-400 mt-1">{product.description}</div>
                    )}
                  </div>

                  {/* Stock Management */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Dépôt */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-center mb-2">
                        <h4 className="text-xs font-medium text-gray-700">Dépôt</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(product.id, 'depot_quantity', product.depot_quantity - 1)}
                            disabled={isUpdating || product.depot_quantity <= 0}
                            className={cn(
                              'flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-white',
                              'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
                              'focus:outline-none focus:ring-2 focus:ring-[#E72C63]'
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
                              'block w-full rounded border-gray-300 px-2 py-1 text-center text-lg font-bold',
                              'focus:border-[#E72C63] focus:ring-[#E72C63]',
                              product.depot_quantity < product.min_quantity ? "border-red-300 bg-red-50 text-red-600" : "text-[#29235C]"
                            )}
                            disabled={isUpdating}
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(product.id, 'depot_quantity', product.depot_quantity + 1)}
                            disabled={isUpdating}
                            className={cn(
                              'flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-white',
                              'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
                              'focus:outline-none focus:ring-2 focus:ring-[#E72C63]'
                            )}
                          >
                            <Plus className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                        {product.depot_quantity < product.min_quantity && (
                          <div className="text-xs text-red-600 mt-1">
                            Min: {product.min_quantity}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Camion Paul */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-center mb-2">
                        <h4 className="text-xs font-medium text-gray-700">Camion Paul</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(product.id, 'paul_truck_quantity', product.paul_truck_quantity - 1)}
                            disabled={isUpdating || product.paul_truck_quantity <= 0}
                            className={cn(
                              'flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-white',
                              'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
                              'focus:outline-none focus:ring-2 focus:ring-[#E72C63]'
                            )}
                          >
                            <Minus className="h-4 w-4 text-gray-600" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={product.paul_truck_quantity}
                            onChange={(e) => handleQuantityChange(product.id, 'paul_truck_quantity', parseInt(e.target.value) || 0)}
                            className={cn(
                              'block w-full rounded border-gray-300 px-2 py-1 text-center text-lg font-bold',
                              'focus:border-[#E72C63] focus:ring-[#E72C63]',
                              product.paul_truck_quantity < product.min_quantity ? "border-red-300 bg-red-50 text-red-600" : "text-[#29235C]"
                            )}
                            disabled={isUpdating}
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(product.id, 'paul_truck_quantity', product.paul_truck_quantity + 1)}
                            disabled={isUpdating}
                            className={cn(
                              'flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-white',
                              'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
                              'focus:outline-none focus:ring-2 focus:ring-[#E72C63]'
                            )}
                          >
                            <Plus className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                        {product.paul_truck_quantity < product.min_quantity && (
                          <div className="text-xs text-red-600 mt-1">
                            Min: {product.min_quantity}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Camion Quentin */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-center mb-2">
                        <h4 className="text-xs font-medium text-gray-700">Camion Quentin</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(product.id, 'quentin_truck_quantity', product.quentin_truck_quantity - 1)}
                            disabled={isUpdating || product.quentin_truck_quantity <= 0}
                            className={cn(
                              'flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-white',
                              'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
                              'focus:outline-none focus:ring-2 focus:ring-[#E72C63]'
                            )}
                          >
                            <Minus className="h-4 w-4 text-gray-600" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={product.quentin_truck_quantity}
                            onChange={(e) => handleQuantityChange(product.id, 'quentin_truck_quantity', parseInt(e.target.value) || 0)}
                            className={cn(
                              'block w-full rounded border-gray-300 px-2 py-1 text-center text-lg font-bold',
                              'focus:border-[#E72C63] focus:ring-[#E72C63]',
                              product.quentin_truck_quantity < product.min_quantity ? "border-red-300 bg-red-50 text-red-600" : "text-[#29235C]"
                            )}
                            disabled={isUpdating}
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(product.id, 'quentin_truck_quantity', product.quentin_truck_quantity + 1)}
                            disabled={isUpdating}
                            className={cn(
                              'flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-white',
                              'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
                              'focus:outline-none focus:ring-2 focus:ring-[#E72C63]'
                            )}
                          >
                            <Plus className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                        {product.quentin_truck_quantity < product.min_quantity && (
                          <div className="text-xs text-red-600 mt-1">
                            Min: {product.min_quantity}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {filteredProducts.length} produit(s) trouvé(s)
            </div>
          </div>
        )}


        {searchTerm && searchTerm.length >= 3 && filteredProducts.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500">Aucun produit trouvé pour "{searchTerm}"</p>
          </div>
        )}
      </div>

    </div>
  );
}