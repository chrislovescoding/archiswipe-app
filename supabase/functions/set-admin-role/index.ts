// supabase/functions/set-admin-role/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2' // Ensure you use a version compatible with your project

console.log('Set Admin Role function booting up!')

serve(async (req) => {
  try {
    // 1. Create a Supabase client with the Service Role Key
    //    Ensure environment variables are set in your Supabase project settings
    //    or pass them directly if testing locally (not recommended for production secrets).
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Get userId and role from request body
    const { userId, isAdmin } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 3. Define the metadata to update
    //    If isAdmin is true, add 'admin' role. If false, remove it (or set roles to empty array).
    let appMetadataUpdate = {};
    if (isAdmin) {
      appMetadataUpdate = { roles: ['admin'] };
    } else {
      // Example: To remove all roles or ensure 'admin' is not present
      // This logic might need adjustment based on how you manage multiple roles
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userError) throw userError;

      const currentRoles = userData.user.app_metadata?.roles || [];
      const updatedRoles = currentRoles.filter((role: string) => role !== 'admin'); // remove admin
      // or if (isAdmin) { updatedRoles.push('admin'); } // add admin if not present

      appMetadataUpdate = { roles: updatedRoles.length > 0 ? updatedRoles : undefined }; // Set to undefined to remove the key if empty
                                                                                          // or { roles: [] } if you want an empty array
    }


    // 4. Update the user's app_metadata
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { app_metadata: appMetadataUpdate }
    )

    if (error) {
      console.error('Error updating user metadata:', error)
      throw error
    }

    console.log('Successfully updated user metadata:', data)
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})