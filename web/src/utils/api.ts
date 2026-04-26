export const getBotApiUrl = () => {
  return process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:8080';
};

export async function botApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const session = await (typeof window !== 'undefined' ? (await import('next-auth/react')).getSession() : null);
  const token = (session as any)?.supabaseAccessToken;

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${getBotApiUrl()}${input}`, {
    ...init,
    headers,
  });
}
