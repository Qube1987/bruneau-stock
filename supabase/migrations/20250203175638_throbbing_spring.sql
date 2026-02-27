/*
  # Initial Schema Setup

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
    
    - `subcategories`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key)
      - `name` (text)
      - `created_at` (timestamp)
    
    - `products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `min_quantity` (integer)
      - `subcategory_id` (uuid, foreign key)
      - `depot_quantity` (integer)
      - `paul_truck_quantity` (integer)
      - `quentin_truck_quantity` (integer)
      - `created_at` (timestamp)
    
    - `movements`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `movement_type` (text)
      - `location` (text)
      - `quantity_change` (integer)
      - `comment` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read and write data
*/

-- Create categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert categories"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create subcategories table
CREATE TABLE subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name)
);

ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read subcategories"
  ON subcategories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert subcategories"
  ON subcategories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  min_quantity integer NOT NULL DEFAULT 0,
  subcategory_id uuid REFERENCES subcategories(id) ON DELETE CASCADE NOT NULL,
  depot_quantity integer NOT NULL DEFAULT 0,
  paul_truck_quantity integer NOT NULL DEFAULT 0,
  quentin_truck_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create movements table
CREATE TABLE movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  movement_type text NOT NULL,
  location text NOT NULL,
  quantity_change integer NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read movements"
  ON movements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert movements"
  ON movements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_products_subcategory ON products(subcategory_id);
CREATE INDEX idx_subcategories_category ON subcategories(category_id);
CREATE INDEX idx_movements_product ON movements(product_id);
CREATE INDEX idx_movements_created_at ON movements(created_at);