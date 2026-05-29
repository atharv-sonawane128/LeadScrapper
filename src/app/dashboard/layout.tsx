"use client";

import React from "react";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Terminal as ConsoleIcon, 
  Database, 
  LogOut, 
  Terminal,
  User
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%"
      }}>
        <svg className="spinner" viewBox="0 0 50 50" style={{ width: "40px", height: "40px", color: "var(--primary)" }}>
          <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
        </svg>
      </div>
    );
  }

  // Fallback protection (AuthContext automatically pushes redirect, but safe fallback is good)
  if (!user) {
    return null;
  }

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Scraper Console", href: "/dashboard/console", icon: ConsoleIcon },
    { name: "Leads Database", href: "/dashboard/leads", icon: Database },
  ];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Terminal size={22} style={{ color: "var(--primary)" }} />
          <span className="sidebar-text">Aether<span className="text-gradient">Scrape</span></span>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={18} />
                <span className="sidebar-text">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-color)",
              padding: "0.45rem",
              borderRadius: "8px",
              color: "var(--text-secondary)"
            }}>
              <User size={16} />
            </div>
            <div className="sidebar-text" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>{user.displayName || "Operator"}</div>
              <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="btn btn-secondary"
            style={{ width: "100%", padding: "0.6rem 1rem", fontSize: "0.85rem", justifyContent: "flex-start", gap: "0.75rem" }}
          >
            <LogOut size={16} style={{ color: "var(--error)" }} />
            <span className="sidebar-text">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
