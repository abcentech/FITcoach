const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '..', '.next');

try {
  if (fs.existsSync(nextDir)) {
    console.log('Cleaning existing .next directory to prevent Webpack cache corruption...');
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('.next directory cleaned successfully.');
  } else {
    console.log('No .next directory found. Starting clean.');
  }
} catch (error) {
  console.error('Failed to clean .next directory:', error.message);
}
