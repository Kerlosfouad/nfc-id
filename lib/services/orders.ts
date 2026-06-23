import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { ensureProductCatalogTable } from '@/lib/services/productCatalog';

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface CheckoutInput {
  customerName: string;
  email: string | null;
  phone: string;
  secondaryPhone: string | null;
  address: string;
  apartment: string;
  country: string;
  city: string;
  notes: string | null;
  couponCode: string | null;
  items: OrderItemInput[];
}

export interface AdminOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  email: string | null;
  phone: string;
  secondaryPhone: string | null;
  address: string;
  apartment: string;
  country: string;
  city: string;
  notes: string | null;
  couponCode: string | null;
  subtotal: number;
  discount: number;
  shippingLabel: string;
  total: number;
  status: string;
  createdAt: Date;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    imageUrl: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
}

let ensured = false;

export async function ensureOrderTables() {
  if (ensured) return;
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS shop_orders (
      id TEXT PRIMARY KEY,
      order_number BIGSERIAL UNIQUE,
      customer_name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      secondary_phone TEXT,
      address TEXT NOT NULL,
      apartment TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      notes TEXT,
      coupon_code TEXT,
      subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
      discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      shipping_label TEXT NOT NULL DEFAULT 'To be calculated',
      total NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'NEW',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS shop_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      unit_price NUMERIC(12, 2) NOT NULL,
      quantity INTEGER NOT NULL,
      line_total NUMERIC(12, 2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ensured = true;
}

function parsePrice(label: string | null | undefined) {
  if (!label) return 0;
  const match = label.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function mapOrderRows(
  orders: Array<{
    id: string;
    order_number: bigint;
    customer_name: string;
    email: string | null;
    phone: string;
    secondary_phone: string | null;
    address: string;
    apartment: string;
    country: string;
    city: string;
    notes: string | null;
    coupon_code: string | null;
    subtotal: unknown;
    discount: unknown;
    shipping_label: string;
    total: unknown;
    status: string;
    created_at: Date;
  }>,
  items: Array<{
    id: string;
    order_id: string;
    product_id: string;
    product_name: string;
    image_url: string;
    unit_price: unknown;
    quantity: number;
    line_total: unknown;
  }>,
): AdminOrder[] {
  return orders.map((order) => ({
    id: order.id,
    orderNumber: Number(order.order_number),
    customerName: order.customer_name,
    email: order.email,
    phone: order.phone,
    secondaryPhone: order.secondary_phone,
    address: order.address,
    apartment: order.apartment,
    country: order.country,
    city: order.city,
    notes: order.notes,
    couponCode: order.coupon_code,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shippingLabel: order.shipping_label,
    total: Number(order.total),
    status: order.status,
    createdAt: order.created_at,
    items: items
      .filter((item) => item.order_id === order.id)
      .map((item) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        imageUrl: item.image_url,
        unitPrice: Number(item.unit_price),
        quantity: item.quantity,
        lineTotal: Number(item.line_total),
      })),
  }));
}

export async function createOrder(input: CheckoutInput) {
  await ensureOrderTables();
  await ensureProductCatalogTable();
  const productIds = input.items.map((item) => item.productId);
  const products = await db.$queryRaw<
    Array<{ id: string; name: string; image_url: string; price_label: string; sale_price_label: string | null }>
  >`
    SELECT id, name, image_url, price_label, sale_price_label
    FROM admin_products
    WHERE is_active = true AND id = ANY(${productIds})
  `;

  const lines = input.items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) throw new Error('One or more products are no longer available');
    const unitPrice = parsePrice(product.sale_price_label ?? product.price_label);
    return {
      productId: product.id,
      productName: product.name,
      imageUrl: product.image_url,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const subtotal = lines.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = 0;
  const total = subtotal - discount;
  const orderId = randomUUID();

  const orderRows = await db.$queryRaw<Array<{ id: string; order_number: bigint }>>`
    INSERT INTO shop_orders (
      id, customer_name, email, phone, secondary_phone, address, apartment, country, city, notes,
      coupon_code, subtotal, discount, total
    )
    VALUES (
      ${orderId}, ${input.customerName}, ${input.email}, ${input.phone}, ${input.secondaryPhone},
      ${input.address}, ${input.apartment}, ${input.country}, ${input.city}, ${input.notes},
      ${input.couponCode}, ${subtotal}, ${discount}, ${total}
    )
    RETURNING id, order_number
  `;

  for (const line of lines) {
    await db.$executeRaw`
      INSERT INTO shop_order_items (
        id, order_id, product_id, product_name, image_url, unit_price, quantity, line_total
      )
      VALUES (
        ${randomUUID()}, ${orderId}, ${line.productId}, ${line.productName}, ${line.imageUrl},
        ${line.unitPrice}, ${line.quantity}, ${line.lineTotal}
      )
    `;
  }

  return { id: orderRows[0].id, orderNumber: Number(orderRows[0].order_number), total };
}

export async function listOrders() {
  await ensureOrderTables();
  const orders = await db.$queryRaw<Array<Parameters<typeof mapOrderRows>[0][number]>>`
    SELECT * FROM shop_orders
    ORDER BY created_at DESC
  `;
  const orderIds = orders.map((order) => order.id);
  const items = orderIds.length
    ? await db.$queryRaw<Array<Parameters<typeof mapOrderRows>[1][number]>>`
        SELECT * FROM shop_order_items
        WHERE order_id = ANY(${orderIds})
        ORDER BY created_at ASC
      `
    : [];
  return mapOrderRows(orders, items);
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function ordersToCsv(orders: AdminOrder[]) {
  const header = [
    'Order Number',
    'Date',
    'Status',
    'Customer',
    'Phone',
    'Secondary Phone',
    'Email',
    'Country',
    'City',
    'Address',
    'Apartment',
    'Products',
    'Subtotal',
    'Discount',
    'Shipping',
    'Total',
    'Coupon',
    'Notes',
  ];
  const rows = orders.map((order) => [
    order.orderNumber,
    order.createdAt.toISOString(),
    order.status,
    order.customerName,
    order.phone,
    order.secondaryPhone,
    order.email,
    order.country,
    order.city,
    order.address,
    order.apartment,
    order.items.map((item) => `${item.productName} x${item.quantity}`).join(' | '),
    order.subtotal,
    order.discount,
    order.shippingLabel,
    order.total,
    order.couponCode,
    order.notes,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
