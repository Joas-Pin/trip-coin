import { getSupabase, unwrap } from "./_utils";
import { supabase } from "../lib/supabase";

export const DEFAULT_ROLE = "colaborador";

export async function getProfile(id) {
  const q = getSupabase().from("profiles").select("*").eq("id", id).single();
  return unwrap(await q);
}

export async function getProfileByUsername(username) {
  try {
    // First check if the username column exists
    const { data, error } = await getSupabase()
      .from("profiles")
      .select("*")
      .eq("username", username)
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
  const sb = getSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();

  if (!session?.user?.id || session.user.id !== user.id) {
    return null;
  }

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

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

  // Only add username if provided
  if (username) {
    try {
      // Try to create with username
      const createdWithUsername = await upsertProfile({
        ...profileData,
        username,
      });
      return createdWithUsername;
    } catch (error) {
      // If that fails, create without username
      console.warn("Username column not found, creating profile without it");
    }
  }

  // Create without username
  const created = await upsertProfile(profileData);
  return created;
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
