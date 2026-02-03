# Dashboard Configurations

Edit `dashboard_configurations.json` to update `workspace_dashboard_configurations.dashboard_config` rows.

- **Key** = `config_name` (must match existing row)
- **Value** = Full `dashboard_config` JSONB content
- Use `role_configurations` structure for API compatibility (see menu-items route)

## Usage

1. Edit `dashboard_configurations.json`
2. Run: `node scripts/generate-dashboard-config-sql.js`
3. Execute `config/dashboard_config_updates.sql` via Supabase SQL editor

Or output to stdout: `node scripts/generate-dashboard-config-sql.js --stdout`
