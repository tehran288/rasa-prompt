import "./globals.css";

// Requests that never matched a locale (rare: the proxy redirects almost everything).
export default function GlobalNotFound() {
  return (
    <html lang="en" dir="ltr" className="dark">
      <body>
        <main className="wrap" style={{ paddingBlock: 120, textAlign: "center" }}>
          <h1 style={{ fontSize: 40 }}>404</h1>
          <p className="muted">
            <a href="/fa">فارسی</a> • <a href="/ar">العربية</a> • <a href="/en">English</a>
          </p>
        </main>
      </body>
    </html>
  );
}
