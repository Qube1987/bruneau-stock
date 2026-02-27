/*
  # Mise à jour des politiques RLS

  1. Modifications
    - Mise à jour des politiques RLS pour permettre l'insertion de données
    - Ajout de politiques pour la mise à jour des données
    - Ajout de politiques pour la suppression des données

  2. Sécurité
    - Les utilisateurs authentifiés peuvent lire, créer, mettre à jour et supprimer leurs données
    - Les politiques sont appliquées à toutes les tables
*/

-- Mise à jour des politiques pour la table categories
DROP POLICY IF EXISTS "Allow authenticated users to read categories" ON categories;
DROP POLICY IF EXISTS "Allow authenticated users to insert categories" ON categories;

CREATE POLICY "Enable all operations for authenticated users" ON categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Mise à jour des politiques pour la table subcategories
DROP POLICY IF EXISTS "Allow authenticated users to read subcategories" ON subcategories;
DROP POLICY IF EXISTS "Allow authenticated users to insert subcategories" ON subcategories;

CREATE POLICY "Enable all operations for authenticated users" ON subcategories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Mise à jour des politiques pour la table products
DROP POLICY IF EXISTS "Allow authenticated users to read products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to insert products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON products;

CREATE POLICY "Enable all operations for authenticated users" ON products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Mise à jour des politiques pour la table movements
DROP POLICY IF EXISTS "Allow authenticated users to read movements" ON movements;
DROP POLICY IF EXISTS "Allow authenticated users to insert movements" ON movements;

CREATE POLICY "Enable all operations for authenticated users" ON movements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);