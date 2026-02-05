import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, signInWithGoogle, signOut as supabaseSignOut } from "@/lib/supabase";
import type { AuthUser } from "@shared/schema";

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  providerToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [providerToken, setProviderToken] = useState<string | null>(null);

  const mapUser = useCallback((supabaseUser: User | null): AuthUser | null => {
    if (!supabaseUser) return null;
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
      avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check - provider_token exists:", !!session?.provider_token);
      setSession(session);
      setUser(mapUser(session?.user || null));
      setProviderToken(session?.provider_token || null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event, "provider_token exists:", !!session?.provider_token);
        setSession(session);
        setUser(mapUser(session?.user || null));
        setProviderToken(session?.provider_token || null);
        setLoading(false);

        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.provider_token) {
          try {
            console.log("Storing provider token for user:", session.user.id);
            const response = await fetch("/api/auth/store-token", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "x-access-token": session.access_token,
                "x-user-id": session.user.id,
              },
              body: JSON.stringify({
                user_id: session.user.id,
                provider_token: session.provider_token,
                provider_refresh_token: session.provider_refresh_token,
              }),
            });
            const result = await response.json();
            console.log("Store token response:", result);
          } catch (error) {
            console.error("Failed to store provider token:", error);
          }
        }

        // Sync profile on sign-in
        if (event === "SIGNED_IN" && session?.user) {
          try {
            console.log("Syncing profile for user:", session.user.id);
            await fetch("/api/auth/sync-profile", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "x-access-token": session.access_token,
                "x-user-id": session.user.id,
              },
              body: JSON.stringify({
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
                avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
              }),
            });
            console.log("Profile synced successfully");
          } catch (error) {
            console.error("Failed to sync profile:", error);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [mapUser]);

  const signIn = async () => {
    await signInWithGoogle();
  };

  const signOut = async () => {
    try {
      await supabaseSignOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setUser(null);
      setSession(null);
      setProviderToken(null);
      // Force redirect to home page
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, providerToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
