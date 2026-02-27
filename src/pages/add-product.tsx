import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCategories, getSubcategories, createCategory, createSubcategory, createProduct } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Category, Subcategory } from '@/types';

interface ProductFormData {
  name: string;
  code_article: string;
  marque: string;
  fournisseur: string;
  ref_extrabat: string;
  category_id: string;
  subcategory_id: string;
  new_category: string;
  new_subcategory: string;
  min_quantity: number;
  depot_quantity: number;
  paul_truck_quantity: number;
  quentin_truck_quantity: number;
  purchase_price_ht: number;
}

export function AddProductPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    code_article: '',
    marque: '',
    fournisseur: '',
    ref_extrabat: '',
    category_id: '',
    subcategory_id: '',
    new_category: '',
    new_subcategory: '',
    min_quantity: 0,
    depot_quantity: 0,
    paul_truck_quantity: 0,
    quentin_truck_quantity: 0,
    purchase_price_ht: 0,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: !!session,
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['subcategories', formData.category_id],
    queryFn: () => getSubcategories(formData.category_id),
    enabled: !!session && !!formData.category_id,
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      createSubcategory(categoryId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const handleInputChange = (field: keyof ProductFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'category_id') {
      setFormData((prev) => ({ ...prev, subcategory_id: '', new_subcategory: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      let categoryId = formData.category_id;
      let subcategoryId = formData.subcategory_id;

      if (formData.new_category) {
        const newCategory = await createCategoryMutation.mutateAsync(formData.new_category);
        categoryId = newCategory.id;
      }

      if (!categoryId) {
        throw new Error('Veuillez sélectionner ou créer une catégorie');
      }

      if (formData.new_subcategory) {
        const newSubcategory = await createSubcategoryMutation.mutateAsync({
          categoryId,
          name: formData.new_subcategory,
        });
        subcategoryId = newSubcategory.id;
      }

      if (!subcategoryId) {
        throw new Error('Veuillez sélectionner ou créer une sous-catégorie');
      }

      if (!formData.name) {
        throw new Error('Le nom du produit est obligatoire');
      }

      await createProductMutation.mutateAsync({
        name: formData.name,
        code_article: formData.code_article || null,
        marque: formData.marque || null,
        fournisseur: formData.fournisseur || null,
        ref_extrabat: formData.ref_extrabat || null,
        subcategory_id: subcategoryId,
        min_quantity: formData.min_quantity,
        depot_quantity: formData.depot_quantity,
        paul_truck_quantity: formData.paul_truck_quantity,
        quentin_truck_quantity: formData.quentin_truck_quantity,
        purchase_price_ht: formData.purchase_price_ht,
      });

      setSuccessMessage('Produit ajouté avec succès !');

      setFormData({
        name: '',
        code_article: '',
        marque: '',
        fournisseur: '',
        ref_extrabat: '',
        category_id: categoryId,
        subcategory_id: '',
        new_category: '',
        new_subcategory: '',
        min_quantity: 0,
        depot_quantity: 0,
        paul_truck_quantity: 0,
        quentin_truck_quantity: 0,
        purchase_price_ht: 0,
      });

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error creating product:', error);
      setError(error.message || 'Une erreur est survenue lors de la création du produit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <p className="text-center text-gray-600">Veuillez vous connecter pour accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#29235C]">Ajouter un produit</h1>
        <Button variant="outline" onClick={() => navigate('/inventory')}>
          Retour à l'inventaire
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-sm">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nom du produit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={cn(
                  'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                  'focus:border-[#E72C63] focus:ring-[#E72C63]'
                )}
              />
            </div>

            <div>
              <label htmlFor="code_article" className="block text-sm font-medium text-gray-700">
                Code article
              </label>
              <input
                type="text"
                id="code_article"
                value={formData.code_article}
                onChange={(e) => handleInputChange('code_article', e.target.value)}
                className={cn(
                  'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                  'focus:border-[#E72C63] focus:ring-[#E72C63]'
                )}
              />
            </div>

            <div>
              <label htmlFor="marque" className="block text-sm font-medium text-gray-700">
                Marque
              </label>
              <input
                type="text"
                id="marque"
                value={formData.marque}
                onChange={(e) => handleInputChange('marque', e.target.value)}
                className={cn(
                  'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                  'focus:border-[#E72C63] focus:ring-[#E72C63]'
                )}
              />
            </div>

            <div>
              <label htmlFor="fournisseur" className="block text-sm font-medium text-gray-700">
                Fournisseur
              </label>
              <input
                type="text"
                id="fournisseur"
                value={formData.fournisseur}
                onChange={(e) => handleInputChange('fournisseur', e.target.value)}
                className={cn(
                  'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                  'focus:border-[#E72C63] focus:ring-[#E72C63]'
                )}
              />
            </div>

            <div>
              <label htmlFor="ref_extrabat" className="block text-sm font-medium text-gray-700">
                Référence Extrabat
              </label>
              <input
                type="text"
                id="ref_extrabat"
                value={formData.ref_extrabat}
                onChange={(e) => handleInputChange('ref_extrabat', e.target.value)}
                className={cn(
                  'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                  'focus:border-[#E72C63] focus:ring-[#E72C63]'
                )}
              />
            </div>

            <div>
              <label htmlFor="purchase_price_ht" className="block text-sm font-medium text-gray-700">
                Prix d'achat HT (€)
              </label>
              <input
                type="number"
                id="purchase_price_ht"
                min="0"
                step="0.01"
                value={formData.purchase_price_ht}
                onChange={(e) => handleInputChange('purchase_price_ht', parseFloat(e.target.value) || 0)}
                className={cn(
                  'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                  'focus:border-[#E72C63] focus:ring-[#E72C63]'
                )}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-medium text-[#29235C]">Catégorisation</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Catégorie <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  value={formData.category_id}
                  onChange={(e) => handleInputChange('category_id', e.target.value)}
                  disabled={!!formData.new_category}
                  className={cn(
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                    'focus:border-[#E72C63] focus:ring-[#E72C63]'
                  )}
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">ou créer une nouvelle catégorie ci-dessous</p>
              </div>

              <div>
                <label htmlFor="new_category" className="block text-sm font-medium text-gray-700">
                  Nouvelle catégorie
                </label>
                <input
                  type="text"
                  id="new_category"
                  value={formData.new_category}
                  onChange={(e) => {
                    handleInputChange('new_category', e.target.value);
                    if (e.target.value) {
                      handleInputChange('category_id', '');
                    }
                  }}
                  disabled={!!formData.category_id}
                  className={cn(
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                    'focus:border-[#E72C63] focus:ring-[#E72C63]'
                  )}
                />
              </div>

              <div>
                <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700">
                  Sous-catégorie <span className="text-red-500">*</span>
                </label>
                <select
                  id="subcategory"
                  value={formData.subcategory_id}
                  onChange={(e) => handleInputChange('subcategory_id', e.target.value)}
                  disabled={!!formData.new_subcategory || (!formData.category_id && !formData.new_category)}
                  className={cn(
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                    'focus:border-[#E72C63] focus:ring-[#E72C63]'
                  )}
                >
                  <option value="">Sélectionner une sous-catégorie</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">ou créer une nouvelle sous-catégorie ci-dessous</p>
              </div>

              <div>
                <label htmlFor="new_subcategory" className="block text-sm font-medium text-gray-700">
                  Nouvelle sous-catégorie
                </label>
                <input
                  type="text"
                  id="new_subcategory"
                  value={formData.new_subcategory}
                  onChange={(e) => {
                    handleInputChange('new_subcategory', e.target.value);
                    if (e.target.value) {
                      handleInputChange('subcategory_id', '');
                    }
                  }}
                  disabled={!!formData.subcategory_id || (!formData.category_id && !formData.new_category)}
                  className={cn(
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                    'focus:border-[#E72C63] focus:ring-[#E72C63]'
                  )}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-medium text-[#29235C]">Quantités</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="min_quantity" className="block text-sm font-medium text-gray-700">
                  Quantité minimale
                </label>
                <input
                  type="number"
                  id="min_quantity"
                  min="0"
                  value={formData.min_quantity}
                  onChange={(e) => handleInputChange('min_quantity', parseInt(e.target.value) || 0)}
                  className={cn(
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                    'focus:border-[#E72C63] focus:ring-[#E72C63]'
                  )}
                />
              </div>

              <div>
                <label htmlFor="depot_quantity" className="block text-sm font-medium text-gray-700">
                  Quantité dépôt
                </label>
                <input
                  type="number"
                  id="depot_quantity"
                  min="0"
                  value={formData.depot_quantity}
                  onChange={(e) => handleInputChange('depot_quantity', parseInt(e.target.value) || 0)}
                  className={cn(
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                    'focus:border-[#E72C63] focus:ring-[#E72C63]'
                  )}
                />
              </div>

              <div>
                <label htmlFor="paul_truck_quantity" className="block text-sm font-medium text-gray-700">
                  Quantité camion Paul
                </label>
                <input
                  type="number"
                  id="paul_truck_quantity"
                  min="0"
                  value={formData.paul_truck_quantity}
                  onChange={(e) => handleInputChange('paul_truck_quantity', parseInt(e.target.value) || 0)}
                  className={cn(
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                    'focus:border-[#E72C63] focus:ring-[#E72C63]'
                  )}
                />
              </div>

              <div>
                <label htmlFor="quentin_truck_quantity" className="block text-sm font-medium text-gray-700">
                  Quantité camion Quentin
                </label>
                <input
                  type="number"
                  id="quentin_truck_quantity"
                  min="0"
                  value={formData.quentin_truck_quantity}
                  onChange={(e) => handleInputChange('quentin_truck_quantity', parseInt(e.target.value) || 0)}
                  className={cn(
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                    'focus:border-[#E72C63] focus:ring-[#E72C63]'
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t border-gray-200 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/inventory')}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Ajout en cours...' : 'Ajouter le produit'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
