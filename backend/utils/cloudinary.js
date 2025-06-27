// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Ensure dotenv is configured at the very top of your main server file (server.js)
// and that this file is imported after dotenv.config() has run in server.js.
dotenv.config(); // Calling it here too as a safeguard, though it's best placed once in server.js

// Log environment variables to check if they are being loaded correctly
console.log('Cloudinary Config Check:');
console.log('  CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Loaded' : 'Not Loaded');
console.log('  CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Loaded' : 'Not Loaded');
console.log('  CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Loaded (value hidden)' : 'Not Loaded');

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudinary;
