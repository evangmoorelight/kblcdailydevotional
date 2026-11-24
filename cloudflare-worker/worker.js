
export default {
  async fetch(request, env) {
    const allowedOrigin = "https://kblcdailydevotional.vercel.app";
    const origin = request.headers.get("Origin") || "";

    const cors = {
      "Access-Control-Allow-Origin":
        origin === allowedOrigin ? origin : allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    const respond = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: cors
      });

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return respond({
        status: "active",
        service: "KBLC Daily Devotional Push",
        message: "Notification server is running."
      });
    }

    if (!env.SUBSCRIPTIONS) {
      return respond({
        error: "KV storage is not configured."
      }, 500);
    }

    if (url.pathname === "/subscribe" && request.method === "POST") {
      try {
        const subscription = await request.json();

        if (
          !subscription.endpoint ||
          !subscription.keys ||
          !subscription.keys.p256dh ||
          !subscription.keys.auth
        ) {
          return respond({
            error: "Invalid push subscription."
          }, 400);
        }

        const hash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(subscription.endpoint)
        );

        const id = Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");

        await env.SUBSCRIPTIONS.put(
          id,
          JSON.stringify(subscription)
        );

        return respond({
          success: true,
          message: "Subscription saved successfully."
        });
      } catch (error) {
        return respond({
          error: "Could not save subscription."
        }, 500);
      }
    }

    if (url.pathname === "/count" && request.method === "GET") {
      const result = await env.SUBSCRIPTIONS.list();

      return respond({
        subscribers: result.keys.length
      });
    }

    return respond({
      error: "Endpoint not found."
    }, 404);
  }
};
