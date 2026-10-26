// @ts-nocheck
import { AiError } from './errors';

async function client() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin;
}
export async function assertAiAccess(scope: string) {
  const db = await client();
  const { data, error } = await db.from('ai_access_blocks').select('kind,status,message').eq('scope', scope).maybeSingle();
  if (error) throw new AiError('unavailable', 'AI access status could not be checked.');
  if (data) throw new AiError(data.kind, data.message, { status: data.status });
}
export async function blockAiAccess(scope: string, error: AiError) {
  const db = await client();
  const { error: failure } = await db.from('ai_access_blocks').upsert({ scope, kind: error.kind, status: error.status, message: error.message });
  if (failure) throw new AiError('unavailable', 'AI access could not be safely paused.');
}