import { Autumn } from "autumn-js";
import { getEnvValue } from "@/server/lib/runtime-env";

const dummyAutumn = {
  check: async () => ({ allowed: true, balance: { remaining: 999999999 } }),
  track: async () => ({}),
};

export const autumn = new Proxy(new Autumn({
  secretKey: () => getEnvValue("AUTUMN_SECRET_KEY") || "dummy",
}), {
  get(target, prop, receiver) {
    if (!getEnvValue("AUTUMN_SECRET_KEY")) {
      return Reflect.get(dummyAutumn, prop) || Reflect.get(target, prop, receiver);
    }
    return Reflect.get(target, prop, receiver);
  }
});
