/*
 # Add usage_count to stock_products
 
 Tracks how many times a product's quantity has been modified from the quick access page.
 Used to display the most-used products as shortcuts below the search bar.
 */
ALTER TABLE stock_products
ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0;