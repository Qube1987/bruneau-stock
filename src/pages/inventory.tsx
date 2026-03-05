import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CameraScanner } from '@/components/ui/camera-scanner';
import { cn } from '@/lib/utils';
import { getCategories, getProducts, updateProduct, getSubcategories } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Camera, X } from 'lucide-react';
import type { Category, ProductWithDetails, Subcategory } from '@/types';

type StockLocation = 'depot_quantity' | 'paul_truck_quantity' | 'quentin_truck_quantity';
type QuantityChanges = Record<string, Partial<Record<StockLocation, number>>>;

export function InventoryPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [quantityChanges, setQuantityChanges] = useState<QuantityChanges>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: !!session,
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['subcategories', selectedCategories],
    queryFn: () => {
      const promises = selectedCategories.map(categoryId => getSubcategories(categoryId));
      return Promise.all(promises).then(results => results.flat());
    },
    enabled: !!session && selectedCategories.length > 0,
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<ProductWithDetails[]>({
    queryKey: ['products', selectedCategories, selectedSubcategories],
    queryFn: () => getProducts({
      categoryIds: selectedCategories,
      subcategoryIds: selectedSubcategories.length > 0 ? selectedSubcategories : undefined
    }),
    enabled: !!session,
  });

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.subcategory?.name && product.subcategory.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.subcategory?.category?.name && product.subcategory.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const updateProductMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProductWithDetails> }) =>
      updateProduct(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setSelectedCategories(prev => {
      const newCategories = checked
        ? [...prev, categoryId]
        : prev.filter(id => id !== categoryId);

      if (!checked) {
        setSelectedSubcategories(prev =>
          prev.filter(subId =>
            subcategories.find(sub => sub.id === subId)?.category_id !== categoryId
          )
        );
      }

      return newCategories;
    });
  };

  const handleSubcategoryChange = (subcategoryId: string, checked: boolean) => {
    setSelectedSubcategories(prev =>
      checked
        ? [...prev, subcategoryId]
        : prev.filter(id => id !== subcategoryId)
    );
  };

  const handleQuantityChange = (
    productId: string,
    location: StockLocation,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setQuantityChanges(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [location]: numValue,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      for (const [productId, changes] of Object.entries(quantityChanges)) {
        await updateProductMutation.mutateAsync({
          id: productId,
          updates: changes,
        });
      }

      setQuantityChanges({});
      alert('Inventaire mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating inventory:', error);
      setError(`Erreur lors de la mise à jour: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayValue = (product: ProductWithDetails, location: StockLocation) => {
    if (quantityChanges[product.id]?.[location] !== undefined) {
      return quantityChanges[product.id][location];
    }
    return product[location];
  };

  if (!session) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <p className="text-center text-gray-600">Veuillez vous connecter pour accéder à cette page.</p>
      </div>
    );
  }

  if (isLoadingCategories) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-gray-600">Chargement des catégories...</div>
      </div>
    );
  }

  const hasChanges = Object.keys(quantityChanges).length > 0;

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#29235C]">Inventaire</h1>
          {hasChanges && (
            <Button
              size="lg"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2"
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="search" className="mb-2 block text-sm font-medium text-gray-700">
            Rechercher un article
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                id="search"
                name="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tapez le nom d'un article, une description, une catégorie..."
                className={cn(
                  'block w-full rounded-md border-gray-300 pl-10 py-2 shadow-sm',
                  'focus:border-[#E72C63] focus:ring-[#E72C63] sm:text-sm',
                  searchTerm ? 'pr-8' : 'pr-3'
                )}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsScannerOpen(true)}
              className="px-3 py-2 flex items-center gap-2"
              title="Scanner QR code ou texte"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Scanner</span>
            </Button>
          </div>
          {searchTerm && (
            <p className="mt-1 text-sm text-gray-500">
              {filteredProducts.length} article(s) trouvé(s)
            </p>
          )}
        </div>

        <CameraScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanResult={(text) => {
            setSearchTerm(text);
            setIsScannerOpen(false);
          }}
        />

        <div className="mb-8">
          <h2 className="mb-4 text-lg font-medium text-[#29235C]">Filtrer par catégorie</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Checkbox
                key={category.id}
                id={`category-${category.id}`}
                name={`category-${category.id}`}
                label={category.name}
                checked={selectedCategories.includes(category.id)}
                onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
              />
            ))}
          </div>
        </div>

        {selectedCategories.length > 0 && subcategories.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-[#29235C]">Filtrer par sous-catégorie</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subcategories.map((subcategory) => (
                <Checkbox
                  key={subcategory.id}
                  id={`subcategory-${subcategory.id}`}
                  name={`subcategory-${subcategory.id}`}
                  label={subcategory.name}
                  checked={selectedSubcategories.includes(subcategory.id)}
                  onChange={(e) => handleSubcategoryChange(subcategory.id, e.target.checked)}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          {isLoadingProducts ? (
            <p className="text-center text-gray-500">Chargement des produits...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center text-gray-500">
              {searchTerm
                ? `Aucun produit trouvé pour "${searchTerm}"`
                : selectedCategories.length > 0
                  ? 'Aucun produit trouvé pour les catégories sélectionnées'
                  : 'Aucun produit trouvé'}
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <div key={product.id} className="py-1">
                  <div className="mb-1 flex items-baseline gap-2">
                    <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
                    <span className="text-gray-300">•</span>
                    <p className="text-xs text-gray-500">
                      {product.subcategory?.category?.name || 'Non catégorisé'} &gt; {product.subcategory?.name || 'Non catégorisé'}
                    </p>
                  </div>

                  <div className="mb-1 grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center justify-between rounded bg-gray-50 p-1">
                      <p className="text-xs text-gray-500">Dépôt</p>
                      <input
                        type="number"
                        min="0"
                        value={getDisplayValue(product, 'depot_quantity')}
                        onChange={(e) => handleQuantityChange(product.id, 'depot_quantity', e.target.value)}
                        className={cn(
                          'mt-0.5 block w-16 rounded border-gray-300 px-1 py-0.5 text-center text-sm',
                          'focus:border-[#E72C63] focus:ring-[#E72C63]',
                          getDisplayValue(product, 'depot_quantity') < product.min_quantity && 'border-red-300 bg-red-50'
                        )}
                      />
                    </div>
                    <div className="flex flex-col items-center justify-between rounded bg-gray-50 p-1">
                      <p className="text-xs text-gray-500">Camion Paul</p>
                      <input
                        type="number"
                        min="0"
                        value={getDisplayValue(product, 'paul_truck_quantity')}
                        onChange={(e) => handleQuantityChange(product.id, 'paul_truck_quantity', e.target.value)}
                        className={cn(
                          'mt-0.5 block w-16 rounded border-gray-300 px-1 py-0.5 text-center text-sm',
                          'focus:border-[#E72C63] focus:ring-[#E72C63]',
                          getDisplayValue(product, 'paul_truck_quantity') < product.min_quantity && 'border-red-300 bg-red-50'
                        )}
                      />
                    </div>
                    <div className="flex flex-col items-center justify-between rounded bg-gray-50 p-1">
                      <p className="text-xs text-gray-500">Camion Quentin</p>
                      <input
                        type="number"
                        min="0"
                        value={getDisplayValue(product, 'quentin_truck_quantity')}
                        onChange={(e) => handleQuantityChange(product.id, 'quentin_truck_quantity', e.target.value)}
                        className={cn(
                          'mt-0.5 block w-16 rounded border-gray-300 px-1 py-0.5 text-center text-sm',
                          'focus:border-[#E72C63] focus:ring-[#E72C63]',
                          getDisplayValue(product, 'quentin_truck_quantity') < product.min_quantity && 'border-red-300 bg-red-50'
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}