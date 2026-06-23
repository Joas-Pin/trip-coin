import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "./supabase";
import { ensureProfileForUser } from "@/api/profiles";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setIsAuthenticated(!!nextUser);
      
      if (!nextUser) {
        setProfile(null);
        setRole(null);
        return;
      }

      // Check if MFA is required
      try {
        const { data: { factors } } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = factors.totp?.filter(f => f.status === 'verified') || [];
        
        // If user has verified factors but no AMR entry for MFA, redirect to verify
        const hasMfaAmr = session?.amr?.some(entry => entry.method === 'mfa/totp');
        if (verifiedFactors.length > 0 && !hasMfaAmr) {
          navigate('/mfa-verify');
          return;
        }

        const prof = await ensureProfileForUser(nextUser);
        setProfile(prof);
        setRole(prof?.role || null);
      } catch (err) {
        // If MFA API fails, just proceed
        const prof = await ensureProfileForUser(nextUser);
        setProfile(prof);
        setRole(prof?.role || null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function loadSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;

      setUser(currentUser);
      setIsAuthenticated(!!currentUser);

      if (currentUser) {
        // Check if MFA is required
        try {
          const { data: { factors } } = await supabase.auth.mfa.listFactors();
          const verifiedFactors = factors.totp?.filter(f => f.status === 'verified') || [];
          const hasMfaAmr = session?.amr?.some(entry => entry.method === 'mfa/totp');
          
          if (verifiedFactors.length > 0 && !hasMfaAmr) {
            navigate('/mfa-verify');
            setLoading(false);
            return;
          }
        } catch (e) {
          // Ignore MFA check errors
        }

        const prof = await ensureProfileForUser(currentUser);
        setProfile(prof);
        setRole(prof?.role || null);
      } else {
        setProfile(null);
        setRole(null);
      }

    } catch (err) {
      setAuthError(err);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAuthenticated,
        loading,
        authError,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () =>
  useContext(AuthContext);
