import { randomUUID } from 'crypto';
import { db } from '@/lib/db';

export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  imageUrl: string;
  badge: string;
  icon: string;
  category: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductInput {
  name: string;
  description: string;
  priceLabel: string;
  imageUrl: string;
  badge: string;
  icon: string;
  category: string;
  isActive: boolean;
  displayOrder: number;
}

let ensured = false;

export async function ensureProductCatalogTable() {
  if (ensured) return;
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price_label TEXT NOT NULL,
      image_url TEXT NOT NULL,
      badge TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'ri-shopping-bag-3-line',
      category TEXT NOT NULL DEFAULT 'General',
      is_active BOOLEAN NOT NULL DEFAULT true,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ensured = true;
}

function mapProduct(row: {
  id: string;
  name: string;
  description: string;
  price_label: string;
  image_url: string;
  badge: string;
  icon: string;
  category: string;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}): CatalogProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceLabel: row.price_label,
    imageUrl: row.image_url,
    badge: row.badge,
    icon: row.icon,
    category: row.category,
    isActive: row.is_active,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProducts({ activeOnly = false } = {}) {
  await ensureProductCatalogTable();
  const rows = activeOnly
    ? await db.$queryRaw<Array<Parameters<typeof mapProduct>[0]>>`
        SELECT * FROM admin_products
        WHERE is_active = true
        ORDER BY display_order ASC, created_at DESC
      `
    : await db.$queryRaw<Array<Parameters<typeof mapProduct>[0]>>`
        SELECT * FROM admin_products
        ORDER BY display_order ASC, created_at DESC
      `;

  return rows.map(mapProduct);
}

export async function createProduct(input: ProductInput) {
  await ensureProductCatalogTable();
  const id = randomUUID();
  const rows = await db.$queryRaw<Array<Parameters<typeof mapProduct>[0]>>`
    INSERT INTO admin_products (
      id, name, description, price_label, image_url, badge, icon, category, is_active, display_order
    )
    VALUES (
      ${id}, ${input.name}, ${input.description}, ${input.priceLabel}, ${input.imageUrl},
      ${input.badge}, ${input.icon}, ${input.category}, ${input.isActive}, ${input.displayOrder}
    )
    RETURNING *
  `;
  return mapProduct(rows[0]);
}

export async function updateProduct(id: string, input: ProductInput) {
  await ensureProductCatalogTable();
  const rows = await db.$queryRaw<Array<Parameters<typeof mapProduct>[0]>>`
    UPDATE admin_products
    SET
      name = ${input.name},
      description = ${input.description},
      price_label = ${input.priceLabel},
      image_url = ${input.imageUrl},
      badge = ${input.badge},
      icon = ${input.icon},
      category = ${input.category},
      is_active = ${input.isActive},
      display_order = ${input.displayOrder},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function deleteProduct(id: string) {
  await ensureProductCatalogTable();
  await db.$executeRaw`DELETE FROM admin_products WHERE id = ${id}`;
}

