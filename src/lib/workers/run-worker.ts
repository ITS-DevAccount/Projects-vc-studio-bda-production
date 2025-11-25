#!/usr/bin/env node
// Sprint 1d.5: Service Task Execution System
// Standalone worker script - Entry point for running the service task worker

import { config } from 'dotenv';
import { resolve } from 'path';
import { startServiceTaskWorker } from './service-task-worker';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

console.log('='.repeat(60));
console.log('SERVICE TASK WORKER - Starting up...');
console.log('='.repeat(60));

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error('\n❌ ERROR: Missing required environment variables:');
  missingEnvVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease ensure these are set in your .env.local file.\n');
  process.exit(1);
}

console.log('✓ Environment variables validated');
console.log(`✓ Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log('✓ Service role key configured\n');

// Start the worker
try {
  const worker = startServiceTaskWorker();
  console.log('✓ Worker started successfully\n');
  console.log('Press Ctrl+C to stop the worker\n');

  // Handle graceful shutdown
  const gracefulShutdown = () => {
    console.log('\n\n' + '='.repeat(60));
    console.log('SERVICE TASK WORKER - Shutting down...');
    console.log('='.repeat(60));
    worker.stop();
    console.log('✓ Worker stopped gracefully\n');
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
} catch (error) {
  console.error('\n❌ ERROR: Failed to start worker:');
  console.error(error);
  process.exit(1);
}
