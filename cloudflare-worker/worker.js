
const json = (data, status = 200, origin = "*") =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });

const enc = new TextEncoder();

function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s + "=".repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
}

async function hmac(key, data) {
  const k = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

async function hkdf(ikm, salt, info, length) {
  const prk = await hmac(salt, ikm);
  let t = new Uint8Array();
  const out = [];
  for (let i = 1; out.length < length; i++) {
    const input = new Uint8Array(t.length + info.length + 1);
    input.set(t);
    input.set(info, t.length);
    input[input.length - 1] = i;
    t = await hmac(prk, input);
    out.push(...t);
  }
  return new Uint8Array(out.slice(0, length));
}

async function vapidToken(endpoint, env) {
  const url = new URL(endpoint);
  const audience = url.origin;
  const now = Math.floor(Date.now() / 1000);

  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64url(enc.encode(JSON.stringify({
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT || "mailto:notifications@kblcdailydevotional.vercel.app"
  })));

  const message = enc.encode(header + "." + payload);
  const privateKey = fromB64url(env.VAPID_PRIVATE_KEY);
  const publicKey = fromB64url(env.VAPID_PUBLIC_KEY);

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: b64url(privateKey),
      x: b64url(publicKey.slice(1, 33)),
      y: b64url(publicKey.slice(33, 65)),
      ext: true
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, message
  ));

  return header + "." + payload + "." + b64url(signature);
}

async function encryptPush(subscription, payload) {
  const clientPublic = fromB64url(subscription.keys.p256dh);
  const authSecret = fromB64url(subscription.keys.auth);

  const server = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );

  const serverPublic = new Uint8Array(
    await crypto.subtle.exportKey("raw", server.publicKey)
  );

  const clientKey = await crypto.subtle.importKey(
    "raw", clientPublic,
    { name: "ECDH", namedCurve: "P-256" }, false, []
  );

  const shared = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey }, server.privateKey, 256
  ));

  const authInfo = new Uint8Array([
    ...enc.encode("WebPush: info\0"), ...clientPublic, ...serverPublic
  ]);
  const ikm = await hkdf(shared, authSecret, authInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = await hkdf(prk, new Uint8Array(32), enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(prk, new Uint8Array(32), enc.encode("Content-Encoding: nonce\0"), 12);

  const plain = new Uint8Array(enc.encode(payload).length + 1);
  plain.set(enc.encode(payload));
  plain[plain.length - 1] = 2;

  const aesKey = await crypto.subtle.importKey(
    "raw", cek, "AES-GCM", false, ["encrypt"]
  );
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce }, aesKey, plain
  ));

  const record = new Uint8Array(21 + serverPublic.length + encrypted.length);
  record.set(salt, 0);
  new DataView(record.buffer).setUint32(16, 4096, false);
  record[20] = serverPublic.length;
  record.set(serverPublic, 21);
  record.set(encrypted, 21 + serverPublic.length);
  return record;
}

async function sendPush(subscription, payload, env) {
  const token = await vapidToken(subscription.endpoint, env);
  const body = await encryptPush(subscription, JSON.stringify(payload));

  return fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${token}, k=${env.VAPID_PUBLIC_KEY}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
      "Urgency": "high"
    },
    body
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = "https://kblcdailydevotional.vercel.app";
    const corsOrigin = origin === allowed ? origin : allowed;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return json({
        status: "active",
        service: "KBLC Daily Devotional Push",
        message: "Notification server is running."
      }, 200, corsOrigin);
    }

    if (!env.SUBSCRIPTIONS) {
      return json({ error: "KV storage is not configured." }, 500, corsOrigin);
    }

    if (url.pathname === "/public-key" && request.method === "GET") {
      return json({ publicKey: env.VAPID_PUBLIC_KEY }, 200, corsOrigin);
    }

    if (url.pathname === "/subscribe" && request.method === "POST") {
      try {
        const sub = await request.json();
        if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
          return json({ error: "Invalid subscription." }, 400, corsOrigin);
        }

        const digest = await crypto.subtle.digest("SHA-256", enc.encode(sub.endpoint));
        const id = b64url(new Uint8Array(digest));
        await env.SUBSCRIPTIONS.put(id, JSON.stringify(sub));

        return json({ success: true, message: "Subscription saved." }, 200, corsOrigin);
      } catch {
        return json({ error: "Subscription could not be saved." }, 400, corsOrigin);
      }
    }

    if (url.pathname === "/count" && request.method === "GET") {
      const result = await env.SUBSCRIPTIONS.list();
      return json({ subscribers: result.keys.length }, 200, corsOrigin);
    }

    if (url.pathname === "/send" && request.method === "POST") {
      const auth = request.headers.get("Authorization");
      if (!env.ADMIN_SECRET || auth !== `Bearer ${env.ADMIN_SECRET}`) {
        return json({ error: "Unauthorized." }, 401, corsOrigin);
      }

      try {
        const input = await request.json();
        const message = {
          title: input.title || "KBLC Daily Devotional",
          body: input.body || "A new devotional is available. Listen, read, reflect and grow.",
          url: input.url || "https://kblcdailydevotional.vercel.app/",
          icon: "https://kblcdailydevotional.vercel.app/kblc-logo.png"
        };

        const list = await env.SUBSCRIPTIONS.list();
        let sent = 0;
        let failed = 0;

        for (const item of list.keys) {
          const raw = await env.SUBSCRIPTIONS.get(item.name);
          if (!raw) continue;

          try {
            const response = await sendPush(JSON.parse(raw), message, env);
            if (response.ok) {
              sent++;
            } else {
              failed++;
              if (response.status === 404 || response.status === 410) {
                await env.SUBSCRIPTIONS.delete(item.name);
              }
            }
          } catch {
            failed++;
          }
        }

        return json({ success: true, sent, failed }, 200, corsOrigin);
      } catch {
        return json({ error: "Notification sending failed." }, 500, corsOrigin);
      }
    }

    return json({ error: "Endpoint not found." }, 404, corsOrigin);
  }
};
