// SMS Registration System - Test Script
// Run with: node test-sms-registration.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_PHONE = '+1234567890';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

async function testSms(message, description) {
  console.log(`\n${colors.blue}📱 Sending: "${message}"${colors.reset}`);
  console.log(`${colors.yellow}(${description})${colors.reset}`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/sms/test`, {
      phoneNumber: TEST_PHONE,
      message: message,
    });
    
    console.log(`${colors.green}✅ Response:${colors.reset}`);
    console.log(response.data.response);
    
    return response.data;
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.response?.data || error.message);
    return null;
  }
}

async function runFullTest() {
  console.log(`${colors.green}=== SMS Registration System Test ===${colors.reset}\n`);
  console.log(`Testing with phone: ${TEST_PHONE}`);
  console.log('Make sure your server is running on port 5000!\n');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 1: START
  await testSms('START', 'Initiate registration');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Provide name
  await testSms('Test User', 'Provide name');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Select office (choose first one)
  await testSms('1', 'Select first office');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 4: Select service (choose first one)
  await testSms('1', 'Select first service');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 5: Confirm
  await testSms('YES', 'Confirm registration');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 6: Check token
  console.log(`\n${colors.blue}--- Testing Check Token ---${colors.reset}`);
  await testSms('2', 'Check active token');
  
  console.log(`\n${colors.green}=== Test Complete! ===${colors.reset}\n`);
}

// Test individual commands
async function testCommands() {
  console.log(`${colors.green}=== Testing Individual Commands ===${colors.reset}\n`);
  
  // Test HELP
  await testSms('HELP', 'Show help message');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test invalid input
  await testSms('INVALID', 'Invalid command');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test CANCEL
  await testSms('START', 'Start registration');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await testSms('CANCEL', 'Cancel registration');
  
  console.log(`\n${colors.green}=== Command Tests Complete! ===${colors.reset}\n`);
}

// Run based on argument
const testType = process.argv[2] || 'full';

if (testType === 'commands') {
  testCommands().catch(console.error);
} else {
  runFullTest().catch(console.error);
}
