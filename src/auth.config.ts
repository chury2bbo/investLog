import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.onboardingDone = (user as any).onboardingDone ?? false;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).onboardingDone = token.onboardingDone as boolean;
      return session;
    },
  },
  providers: [],
};
