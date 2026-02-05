// Cloudflare Pages Functions Middleware
// This handles SPA routing - all non-file requests go to index.html

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

interface EventContext {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}

export const onRequest = async (context: EventContext): Promise<Response> => {
  const url = new URL(context.request.url);
  
  // If the request is for an API route, return 404 (API is on separate server)
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ 
      error: 'API not available on this domain',
      message: 'Configure VITE_API_URL to point to your backend server'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // For all other routes, try to serve the asset or fall back to index.html
  const response = await context.next();
  
  // If asset not found and it's not a file request, serve index.html for SPA routing
  if (response.status === 404 && !url.pathname.includes('.')) {
    const indexResponse = await context.env.ASSETS.fetch(
      new Request(`${url.origin}/index.html`, context.request)
    );
    return new Response(indexResponse.body, {
      headers: indexResponse.headers,
      status: 200
    });
  }
  
  return response;
};
