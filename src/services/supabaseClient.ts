// src/services/supabaseClient.ts

import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // no deep-link URL handling in RN
  },
});

// ------------------- Auth helpers -------------------

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  // When there is simply no session yet (e.g. logged out),
  // Supabase throws AuthSessionMissingError. Treat as "no user".
  if (error && (error as any).name === "AuthSessionMissingError") {
    return null;
  }
  if (error) throw error;
  return data.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: name
      ? {
          data: {
            full_name: name,
          },
        }
      : undefined,
  });

  if (error) throw error;
  return data.user;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
