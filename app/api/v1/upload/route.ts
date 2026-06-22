import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const uploadType = String(form.get('type') ?? 'cv');
  if (uploadType === 'product') {
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Product upload must be an image' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image must be smaller than 5MB' }, { status: 400 });
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
  if (bucketListError) {
    return NextResponse.json({ error: bucketListError.message }, { status: 500 });
  }
  if (!buckets?.find(b => b.name === 'profiles')) {
    const { error: bucketCreateError } = await supabase.storage.createBucket('profiles', { public: true });
    if (bucketCreateError) {
      return NextResponse.json({ error: bucketCreateError.message }, { status: 500 });
    }
  }

  const fallbackExt = uploadType === 'product' ? (IMAGE_EXTENSIONS[file.type] ?? 'png') : 'pdf';
  const ext = file.name.split('.').pop()?.toLowerCase() || fallbackExt;
  const folder = uploadType === 'product' ? 'products' : 'cvs';
  const path = `${folder}/${userId}_${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from('profiles')
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from('profiles').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
