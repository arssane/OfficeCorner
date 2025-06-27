// routes/uploadRoute.js
import express from 'express';
import cloudinary from '../utils/cloudinary.js'; // Import the configured cloudinary instance
import upload from '../middleware/upload.js'; // Import Multer middleware
import { protect, authorize } from '../middleware/authMiddleware.js'; // Assuming you have auth middleware

const router = express.Router();

// Route to handle single file upload to Cloudinary
// Protect this route to ensure only authorized users can upload
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Convert buffer to data URI
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataUri = "data:" + req.file.mimetype + ";base64," + b64;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "auto", // Automatically detect file type
      folder: "task_files" // Optional: specify a folder in Cloudinary
    });

    // Return the Cloudinary URL
    res.status(200).json({
      message: 'File uploaded successfully',
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

export default router;
