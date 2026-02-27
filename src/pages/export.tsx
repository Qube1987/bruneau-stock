import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOutOfStockProducts, getProducts } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Product, ProductWithDetails } from '@/types';

export function ExportPage() {
  const { session } = useAuth();
  const { data: outOfStockProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['outOfStockProducts'],
    queryFn: getOutOfStockProducts,
    enabled: !!session,
  });

  const { data: allProducts = [] } = useQuery<ProductWithDetails[]>({
    queryKey: ['allProducts'],
    queryFn: () => getProducts({}),
    enabled: !!session,
  });

  const totalInventoryValue = allProducts.reduce((total, product) => {
    const totalQuantity = product.depot_quantity + product.paul_truck_quantity + product.quentin_truck_quantity;
    return total + (totalQuantity * product.purchase_price_ht);
  }, 0);

  const handleExportCSV = () => {
    if (!outOfStockProducts.length) return;

    const headers = ['Nom', 'Description', 'Quantité Minimum', 'Quantité Dépôt', 'Quantité Camion Paul', 'Quantité Camion Quentin'];
    const rows = outOfStockProducts.map(product => [
      product.name,
      product.description || '',
      product.min_quantity.toString(),
      product.depot_quantity.toString(),
      product.paul_truck_quantity.toString(),
      product.quentin_truck_quantity.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ruptures_stock.csv';
    link.click();
  };

  const handleExportFullInventory = () => {
    if (!allProducts.length) return;

    const headers = [
      'Nom',
      'Description',
      'Catégorie',
      'Sous-catégorie',
      'Prix d\'achat HT',
      'Quantité Minimum',
      'Quantité Dépôt',
      'Quantité Camion Paul',
      'Quantité Camion Quentin',
      'Quantité Totale',
      'Valeur Stock (HT)'
    ];

    const rows = allProducts.map(product => {
      const totalQuantity = product.depot_quantity + product.paul_truck_quantity + product.quentin_truck_quantity;
      const stockValue = totalQuantity * product.purchase_price_ht;

      return [
        product.name,
        product.description || '',
        product.subcategory?.category?.name || '',
        product.subcategory?.name || '',
        product.purchase_price_ht.toFixed(2),
        product.min_quantity.toString(),
        product.depot_quantity.toString(),
        product.paul_truck_quantity.toString(),
        product.quentin_truck_quantity.toString(),
        totalQuantity.toString(),
        stockValue.toFixed(2)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventaire_complet_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
      {/* Inventory Value Summary */}
      <div className="rounded-lg bg-gradient-to-r from-[#29235C] to-[#3d3570] p-6 shadow-sm text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium opacity-90">Valeur Totale du Stock</h2>
            <p className="mt-2 text-4xl font-bold">{totalInventoryValue.toFixed(2)} €</p>
            <p className="mt-1 text-sm opacity-75">Hors taxes</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Total Articles</p>
            <p className="mt-1 text-2xl font-bold">{allProducts.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-[#29235C]">Export / Ruptures de Stock</h1>

        <div className="mb-6 flex flex-wrap gap-4">
          <Button
            size="lg"
            className="inline-flex items-center gap-2"
            onClick={handleExportFullInventory}
            disabled={allProducts.length === 0}
          >
            <FileDown className="h-5 w-5" />
            Exporter Inventaire Complet
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="inline-flex items-center gap-2"
            onClick={handleExportCSV}
            disabled={isLoading || outOfStockProducts.length === 0}
          >
            <FileDown className="h-5 w-5" />
            Exporter Ruptures de Stock
          </Button>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Article
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Quantité Dépôt
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Quantité Camion Paul
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Quantité Camion Quentin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Chargement des produits en rupture de stock...
                  </td>
                </tr>
              ) : outOfStockProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Aucun produit en rupture de stock
                  </td>
                </tr>
              ) : (
                outOfStockProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{product.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{product.depot_quantity}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{product.paul_truck_quantity}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{product.quentin_truck_quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}