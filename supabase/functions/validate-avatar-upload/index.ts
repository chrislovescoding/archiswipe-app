// supabase/functions/validate-avatar-upload/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'; // Or your preferred version
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_FILE_SIZE_MB = 2; // Max 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// This function will be called by the Postgres trigger
async function handleStorageObjectInsert(record: any, supabaseAdminClient: SupabaseClient) {
  console.log('Handling storage object insert:', JSON.stringify(record, null, 2));

  if (!record || record.bucket_id !== 'avatars') {
    console.log('Not for avatars bucket or no record, skipping.');
    return { message: 'Skipped, not for avatars bucket or no record' };
  }

  const objectPath = record.name; // e.g., "user_id/avatar.png"
  const objectId = record.id;   // ID of the object in storage.objects

  // Metadata should be part of the record passed by the trigger
  const fileSize = record.metadata?.size;
  const mimeType = record.metadata?.mimetype;

  console.log(`Validating ${objectPath}: size=${fileSize}, mimeType=${mimeType}`);

  if (typeof fileSize === 'undefined' || typeof mimeType === 'undefined') {
    console.warn(`Metadata (size or mimetype) missing for ${objectPath} in trigger record. Object ID: ${objectId}. This might indicate an issue with the storage event or object creation process.`);
    // If critical metadata is missing, you might decide to delete the object as a precaution
    // or log for investigation. For this example, we'll log and proceed,
    // but in a production system, you might want a stricter approach.
    // isValid will likely fail below if these are undefined.
  }

  let isValid = true;
  let validationError = '';

  if (typeof fileSize !== 'number' || fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
    isValid = false;
    validationError = `File too large (max ${MAX_FILE_SIZE_MB}MB) or size undefined. Size: ${fileSize}`;
  }

  if (typeof mimeType !== 'string' || !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    isValid = false;
    validationError = `Invalid file type or mimetype undefined. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}. Found: ${mimeType}`;
  }

  if (!isValid) {
    console.error(`Invalid file ${objectPath}: ${validationError}. Deleting...`);
    const { error: deleteError } = await supabaseAdminClient
      .storage
      .from(record.bucket_id)
      .remove([objectPath]);

    if (deleteError) {
      console.error(`Failed to delete invalid file ${objectPath}:`, deleteError);
      throw new Error(`Failed to cleanup invalid file: ${deleteError.message}. Original error: ${validationError}`);
    }
    console.log(`Successfully deleted invalid file: ${objectPath}`);
    // It's hard to directly notify the user from here since it's async.
    // Client-side validation is key for immediate user feedback.
    // Throwing an error here will cause the transaction that called the function (if any) to rollback.
    // However, storage operations are often outside explicit transactions from the client.
    // The main effect of throwing an error might be in the trigger's behavior if not handled.
    throw new Error(`Invalid file uploaded: ${validationError}. File was deleted.`);
  }

  console.log(`File ${objectPath} is valid.`);
  return { message: 'File validated successfully' };
}


// Main serve function for Deno Deploy (standard for Supabase Edge Functions)
serve(async (req) => {
  // This function is primarily designed to be called by a trigger.
  // If you also want to call it via HTTP GET/POST for other reasons,
  // you can add routing logic here.
  // For trigger invocation, the request body will contain the event.
  if (req.method === 'POST') {
    try {
      const supabaseAdminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const body = await req.json();
      // The trigger payload will be an object with a "record" or "old_record" key
      // For an INSERT trigger, we expect "record"
      if (body.record && body.type === 'INSERT' && body.table === 'objects' && body.schema === 'storage') {
        const result = await handleStorageObjectInsert(body.record, supabaseAdminClient);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
          status: 200, // Or 400 if validation failed and an error was thrown by handleStorageObjectInsert
        });
      } else {
         console.log('Webhook received non-INSERT or unexpected event for storage.objects:', body.type, body.table, body.schema);
         return new Response(JSON.stringify({ message: "Event not processed" }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200, // Acknowledge receipt, but didn't act
        });
      }

    } catch (error) {
      console.error('Error processing POST request in Edge Function:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: error.message.startsWith("Invalid file uploaded") ? 400 : 500,
      });
    }
  }

  return new Response(JSON.stringify({ message: 'Function is active. Expects POST from trigger.' }), {
    headers: { 'Content-Type': 'application/json' },
  });
});