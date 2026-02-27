export type MovementType = 
  | 'SUPPLIER_TO_DEPOT'
  | 'DEPOT_TO_PAUL'
  | 'DEPOT_TO_QUENTIN'
  | 'PAUL_TO_CLIENT'
  | 'QUENTIN_TO_CLIENT'
  | 'DEPOT_TO_CLIENT';

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  code_article: string | null;
  marque: string | null;
  fournisseur: string | null;
  ref_extrabat: string | null;
  min_quantity: number;
  subcategory_id: string;
  depot_quantity: number;
  paul_truck_quantity: number;
  quentin_truck_quantity: number;
  purchase_price_ht: number;
  created_at: string;
}

export interface Movement {
  id: string;
  stock_product_id: string;
  movement_type: MovementType;
  location: string;
  quantity_change: number;
  comment: string | null;
  created_at: string;
}

export interface ProductWithDetails extends Product {
  subcategory: Subcategory & {
    category: Category;
  };
}