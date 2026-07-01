import { randomUUID } from 'crypto';
import { db } from '@/lib/db';

export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  salePriceLabel: string | null;
  imageUrl: string;
  badge: string;
  icon: string;
  category: string;
  discountLabel: string | null;
  isActive: boolean;
  displayOrder: number;
  stockQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductInput {
  name: string;
  description: string;
  priceLabel: string;
  salePriceLabel: string | null;
  imageUrl: string;
  badge: string;
  icon: string;
  category: string;
  discountLabel: string | null;
  isActive: boolean;
  displayOrder: number;
  stockQuantity: number;
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
      sale_price_label TEXT,
      image_url TEXT NOT NULL,
      badge TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'ri-shopping-bag-3-line',
      category TEXT NOT NULL DEFAULT 'General',
      discount_label TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      display_order INTEGER NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_product_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.$executeRawUnsafe(`ALTER TABLE admin_products ADD COLUMN IF NOT EXISTS discount_label TEXT`);
  await db.$executeRawUnsafe(`ALTER TABLE admin_products ADD COLUMN IF NOT EXISTS sale_price_label TEXT`);
  await db.$executeRawUnsafe(`ALTER TABLE admin_products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0`);
  ensured = true;
}

function mapProduct(row: {
  id: string;
  name: string;
  description: string;
  price_label: string;
  sale_price_label: string | null;
  image_url: string;
  badge: string;
  icon: string;
  category: string;
  discount_label: string | null;
  is_active: boolean;
  display_order: number;
  stock_quantity: number;
  created_at: Date;
  updated_at: Date;
}): CatalogProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceLabel: row.price_label,
    salePriceLabel: row.sale_price_label,
    imageUrl: row.image_url,
    badge: row.badge,
    icon: row.icon,
    category: row.category,
    discountLabel: row.discount_label,
    isActive: row.is_active,
    displayOrder: row.display_order,
    stockQuantity: row.stock_quantity,
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
  await ensureCategory(input.category);
  const id = randomUUID();
  const rows = await db.$queryRaw<Array<Parameters<typeof mapProduct>[0]>>`
    INSERT INTO admin_products (
      id, name, description, price_label, sale_price_label, image_url, badge, icon, category, discount_label, is_active, display_order, stock_quantity
    )
    VALUES (
      ${id}, ${input.name}, ${input.description}, ${input.priceLabel}, ${input.salePriceLabel}, ${input.imageUrl},
      ${input.badge}, ${input.icon}, ${input.category}, ${input.discountLabel}, ${input.isActive}, ${input.displayOrder}, ${input.stockQuantity}
    )
    RETURNING *
  `;
  return mapProduct(rows[0]);
}

export async function updateProduct(id: string, input: ProductInput) {
  await ensureProductCatalogTable();
  await ensureCategory(input.category);
  const rows = await db.$queryRaw<Array<Parameters<typeof mapProduct>[0]>>`
    UPDATE admin_products
    SET
      name = ${input.name},
      description = ${input.description},
      price_label = ${input.priceLabel},
      sale_price_label = ${input.salePriceLabel},
      image_url = ${input.imageUrl},
      badge = ${input.badge},
      icon = ${input.icon},
      category = ${input.category},
      discount_label = ${input.discountLabel},
      is_active = ${input.isActive},
      display_order = ${input.displayOrder},
      stock_quantity = ${input.stockQuantity},
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

export async function decrementProductStock(items: Array<{ productId: string; quantity: number }>) {
  await ensureProductCatalogTable();
  for (const item of items) {
    await db.$executeRaw`
      UPDATE admin_products
      SET stock_quantity = GREATEST(stock_quantity - ${item.quantity}, 0),
          badge = GREATEST(stock_quantity - ${item.quantity}, 0)::text,
          updated_at = NOW()
      WHERE id = ${item.productId}
    `;
  }
}

export async function listCategories() {
  await ensureProductCatalogTable();
  const rows = await db.$queryRaw<Array<{ name: string; product_count: bigint }>>`
    SELECT c.name, COUNT(p.id) AS product_count
    FROM admin_product_categories c
    LEFT JOIN admin_products p ON p.category = c.name
    GROUP BY c.name
    ORDER BY c.name ASC
  `;
  return rows.map((row) => ({ name: row.name, productCount: Number(row.product_count) }));
}

export async function deleteCategory(name: string) {
  await ensureProductCatalogTable();
  const cleanName = name.trim();
  if (!cleanName || cleanName === 'General') return { ok: false, reason: 'PROTECTED' as const };

  const rows = await db.$queryRaw<Array<{ product_count: bigint }>>`
    SELECT COUNT(*) AS product_count
    FROM admin_products
    WHERE category = ${cleanName}
  `;
  const productCount = Number(rows[0]?.product_count ?? 0);
  if (productCount > 0) return { ok: false, reason: 'NOT_EMPTY' as const };

  await db.$executeRaw`DELETE FROM admin_product_categories WHERE name = ${cleanName}`;
  return { ok: true as const };
}

export async function ensureCategory(name: string) {
  await ensureProductCatalogTable();
  const cleanName = name.trim() || 'General';
  await db.$executeRaw`
    INSERT INTO admin_product_categories (id, name)
    VALUES (${randomUUID()}, ${cleanName})
    ON CONFLICT (name) DO NOTHING
  `;
  return cleanName;
}
