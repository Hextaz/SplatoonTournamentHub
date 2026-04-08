import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        if (profile && 'id' in profile) {
          token.id = (profile as any).id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session) {
        (session as any).accessToken = token.accessToken;
        if (session.user) {
          (session.user as any).id = token.id || token.sub;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET || "super-secret-default-key-for-dev",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
