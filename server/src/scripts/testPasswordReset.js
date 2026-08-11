const dotenv = require('dotenv');
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config();

async function runTests() {
  console.log('🧪 Starting Password Reset Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  await connectDB();
  const BASE_URL = 'http://localhost:5000/api/auth';

  async function makeRequest(path, method = 'GET', body = null) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null,
      });

      let data = {};
      try { data = await response.json(); } catch (e) {}

      return { status: response.status, data };
    } catch (err) {
      return { status: 500, data: { message: err.message } };
    }
  }

  console.log('--- Setup ---');
  // Clean test user and create a fresh one
  await User.deleteOne({ email: 'resetuser@nutmeg.com' });
  const user = await User.create({
    name: 'Reset Test',
    email: 'resetuser@nutmeg.com',
    passwordHash: 'OldPassword123',
    role: 'player'
  });
  console.log('  Test user created.');

  console.log('\n--- 1. Forgot Password Tests ---');
  
  // 1.1 Unregistered email should return success (no enumeration)
  const fpUnregistered = await makeRequest('/forgotpassword', 'POST', { email: 'unknown@example.com' });
  assert(fpUnregistered.status === 200, 'Unregistered email returns 200 OK');
  assert(fpUnregistered.data.message.includes('If an account exists'), 'Generic message returned for unregistered email');

  // 1.2 Registered email should return success and set token
  const fpRegistered = await makeRequest('/forgotpassword', 'POST', { email: 'resetuser@nutmeg.com' });
  assert(fpRegistered.status === 200, 'Registered email returns 200 OK');
  
  // Verify token is in DB
  const userAfterFp = await User.findById(user._id);
  assert(userAfterFp.resetPasswordToken !== undefined, 'Reset token hash is stored in DB');
  assert(userAfterFp.resetPasswordExpire > Date.now(), 'Reset token expiration is in the future');

  // We need the raw token to test the reset endpoint.
  // Since we can't easily intercept the email in this script, we'll manually set a known token for testing.
  const rawToken = 'my_test_token_123';
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  userAfterFp.resetPasswordToken = hashedToken;
  userAfterFp.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  await userAfterFp.save({ validateBeforeSave: false });

  console.log('\n--- 2. Reset Password Tests ---');

  // 2.1 Invalid token
  const resetInvalid = await makeRequest('/resetpassword/invalid_token', 'POST', { password: 'NewPassword123' });
  assert(resetInvalid.status === 400, 'Invalid token returns 400 Bad Request');
  assert(resetInvalid.data.message.includes('invalid or has expired'), 'Correct error message for invalid token');

  // 2.2 Short new password
  const resetShort = await makeRequest(`/resetpassword/${rawToken}`, 'POST', { password: 'short' });
  assert(resetShort.status === 400, 'Short password returns 400 Bad Request');

  // 2.3 Valid reset
  const resetValid = await makeRequest(`/resetpassword/${rawToken}`, 'POST', { password: 'NewPassword123' });
  assert(resetValid.status === 200, 'Valid reset returns 200 OK');
  assert(resetValid.data.message === 'Password reset successful', 'Success message is correct');

  // Verify token is cleared
  const userAfterReset = await User.findById(user._id);
  assert(!userAfterReset.resetPasswordToken, 'Reset token is cleared after success');
  assert(!userAfterReset.resetPasswordExpire, 'Reset expiration is cleared after success');

  // 2.4 Token should be single use
  const resetReuse = await makeRequest(`/resetpassword/${rawToken}`, 'POST', { password: 'AnotherPassword123' });
  assert(resetReuse.status === 400, 'Reused token returns 400 Bad Request');

  console.log('\n--- 3. Login Regression Test ---');

  // 3.1 Login with old password should fail
  const loginOld = await makeRequest('/login', 'POST', { email: 'resetuser@nutmeg.com', password: 'OldPassword123' });
  assert(loginOld.status === 401, 'Login with old password fails (401 Unauthorized)');

  // 3.2 Login with new password should succeed
  const loginNew = await makeRequest('/login', 'POST', { email: 'resetuser@nutmeg.com', password: 'NewPassword123' });
  assert(loginNew.status === 200, 'Login with new password succeeds (200 OK)');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
