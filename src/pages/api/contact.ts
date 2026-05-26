import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { error } = await supabase
        .from('contacts')
        .insert({ name, email, message });

    if (error) {
        return new Response(JSON.stringify({ error: 'Failed to save message' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
};
