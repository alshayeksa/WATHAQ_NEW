import { app } from "./app";

// Cloudflare Workers entry point
// Environment variables are passed via the env binding, not process.env
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  NODE_ENV?: string;
  SESSION_SECRET?: string;
  FRONTEND_URL?: string;
}

// Create a wrapper that injects env into globalThis before handling requests
const worker = {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    // Inject environment variables into globalThis for the repositories
    (globalThis as any).SUPABASE_URL = env.SUPABASE_URL;
    (globalThis as any).SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    (globalThis as any).SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    (globalThis as any).GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
    (globalThis as any).GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
    (globalThis as any).SESSION_SECRET = env.SESSION_SECRET || 'default-session-secret-32chars!';
    (globalThis as any).FRONTEND_URL = env.FRONTEND_URL || '';
    
    // Also set process.env for compatibility
    if (typeof process !== 'undefined' && process.env) {
      process.env.SUPABASE_URL = env.SUPABASE_URL;
      process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
      process.env.SESSION_SECRET = env.SESSION_SECRET || 'default-session-secret-32chars!';
      process.env.FRONTEND_URL = env.FRONTEND_URL || '';
      process.env.NODE_ENV = env.NODE_ENV || 'production';
    }

    // Handle the request with the Hono app
    return app.fetch(request, env, ctx);
  },
};

export default worker;
