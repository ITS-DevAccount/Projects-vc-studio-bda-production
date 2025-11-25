#!/usr/bin/env ts-node
/**
 * Update Companies House API Key in Service Configuration
 *
 * Usage:
 *   npx ts-node scripts/update-companies-house-key.ts NEW_API_KEY
 */

import { createClient } from '@supabase/supabase-js';

const COMPANIES_HOUSE_SERVICE_ID = '44e487db-66bf-42e2-817e-a7ad2cc4a5d5';

async function updateApiKey(newApiKey: string) {
  console.log('=== Update Companies House API Key ===\n');

  // Get Supabase credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase credentials not found in environment variables');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set\n');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Fetch current service configuration
    console.log('Fetching current service configuration...');
    const { data: currentService, error: fetchError } = await supabase
      .from('service_configurations')
      .select('*')
      .eq('service_config_id', COMPANIES_HOUSE_SERVICE_ID)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching service:', fetchError.message);
      process.exit(1);
    }

    if (!currentService) {
      console.error('❌ Error: Companies House service not found');
      process.exit(1);
    }

    console.log(`Found service: ${currentService.service_name}`);
    console.log(`Current endpoint: ${currentService.endpoint_url}\n`);

    // 2. Show current auth config
    const currentAuth = currentService.authentication as any;
    if (currentAuth) {
      const oldKey = currentAuth.username || '';
      const maskedOldKey = oldKey ? `${oldKey.substring(0, 8)}...${oldKey.substring(oldKey.length - 4)}` : 'none';
      console.log(`Current API Key: ${maskedOldKey}`);
    }

    const maskedNewKey = `${newApiKey.substring(0, 8)}...${newApiKey.substring(newApiKey.length - 4)}`;
    console.log(`New API Key: ${maskedNewKey}\n`);

    // 3. Update authentication configuration
    const newAuthConfig = {
      type: 'basic_auth',
      username: newApiKey,
      password: '',
    };

    console.log('Updating service configuration...');
    const { data: updatedService, error: updateError } = await supabase
      .from('service_configurations')
      .update({
        authentication: newAuthConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('service_config_id', COMPANIES_HOUSE_SERVICE_ID)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating service:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Service configuration updated successfully!\n');
    console.log('Updated service details:');
    console.log(`  Service Name: ${updatedService.service_name}`);
    console.log(`  Service ID: ${updatedService.service_config_id}`);
    console.log(`  Endpoint: ${updatedService.endpoint_url}`);
    console.log(`  Auth Type: ${(updatedService.authentication as any).type}`);
    console.log(`  API Key: ${maskedNewKey}\n`);

    console.log('🎉 Done! You can now test the service in your application.');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: No API key provided\n');
    console.log('Usage: npx ts-node scripts/update-companies-house-key.ts NEW_API_KEY\n');
    console.log('Example:');
    console.log('  npx ts-node scripts/update-companies-house-key.ts 4d089f55-e24b-43a8-86da-3be1f821a6fa\n');
    process.exit(1);
  }

  const newApiKey = args[0];

  // Validate API key format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(newApiKey)) {
    console.error('Warning: API key does not look like a valid UUID format\n');
  }

  await updateApiKey(newApiKey);
}

main();
