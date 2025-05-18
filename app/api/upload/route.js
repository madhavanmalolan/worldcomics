import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create a unique filename
    const uniqueId = uuidv4();
    const extension = file.name.split('.').pop();
    const filename = `${uniqueId}.${extension}`;

    // Get the file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save the file to the public directory
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);
    console.log('File uploaded successfully:', filepath);

    // Return the URL that can be used to access the file
    const url = `${process.env.NEXT_PUBLIC_BASE_URL}/uploads/${filename}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error uploading file' },
      { status: 500 }
    );
  }
} 