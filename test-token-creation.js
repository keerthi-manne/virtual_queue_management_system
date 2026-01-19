/**
 * Quick test script to create a token and verify notifications
 */

// Test token creation notification
console.log('\n🧪 Testing Token Creation with Notifications...\n');

const testData = {
  userId: '6c6e1c15-bf28-4cb8-a2da-e4e3a96a9b96', // divyamma's user ID
  serviceId: '2', // Birth Certificate service
  priority: 'NORMAL',
  userInfo: {
    name: 'Test User',
    phone: '9353900190',
    email: 'divyashhree04@gmail.com'
  }
};

fetch('http://localhost:5000/api/queue/join', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(res => res.json())
.then(data => {
  console.log('✅ Response:', JSON.stringify(data, null, 2));
  console.log('\n📧 Check your email:', testData.userInfo.email);
  console.log('📱 Check your phone:', testData.userInfo.phone);
  console.log('\n⏳ Wait 30 seconds for notification queue to process...\n');
})
.catch(err => {
  console.error('❌ Error:', err.message);
});
