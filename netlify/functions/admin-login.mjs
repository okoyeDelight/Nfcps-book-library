import crypto from "node:crypto";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function reply(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function secureEqual(a, b) {
  const left = crypto.createHash("sha256").update(String(a)).digest();
  const right = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

function signSession(secret) {
  const payload = Buffer.from(
    JSON.stringify({ role: "admin", exp: Date.now() + 6 * 60 * 60 * 1000 })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });

  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!adminPassword || !sessionSecret) {
    return reply(503, { error: "Admin access has not been configured on the deployment yet." });
  }

  let password = "";
  try {
    password = JSON.parse(event.body || "{}").password || "";
  } catch {
    return reply(400, { error: "Invalid request" });
  }

  if (!secureEqual(password, adminPassword)) {
    return reply(401, { error: "Incorrect password" });
  }

  return reply(200, { token: signSession(sessionSecret), expiresIn: 21600 });
};
