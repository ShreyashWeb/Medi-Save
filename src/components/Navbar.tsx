"use client";

import React, { useEffect, useState } from "react";

interface UserProfile {
  id?: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export default function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);

  // Initialize and listen for Supabase auth state & URL hash redirects
  useEffect(() => {
    // 1. Check existing session in localStorage
    try {
      const stored = localStorage.getItem("medisave_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      // Ignore JSON error
    }

    // 2. Parse hash fragment from Supabase OAuth redirect: #access_token=...
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const token = hashParams.get("access_token");
        if (token) {
          localStorage.setItem("medisave_token", token);
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gckeoffdfjkqpdnfidxy.supabase.co";
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_nPHMbiIeBoOho5NJfOqVNQ_EVf7suS3";

          fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: anonKey,
            },
          })
            .then((r) => r.json())
            .then((userData) => {
              if (userData && (userData.email || userData.id)) {
                setUser(userData);
                localStorage.setItem("medisave_user", JSON.stringify(userData));
                window.history.replaceState(null, "", window.location.pathname);
              }
            })
            .catch((err) => console.warn("Supabase user fetch failed:", err));
        }
      } catch (e) {
        console.warn("Error parsing OAuth token:", e);
      }
    }
  }, []);

  const handleGoogleAuth = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gckeoffdfjkqpdnfidxy.supabase.co";
    const redirectUrl = window.location.origin;
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
      redirectUrl
    )}`;
  };

  const handleSignOut = () => {
    localStorage.removeItem("medisave_user");
    localStorage.removeItem("medisave_token");
    setUser(null);
  };

  const handleOpenLogin = () => {
    const modal = document.getElementById("auth-modal");
    if (modal) {
      modal.style.display = "flex";
    } else {
      handleGoogleAuth();
    }
  };

  const handleOpenKendras = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && typeof (window as any).openKendraModal === "function") {
      (window as any).openKendraModal();
    } else {
      const modal = document.getElementById("kendra-modal");
      if (modal) modal.style.display = "flex";
    }
  };

  const initial = user?.email ? user.email[0].toUpperCase() : "U";
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <nav className="medisave-header-nav" role="navigation" aria-label="Main Navigation">
      <div className="medisave-nav-container">
        {/* Brand & WOW Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
          <a
            href="/"
            className="medisave-brand-link"
            style={{ display: "inline-flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
          >
            <div className="medisave-logo-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#A6D63A"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M2 12h20" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                }}
              >
                Medi<span style={{ color: "#2FE694" }}>Save</span>
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "#A6D63A",
                  fontWeight: 700,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                }}
              >
                दवा बचत पहल
              </span>
            </div>
          </a>

          {/* COOL & WOW UNIQUE BADGE FOR MEDISAVE */}
          <div
            className="medisave-wow-badge"
            id="badge-gov-verify"
            title="100% Bioequivalent generic medicines verified against official PMBJP & NPPA government datasets"
          >
            <span className="live-radar-beacon">
              <span className="radar-core"></span>
              <span className="radar-wave"></span>
            </span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#A6D63A"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span className="badge-title">PMBJP GOVT. VERIFIED</span>
            <span className="badge-divider"></span>
            <span className="badge-tag">100% Bioequivalent</span>
          </div>
        </div>

        {/* Center Links */}
        <div className="medisave-nav-links">
          <a href="/" className="medisave-nav-link active">
            Home
          </a>
          <a href="#drug-form" className="medisave-nav-link">
            Search Medicines
          </a>
          <a href="#how-it-works" className="medisave-nav-link">
            How It Works
          </a>
          <a href="#kendras" onClick={handleOpenKendras} className="medisave-nav-link">
            Find Kendras
          </a>
          <a href="#faqs" className="medisave-nav-link">
            FAQs
          </a>
        </div>

        {/* Right Actions: Login & Supabase Google Signup */}
        <div className="medisave-nav-actions" id="medisave-nav-actions">
          {user ? (
            <div className="user-nav-chip">
              <div className="user-avatar-circle">{initial}</div>
              <span>{displayName}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="btn-signout-chip"
                title="Sign out of MediSave"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <button
                id="open-login-btn"
                type="button"
                onClick={handleOpenLogin}
                className="btn-nav-login"
                title="Sign in with Email or Password"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Login</span>
              </button>

              <button
                id="btn-google-signup"
                type="button"
                onClick={handleGoogleAuth}
                className="btn-google-signup"
                title="Instant Google Authentication with Supabase"
              >
                <svg width="17" height="17" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign up with Google</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
