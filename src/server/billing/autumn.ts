import { Autumn } from "autumn-js";
import { env } from "cloudflare:workers";
import { db } from "@/db";
import { member, user } from "@/db/better-auth-schema";
import { eq } from "drizzle-orm";

const dummyAutumn = {
  check: async () => ({ allowed: true, balance: { remaining: 999999999 } }),
  track: async () => ({}),
  customers: {
    getOrCreate: async (args: any) => ({ id: args.customerId, name: "Dummy", email: args.email }),
  }
};

const lockedAutumn = {
  check: async () => ({ allowed: false, balance: { remaining: 0 } }),
  track: async () => ({}),
  customers: {
    getOrCreate: async (args: any) => ({ id: args.customerId, name: "Dummy", email: args.email }),
  }
};

async function isCustomerApproved(customerId: string) {
  try {
    const rows = await db.select({ email: user.email })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, customerId));
    
    const emails = rows.map(r => r.email);
    const approvedEmailsStr = (env.APPROVED_EMAILS as string) || "admin@mme.com.vn,duylh220284@gmail.com";
    const approvedEmails = approvedEmailsStr.split(",").map(e => e.trim());
    
    return emails.some(e => approvedEmails.includes(e));
  } catch (error) {
    console.error("isCustomerApproved error:", error);
    return false;
  }
}

export const autumn = new Proxy(new Autumn({
  secretKey: () => (env.AUTUMN_SECRET_KEY as string) || "dummy",
}), {
  get(target, prop, receiver) {
    if (!env.AUTUMN_SECRET_KEY) {
      if (prop === "check" || prop === "track") {
        return async (args: { customerId: string }) => {
           if (await isCustomerApproved(args.customerId)) {
             return Reflect.get(dummyAutumn, prop)(args);
           }
           return Reflect.get(lockedAutumn, prop)(args);
        };
      }
      if (prop === "customers") {
        return dummyAutumn.customers;
      }
      return Reflect.get(target, prop, receiver);
    }
    return Reflect.get(target, prop, receiver);
  }
});
