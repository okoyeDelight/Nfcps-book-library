"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, Eye, ImagePlus, KeyRound, LoaderCircle, LogOut, Plus, ShieldCheck, Trash2, UploadCloud } from "lucide-react";

const emptyForm = {
  title: "",
  author: "",
  category: "Christian Living",
  description: "",
  cover: "",
  coverDataUrl: "",
  source: "",
  verified: true,
};

type BookForm = typeof emptyForm;

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setToken(window.sessionStorage.getItem("nfcps-admin-session") || "");
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/.netlify/functions/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in");
      window.sessionStorage.setItem("nfcps-admin-session", data.token);
      setToken(data.token);
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in. The secure admin backend runs on the deployed Netlify site.");
    } finally {
      setBusy(false);
    }
  }

  function handleCoverFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP cover image.");
      event.target.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("The cover image must be smaller than 3 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, coverDataUrl: String(reader.result || ""), cover: "" }));
    };
    reader.onerror = () => setError("Could not read that image. Try another one.");
    reader.readAsDataURL(file);
  }

  async function publishBook(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/.netlify/functions/admin-add-book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish book");
      setMessage(`${data.book.title} has been committed to the NFCPS library. The live site will update after the connected deployment rebuilds.`);
      setForm(emptyForm);
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Could not publish book";
      setError(text);
      if (text.toLowerCase().includes("expired")) {
        window.sessionStorage.removeItem("nfcps-admin-session");
        setToken("");
      }
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    window.sessionStorage.removeItem("nfcps-admin-session");
    setToken("");
    setMessage("");
    setError("");
  }

  const previewCover = form.coverDataUrl || form.cover;

  return (
    <main className="admin-page">
      <div className="admin-glow admin-glow-one" />
      <div className="admin-glow admin-glow-two" />
      <header className="admin-topbar">
        <a href="/" className="admin-back"><ArrowLeft size={17} /> Back to library</a>
        <div className="admin-brand"><span><BookOpen size={20} /></span><div><strong>NFCPS</strong><small>LIBRARY ADMIN</small></div></div>
        {token ? <button type="button" className="admin-logout" onClick={logout}><LogOut size={16} /> Sign out</button> : <span className="admin-secure"><ShieldCheck size={16} /> Secure access</span>}
      </header>

      {!token ? (
        <section className="admin-login-card">
          <div className="admin-icon"><KeyRound size={27} /></div>
          <span className="section-kicker">ADMIN ACCESS</span>
          <h1>Manage the library.</h1>
          <p>One password. No email account. Once signed in, an authorised NFCPS librarian can add new physical books without touching the website code.</p>
          <form onSubmit={signIn} className="admin-login-form">
            <label><span>Admin password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter admin password" required /></label>
            <button className="admin-primary" disabled={busy || !password}>{busy ? <><LoaderCircle className="spin" size={17} /> Signing in…</> : <><ShieldCheck size={17} /> Open dashboard</>}</button>
          </form>
          {error && <div className="admin-alert error">{error}</div>}
          <p className="admin-security-note">The password is checked by a serverless function and is never stored in the public website source code.</p>
        </section>
      ) : (
        <section className="admin-dashboard">
          <div className="admin-heading">
            <div><span className="section-kicker">PHYSICAL COLLECTION</span><h1>Add a new book.</h1><p>Upload the cover straight from your phone gallery, enter the details once, and publish it into the same 3D collection.</p></div>
            <div className="admin-status"><CheckCircle2 size={18} /><span>Admin authenticated</span></div>
          </div>

          <div className="admin-grid">
            <form className="admin-form-card" onSubmit={publishBook}>
              <div className="admin-form-title"><Plus size={19} /><strong>Book information</strong></div>
              <div className="admin-fields two-col">
                <label><span>Book title *</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. The Pursuit of God" required /></label>
                <label><span>Author *</span><input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} placeholder="Author name" required /></label>
              </div>

              <label className="admin-upload-box">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverFile} />
                <span className="admin-upload-icon"><ImagePlus size={22} /></span>
                <span className="admin-upload-copy"><strong>{form.coverDataUrl ? "Cover selected" : "Upload book cover"}</strong><small>Choose a JPG, PNG or WebP from your gallery · maximum 3 MB</small></span>
                <span className="admin-upload-action">Choose image</span>
              </label>

              {form.coverDataUrl && (
                <div className="admin-selected-cover"><CheckCircle2 size={16} /><span>Gallery cover will be saved into the website automatically.</span><button type="button" onClick={() => setForm({ ...form, coverDataUrl: "" })}><Trash2 size={14} /> Remove</button></div>
              )}

              <div className="admin-fields two-col">
                <label><span>Category *</span><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Prayer, Leadership, Faith…" required /></label>
                <label><span>Or use online cover URL</span><input type="url" value={form.cover} disabled={Boolean(form.coverDataUrl)} onChange={(event) => setForm({ ...form, cover: event.target.value, coverDataUrl: "" })} placeholder="https://…/cover.jpg" /></label>
              </div>
              <label className="admin-full"><span>Description *</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="A clear two- or three-sentence description of the book…" rows={6} required /></label>
              <label className="admin-full"><span>Book information/source URL</span><input type="url" value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} placeholder="Google Books, publisher page, Open Library…" /></label>
              <label className="admin-check"><input type="checkbox" checked={form.verified} onChange={(event) => setForm({ ...form, verified: event.target.checked })} /><span><strong>Metadata verified</strong><small>Turn this off if the title or author still needs confirmation.</small></span></label>
              <button className="admin-primary publish" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} /> Publishing…</> : <><UploadCloud size={17} /> Publish to NFCPS Library</>}</button>
              {message && <div className="admin-alert success">{message}</div>}
              {error && <div className="admin-alert error">{error}</div>}
            </form>

            <aside className="admin-preview-card">
              <div className="admin-preview-title"><Eye size={18} /><strong>Live card preview</strong></div>
              <div className="admin-preview-stage">
                <div className="admin-preview-book">
                  {previewCover ? <img src={previewCover} alt="Book cover preview" /> : <div className="admin-cover-fallback"><small>NFCPS LIBRARY</small><strong>{form.title || "BOOK TITLE"}</strong><span>{form.author || "Author"}</span></div>}
                </div>
                <div className="admin-preview-shelf" />
              </div>
              <span className="category-chip">{form.category || "Category"}</span>
              <h2>{form.title || "Your new book"}</h2>
              <p className="author">{form.author || "Author name"}</p>
              <p>{form.description || "The description will appear here exactly as readers will see it in the physical library."}</p>
            </aside>
          </div>
        </section>
      )}
    </main>
  );
}
