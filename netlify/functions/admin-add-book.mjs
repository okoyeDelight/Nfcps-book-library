import crypto from "node:crypto";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function reply(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function verifySession(token, secret) {
  if (!token || !secret) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.role === "admin" && Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
}

function clean(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });

  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!verifySession(token, sessionSecret)) return reply(401, { error: "Admin session expired. Sign in again." });

  const githubToken = process.env.GITHUB_LIBRARY_TOKEN;
  const repo = process.env.GITHUB_LIBRARY_REPO || "okoyeDelight/Nfcps-book-library";
  const branch = process.env.GITHUB_LIBRARY_BRANCH || "main";
  if (!githubToken) return reply(503, { error: "GitHub publishing has not been configured on Netlify yet." });

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Invalid request" });
  }

  const title = clean(input.title, 180);
  const author = clean(input.author, 140);
  const category = clean(input.category, 80);
  const description = clean(input.description, 900);
  const cover = clean(input.cover, 800);
  const source = clean(input.source, 800);

  if (!title || !author || !category || !description) {
    return reply(400, { error: "Title, author, category and description are required." });
  }

  const path = "data/admin-books.json";
  const endpoint = `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
  const githubHeaders = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${githubToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "NFCPS-Book-Library-Admin",
  };

  const currentResponse = await fetch(endpoint, { headers: githubHeaders });
  if (!currentResponse.ok) return reply(502, { error: "Could not read the library data from GitHub." });
  const currentFile = await currentResponse.json();

  let books = [];
  try {
    books = JSON.parse(Buffer.from(currentFile.content, "base64").toString("utf8"));
    if (!Array.isArray(books)) books = [];
  } catch {
    books = [];
  }

  const duplicate = books.some((book) => String(book.title).toLowerCase() === title.toLowerCase() && String(book.author).toLowerCase() === author.toLowerCase());
  if (duplicate) return reply(409, { error: "That book is already in the admin collection." });

  const newBook = {
    id: Date.now(),
    title,
    author,
    category,
    description,
    ...(cover ? { cover } : {}),
    ...(source ? { source } : {}),
    verified: Boolean(input.verified),
  };

  const nextBooks = [...books, newBook];
  const updateResponse = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { ...githubHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `library: add ${title}`,
      content: Buffer.from(`${JSON.stringify(nextBooks, null, 2)}\n`).toString("base64"),
      sha: currentFile.sha,
      branch,
    }),
  });

  if (!updateResponse.ok) {
    const details = await updateResponse.text();
    console.error("GitHub update failed", details);
    return reply(502, { error: "GitHub rejected the library update." });
  }

  return reply(200, { ok: true, book: newBook, message: "Book published. The connected Netlify site will rebuild from GitHub automatically." });
};
