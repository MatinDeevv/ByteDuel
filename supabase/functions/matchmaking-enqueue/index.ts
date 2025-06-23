import { createClient } from 'npm:@supabase/supabase-js@2';

interface EnqueueRequest {
  userId: string;
  mode: 'ranked' | 'casual';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, mode }: EnqueueRequest = await req.json();

    if (!userId || !mode) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or mode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate mode
    if (!['ranked', 'casual'].includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mode. Must be ranked or casual' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enqueue the player
    const { data, error } = await supabaseClient.rpc('enqueue_player', {
      p_user_id: userId,
      p_mode: mode,
    });

    if (error) {
      console.error('Enqueue error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to enqueue player' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Enqueued player ${userId} in ${mode} mode`);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Enqueue function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});