import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategories, getSubcategories, createProduct, createCategory, createSubcategory, findCategory, findSubcategory } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Category, Subcategory } from '@/types';

interface CSVProduct {
  nom: string;
  description: string;
  quantite_min: string;
  quantite_depot: string;
  quantite_camion_paul: string;
  quantite_camion_quentin: string;
  categorie: string;
  sous_categorie: string;
}

export function ImportPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    minQuantity: '',
    categoryId: '',
    subcategoryId: '',
  });

  // Fetch categories and subcategories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: !!session,
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['subcategories', formData.categoryId],
    queryFn: () => getSubcategories(formData.categoryId),
    enabled: !!session && !!formData.categoryId,
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onError: (error: any) => {
      console.error('Error creating category:', error);
      setError(`Erreur lors de la création de la catégorie: ${error.message}`);
    },
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      createSubcategory(categoryId, name),
    onError: (error: any) => {
      console.error('Error creating subcategory:', error);
      setError(`Erreur lors de la création de la sous-catégorie: ${error.message}`);
    },
  });

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      console.error('Error creating product:', error);
      setError(`Erreur lors de la création du produit: ${error.message}`);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError('');
      setProgress({ current: 0, total: 0 });
    }
  };

  const parseCSVLine = (line: string): string[] => {
    return line
      .split(',')
      .map(value => value.trim())
      .filter((_, index, array) => index !== array.length - 1 || array[index] !== '');
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !session) return;
    setError('');
    setIsImporting(true);
    setProgress({ current: 0, total: 0 });

    try {
      const text = await selectedFile.text();
      const rows = text.split('\n')
        .map(row => row.trim())
        .filter(row => row.length > 0);

      const headers = parseCSVLine(rows[0]);
      const products: CSVProduct[] = [];

      // Parse CSV
      for (let i = 1; i < rows.length; i++) {
        const values = parseCSVLine(rows[i]);
        if (values.length >= 8) {
          products.push({
            nom: values[0],
            description: values[1],
            quantite_min: values[2],
            quantite_depot: values[3],
            quantite_camion_paul: values[4],
            quantite_camion_quentin: values[5],
            categorie: values[6],
            sous_categorie: values[7],
          });
        }
      }

      setProgress({ current: 0, total: products.length });

      // Process each product
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        try {
          // Find or create category
          let category = await findCategory(product.categorie);
          if (!category) {
            category = await createCategoryMutation.mutateAsync(product.categorie);
            await queryClient.invalidateQueries({ queryKey: ['categories'] });
          }

          // Find or create subcategory
          let subcategory = await findSubcategory(category.id, product.sous_categorie);
          if (!subcategory) {
            subcategory = await createSubcategoryMutation.mutateAsync({
              categoryId: category.id,
              name: product.sous_categorie,
            });
            await queryClient.invalidateQueries({ queryKey: ['subcategories', category.id] });
          }

          // Create product
          await createProductMutation.mutateAsync({
            name: product.nom,
            description: product.description || null,
            min_quantity: parseInt(product.quantite_min) || 0,
            subcategory_id: subcategory.id,
            depot_quantity: parseInt(product.quantite_depot) || 0,
            paul_truck_quantity: parseInt(product.quantite_camion_paul) || 0,
            quentin_truck_quantity: parseInt(product.quantite_camion_quentin) || 0,
          });

          setProgress(prev => ({ ...prev, current: i + 1 }));
        } catch (error: any) {
          console.error('Error processing product:', error);
          setError(`Erreur lors du traitement de la ligne ${i + 1} (${product.nom}): ${error.message}`);
          return;
        }
      }

      alert('Import CSV réussi');
      setSelectedFile(null);
      setProgress({ current: 0, total: 0 });
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      setError(`Erreur lors de l'import CSV: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subcategoryId) return;
    setError('');

    try {
      await createProductMutation.mutateAsync({
        name: formData.name,
        description: formData.description || null,
        min_quantity: parseInt(formData.minQuantity) || 0,
        subcategory_id: formData.subcategoryId,
        depot_quantity: 0,
        paul_truck_quantity: 0,
        quentin_truck_quantity: 0,
      });

      setFormData({
        name: '',
        description: '',
        minQuantity: '',
        categoryId: '',
        subcategoryId: '',
      });

      alert('Produit ajouté avec succès');
    } catch (error: any) {
      setError(`Erreur lors de la création du produit: ${error.message}`);
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
    <div className="space-y-8">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* CSV Import Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-[#29235C]">Import CSV</h2>
        
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Fichier CSV
          </label>
          <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md bg-white font-medium text-[#E72C63] hover:text-[#E72C63]/80"
                >
                  <span>Sélectionner un fichier</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">ou glisser-déposer</p>
              </div>
              <p className="text-xs text-gray-500">CSV uniquement</p>
              {selectedFile && (
                <p className="text-sm text-gray-600">
                  Fichier sélectionné : {selectedFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {progress.total > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Progression</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-[#E72C63] transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Button
          size="lg"
          className="w-full sm:w-auto"
          disabled={!selectedFile || isImporting}
          onClick={handleFileUpload}
        >
          {isImporting ? 'Import en cours...' : 'Importer le fichier'}
        </Button>
      </div>

      {/* Manual Product Addition Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-[#29235C]">Ajout Manuel d'un Article</h2>
        
        <form className="space-y-6" onSubmit={handleFormSubmit}>
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
              Nom
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={cn(
                'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                'focus:border-[#E72C63] focus:ring-[#E72C63] sm:text-sm'
              )}
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={cn(
                'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                'focus:border-[#E72C63] focus:ring-[#E72C63] sm:text-sm'
              )}
            />
          </div>

          <div>
            <label htmlFor="minQuantity" className="mb-2 block text-sm font-medium text-gray-700">
              Quantité Minimum
            </label>
            <input
              type="number"
              id="minQuantity"
              name="minQuantity"
              required
              value={formData.minQuantity}
              onChange={(e) => setFormData(prev => ({ ...prev, minQuantity: e.target.value }))}
              min="0"
              className={cn(
                'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                'focus:border-[#E72C63] focus:ring-[#E72C63] sm:text-sm'
              )}
            />
          </div>

          <div>
            <label htmlFor="categoryId" className="mb-2 block text-sm font-medium text-gray-700">
              Catégorie
            </label>
            <select
              id="categoryId"
              name="categoryId"
              required
              value={formData.categoryId}
              onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value, subcategoryId: '' }))}
              className={cn(
                'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                'focus:border-[#E72C63] focus:ring-[#E72C63] sm:text-sm'
              )}
            >
              <option value="">Sélectionnez une catégorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="subcategoryId" className="mb-2 block text-sm font-medium text-gray-700">
              Sous-catégorie
            </label>
            <select
              id="subcategoryId"
              name="subcategoryId"
              required
              value={formData.subcategoryId}
              onChange={(e) => setFormData(prev => ({ ...prev, subcategoryId: e.target.value }))}
              className={cn(
                'mt-1 block w-full rounded-md border-gray-300 shadow-sm',
                'focus:border-[#E72C63] focus:ring-[#E72C63] sm:text-sm'
              )}
            >
              <option value="">Sélectionnez une sous-catégorie</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            disabled={createProductMutation.isPending}
          >
            {createProductMutation.isPending ? 'Ajout en cours...' : 'Ajouter l\'article'}
          </Button>
        </form>
      </div>
    </div>
  );
}