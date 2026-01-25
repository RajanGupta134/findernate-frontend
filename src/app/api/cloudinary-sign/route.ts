import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const folder = (body?.folder as string) || 'findernate/profiles';

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({
        error: 'Missing Cloudinary server env vars (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)'
      }, { status: 500 });
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Build the parameters string to sign (alphabetically sorted keys)
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    return NextResponse.json({
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to generate signature' }, { status: 500 });
  }
}
