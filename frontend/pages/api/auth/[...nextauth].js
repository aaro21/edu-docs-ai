import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { getAllowedEmails } from "../../../lib/allowedEmails";

export const authOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ profile }) {
      if (process.env.NODE_ENV !== "production") return true;
      const allowed = await getAllowedEmails();
      const email = profile?.email?.toLowerCase();
      if (!email || !allowed.includes(email)) {
        return "/access-denied";
      }
      return true;
    },
  },
};

export default NextAuth(authOptions);
