import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrder } from '@/lib/services/orders';

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().nullable().optional().default(null),
);

const CheckoutSchema = z.object({
  customerName: z.string().trim().min(2),
  email: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().email().nullable().optional().default(null),
  ),
  phone: z.string().trim().min(6),
  secondaryPhone: optionalText,
  address: z.string().trim().min(5),
  apartment: z.string().trim().optional().default(''),
  country: z.string().trim().min(2).default('Egypt'),
  city: z.string().trim().min(2),
  notes: optionalText,
  couponCode: optionalText,
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1),
});

export async function POST(request: NextRequest) {
  const parsed = CheckoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const field = firstIssue?.path.join('.');
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: field ? `Please check ${field}.` : 'Please complete the required checkout fields.',
          fields: Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join('.') || 'checkout', issue.message])),
        },
      },
      { status: 400 },
    );
  }

  try {
    const order = await createOrder(parsed.data);
    return NextResponse.json({ data: order, error: null }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'ORDER_CREATE_FAILED',
          message: e instanceof Error ? e.message : 'Order could not be created.',
        },
      },
      { status: 500 },
    );
  }
}
