import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState("جاري إكمال تسجيل الدخول...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse tokens from URL hash (Supabase puts them there after OAuth)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const providerToken = hashParams.get('provider_token');
        
        // If we have tokens in URL, set the session
        if (accessToken && refreshToken) {
          setStatus("جاري تعيين الجلسة...");
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("Set session error:", sessionError);
            setLocation("/");
            return;
          }

          // If we have provider token, store it immediately
          if (providerToken && sessionData.session?.user) {
            setStatus("جاري حفظ اتصال Google Drive...");
            console.log("Storing provider token for user:", sessionData.session.user.id);
            
            try {
              const response = await fetch("/api/auth/store-token", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "x-access-token": accessToken,
                  "x-user-id": sessionData.session.user.id,
                },
                body: JSON.stringify({
                  user_id: sessionData.session.user.id,
                  provider_token: providerToken,
                }),
              });
              const result = await response.json();
              console.log("Store token response:", result);
            } catch (storeError) {
              console.error("Failed to store provider token:", storeError);
            }
          }

          setLocation("/dashboard");
          return;
        }

        // Fallback: try to get existing session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth callback error:", error);
          setLocation("/");
          return;
        }

        if (data.session) {
          // Check for provider token in session
          if (data.session.provider_token) {
            setStatus("جاري حفظ اتصال Google Drive...");
            console.log("Provider token found in session, storing...");
            
            try {
              const response = await fetch("/api/auth/store-token", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "x-access-token": data.session.access_token,
                  "x-user-id": data.session.user.id,
                },
                body: JSON.stringify({
                  user_id: data.session.user.id,
                  provider_token: data.session.provider_token,
                }),
              });
              const result = await response.json();
              console.log("Store token response:", result);
            } catch (storeError) {
              console.error("Failed to store provider token:", storeError);
            }
          }
          
          setLocation("/dashboard");
        } else {
          setLocation("/");
        }
      } catch (err) {
        console.error("Auth callback exception:", err);
        setLocation("/");
      }
    };

    handleCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
