// middleware/upload.js
import multer from 'multer';

// Configure Multer to store files in memory
const storage = multer.memoryStorage();

// Initialize multer upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow common file types: images, PDFs, office documents
    if (file.mimetype.startsWith('image/') ||
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-powerpoint' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and office documents are allowed.'), false);
    }
  }
});

export default upload;
