import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CameraScanner } from '@/components/ui/camera-scanner';
import { cn } from '@/lib/utils';
import { getCategories, getProducts, getSubcategories, processMovement } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Minus, Plus, Truck, Package, Users, Building2, ArrowRight, Camera, X } from 'lucide-react';
import type { Category, ProductWithDetails, Subcategory, MovementType } from '@/types';

const MOVEMENT_TYPES = [
  {
    value: 'SUPPLIER_TO_DEPOT',
    label: 'Fournisseur → Dépôt',
    shortLabel: 'Fournisseur',
    icon: Package,
    color: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
  },
  {
    value: 'DEPOT_TO_PAUL',
    label: 'Dépôt → Camion Paul',
    shortLabel: 'Vers Paul',
    icon: Truck,
    color: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
  },
  {
    value: 'DEPOT_TO_QUENTIN',
    label: 'Dépôt → Camion Quentin',
    shortLabel: 'Vers Quentin',
    icon: Truck,
    color: 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200'
  },
  {
    value: 'PAUL_TO_CLIENT',
    label: 'Camion Paul → Client',
    shortLabel: 'Paul → Client',
    icon: Users,
    color: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
  },
  {
    value: 'QUENTIN_TO_CLIENT',
    label: 'Camion Quentin → Client',
    shortLabel: 'Quentin → Client',
    icon: Users,
    color: 'bg-pink-100 text-pink-700 border-pink-300 hover:bg-pink-200'
  },
  {
    value: 'DEPOT_TO_CLIENT',
    label: 'Dépôt → Client',
    shortLabel: 'Dépôt → Client',
    icon: Building2,
    color: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
  },
] as const;

export default function MovementsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMovementType, setSelectedMovementType] = useState<string>('');
  const [comment, setComment] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
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

  const processMovementMutation = useMutation({
    mutationFn: ({ productId, movementType, quantity, comment }: {
      productId: string;
      movementType: MovementType;
      quantity: number;
      comment?: string;
    }) => processMovement(productId, movementType, quantity, comment),
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

  const handleQuantityChange = (productId: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, value),
    }));
  };

  const incrementQuantity = (productId: string) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const decrementQuantity = (productId: string) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) - 1),
    }));
  };

  const handleSubmit = async () => {
    if (!selectedMovementType) {
      setError('Veuillez sélectionner un type de mouvement');
      return;
    }

    const productsToProcess = Object.entries(quantities)
      .filter(([_, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity,
      }));

    if (productsToProcess.length === 0) {
      setError('Veuillez saisir au moins une quantité pour un produit');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      for (const { productId, quantity } of productsToProcess) {
        await processMovementMutation.mutateAsync({
          productId,
          movementType: selectedMovementType as MovementType,
          quantity,
          comment: comment.trim() || undefined,
        });
      }

      setSelectedMovementType('');
      setComment('');
      setQuantities({});
      alert('Mouvements de stock effectués avec succès');
    } catch (error: any) {
      console.error('Error processing movements:', error);
      setError(`Erreur lors du traitement des mouvements: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
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

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-[#29235C]">Mouvements de Stock</h1>

        <div className="mb-6">
          <label className="mb-4 block text-sm font-medium text-gray-700">
            Type de Mouvement
          </label>

          {/* Affichage du mouvement sélectionné */}
          {selectedMovementType && (
            <div className="mb-4 p-3 bg-[#E72C63]/10 border border-[#E72C63] rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const selectedType = MOVEMENT_TYPES.find(type => type.value === selectedMovementType);
                    if (!selectedType) return null;
                    const IconComponent = selectedType.icon;
                    return (
                      <>
                        <IconComponent className="h-5 w-5 text-[#E72C63]" />
                        <span className="font-medium text-[#E72C63]">
                          {selectedType.label}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMovementType('')}
                  className="text-xs px-2 py-1 h-auto"
                >
                  Changer
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MOVEMENT_TYPES.map((type) => {
              const IconComponent = type.icon;
              const isSelected = selectedMovementType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedMovementType(type.value)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                    'focus:outline-none focus:ring-2 focus:ring-[#E72C63] focus:ring-offset-2',
                    isSelected
                      ? 'border-[#E72C63] bg-[#E72C63]/10 text-[#E72C63]'
                      : type.color
                  )}
                >
                  <IconComponent className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {type.shortLabel}
                    </div>
                    <div className="text-xs opacity-75 truncate">
                      {type.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
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

        <div className="mb-6">
          <h2 className="mb-4 text-lg font-medium text-[#29235C]">Catégories</h2>
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
          <div className="mb-6">
            <h2 className="mb-4 text-lg font-medium text-[#29235C]">Sous-catégories</h2>
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

        <div className="mb-6">
          <label htmlFor="comment-field" className="mb-2 block text-sm font-medium text-gray-700">
            Commentaire
          </label>
          <textarea
            id="comment-field"
            name="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className={cn(
              'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-[#E72C63] focus:ring-[#E72C63] sm:text-sm'
            )}
            placeholder="Ajoutez un commentaire pour ce mouvement..."
          />
        </div>

        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={handleSubmit}
          disabled={!selectedMovementType || isProcessing}
        >
          {isProcessing ? 'Traitement en cours...' : 'Valider le mouvement'}
        </Button>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-[#29235C]">État des Stocks</h2>
        {isLoadingProducts ? (
          <p className="text-gray-500">Chargement des produits...</p>
        ) : filteredProducts.length > 0 ? (
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
                    <p className="mt-0.5 text-sm text-gray-900">{product.depot_quantity}</p>
                  </div>
                  <div className="flex flex-col items-center justify-between rounded bg-gray-50 p-1">
                    <p className="text-xs text-gray-500">Camion Paul</p>
                    <p className="mt-0.5 text-sm text-gray-900">{product.paul_truck_quantity}</p>
                  </div>
                  <div className="flex flex-col items-center justify-between rounded bg-gray-50 p-1">
                    <p className="text-xs text-gray-500">Camion Quentin</p>
                    <p className="mt-0.5 text-sm text-gray-900">{product.quentin_truck_quantity}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => decrementQuantity(product.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>

                  <input
                    type="number"
                    min="0"
                    value={quantities[product.id] || ''}
                    onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                    placeholder="Qté"
                    className={cn(
                      'block w-16 rounded border-gray-300 px-1 py-0.5 text-center text-sm',
                      'focus:border-[#E72C63] focus:ring-[#E72C63]'
                    )}
                  />

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => incrementQuantity(product.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            {searchTerm
              ? `Aucun produit trouvé pour "${searchTerm}"`
              : selectedCategories.length > 0
                ? 'Aucun produit trouvé pour les catégories sélectionnées'
                : 'Sélectionnez des catégories pour voir les produits'}
          </p>
        )}
      </div>
    </div>
  );
}

export { MovementsPage }