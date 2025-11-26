// Sprint 1d.7: FLM Building Workflow - Prompts Execute API
// Phase A: AI Interface Foundation

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getPromptLibrary } from '@/lib/ai/prompt-library';

// POST /api/prompts/execute - Execute a prompt (for testing)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { promptCode, inputData, modelOverride } = body;

    if (!promptCode || !inputData) {
      return NextResponse.json(
        { error: 'promptCode and inputData are required' },
        { status: 400 }
      );
    }

    // Execute prompt
    const promptLibrary = await getPromptLibrary();
    const response = await promptLibrary.executePrompt(
      promptCode,
      inputData,
      { modelOverride }
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
