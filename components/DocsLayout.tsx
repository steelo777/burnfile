"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Nav } from "./Nav";

interface DocsLayoutProps {
  children: React.ReactNode;
  toc?: { label: string; anchor: string }[];
}

export function DocsLayout({ children, toc }: DocsLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Nav — passes menu toggle down, owns nothing else */}
      <Nav onMenuClick={() => setMobileOpen(true)} />

      <div style={{ display: "flex" }}>
        {/* Sidebar — owns both desktop and mobile rendering */}
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* Main content — natural document flow, no overflow tricks */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex" }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                maxWidth: "860px",
                padding: "32px 40px 80px 40px",
              }}
            >
              {children}
            </div>

            {/* Right TOC */}
            {toc && toc.length > 0 && (
              <aside
                style={{
                  width: "192px",
                  flexShrink: 0,
                  paddingTop: "32px",
                  paddingRight: "24px",
                  display: "none",
                }}
                className="xl:block"
              >
                <div style={{ position: "sticky", top: "80px" }}>
                  <p
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono), monospace",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--text-muted)",
                      marginBottom: "12px",
                    }}
                  >
                    On this page
                  </p>
                  <nav>
                    {toc.map((item) => (
                      <a
                        key={item.anchor}
                        href={`#${item.anchor}`}
                        style={{
                          display: "block",
                          fontSize: "13px",
                          padding: "4px 0",
                          color: "var(--text-muted)",
                          textDecoration: "none",
                          transition: "color 150ms",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        {item.label}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
