import axios from 'axios';

// Test data for teacher registration
const testTeacherData = {
  fullname: "Test Teacher",
  email: "testteacher@example.com",
  password: "testpassword123",
  phone: "1234567890",
  gender: "Male",
  address: "123 Test Street, Test City",
  role: "teacher",
  salary: 50000,
  designation: "Senior Teacher",
  subjects: ["Mathematics", "Physics"],
  status: "full time",
  bankName: "Test Bank",
  bankAccount: "1234567890",
  accountName: "Test Teacher"
};

// Test the registration endpoint
async function testTeacherRegistration() {
  try {
    console.log('Testing teacher registration...');
    console.log('Test data:', JSON.stringify(testTeacherData, null, 2));
    
    const response = await axios.post('http://localhost:3002/auth/register', testTeacherData);
    
    console.log('✅ Registration successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Verify that teacher-specific fields are included in response
    const { newUser } = response.data;
    
    console.log('\n📋 Verification:');
    console.log('- Salary included:', newUser.salary ? '✅' : '❌');
    console.log('- Designation included:', newUser.designation ? '✅' : '❌');
    console.log('- Subjects included:', newUser.subjects ? '✅' : '❌');
    console.log('- Teacher info included:', newUser.teacherInfo ? '✅' : '❌');
    
    if (newUser.teacherInfo) {
      console.log('- Bank details included:', newUser.teacherInfo.bankDetails ? '✅' : '❌');
      console.log('- Status included:', newUser.teacherInfo.status ? '✅' : '❌');
    }
    
  } catch (error) {
    console.error('❌ Registration failed:');
    console.error('Error:', error.response?.data || error.message);
  }
}

// Test the teacher add endpoint
async function testAddTeacherEndpoint() {
  try {
    console.log('\n\nTesting add teacher endpoint...');
    
    // You would need a valid admin token for this test
    // const token = 'your-admin-token-here';
    
    const addTeacherData = {
      ...testTeacherData,
      email: "testteacher2@example.com" // Different email to avoid conflict
    };
    
    console.log('Test data:', JSON.stringify(addTeacherData, null, 2));
    
    // Uncomment the following lines when you have a valid token
    /*
    const response = await axios.post('http://localhost:3002/teacher/add-teacher', addTeacherData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Add teacher successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    */
    
    console.log('ℹ️  Add teacher endpoint test skipped (requires admin token)');
    
  } catch (error) {
    console.error('❌ Add teacher failed:');
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run tests
console.log('🧪 Teacher Registration Test Suite');
console.log('==================================\n');

testTeacherRegistration()
  .then(() => testAddTeacherEndpoint())
  .then(() => {
    console.log('\n✨ Test suite completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });