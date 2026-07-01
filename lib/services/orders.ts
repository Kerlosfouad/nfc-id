import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { decrementProductStock, ensureProductCatalogTable } from '@/lib/services/productCatalog';

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

export async function deleteOrder(id: string) {
  await ensureOrderTables();
  await db.$executeRaw`DELETE FROM shop_orders WHERE id = ${id}`;
}

export async function deleteAllOrders() {
  await ensureOrderTables();
  await db.$executeRaw`DELETE FROM shop_orders`;
}

export async function acceptAllOrders() {
  const orders = await listOrders();
  const stockItems = orders.flatMap((order) =>
    order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
  );
  await decrementProductStock(stockItems);
  await deleteAllOrders();
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function htmlCell(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const EXCEL_COLUMNS = [
  { key: 'index', label: '#', width: 64, className: 'center nowrap' },
  { key: 'orderNumber', label: 'Order', width: 78, className: 'center nowrap' },
  { key: 'date', label: 'Date', width: 170, className: 'nowrap' },
  { key: 'customer', label: 'Customer Name', width: 220, className: 'text' },
  { key: 'phone', label: 'Phone', width: 150, className: 'phone nowrap' },
  { key: 'secondaryPhone', label: 'Second Phone', width: 150, className: 'phone nowrap' },
  { key: 'email', label: 'Email', width: 250, className: 'text' },
  { key: 'city', label: 'City', width: 135, className: 'text' },
  { key: 'address', label: 'Address', width: 280, className: 'text' },
  { key: 'product', label: 'Product', width: 210, className: 'text' },
  { key: 'quantity', label: 'Qty', width: 66, className: 'center nowrap' },
  { key: 'unitPrice', label: 'Unit Price', width: 105, className: 'money nowrap' },
  { key: 'lineTotal', label: 'Line Total', width: 105, className: 'money nowrap' },
  { key: 'total', label: 'Order Total', width: 115, className: 'money nowrap' },
  { key: 'notes', label: 'Notes', width: 260, className: 'text' },
] as const;

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

export function ordersToExcel(orders: AdminOrder[]) {
  const rows = orders.flatMap((order) =>
    order.items.length
      ? order.items.map((item, itemIndex) => ({
          index: `${order.orderNumber}.${itemIndex + 1}`,
          orderNumber: order.orderNumber,
          date: order.createdAt.toLocaleString(),
          customer: order.customerName,
          phone: order.phone,
          secondaryPhone: order.secondaryPhone ?? '',
          email: order.email ?? '',
          city: order.city,
          address: `${order.address} - ${order.apartment}`,
          product: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          total: order.total,
          notes: order.notes ?? '',
        }))
      : [{
          index: String(order.orderNumber),
          orderNumber: order.orderNumber,
          date: order.createdAt.toLocaleString(),
          customer: order.customerName,
          phone: order.phone,
          secondaryPhone: order.secondaryPhone ?? '',
          email: order.email ?? '',
          city: order.city,
          address: `${order.address} - ${order.apartment}`,
          product: '',
          quantity: 0,
          unitPrice: 0,
          lineTotal: 0,
          total: order.total,
          notes: order.notes ?? '',
        }],
  );

  const bodyRows = rows.map((row) => `
    <tr>
      ${EXCEL_COLUMNS.map((column) => `
        <td width="${column.width}" class="${column.className}" style="width:${column.width}px">${htmlCell(row[column.key])}</td>
      `).join('')}
    </tr>
  `).join('');

  const headerCells = EXCEL_COLUMNS.map((column) =>
    `<th width="${column.width}" style="width:${column.width}px">${column.label}</th>`,
  ).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml>
    <x:ExcelWorkbook xmlns:x="urn:schemas-microsoft-com:office:excel">
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Accepted Orders</x:Name>
          <x:WorksheetOptions>
            <x:FreezePanes/>
            <x:FrozenNoSplit/>
            <x:SplitHorizontal>3</x:SplitHorizontal>
            <x:TopRowBottomPane>3</x:TopRowBottomPane>
            <x:ActivePane>2</x:ActivePane>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml><![endif]-->
  <style>
    body { font-family: Arial, sans-serif; margin: 0; }
    table { border-collapse: collapse; table-layout: fixed; width: 2363px; }
    .title { background: #173966; color: #fff; font-size: 20px; font-weight: 700; text-align: center; height: 38px; }
    .subtitle { background: #eef3fb; color: #173966; font-size: 12px; font-weight: 700; text-align: center; height: 24px; }
    th { background: #2f5597; color: #fff; font-size: 13px; font-weight: 700; text-align: center; border: 1px solid #173966; height: 32px; padding: 4px 6px; white-space: normal; }
    td { border: 1px solid #9fb2cf; color: #111827; font-size: 12px; height: 30px; padding: 4px 7px; vertical-align: middle; mso-number-format: "\\@"; overflow-wrap: break-word; word-break: normal; }
    tr:nth-child(even) td { background: #f5f8fc; }
    .center { text-align: center; font-weight: 700; }
    .money { text-align: center; font-weight: 700; }
    .phone { color: #0f5132; font-weight: 700; }
    .text { text-align: left; white-space: normal; }
    .nowrap { white-space: nowrap; }
  </style>
</head>
<body>
  <table>
    <colgroup>
      ${EXCEL_COLUMNS.map((column) => `<col width="${column.width}" style="width:${column.width}px" />`).join('')}
    </colgroup>
    <tr><td class="title" colspan="15">NFC ID - Accepted Orders</td></tr>
    <tr><td class="subtitle" colspan="15">One row per product. Order Total is repeated for all products in the same order.</td></tr>
    <tr>${headerCells}</tr>
    ${bodyRows || '<tr><td colspan="15" class="center">No orders found</td></tr>'}
  </table>
</body>
</html>`;
}
