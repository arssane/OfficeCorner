// Save as test-google-connection.js
import https from 'https'
import dns from 'dns'

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

console.log('Starting connectivity test to Google OAuth servers...');

// Test DNS resolution
dns.resolve4('oauth2.googleapis.com', (err, addresses) => {
  if (err) {
    console.error('DNS resolution failed:', err);
  } else {
    console.log('DNS resolution successful. IPv4 addresses:', addresses);
    
    // Test HTTPS connection
    const req = https.get({
      hostname: 'oauth2.googleapis.com',
      path: '/',
      family: 4, // Force IPv4
      timeout: 5000
    }, (res) => {
      console.log(`HTTPS connection successful! Status code: ${res.statusCode}`);
      res.on('data', () => {});
      res.on('end', () => {
        console.log('Connection test completed successfully');
      });
    });
    
    req.on('error', (err) => {
      console.error('HTTPS connection failed:', err);
    });
    
    req.on('timeout', () => {
      console.error('HTTPS connection timed out');
      req.destroy();
    });
  }
});