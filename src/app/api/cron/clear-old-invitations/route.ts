import { createClient } from '@supabase/supabase-js';
import { subDays } from 'date-fns';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use the service-role key so the cron can delete across all users (bypasses RLS).
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const cutoffDate = subDays(new Date(), 30).toISOString();

    const { data, error } = await supabaseAdmin
      .from('family_invitations')
      .delete()
      .lt('created_at', cutoffDate)
      .select('id');

    if (error) throw error;

    return NextResponse.json({ message: `Successfully deleted ${data?.length ?? 0} old invitations` }, { status: 200 });

  } catch (error) {
    console.error('Failed to clear old invitations:', error);
    return NextResponse.json({ message: 'Failed to clear old invitations' }, { status: 500 });
  }
}
