import 'server-only';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {CivicError} from '@/features/civic/validation';

export const IDENTITY_MAX_BYTES = 5 * 1024 * 1024;
const PIXELS = 24_000_000;

/** Decode and re-encode untrusted images before storing or serving them. */
export async function validateIdentityDocument(file: File) {
  if (!file.size || file.size > IDENTITY_MAX_BYTES) throw new CivicError('Choose an ID image up to 5 MB.', 413);
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new CivicError('Upload a JPG or PNG image of your ID.');
  const input = Buffer.from(await file.arrayBuffer());
  try {
    const options = {limitInputPixels: PIXELS, animated: false, failOn: 'warning' as const};
    const meta = await sharp(input, options).metadata();
    if (meta.format !== (file.type === 'image/jpeg' ? 'jpeg' : 'png') || !meta.width || !meta.height || meta.width * meta.height > PIXELS || (meta.pages ?? 1) > 1) throw new Error('Invalid image');
    const data = await sharp(input, options).rotate().flatten({background: '#ffffff'}).jpeg({quality: 90}).toBuffer();
    if (data.length > IDENTITY_MAX_BYTES) throw new Error('Decoded image too large');
    return {data, mimeType: 'image/jpeg', byteSize: data.length, sha256: createHash('sha256').update(data).digest('hex')};
  } catch {
    throw new CivicError('The ID image could not be read safely. Choose a complete JPG or PNG with at most 24 million pixels.');
  }
}
