import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  debug: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      const email = (user?.email || profile?.email)?.trim().toLowerCase();
      const allowed = email?.endsWith("@bonadmin.com") ?? false;

      console.info("Google sign-in domain check", {
        emailPresent: Boolean(email),
        allowed,
        domain: email?.split("@")[1] ?? null,
      });

      if (!allowed) {
        console.error("Google sign-in denied: email domain is not @bonadmin.com");
      }

      return allowed;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
