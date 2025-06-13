// services/emailService.js - Email service with OTP functionality
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// In-memory OTP storage (consider using Redis in production)
const otpStorage = new Map();

// OTP expiry time (5 minutes)
const OTP_EXPIRY_TIME = 5 * 60 * 1000;

// Email transporter configuration
const createTransporter = () => {
  // Corrected function call: nodemailer.createTransport instead of nodemailer.createTransporter
  // Explicitly defining host and port for Gmail, using SMTPS (secure connection on port 465)
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', // Gmail's SMTP host
    port: 465,              // Standard port for SMTPS
    secure: true,           // Use SSL/TLS
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_APP_PASSWORD // Your app-specific password
    }
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store OTP with expiry
const storeOTP = (email, otp, purpose = 'verification') => {
  const key = `${email}_${purpose}`;
  otpStorage.set(key, {
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_TIME,
    attempts: 0
  });
  
  // Auto-cleanup after expiry
  setTimeout(() => {
    otpStorage.delete(key);
  }, OTP_EXPIRY_TIME);
};

// Verify OTP
const verifyOTP = (email, otp, purpose = 'verification') => {
  const key = `${email}_${purpose}`;
  const storedData = otpStorage.get(key);
  
  if (!storedData) {
    return { success: false, message: 'OTP not found or expired' };
  }
  
  // Check expiry
  if (Date.now() > storedData.expiresAt) {
    otpStorage.delete(key);
    return { success: false, message: 'OTP has expired' };
  }
  
  // Check attempts (max 3 attempts)
  if (storedData.attempts >= 3) {
    otpStorage.delete(key);
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }
  
  // Verify OTP
  if (storedData.otp !== otp) {
    storedData.attempts++;
    return { success: false, message: 'Invalid OTP' };
  }
  
  // Success - remove OTP
  otpStorage.delete(key);
  return { success: true, message: 'OTP verified successfully' };
};

// Send OTP email
const sendOTP = async (email, purpose = 'verification', userName = '') => {
  try {
    const otp = generateOTP();
    const transporter = createTransporter();
    
    // Store OTP
    storeOTP(email, otp, purpose);
    
    // Email templates based on purpose
    const emailTemplates = {
      verification: {
        subject: 'Email Verification - Your OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Hello ${userName || 'User'},</p>
            <p>Your verification code is:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `
      },
      login: {
        subject: 'Login Verification - Your OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Login Verification</h2>
            <p>Hello ${userName || 'User'},</p>
            <p>Your login verification code is:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't try to log in, please secure your account immediately.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `
      },
      reset: {
        subject: 'Password Reset - Your OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset</h2>
            <p>Hello ${userName || 'User'},</p>
            <p>Your password reset verification code is:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `
      },
      // New purpose for Google signup verification
      'google-signup-verification': {
        subject: 'Google Account Verification - Your OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Google Account Verification</h2>
            <p>Hello ${userName || 'User'},</p>
            <p>To complete your registration with Google, please use the following verification code:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you did not attempt to sign up with Google, please ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `
      }
    };
    
    const template = emailTemplates[purpose] || emailTemplates.verification;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: template.subject,
      html: template.html
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email} for ${purpose}`);
    
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    return { success: false, message: 'Failed to send OTP' };
  }
};

// Clean expired OTPs (utility function)
const cleanExpiredOTPs = () => {
  const now = Date.now();
  for (const [key, value] of otpStorage.entries()) {
    if (now > value.expiresAt) {
      otpStorage.delete(key);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanExpiredOTPs, 10 * 60 * 1000);

export { sendOTP, verifyOTP };
