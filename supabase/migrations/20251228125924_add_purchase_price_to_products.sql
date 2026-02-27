/*
  # Add purchase price to products

  1. Changes
    - Add `purchase_price_ht` column to `products` table
      - Type: numeric(10,2) for storing prices with 2 decimal places
      - Default: 0.00
      - Not null to ensure data consistency
  
  2. Notes
    - Uses numeric type for precise decimal calculations
    - Default value of 0.00 for existing products
    - Can be updated later with actual purchase prices
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'purchase_price_ht'
  ) THEN
    ALTER TABLE products ADD COLUMN purchase_price_ht numeric(10,2) DEFAULT 0.00 NOT NULL;
  END IF;
END $$;