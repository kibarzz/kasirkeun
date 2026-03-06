import { IncomingForm } from 'formidable';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({
    uploadDir: '/tmp',
    keepExtensions: true,
  });

  try {
    const { files }: any = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const file = files.proof || files.image || files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      // Fallback or error
      return res.status(200).json({ 
        url: `/tmp/${file.newFilename}`,
        message: 'Cloudinary not configured. File uploaded to temporary storage only.' 
      });
    }

    // Upload to Cloudinary
    // formidable v3+ uses file.filepath, v2 uses file.path
    const filePath = file.filepath || file.path;
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'kedai_m46',
      use_filename: true,
      unique_filename: true,
    });

    // Clean up local temp file
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Failed to delete temp file:', e);
    }

    return res.status(200).json({ 
      url: result.secure_url,
      public_id: result.public_id,
      message: 'File uploaded successfully to Cloudinary' 
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed', details: error.message });
  }
}
