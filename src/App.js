import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/code/:code" element={<StatsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

function Header() {
  return (
    <header className="navbar">
      <div className="logo">TinyLink</div>
      <nav>
        <Link to="/">Dashboard</Link>
      </nav>
    </header>
  );
}

function Dashboard() {
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [linksError, setLinksError] = useState("");

  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [search, setSearch] = useState("");

  // all links load
  useEffect(() => {
    async function fetchLinks() {
      setLoadingLinks(true);
      setLinksError("");
      try {
        const res = await fetch(`${API_BASE}/api/links`);
        if (!res.ok) {
          throw new Error("Failed to load links");
        }
        const data = await res.json();
        setLinks(data);
      } catch (err) {
        console.error(err);
        setLinksError("Doesn't load Links.Try after some time.");
      } finally {
        setLoadingLinks(false);
      }
    }

    fetchLinks();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!url.trim()) {
      setFormError("URL required.");
      return;
    }

    if (code && !/^[A-Za-z0-9]{6,8}$/.test(code)) {
      setFormError("Code contains 6-8 characters A-Z,a-z,0-9.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, code: code || undefined }),
      });

      if (res.status === 409) {
        setFormError("Code Already Exist, Try Another.");
        return;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setFormError(errBody.error || "Could not create link.");
        return;
      }

      const created = await res.json();
      setLinks((prev) => [created, ...prev]);
      setUrl("");
      setCode("");
      setFormSuccess("Link successfully created!");
    } catch (err) {
      console.error(err);
      setFormError("Network error. Try again after some time.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (codeToDelete) => {
    const sure = window.confirm(
      `Definitely need to be deleted? Short code: ${codeToDelete}`
    );
    if (!sure) return;

    try {
      const res = await fetch(`${API_BASE}/api/links/${codeToDelete}`, {
        method: "DELETE",
      });

      if (res.status === 404) {
        alert("Code already delete / doesn't exist.");
        return;
      }

      if (!res.ok) {
        alert("Could not delete. Try after some time.");
        return;
      }

      setLinks((prev) => prev.filter((l) => l.code !== codeToDelete));
    } catch (err) {
      console.error(err);
      alert("Network error.");
    }
  };

  const filteredLinks = links.filter((l) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      l.code.toLowerCase().includes(s) ||
      l.target_url.toLowerCase().includes(s)
    );
  });

  return (
    <div className="page">
      <section className="hero">
        <h1>Build Stronger Digital Connections</h1>
        <p>
          Use TinyLink to shorten long URLs, track every clicks, and manage all your links from a clean, simple Dashboard.
        </p>
      </section>

      <section className="card form-card">
        <h2>Add new link</h2>
        <form onSubmit={handleCreate} className="shorten-form vertical">
          <label>
            Long URL
            <input
              type="text"
              placeholder="https://example.com/very/long/url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>

          <label>
            Custom code (optional)
            <input
              type="text"
              placeholder="6-8 chars, A-Z, a-z, 0-9"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>

          {formError && <p className="error">{formError}</p>}
          {formSuccess && <p className="success">{formSuccess}</p>}

          <button type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create link"}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>My Links</h2>
          <input
            type="text"
            placeholder="Search by code or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {loadingLinks ? (
          <p>Loading links...</p>
        ) : linksError ? (
          <p className="error">{linksError}</p>
        ) : filteredLinks.length === 0 ? (
          <p>There is no link yet. Add a new link from the form above.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Short code</th>
                  <th>Short URL</th>
                  <th>Target URL</th>
                  <th>Total clicks</th>
                  <th>Last clicked</th>
                  <th>Created at</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map((link) => (
                  <LinkRow
                    key={link.code}
                    link={link}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function LinkRow({ link, onDelete }) {
  const navigate = useNavigate();

  const shortUrl = `${API_BASE}/${link.code}`;

  const copyShort = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      alert("Short URL copied!");
    } catch {
      alert("Could not copy.");
    }
  };

  const lastClicked = link.last_clicked_at
    ? new Date(link.last_clicked_at).toLocaleString()
    : "-";

  const createdAt = link.created_at
    ? new Date(link.created_at).toLocaleString()
    : "-";

  return (
    <tr>
      <td>{link.code}</td>
      <td>
        <a href={shortUrl} target="_blank" rel="noreferrer">
          {shortUrl}
        </a>
      </td>
      <td className="original-url" title={link.target_url}>
        {link.target_url}
      </td>
      <td>{link.total_clicks}</td>
      <td>{lastClicked}</td>
      <td>{createdAt}</td>
      <td>
        <button onClick={copyShort}>Copy</button>
        <button onClick={() => navigate(`/code/${link.code}`)}>Stats</button>
        <button className="danger" onClick={() => onDelete(link.code)}>
          Delete
        </button>
      </td>
    </tr>
  );
}

function StatsPage() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`${API_BASE}/api/links/${code}`);
        if (res.status === 404) {
          setErr("Code doesn't exist.");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setErr("Stats doesn't load.");
          setLoading(false);
          return;
        }
        const body = await res.json();
        setData(body);
      } catch (e) {
        console.error(e);
        setErr("Network error.");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [code]);

  const shortUrl = `${API_BASE}/${code}`;

  if (loading) {
    return (
      <div className="page">
        <h2>Stats for {code}</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="page">
        <h2>Stats for {code}</h2>
        <p className="error">{err}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="card">
        <h2>Stats for {data.code}</h2>
        <p>
          <strong>Short URL:</strong>{" "}
          <a href={shortUrl} target="_blank" rel="noreferrer">
            {shortUrl}
          </a>
        </p>
        <p>
          <strong>Target URL:</strong>{" "}
          <span className="break-word">{data.target_url}</span>
        </p>
        <p>
          <strong>Total clicks:</strong> {data.total_clicks}
        </p>
        <p>
          <strong>Last clicked:</strong>{" "}
          {data.last_clicked_at
            ? new Date(data.last_clicked_at).toLocaleString()
            : "-"}
        </p>
        <p>
          <strong>Created at:</strong>{" "}
          {data.created_at
            ? new Date(data.created_at).toLocaleString()
            : "-"}
        </p>
      </section>
    </div>
  );
}

function NotFound() {
  return (
    <div className="page">
      <h2>Page not found</h2>
      <p>
        Wrong URL. <Link to="/">Go to Dashboard.</Link>
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>TinyLink • Built with React & Express</p>
    </footer>
  );
}

export default App;
