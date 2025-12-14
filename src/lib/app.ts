import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get the current app code from environment
 * Default: VC_STUDIO
 */
export const getAppCode = (): string => {
    return process.env.NEXT_PUBLIC_APP_CODE || 'VC_STUDIO';
};

/**
 * Get the current app UUID from applications table
 * Used in all INSERT queries to set app_uuid
 * Used in all SELECT/UPDATE/DELETE queries to filter by app_uuid
 */
export const getAppUuid = async (supabase: SupabaseClient): Promise<string> => {
    const appCode = getAppCode();
    
    const { data, error } = await supabase
        .from('applications')
        .select('id')
        .eq('app_code', appCode)
        .single();
    
    if (error) {
        throw new Error(`Failed to get app UUID for app_code: ${appCode}. Error: ${error.message}`);
    }
    
    if (!data) {
        throw new Error(`App not found: ${appCode}`);
    }
    
    return data.id;
};

