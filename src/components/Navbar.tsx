"use client";

import React, { useEffect, useState } from "react";

interface UserProfile {
  id?: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    role?: string;
  };
}

export default function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  // Initialize user session & bind FAQ interactivity
  useEffect(() => {
    // 1. Check existing session
    try {
      const stored = localStorage.getItem("medisave_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      // Ignore
    }

    // 2. Setup FAQs accordion & assign id="faqs"
    const setupFaqs = () => {
      const faqSection = document.querySelector(".section_home-faq");
      if (faqSection && !faqSection.id) {
        faqSection.id = "faqs";
      }

      const accordionItems = document.querySelectorAll<HTMLElement>(".c-accordion-item");
      accordionItems.forEach((item, index) => {
        // Open the first two items by default
        if (index === 0 || index === 1) {
          item.classList.add("is-open");
        }

        const header = item.querySelector<HTMLElement>(".c-accordion-item-q");
        if (header && !header.dataset.faqBound) {
          header.dataset.faqBound = "true";
          header.style.cursor = "pointer";
          header.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            item.classList.toggle("is-open");
          });
        }

        // Replace any old placeholder branding with MediSave
        const textElements = item.querySelectorAll<HTMLElement>(".faq-heading, p");
        textElements.forEach((el) => {
          if (el.innerHTML.includes("MediSave")) {
            el.innerHTML = el.innerHTML.replaceAll("MediSave", "MediSave");
          }
        });
      });
    };

    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const q = target.closest(".c-accordion-item-q");
      if (q) {
        e.preventDefault();
        const item = q.closest(".c-accordion-item");
        if (item) {
          item.classList.toggle("is-open");
        }
      }
    };
    document.addEventListener("click", handleDocClick);

    setupFaqs();
    const t1 = setTimeout(setupFaqs, 400);
    const t2 = setTimeout(setupFaqs, 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.removeEventListener("click", handleDocClick);
    };
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handle1ClickDemoLogin = () => {
    const demoUser: UserProfile = {
      id: "demo-user-778899",
      email: "demo@medisave.in",
      user_metadata: {
        full_name: "Dr. Rajesh Sharma (Demo Patient)",
        role: "Verified Patient",
      },
    };
    setUser(demoUser);
    localStorage.setItem("medisave_user", JSON.stringify(demoUser));
    localStorage.setItem("medisave_token", "demo-token-medisave-active");
    setIsModalOpen(false);
    showToast("Signed in as Dr. Rajesh Sharma (demo@medisave.in)!");
  };

  const handleFillDemo = () => {
    setEmail("demo@medisave.in");
    setPassword("medisave2026");
    if (modalMode === "signup") {
      setFullName("Dr. Rajesh Sharma");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const loggedUser: UserProfile = {
      id: "user-" + Date.now(),
      email: email.trim(),
      user_metadata: {
        full_name: fullName.trim() || email.split("@")[0],
        role: "Patient",
      },
    };

    setUser(loggedUser);
    localStorage.setItem("medisave_user", JSON.stringify(loggedUser));
    localStorage.setItem("medisave_token", "token-" + Date.now());
    setIsModalOpen(false);
    showToast(`Welcome to MediSave, ${loggedUser.user_metadata?.full_name}!`);
  };

  const handleSignOut = () => {
    localStorage.removeItem("medisave_user");
    localStorage.removeItem("medisave_token");
    setUser(null);
    showToast("Signed out successfully.");
  };

  const handleOpenFaqs = (e: React.MouseEvent) => {
    e.preventDefault();
    const faqEl = document.getElementById("faqs") || document.querySelector(".section_home-faq");
    if (faqEl) {
      faqEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleOpenKendras = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && typeof (window as any).openKendraModal === "function") {
      (window as any).openKendraModal('Lucknow');
    } else {
      const modal = document.getElementById("kendra-modal");
      if (modal) modal.style.display = "flex";
    }
  };

  const initial = user?.email ? user.email[0].toUpperCase() : "U";
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            zIndex: 100000,
            background: "#041E11",
            color: "#2FE694",
            border: "1.5px solid #2FE694",
            padding: "14px 22px",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            fontSize: "14px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeInFaq 0.3s ease-out",
          }}
        >
          <span>✓</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Main Dark Green Navigation Bar */}
      <nav className="medisave-header-nav" role="navigation" aria-label="Main Navigation">
        <div className="medisave-nav-container">
          {/* Brand & WOW Unique Badge */}
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
            <a href="#faqs" onClick={handleOpenFaqs} className="medisave-nav-link">
              FAQs
            </a>
          </div>

          {/* Right Actions: Login & Demo Login (No Google) */}
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
                  onClick={() => setIsModalOpen(true)}
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
                  id="btn-nav-demo-instant"
                  type="button"
                  onClick={handle1ClickDemoLogin}
                  className="btn-nav-demo"
                  title="Instant 1-Click Demo Login"
                >
                  <span>⚡</span>
                  <span>Demo Login</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Interactive Authentication & Demo Modal */}
      {isModalOpen && (
        <div
          id="auth-modal"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(4, 30, 17, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              width: "100%",
              maxWidth: "460px",
              borderRadius: "24px",
              padding: "32px",
              boxShadow: "0 24px 60px rgba(4, 30, 17, 0.35)",
              position: "relative",
              color: "#1B0A66",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#6B7280",
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            {/* Modal Title */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "52px",
                  height: "52px",
                  borderRadius: "16px",
                  background: "#041E11",
                  marginBottom: "12px",
                }}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2FE694"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v20M2 12h20" />
                </svg>
              </div>
              <h3 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 6px 0", color: "#041E11" }}>
                {modalMode === "login" ? "Sign In to MediSave" : "Create MediSave Account"}
              </h3>
              <p style={{ fontSize: "13.5px", color: "#6B7280", margin: 0 }}>
                {modalMode === "login"
                  ? "Access your saved Jan Aushadhi prescriptions & pricing"
                  : "Join MediSave for 100% free generic medicine comparison"}
              </p>
            </div>

            {/* DEMO LOGIN CREDENTIALS BOX */}
            <div className="demo-creds-box">
              <div className="demo-creds-title">
                <span>⚡</span>
                <span>Demo Account Credentials</span>
              </div>
              <div className="demo-creds-row">
                <span style={{ fontWeight: 600 }}>Demo Email:</span>
                <span className="demo-creds-badge">demo@medisave.in</span>
              </div>
              <div className="demo-creds-row">
                <span style={{ fontWeight: 600 }}>Demo Password:</span>
                <span className="demo-creds-badge">medisave2026</span>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={handle1ClickDemoLogin}
                  style={{
                    flex: 1,
                    background: "#041E11",
                    color: "#2FE694",
                    border: "1.5px solid #2FE694",
                    borderRadius: "10px",
                    padding: "9px 12px",
                    fontWeight: 750,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span>⚡ 1-Click Instant Demo Login</span>
                </button>
                <button type="button" onClick={handleFillDemo} className="btn-fill-demo">
                  Fill Form
                </button>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div
              style={{
                display: "flex",
                background: "#F3F4F6",
                borderRadius: "10px",
                padding: "4px",
                marginBottom: "20px",
              }}
            >
              <button
                type="button"
                onClick={() => setModalMode("login")}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  background: modalMode === "login" ? "#FFFFFF" : "transparent",
                  color: modalMode === "login" ? "#041E11" : "#6B7280",
                  boxShadow: modalMode === "login" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setModalMode("signup")}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  background: modalMode === "signup" ? "#FFFFFF" : "transparent",
                  color: modalMode === "signup" ? "#041E11" : "#6B7280",
                  boxShadow: modalMode === "signup" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                }}
              >
                Sign Up Free
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit}>
              {modalMode === "signup" && (
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#1F2937" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: "10px",
                      fontSize: "14.5px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#1F2937" }}>
                  Email Address or Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com or +91 98765 43210"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    border: "1.5px solid #E5E7EB",
                    borderRadius: "10px",
                    fontSize: "14.5px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#1F2937" }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    border: "1.5px solid #E5E7EB",
                    borderRadius: "10px",
                    fontSize: "14.5px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #1FAE6B 0%, #15803D 100%)",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: "15px",
                  padding: "13px",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(31, 174, 107, 0.35)",
                  transition: "all 0.2s",
                }}
              >
                {modalMode === "login" ? "Sign In to MediSave" : "Create Free Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
