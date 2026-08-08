export default function RootNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 1rem",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p
            style={{
              marginBottom: "0.5rem",
              fontSize: "3.75rem",
              fontWeight: 700,
              color: "#00b8d9",
            }}
          >
            404
          </p>
          <h2
            style={{
              marginBottom: "0.5rem",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#081a2f",
            }}
          >
            Page not found
          </h2>
          <p style={{ marginBottom: "1.5rem", color: "#5b6472" }}>
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
          <a
            href="/"
            style={{
              borderRadius: "0.75rem",
              backgroundColor: "#081a2f",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
