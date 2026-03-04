import { supabase } from './supabase';
import type { Movement, Product } from '@/types';

export async function getCategories() {
  const { data, error } = await supabase
    .from('stock_categories')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
}

export async function findCategory(name: string) {
  const { data, error } = await supabase
    .from('stock_categories')
    .select('*')
    .eq('name', name)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSubcategories(categoryId?: string) {
  let query = supabase
    .from('stock_subcategories')
    .select('*')
    .order('name');

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function findSubcategory(categoryId: string, name: string) {
  const { data, error } = await supabase
    .from('stock_subcategories')
    .select('*')
    .eq('category_id', categoryId)
    .eq('name', name)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProducts(filters: { categoryIds?: string[], subcategoryIds?: string[] }) {
  let query = supabase
    .from('stock_products')
    .select(`
      *,
      subcategory:stock_subcategories (
        *,
        category:stock_categories (*)
      )
    `)
    .order('name');

  // Si des sous-catégories sont sélectionnées, on filtre par sous-catégorie
  if (filters.subcategoryIds?.length) {
    query = query.in('subcategory_id', filters.subcategoryIds);
  }
  // Sinon, si seulement des catégories sont sélectionnées, on filtre par catégorie
  else if (filters.categoryIds?.length) {
    query = query.in('subcategory.category_id', filters.categoryIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filtrage côté client
  if (filters.subcategoryIds?.length) {
    return data.filter((product: any) =>
      product.subcategory &&
      filters.subcategoryIds!.includes(product.subcategory.id)
    );
  } else if (filters.categoryIds?.length) {
    return data.filter((product: any) =>
      product.subcategory?.category &&
      filters.categoryIds!.includes(product.subcategory.category.id)
    );
  }

  return data;
}

export async function getOutOfStockProducts() {
  const { data: products, error } = await supabase
    .from('stock_products')
    .select(`
      *,
      subcategory:stock_subcategories (
        *,
        category:stock_categories (*)
      )
    `)
    .order('name');

  if (error) throw error;

  // Filtrage côté client pour les produits en rupture
  return products.filter((product: any) =>
    (product.depot_quantity >= 0 && product.depot_quantity < product.min_quantity) ||
    (product.paul_truck_quantity >= 0 && product.paul_truck_quantity < product.min_quantity) ||
    (product.quentin_truck_quantity >= 0 && product.quentin_truck_quantity < product.min_quantity)
  );
}

export async function createCategory(name: string) {
  const { data, error } = await supabase
    .from('stock_categories')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createSubcategory(categoryId: string, name: string) {
  const { data, error } = await supabase
    .from('stock_subcategories')
    .insert({ category_id: categoryId, name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('stock_products')
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  // Fetch current product state before updates to check thresholds
  const { data: currentProduct, error: fetchError } = await supabase
    .from('stock_products')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('stock_products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Check thresholds for notifications
  const pushLocations = [
    { key: 'depot_quantity', name: 'Dépôt' },
    { key: 'paul_truck_quantity', name: 'Camion Paul' },
    { key: 'quentin_truck_quantity', name: 'Camion Quentin' }
  ];

  for (const loc of pushLocations) {
    const prevQty = (currentProduct as any)[loc.key] as number;
    const newQty = (updates as any)[loc.key] as number | undefined;

    if (newQty !== undefined && prevQty >= currentProduct.min_quantity && newQty < currentProduct.min_quantity) {
      supabase.functions.invoke('send-stock-push', {
        body: {
          product_id: id,
          product_name: currentProduct.name,
          new_quantity: newQty,
          min_quantity: currentProduct.min_quantity,
          location: loc.name
        }
      }).catch(err => console.error('Failed to invoke push notification:', err));
    }
  }

  return data;
}

export async function incrementUsageCount(id: string) {
  const { error } = await supabase.rpc('increment_product_usage', { product_id: id });
  if (error) {
    // Non-blocking: log but don't throw so the quantity update still succeeds
    console.error('Failed to increment usage count:', error);
  }
}

export async function createMovement(movement: Omit<Movement, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('stock_movements')
    .insert(movement)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function processMovement(
  productId: string,
  movementType: Movement['movement_type'],
  quantity: number,
  comment?: string
) {
  // Start a Supabase transaction
  const { data: product, error: productError } = await supabase
    .from('stock_products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError) throw productError;

  let updates: Partial<Product> = {};
  let location: string;

  switch (movementType) {
    case 'SUPPLIER_TO_DEPOT':
      updates.depot_quantity = product.depot_quantity + quantity;
      location = 'depot';
      break;
    case 'DEPOT_TO_PAUL':
      updates.depot_quantity = product.depot_quantity - quantity;
      updates.paul_truck_quantity = product.paul_truck_quantity + quantity;
      location = 'paul_truck';
      break;
    case 'DEPOT_TO_QUENTIN':
      updates.depot_quantity = product.depot_quantity - quantity;
      updates.quentin_truck_quantity = product.quentin_truck_quantity + quantity;
      location = 'quentin_truck';
      break;
    case 'PAUL_TO_CLIENT':
      updates.paul_truck_quantity = product.paul_truck_quantity - quantity;
      location = 'client';
      break;
    case 'QUENTIN_TO_CLIENT':
      updates.quentin_truck_quantity = product.quentin_truck_quantity - quantity;
      location = 'client';
      break;
    case 'DEPOT_TO_CLIENT':
      updates.depot_quantity = product.depot_quantity - quantity;
      location = 'client';
      break;
    default:
      throw new Error('Invalid movement type');
  }

  // Update product quantities
  const { error: updateError } = await supabase
    .from('stock_products')
    .update(updates)
    .eq('id', productId);

  if (updateError) throw updateError;

  // Create movement record
  const { error: movementError } = await supabase
    .from('stock_movements')
    .insert({
      stock_product_id: productId,
      movement_type: movementType,
      location,
      quantity_change: quantity,
      comment,
    });

  if (movementError) throw movementError;

  // Check thresholds for notifications
  const pushLocations = [
    { key: 'depot_quantity', name: 'Dépôt' },
    { key: 'paul_truck_quantity', name: 'Camion Paul' },
    { key: 'quentin_truck_quantity', name: 'Camion Quentin' }
  ];

  for (const loc of pushLocations) {
    const prevQty = (product as any)[loc.key] as number;
    const newQty = (updates as any)[loc.key] as number | undefined;

    if (newQty !== undefined && prevQty >= product.min_quantity && newQty < product.min_quantity) {
      // Trigger Edge Function for push notification
      supabase.functions.invoke('send-stock-push', {
        body: {
          product_id: productId,
          product_name: product.name,
          new_quantity: newQty,
          min_quantity: product.min_quantity,
          location: loc.name
        }
      }).catch(err => console.error('Failed to invoke push notification:', err));
    }
  }
}