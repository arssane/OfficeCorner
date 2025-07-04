// services/emailService.js - Email service with OTP functionality
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// In-memory OTP storage (consider using Redis in production)
const otpStorage = new Map();

// OTP expiry time (5 minutes)
const OTP_EXPIRY_TIME = 5 * 60 * 1000;

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
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
  
  if (Date.now() > storedData.expiresAt) {
    otpStorage.delete(key);
    return { success: false, message: 'OTP has expired' };
  }
  
  if (storedData.attempts >= 3) {
    otpStorage.delete(key);
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }
  
  if (storedData.otp !== otp) {
    storedData.attempts++;
    return { success: false, message: 'Invalid OTP' };
  }
  
  otpStorage.delete(key);
  return { success: true, message: 'OTP verified successfully' };
};

// CENTRALIZED EMAIL TEMPLATES - Define once and reuse
const getEmailTemplates = (userName = '', reason = '') => ({
  verification: {
    subject: 'Email Verification - Your OTP Code',
    html: (otp) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Email Verification</h2>
        </div>
        <div style="padding: 20px; color: #333;">
          <p>Hello ${userName || 'User'},</p>
          <p>Your verification code is:</p>
          <div style="background-color: #e8f5e9; padding: 20px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 3px; margin: 20px 0; border: 1px dashed #4CAF50; border-radius: 5px; color: #388E3C;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #555;">This code will expire in 5 minutes.</p>
          <p style="font-size: 14px; color: #555;">If you didn't request this verification, please ignore this email.</p>
        </div>
        <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; margin-top: 20px;">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
      </div>
    `
  },
  login: {
    subject: 'Login Verification - Your OTP Code',
    html: (otp) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Login Verification</h2>
        </div>
        <div style="padding: 20px; color: #333;">
          <p>Hello ${userName || 'User'},</p>
          <p>Your login verification code is:</p>
          <div style="background-color: #e8f5e9; padding: 20px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 3px; margin: 20px 0; border: 1px dashed #4CAF50; border-radius: 5px; color: #388E3C;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #555;">This code will expire in 5 minutes.</p>
          <p style="font-size: 14px; color: #555;">If you didn't try to log in, please secure your account immediately.</p>
        </div>
        <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; margin-top: 20px;">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
      </div>
    `
  },
  reset: {
    subject: 'Password Reset - Your OTP Code',
    html: (otp) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Password Reset</h2>
        </div>
        <div style="padding: 20px; color: #333;">
          <p>Hello ${userName || 'User'},</p>
          <p>Your password reset verification code is:</p>
          <div style="background-color: #e8f5e9; padding: 20px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 3px; margin: 20px 0; border: 1px dashed #4CAF50; border-radius: 5px; color: #388E3C;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #555;">This code will expire in 5 minutes.</p>
          <p style="font-size: 14px; color: #555;">If you didn't request a password reset, please ignore this email.</p>
        </div>
        <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; margin-top: 20px;">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
      </div>
    `
  },
  'google-signup-verification': {
    subject: 'Google Account Verification - Your OTP Code',
    html: (otp) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Google Account Verification</h2>
        </div>
        <div style="padding: 20px; color: #333;">
          <p>Hello ${userName || 'User'},</p>
          <p>To complete your registration with Google, please use the following verification code:</p>
          <div style="background-color: #e8f5e9; padding: 20px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 3px; margin: 20px 0; border: 1px dashed #4CAF50; border-radius: 5px; color: #388E3C;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #555;">This code will expire in 5 minutes.</p>
          <p style="font-size: 14px; color: #555;">If you did not attempt to sign up with Google, please ignore this email.</p>
        </div>
        <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; margin-top: 20px;">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
      </div>
    `
  },
  'account-pending': {
    subject: 'Your Account Registration is Pending Approval',
    html: () => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <div style="background-color: #FFC107; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Account Pending Review</h2>
        </div>
        <div style="padding: 20px; color: #333;">
          <p style="font-size: 16px;">Dear <strong style="color: #4CAF50;">${userName || 'User'}</strong>,</p>
          <p style="font-size: 16px;">Thank you for registering your account with us! We appreciate your interest in our services.</p>
          <p style="font-size: 16px;">Your account is currently <strong>pending approval</strong> from our administrators. We are reviewing your registration details to ensure everything is in order.</p>
          <p style="font-size: 16px;">You will receive another email as soon as your account has been approved and activated. We aim to process all requests promptly.</p>
          <p style="font-size: 16px;">Thank you for your patience.</p>
        </div>
        <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; margin-top: 20px;">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
      </div>
    `
  },
  'account-approved': {
    subject: 'Great News! Your Account Has Been Approved!',
    html: () => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Account Approved! 🎉</h2>
        </div>
        <div style="padding: 20px; color: #333;">
          <p style="font-size: 16px;">Congratulations, <strong style="color: #4CAF50;">${userName || 'User'}</strong>!</p>
          <p style="font-size: 16px;">We are delighted to inform you that your account has been <strong>approved</strong> and is now fully active.</p>
          <p style="font-size: 16px;">You can now log in and start exploring all the features and benefits our services offer.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 20px auto;">
            <tr>
              <td style="border-radius: 5px; background: #4CAF50; text-align: center;">
                <a href="${process.env.FRONTEND_URL}/login" style="background: #4CAF50; border: 1px solid #4CAF50; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.2; text-align: center; text-decoration: none; display: block; border-radius: 5px; font-weight: bold; padding: 12px 25px; color: #ffffff;">
                  Log In to Your Account
                </a>
              </td>
            </tr>
          </table>
          <p style="font-size: 14px; color: #555;">If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
          <p style="font-size: 14px;"><a href="${process.env.FRONTEND_URL}/login" style="color: #4CAF50; text-decoration: underline;">${process.env.FRONTEND_URL}/login</a></p>
          <p style="font-size: 14px; color: #555; margin-top: 20px;">If you have any questions or need assistance, please do not hesitate to contact our support team.</p>
          <p style="font-size: 14px; color: #555;">Welcome aboard!</p>
        </div>
        <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; margin-top: 20px;">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
      </div>
    `
  },
  'account-rejected': {
    subject: 'Important: Your Account Registration Status',
    html: () => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <div style="background-color: #DC3545; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Account Registration Rejected</h2>
        </div>
        <div style="padding: 20px; color: #333;">
          <p style="font-size: 16px;">Dear <strong style="color: #DC3545;">${userName || 'User'}</strong>,</p>
          <p style="font-size: 16px;">We regret to inform you that your account registration has been <strong>rejected</strong>.</p>
          ${reason ? `<p style="font-size: 16px;">Reason for rejection: <strong style="color: #DC3545;">${reason}</strong></p>` : ''}
          <p style="font-size: 16px;">If you believe this is an error or have any questions, please contact our support team for further assistance.</p>
        </div>
        <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; margin-top: 20px;">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
      </div>
    `
  },
  // UPDATED: Event Assignment Email Template to accept two links
  'event-assignment': {
    subject: (eventTitle) => `New Event Assigned: ${eventTitle}`,
    html: (eventDetails, adminProvidedEventLink, siteLink) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <div style="background-color: #1a73e8; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">You've Been Assigned to a New Event!</h2>
        </div>
        <div style="padding: 20px; color: #333;">
          <p style="font-size: 16px;">Hello ${eventDetails.assignedUserName || 'User'},</p>
          <p style="font-size: 16px;">A new event has been assigned to you:</p>
          <ul style="list-style-type: none; padding: 0; margin: 20px 0;">
            <li style="margin-bottom: 10px;"><strong>Title:</strong> ${eventDetails.title}</li>
            <li style="margin-bottom: 10px;"><strong>Description:</strong> ${eventDetails.description || 'N/A'}</li>
            <li style="margin-bottom: 10px;"><strong>Date:</strong> ${eventDetails.date}</li>
            <li style="margin-bottom: 10px;"><strong>Time:</strong> ${eventDetails.startTime}${eventDetails.endTime ? ` - ${eventDetails.endTime}` : ''}</li>
            <li style="margin-bottom: 10px;"><strong>Location:</strong> ${eventDetails.location || 'N/A'}</li>
            <li style="margin-bottom: 10px;"><strong>Type:</strong> ${eventDetails.type}</li>
            ${adminProvidedEventLink ? `<li style="margin-bottom: 10px;"><strong>Event Link:</strong> <a href="${adminProvidedEventLink}" style="color: #1a73e8; text-decoration: underline;">${adminProvidedEventLink}</a></li>` : ''}
          </ul>
          ${siteLink ? ` 
            <p style="font-size: 16px;">You can view more details about this event by clicking the button below:</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 20px auto;">
              <tr>
                <td style="border-radius: 5px; background: #1a73e8; text-align: center;">
                  <a href="${siteLink}" style="background: #1a73e8; border: 1px solid #1a73e8; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.2; text-align: center; text-decoration: none; display: block; border-radius: 5px; font-weight: bold; padding: 12px 25px; color: #ffffff;">
                    View Event Details
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-size: 14px; color: #555;">If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
            <p style="font-size: 14px;"><a href="${siteLink}" style="color: #1a73e8; text-decoration: underline;">${siteLink}</a></p>
          ` : '<p style="font-size: 16px;">A link to view event details on the site is not available.</p>'}
          <p style="font-size: 14px; color: #555; margin-top: 20px;">We look forward to your participation!</p>
        </div>
        <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; margin-top: 20px;">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
      </div>
    `
  }
});

// Send OTP email
const sendOTP = async (email, purpose = 'verification', userName = '') => {
  try {
    const otp = generateOTP();
    const transporter = createTransporter();
    
    storeOTP(email, otp, purpose);
    
    const emailTemplates = getEmailTemplates(userName);
    const template = emailTemplates[purpose] || emailTemplates.verification;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: template.subject,
      html: template.html(otp)
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email} for ${purpose}`);
    
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error(`❌ Error sending email for purpose ${purpose}:`, error);
    return { success: false, message: `Failed to send email for ${purpose}` };
  }
};

// FIXED: Function to send a generic email (without OTP)
const sendGenericEmail = async (email, subject, purpose, userName = '', reason = '') => {
  try {
    const transporter = createTransporter();
    
    // Get templates with current userName and reason
    const emailTemplates = getEmailTemplates(userName, reason);
    const template = emailTemplates[purpose];
    
    if (!template) {
      console.error(`❌ No email template found for purpose: ${purpose}`);
      return { success: false, message: `No email template found for purpose: ${purpose}` };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: template.subject,
      html: template.html() // Call the html function for non-OTP templates
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Generic email sent to ${email} with purpose: ${purpose}`);
    
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error(`❌ Error sending generic email to ${email}:`, error);
    return { success: false, message: 'Failed to send email' };
  }
};

// UPDATED: Function to send event assignment email - now accepts two links
const sendEventAssignmentEmail = async (toEmail, eventDetails, adminProvidedEventLink, siteLink) => {
  try {
    const transporter = createTransporter();
    
    const emailTemplates = getEmailTemplates(eventDetails.assignedUserName); // Pass assigned user's name
    const template = emailTemplates['event-assignment'];
    
    if (!template) {
      console.error(`❌ No email template found for purpose: event-assignment`);
      return { success: false, message: `No email template found for purpose: event-assignment` };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: template.subject(eventDetails.title), // Subject can be dynamic
      html: template.html(eventDetails, adminProvidedEventLink, siteLink) // Pass both links to the HTML template
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Event assignment email sent to ${toEmail} for event: ${eventDetails.title}`);
    
    return { success: true, message: 'Event assignment email sent successfully' };
  } catch (error) {
    console.error(`❌ Error sending event assignment email to ${toEmail}:`, error);
    return { success: false, message: 'Failed to send event assignment email' };
  }
};


// Clean expired OTPs (utility function)
const cleanExpiredOTPs = () => {
  const now = Date.now();
  const keysToDelete = [];
  
  for (const [key, data] of otpStorage.entries()) {
    if (now > data.expiresAt) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => otpStorage.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`🧹 Cleaned ${keysToDelete.length} expired OTPs`);
  }
  
  return keysToDelete.length;
};

// Get OTP storage stats (utility function for debugging)
const getOTPStats = () => {
  const now = Date.now();
  const stats = {
    total: otpStorage.size,
    active: 0,
    expired: 0,
    byPurpose: {}
  };
  
  for (const [key, data] of otpStorage.entries()) {
    const purpose = key.split('_').slice(1).join('_'); // Extract purpose from key
    
    if (!stats.byPurpose[purpose]) {
      stats.byPurpose[purpose] = 0;
    }
    stats.byPurpose[purpose]++;
    
    if (now > data.expiresAt) {
      stats.expired++;
    } else {
      stats.active++;
    }
  }
  
  return stats;
};

// Check if OTP exists for email and purpose
const hasActiveOTP = (email, purpose = 'verification') => {
  const key = `${email}_${purpose}`;
  const storedData = otpStorage.get(key);
  
  if (!storedData) return false;
  
  if (Date.now() > storedData.expiresAt) {
    otpStorage.delete(key);
    return false;
  }
  
  return true;
};

// Get remaining time for OTP
const getOTPRemainingTime = (email, purpose = 'verification') => {
  const key = `${email}_${purpose}`;
  const storedData = otpStorage.get(key);
  
  if (!storedData) return 0;
  
  const remaining = storedData.expiresAt - Date.now();
  return remaining > 0 ? remaining : 0;
};

// Cancel/delete OTP
const cancelOTP = (email, purpose = 'verification') => {
  const key = `${email}_${purpose}`;
  const existed = otpStorage.has(key);
  otpStorage.delete(key);
  
  return {
    success: true,
    message: existed ? 'OTP cancelled successfully' : 'No OTP found to cancel'
  };
};

// Set up periodic cleanup (run every 10 minutes)
const setupPeriodicCleanup = () => {
  setInterval(() => {
    cleanExpiredOTPs();
  }, 10 * 60 * 1000); // 10 minutes
  
  console.log('🔄 Periodic OTP cleanup scheduled (every 10 minutes)');
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return { success: false, message: 'Email configuration is invalid', error: error.message };
  }
};

// Export all functions
export {
  sendOTP,
  verifyOTP,
  sendGenericEmail,
  sendEventAssignmentEmail, 
  cleanExpiredOTPs,
  getOTPStats,
  hasActiveOTP,
  getOTPRemainingTime,
  cancelOTP,
  setupPeriodicCleanup,
  isValidEmail,
  testEmailConfig,
  generateOTP,
  storeOTP
};

// Auto-start periodic cleanup when module is loaded
setupPeriodicCleanup();