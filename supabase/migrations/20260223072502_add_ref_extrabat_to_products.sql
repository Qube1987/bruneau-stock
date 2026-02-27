/*
  # Add ref_extrabat column to products table

  1. Changes
    - Add `ref_extrabat` column to `products` table
      - Type: text
      - Nullable: true
      - Used to store Extrabat reference for products
  
  2. Notes
    - Column is nullable to allow existing products without Extrabat reference
    - Uses conditional logic to prevent errors if column already exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'ref_extrabat'
  ) THEN
    ALTER TABLE products ADD COLUMN ref_extrabat text;
  END IF;
END $$;