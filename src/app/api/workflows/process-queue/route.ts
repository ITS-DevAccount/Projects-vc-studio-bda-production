/**
 * Sprint 1d.4 - Workflow Queue Processing API
 * Endpoint to trigger workflow execution queue processing
 * Can be called manually or via cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { processWorkflowQueue } from '@/lib/workflows/execution-worker';

/**
 * POST /api/workflows/process-queue
 * Process pending workflow execution queue items
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Process Queue API] Starting queue processing...');

    // Optional: Add authentication check here if needed
    // For now, allow any authenticated request

    // Process the queue
    const result = await processWorkflowQueue(10); // Process up to 10 items

    console.log('[Process Queue API] Queue processing completed:', result);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Processed ${result.processed} items: ${result.succeeded} succeeded, ${result.failed} failed`,
    });

  } catch (error: any) {
    console.error('[Process Queue API] Error processing queue:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process queue',
    }, { status: 500 });
  }
}

/**
 * GET /api/workflows/process-queue
 * Get status of workflow execution queue
 */
export async function GET(request: NextRequest) {
  try {
    // This could return queue statistics
    // For now, just trigger processing
    const result = await processWorkflowQueue(10);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error: any) {
    console.error('[Process Queue API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get queue status',
    }, { status: 500 });
  }
}
