/*
 # Add RPC function to safely increment product usage count
 */
CREATE OR REPLACE FUNCTION increment_product_usage(product_id uuid) RETURNS void LANGUAGE sql AS $$
UPDATE stock_products
SET usage_count = usage_count + 1
WHERE id = product_id;
$$;