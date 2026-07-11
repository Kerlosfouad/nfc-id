import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { db } from '@/lib/db';
import { deleteUserAccount } from '@/lib/services/deleteUserAccount';

type CustomerExportRow = Awaited<ReturnType<typeof loadCustomers>>[number];
type ExcelCustomerRow = {
  index: string;
  customerName: string;
  email: string;
  phone: string;
  medals: string;
  profileCode: string;
  theme: string;
  verification: string;
  joined: string;
};

function htmlCell(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function phoneFromLinks(profile: CustomerExportRow['profiles'][number]) {
  const phoneLink = profile.links.find((link) => /phone|whatsapp/i.test(link.title));
  return phoneLink?.url.replace(/^https?:\/\/(wa\.me|api\.whatsapp\.com)\/(send\?phone=)?/i, '') ?? '';
}

function activeLabel(value: Date | null) {
  if (!value) return 'Inactive';
  if (value.getTime() <= Date.now()) return 'Expired';
  return `Active until ${value.toLocaleDateString()}`;
}

function buildCustomersExcel(customers: CustomerExportRow[]) {
  const rows: ExcelCustomerRow[] = customers.flatMap((customer, customerIndex) => {
    const medalCodes = customer.tags.map((tag) => tag.publicId).join(' | ');
    if (customer.profiles.length === 0) {
      return [{
        index: String(customerIndex + 1),
        customerName: '',
        email: customer.email,
        phone: '',
        medals: medalCodes,
        profileCode: '',
        theme: 'Inactive',
        verification: 'Inactive',
        joined: customer.createdAt.toLocaleDateString(),
      }];
    }

    return customer.profiles.map((profile, profileIndex) => ({
      index: `${customerIndex + 1}.${profileIndex + 1}`,
      customerName: profile.displayName,
      email: customer.email,
      phone: phoneFromLinks(profile),
      medals: medalCodes,
      profileCode: profile.publicId,
      theme: activeLabel(profile.primeDesignUntil),
      verification: activeLabel(profile.verifiedUntil),
      joined: customer.createdAt.toLocaleDateString(),
    }));
  });

  const bodyRows = rows.map((row) => `
    <tr>
      <td class="center">${htmlCell(row.index)}</td>
      <td>${htmlCell(row.customerName)}</td>
      <td>${htmlCell(row.email)}</td>
      <td>${htmlCell(row.phone)}</td>
      <td>${htmlCell(row.medals)}</td>
      <td>${htmlCell(row.profileCode)}</td>
      <td>${htmlCell(row.theme)}</td>
      <td>${htmlCell(row.verification)}</td>
      <td>${htmlCell(row.joined)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    .title { background: #173966; color: #fff; font-size: 22px; font-weight: 700; text-align: center; height: 34px; }
    th { background: #2f5597; color: #fff; font-size: 14px; font-weight: 700; text-align: center; border: 1px solid #173966; height: 28px; }
    td { border: 1px solid #173966; font-size: 12px; height: 24px; padding: 4px 6px; vertical-align: middle; mso-number-format: "\\@"; }
    tr:nth-child(even) td { background: #f2f5fa; }
    .center { text-align: center; font-weight: 700; }
  </style>
</head>
<body>
  <table>
    <colgroup>
      <col style="width: 48px" />
      <col style="width: 190px" />
      <col style="width: 230px" />
      <col style="width: 150px" />
      <col style="width: 230px" />
      <col style="width: 130px" />
      <col style="width: 150px" />
      <col style="width: 170px" />
      <col style="width: 110px" />
    </colgroup>
    <tr><td class="title" colspan="9">LinkUp - Customer Data</td></tr>
    <tr><td colspan="9"></td></tr>
    <tr>
      <th>#</th>
      <th>Customer Name</th>
      <th>Email</th>
      <th>Phone</th>
      <th>Medal Codes</th>
      <th>Profile Code</th>
      <th>Theme Status</th>
      <th>Verification Status</th>
      <th>Joined</th>
    </tr>
    ${bodyRows || '<tr><td colspan="9" class="center">No customers found</td></tr>'}
  </table>
</body>
</html>`;
}

async function loadCustomers() {
  return db.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      profiles: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          publicId: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          isVerified: true,
          primeDesignUntil: true,
          verifiedUntil: true,
          isSuspended: true,
          isActive: true,
          links: {
            where: {
              OR: [
                { title: { contains: 'phone', mode: 'insensitive' } },
                { title: { contains: 'whatsapp', mode: 'insensitive' } },
                { type: 'WHATSAPP' },
              ],
            },
            select: { title: true, url: true },
            take: 3,
          },
        },
      },
      tags: {
        orderBy: { createdAt: 'desc' },
        select: {
          publicId: true,
          state: true,
        },
        take: 20,
      },
      _count: {
        select: {
          tags: true,
          profiles: true,
        },
      },
    },
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const customers = await loadCustomers();

  if (request.nextUrl.searchParams.get('format') === 'xls') {
    const html = buildCustomersExcel(customers);
    return new NextResponse(`\uFEFF${html}`, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="nfc-id-customers-${new Date().toISOString().slice(0, 10)}.xls"`,
      },
    });
  }

  return NextResponse.json({ data: customers, error: null });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'Missing userId.' } },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteUserAccount(userId);
    return NextResponse.json({ data: deleted, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: { code: 'ACCOUNT_DELETE_FAILED', message: error instanceof Error ? error.message : 'Account could not be deleted.' } },
      { status: 500 },
    );
  }
}
