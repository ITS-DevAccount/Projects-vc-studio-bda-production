// Sprint 1d.7: FLM Building Workflow - Prompts Execute API
// Phase A: AI Interface Foundation

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getPromptLibrary } from '@/lib/ai/prompt-library';

// POST /api/prompts/execute - Execute a prompt (for testing)
export async function POST(request: NextRequest) {
  let body: any = null;
  
  try {
    const supabase = await createServerClient();

    // Check user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    body = await request.json();
    const { promptCode, inputData, modelOverride, llmInterfaceId } = body;

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
      { modelOverride, llmInterfaceId }
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in POST /api/prompts/execute:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      body: body
    });
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}
