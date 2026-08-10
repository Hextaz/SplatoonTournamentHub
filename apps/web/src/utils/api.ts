export const getBotApiUrl = () => {
  // Automatically route through the Next.js generic proxy if this is called client-side or server-side.
  return '/api/bot';
};

export async function botApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const session = await (typeof window !== 'undefined' ? (await import('next-auth/react')).getSession() : null);
  const token = (session as any)?.supabaseAccessToken;

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`); // Keep NextAuth token logic for older references, but proxy will overwrite it with BOT_API_SECRET
  }

  // Handle case where input already starts with /api/...
  const cleanInput = typeof input === 'string' && input.startsWith('/api/') ? input.replace('/api/', '/') : input;

  return fetch(`${getBotApiUrl()}${cleanInput}`, {
    ...init,
    headers,
  });
}
