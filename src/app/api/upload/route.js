import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join, extname } from 'path';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB / file
const MAX_FILES_PER_REQUEST = 10;

function safeBaseName(name) {
  // Bỏ thư mục, ký tự ngoài [A-Za-z0-9._-], leading dots; giới hạn độ dài.
  const stripped = String(name).replace(/^.*[\\/]/, '').replace(/^\.+/, '');
  const sanitized = stripped.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.slice(-60) || 'file';
}

export async function POST(request) {
  try {
    const data = await request.formData();
    const files = data.getAll('files');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Không bắt được file đính kèm' }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Tối đa ${MAX_FILES_PER_REQUEST} file mỗi lần upload` },
        { status: 400 }
      );
    }

    const uploadedUrls = [];

    for (const file of files) {
      if (typeof file === 'string' || !file || typeof file.arrayBuffer !== 'function') {
        return NextResponse.json({ error: 'File không hợp lệ' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" vượt quá ${MAX_FILE_SIZE / 1024 / 1024} MB` },
          { status: 400 }
        );
      }

      const mime = (file.type || '').toLowerCase();
      if (!ALLOWED_MIME_TYPES.has(mime)) {
        return NextResponse.json(
          { error: `Định dạng "${mime || 'unknown'}" không được cho phép` },
          { status: 400 }
        );
      }

      const base = safeBaseName(file.name);
      const ext = extname(base).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { error: `Đuôi file "${ext || 'unknown'}" không được cho phép` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const randomToken = crypto.randomBytes(8).toString('hex');
      const filename = `${Date.now()}-${randomToken}${ext}`;
      const filePath = join(process.cwd(), 'public', 'uploads', filename);

      await writeFile(filePath, buffer);
      uploadedUrls.push(`/uploads/${filename}`);
    }

    return NextResponse.json({ urls: uploadedUrls });
  } catch (error) {
    console.error('Lỗi upload file:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi upload ảnh' }, { status: 500 });
  }
}
