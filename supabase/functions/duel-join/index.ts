import { createClient } from 'npm:@supabase/supabase-js@2';

interface JoinDuelRequest {
  duelId: string;
  userId?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('📞 Duel join API called:', req.method);

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

    const { duelId, userId }: JoinDuelRequest = await req.json();

    if (!duelId) {
      return new Response(
        JSON.stringify({ error: 'Missing duelId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎮 Processing join request:', { duelId, userId });

    // Fetch duel data
    const { data: duel, error } = await supabaseClient
      .from('duels')
      .select('*')
      .eq('id', duelId)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch duel: ${error.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!duel) {
      console.error('❌ Duel not found:', duelId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Duel not found' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user can join this duel
    if (userId && duel.status === 'active') {
      const canJoin = duel.creator_id === userId || duel.opponent_id === userId;
      if (!canJoin) {
        console.error('❌ User not authorized:', { userId, creatorId: duel.creator_id, opponentId: duel.opponent_id });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'You are not authorized to join this duel' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('✅ Duel join successful:', {
      id: duel.id,
      prompt: duel.prompt.slice(0, 100) + '...',
      testCount: Array.isArray(duel.test_cases) ? duel.test_cases.length : 0,
      timeLimit: duel.time_limit,
      status: duel.status,
    });

    // Return duel specification
    return new Response(
      JSON.stringify({
        success: true,
        duel: {
          id: duel.id,
          prompt: duel.prompt,
          test_cases: duel.test_cases,
          time_limit: duel.time_limit,
          mode: duel.mode,
          status: duel.status,
          creator_id: duel.creator_id,
          opponent_id: duel.opponent_id,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('💥 Join duel function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});