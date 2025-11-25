#!/usr/bin/env ts-node
/**
 * Test script for Companies House API key verification
 *
 * Usage:
 *   npx ts-node scripts/test-companies-house-api.ts YOUR_API_KEY
 *
 * This script tests:
 * - Basic Auth header generation
 * - API key validity
 * - Connection to Companies House API
 * - Response handling
 */

// Test company number (Tesco PLC - always exists for testing)
const TEST_COMPANY_NUMBER = '00445790';

async function testCompaniesHouseApi(apiKey: string) {
  console.log('=== Companies House API Key Test ===\n');

  // 1. Show the API key (partially masked)
  const maskedKey = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
  console.log(`Testing API Key: ${maskedKey}\n`);

  // 2. Generate Basic Auth header
  const credentials = `${apiKey}:`;
  const base64Credentials = Buffer.from(credentials).toString('base64');
  const authHeader = `Basic ${base64Credentials}`;

  console.log('Authentication Details:');
  console.log(`  Username: ${apiKey}`);
  console.log(`  Password: (empty)`);
  console.log(`  Combined: ${apiKey}:`);
  console.log(`  Base64: ${base64Credentials.substring(0, 20)}...`);
  console.log(`  Authorization Header: ${authHeader.substring(0, 30)}...\n`);

  // 3. Test endpoint
  const endpoint = `https://api.company-information.service.gov.uk/company/${TEST_COMPANY_NUMBER}`;
  console.log(`Test Endpoint: ${endpoint}\n`);

  // 4. Make request
  console.log('Making request...\n');

  try {
    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });
    const executionTime = Date.now() - startTime;

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    console.log(`Execution Time: ${executionTime}ms\n`);

    // 5. Parse response
    const contentType = response.headers.get('content-type');
    let responseData: any;

    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // 6. Display results
    if (response.ok) {
      console.log('✅ SUCCESS! API key is valid.\n');
      console.log('Company Details:');
      if (typeof responseData === 'object') {
        console.log(`  Company Name: ${responseData.company_name || 'N/A'}`);
        console.log(`  Company Number: ${responseData.company_number || 'N/A'}`);
        console.log(`  Company Status: ${responseData.company_status || 'N/A'}`);
        console.log(`  Type: ${responseData.type || 'N/A'}`);
        console.log(`  Date of Creation: ${responseData.date_of_creation || 'N/A'}`);
      }
      console.log('\nFull Response:');
      console.log(JSON.stringify(responseData, null, 2));

      return true;
    } else {
      console.log('❌ FAILED! API key is invalid or request failed.\n');
      console.log('Error Details:');
      console.log(JSON.stringify(responseData, null, 2));

      if (response.status === 401) {
        console.log('\n⚠️  401 Unauthorized - This means:');
        console.log('   - The API key is invalid, expired, or revoked');
        console.log('   - You need to generate a new API key from Companies House Developer Hub');
        console.log('   - Visit: https://developer.company-information.service.gov.uk/');
      } else if (response.status === 429) {
        console.log('\n⚠️  429 Too Many Requests - Rate limit exceeded');
        console.log('   - Wait a few minutes and try again');
      } else if (response.status === 404) {
        console.log('\n⚠️  404 Not Found - Company not found (unlikely with test company)');
      }

      return false;
    }
  } catch (error) {
    console.log('❌ REQUEST FAILED\n');
    console.log('Error:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.message.includes('fetch')) {
      console.log('\n⚠️  Network error - Check your internet connection');
    }

    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: No API key provided\n');
    console.log('Usage: npx ts-node scripts/test-companies-house-api.ts YOUR_API_KEY\n');
    console.log('Example:');
    console.log('  npx ts-node scripts/test-companies-house-api.ts 27dfd3f2-6848-4a55-b063-f9ef7216779e\n');
    console.log('To get an API key:');
    console.log('  1. Visit https://developer.company-information.service.gov.uk/');
    console.log('  2. Sign in or create an account');
    console.log('  3. Go to "Your applications"');
    console.log('  4. Register a new API Key application or view existing keys\n');
    process.exit(1);
  }

  const apiKey = args[0];

  // Validate API key format (basic validation)
  if (apiKey.length < 20) {
    console.error('Warning: API key seems too short. Companies House API keys are typically UUIDs (36 characters).\n');
  }

  const success = await testCompaniesHouseApi(apiKey);

  console.log('\n=== Test Complete ===');
  process.exit(success ? 0 : 1);
}

main();
