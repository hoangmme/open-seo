import { createFileRoute } from "@tanstack/react-router";
import { autumnHandler } from "autumn-js/fetch";
import { env } from "cloudflare:workers";
import { isHostedAuthMode } from "@/lib/auth-mode";
import { resolveHostedContext } from "@/middleware/ensure-user/hosted";

const handler = autumnHandler({
  identify: async (request) => {
    const context = await resolveHostedContext(request.headers);

    return {
      customerId: context.organizationId,
    };
  },
});

function handleAutumnRequest(request: Request) {
  if (!isHostedAuthMode(env.AUTH_MODE)) {
    return new Response("Not found", {
      status: 404,
    });
  }

  if (!env.AUTUMN_SECRET_KEY) {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/getOrCreateCustomer")) {
      return new Response(JSON.stringify({ customer: { id: "dummy", name: "Dummy" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  return handler(request);
}

export const Route = createFileRoute("/api/autumn/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return handleAutumnRequest(request);
      },
      POST: async ({ request }: { request: Request }) => {
        return handleAutumnRequest(request);
      },
    },
  },
});
