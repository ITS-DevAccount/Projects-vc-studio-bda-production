// Migration Script: Migrate existing stakeholders to workspace system
// Usage: node --loader ts-node/esm src/scripts/migrate-stakeholders-to-workspaces.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MigrationStats {
  totalStakeholders: number;
  successfulMigrations: number;
  skippedMigrations: number;
  failedMigrations: number;
  errors: Array<{ stakeholderId: string; error: string }>;
}

async function migrateStakeholdersToWorkspaces() {
  console.log('='.repeat(80));
  console.log('Stakeholder to Workspace Migration');
  console.log('='.repeat(80));
  console.log('');

  const stats: MigrationStats = {
    totalStakeholders: 0,
    successfulMigrations: 0,
    skippedMigrations: 0,
    failedMigrations: 0,
    errors: [],
  };

  try {
    // Get VC Studio app UUID
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('app_code', 'VC_STUDIO')
      .single();

    if (appError || !app) {
      throw new Error('VC_STUDIO application not found. Please ensure it exists in the applications table.');
    }

    const appUuid = app.id;
    console.log(`✓ Found VC_STUDIO app: ${appUuid}`);
    console.log('');

    // Get all active stakeholders with their roles
    console.log('Fetching stakeholders...');
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from('stakeholders')
      .select(`
        id,
        name,
        email,
        reference,
        status,
        stakeholder_roles!inner(role_type, app_uuid)
      `)
      .eq('status', 'active')
      .eq('stakeholder_roles.app_uuid', appUuid);

    if (stakeholdersError) {
      throw new Error(`Failed to fetch stakeholders: ${stakeholdersError.message}`);
    }

    if (!stakeholders || stakeholders.length === 0) {
      console.log('No active stakeholders found to migrate.');
      return stats;
    }

    stats.totalStakeholders = stakeholders.length;
    console.log(`✓ Found ${stakeholders.length} stakeholders to migrate`);
    console.log('');

    // Migrate each stakeholder
    for (const stakeholder of stakeholders) {
      const roles = stakeholder.stakeholder_roles as any[];

      if (!roles || roles.length === 0) {
        console.log(`⚠ Skipping ${stakeholder.name} (${stakeholder.reference}): No roles assigned`);
        stats.skippedMigrations++;
        continue;
      }

      console.log(`Migrating: ${stakeholder.name} (${stakeholder.reference})`);

      // Migrate for each role
      for (const role of roles) {
        const roleType = role.role_type;

        try {
          // Call migration function
          const { data, error } = await supabase.rpc('migrate_stakeholder_to_workspace', {
            p_stakeholder_id: stakeholder.id,
            p_app_uuid: appUuid,
            p_primary_role_code: roleType,
          });

          if (error) {
            throw new Error(error.message);
          }

          if (data && data.success) {
            if (data.was_migrated) {
              console.log(`  ✓ Created workspace for role: ${roleType} (${data.workspace_id})`);
              stats.successfulMigrations++;
            } else {
              console.log(`  ⊙ Workspace already exists for role: ${roleType}`);
              stats.skippedMigrations++;
            }
          } else {
            throw new Error(data?.message || 'Unknown error');
          }
        } catch (error: any) {
          console.error(`  ✗ Failed to migrate role ${roleType}: ${error.message}`);
          stats.failedMigrations++;
          stats.errors.push({
            stakeholderId: stakeholder.id,
            error: `Role ${roleType}: ${error.message}`,
          });
        }
      }

      console.log('');
    }

    // Print summary
    console.log('='.repeat(80));
    console.log('Migration Summary');
    console.log('='.repeat(80));
    console.log(`Total stakeholders:        ${stats.totalStakeholders}`);
    console.log(`Successful migrations:     ${stats.successfulMigrations}`);
    console.log(`Skipped (already exists):  ${stats.skippedMigrations}`);
    console.log(`Failed migrations:         ${stats.failedMigrations}`);
    console.log('');

    if (stats.errors.length > 0) {
      console.log('Errors:');
      stats.errors.forEach((err) => {
        console.log(`  - Stakeholder ${err.stakeholderId}: ${err.error}`);
      });
      console.log('');
    }

    if (stats.failedMigrations === 0) {
      console.log('✓ Migration completed successfully!');
    } else {
      console.log('⚠ Migration completed with errors. Please review the error log above.');
    }

    return stats;
  } catch (error: any) {
    console.error('');
    console.error('='.repeat(80));
    console.error('FATAL ERROR');
    console.error('='.repeat(80));
    console.error(error.message);
    console.error('');
    throw error;
  }
}

// Run migration
migrateStakeholdersToWorkspaces()
  .then((stats) => {
    const exitCode = stats.failedMigrations > 0 ? 1 : 0;
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
