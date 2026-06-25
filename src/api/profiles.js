import { getSupabase, unwrap } from "./_utils";
import { supabase } from "../lib/supabase";

export const DEFAULT_ROLE = "colaborador";

export async function getProfile(id) {
  const q = getSupabase().from("profiles").select("*").eq("id", id).single();
  return unwrap(await q);
}

export async function getProfileByUsername(username) {
  try {
    // First check if the username column exists, case-insensitive search
    const { data, error } = await getSupabase()
      .from("profiles")
      .select("*")
      .ilike("username", username.trim())
      .maybeSingle();
    
    if (error) {
      // If error is about missing column, return null gracefully
      if (error.message && error.message.includes("column") && error.message.includes("does not exist")) {
        console.debug("Username column doesn't exist in profiles table");
        return null;
      }
      throw error;
    }
    
    return data; // Will be null if no profile found
  } catch (error) {
    // If any other error, return null (including column not found)
    console.debug("Error looking up profile by username:", error);
    return null;
  }
}

export async function upsertProfile(profile) {
  // Create a copy of profile without username if it's null/undefined
  const safeProfile = { ...profile };
  if (safeProfile.username === null || safeProfile.username === undefined) {
    delete safeProfile.username;
  }

  const q = getSupabase()
    .from("profiles")
    .upsert(safeProfile, { onConflict: "id" })
    .select("*")
    .single();
  return unwrap(await q);
}

export async function ensureProfileForUser(user, role = DEFAULT_ROLE, username = null) {
  if (!user?.id) return null;
  // console.log(`[ensureProfileForUser] Starting for user ID: ${user.id}`); // REMOVED sensitive log
  
  const sb = getSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();

  if (!session?.user?.id || session.user.id !== user.id) {
    // console.warn(`[ensureProfileForUser] Session mismatch or missing! Session user: ${session?.user?.id}, Provided user: ${user.id}`); // REMOVED
    return null;
  }

  // console.log(`[ensureProfileForUser] Checking if profile exists for user: ${user.id}`); // REMOVED
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    // console.error(`[ensureProfileForUser] Error checking profile existence:`, error); // REMOVED
    throw error;
  }

  if (data) {
    // console.log(`[ensureProfileForUser] Profile found!`, data); // REMOVED
    return data;
  }

  // console.log(`[ensureProfileForUser] No profile found, creating a new one for user: ${user.id}`); // REMOVED
  // console.log(`[ensureProfileForUser] User metadata:`, user.user_metadata); // REMOVED
  
  const nome =
    user.user_metadata?.nome ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.email ? user.email.split("@")[0] : "");

  const profileData = {
    id: user.id,
    nome: nome || "Usuário",
    email: user.email || "",
    role,
  };
  // console.log(`[ensureProfileForUser] Profile data to insert:`, profileData); // REMOVED

  // Only add username if provided
  if (username) {
    try {
      // Try to create with username
      const createdWithUsername = await upsertProfile({
        ...profileData,
        username,
      });
      // console.log(`[ensureProfileForUser] Profile created successfully (with username)!`, createdWithUsername); // REMOVED
      return createdWithUsername;
    } catch (error) {
      // If that fails, create without username
      // console.warn(`[ensureProfileForUser] Username column not found or error, creating profile without it:`, error); // REMOVED
    }
  }

  // Create without username
  try {
    const created = await upsertProfile(profileData);
    // console.log(`[ensureProfileForUser] Profile created successfully (without username)!`, created); // REMOVED
    return created;
  } catch (createError) {
    // console.error(`[ensureProfileForUser] FATAL ERROR creating profile:`, createError); // REMOVED
    throw createError;
  }
}

export async function listProfilesByRole(role) {
  const q = getSupabase().from("profiles").select("*").eq("role", role).order("nome", { ascending: true });
  return unwrap(await q);
}

export async function listAllProfiles() {
  const q = getSupabase().from("profiles").select("*").order("nome", { ascending: true });
  return unwrap(await q);
}

export async function updateProfileRole(id, role) {
  const q = getSupabase().from("profiles").update({ role }).eq("id", id).select("*").single();
  return unwrap(await q);
}

export async function createUserWithEmail(email, password, nome, username, role) {
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, username }
  });

  if (authError) throw authError;

  if (authData.user) {
    const profileData = {
      id: authData.user.id,
      nome,
      email,
      role
    };
    
    if (username) {
      try {
        await upsertProfile({ ...profileData, username });
      } catch (error) {
        await upsertProfile(profileData);
      }
    } else {
      await upsertProfile(profileData);
    }
  }

  return authData.user;
}

export default {
  DEFAULT_ROLE,
  getProfile,
  getProfileByUsername,
  upsertProfile,
  ensureProfileForUser,
  listProfilesByRole,
  listAllProfiles,
  updateProfileRole,
  createUserWithEmail
};
