"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { leadService, Lead, LeadFilters } from "@/lib/leadService";
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  X, 
  ExternalLink,
  Globe,
  Tag,
  ChevronRight,
  Info,
  Database
} from "lucide-react";
import { LinkedinIcon } from "@/components/icons";


export default function LeadsPage() {
  const { user } = useAuth();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Detail Drawer state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Filter Inputs
  const [keyword, setKeyword] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");

  const fetchLeads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setError(null);
      const filters: LeadFilters = {};
      if (industry) filters.industry = industry;
      if (companySize) filters.companySize = companySize;
      if (role) filters.role = role;
      if (location) filters.location = location;
      if (keyword) filters.keyword = keyword;

      const fetched = await leadService.getLeads(user.uid, filters);
      setLeads(fetched);
      setFilteredLeads(fetched);
    } catch (err: any) {
      console.error("Failed to load leads", err);
      if (err.code === "permission-denied" || err.message?.includes("permission")) {
        setError("Cloud Firestore permissions are locked. Paste the security rules into your Firebase Console.");
      } else {
        setError(err.message || "Failed to load database index.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [user, industry, companySize, role, location]);

  // Handle local keyword filtering
  useEffect(() => {
    const kw = keyword.toLowerCase();
    const results = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(kw) ||
        l.company.toLowerCase().includes(kw) ||
        l.email.toLowerCase().includes(kw) ||
        l.skills.some((s) => s.toLowerCase().includes(kw))
    );
    setFilteredLeads(results);
  }, [keyword, leads]);

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeads((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((l) => l.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!user || selectedLeads.length === 0) return;
    if (confirm(`Are you sure you want to delete the ${selectedLeads.length} selected lead(s)?`)) {
      setLoading(true);
      try {
        for (const leadId of selectedLeads) {
          await leadService.deleteLead(user.uid, leadId);
        }
        setSelectedLeads([]);
        setSelectedLead(null);
        await fetchLeads();
      } catch (err) {
        console.error("Failed to delete selected leads", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClearDatabase = async () => {
    if (!user) return;
    if (confirm("WARNING: Are you sure you want to delete ALL leads in your database? This action is irreversible.")) {
      setLoading(true);
      try {
        await leadService.clearLeads(user.uid);
        setSelectedLeads([]);
        setSelectedLead(null);
        await fetchLeads();
      } catch (err) {
        console.error("Failed to clear database", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // CSV Export Utility
  const handleExportCSV = () => {
    const leadsToExport = selectedLeads.length > 0 
      ? filteredLeads.filter((l) => selectedLeads.includes(l.id))
      : filteredLeads;

    if (leadsToExport.length === 0) {
      alert("No leads available to export.");
      return;
    }

    const headers = ["Name", "Job Title", "Company", "Email", "Phone", "Location", "Industry", "Company Size", "Source", "Scraped At", "LinkedIn Profile", "Website"];
    const csvRows = [headers.join(",")];

    leadsToExport.forEach((lead) => {
      const values = [
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${lead.jobTitle.replace(/"/g, '""')}"`,
        `"${lead.company.replace(/"/g, '""')}"`,
        `"${(lead.email || "").replace(/"/g, '""')}"`,
        `"${(lead.phone || "").replace(/"/g, '""')}"`,
        `"${lead.location.replace(/"/g, '""')}"`,
        `"${lead.industry.replace(/"/g, '""')}"`,
        `"${lead.companySize.replace(/"/g, '""')}"`,
        `"${lead.source.replace(/"/g, '""')}"`,
        `"${new Date(lead.scrapedAt).toLocaleDateString()}"`,
        `"${(lead.socialLinks?.linkedin || "").replace(/"/g, '""')}"`,
        `"${(lead.socialLinks?.website || "").replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AetherScrape_Leads_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Page Header */}
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "800", fontFamily: "var(--font-display)", color: "#f8fafc", marginBottom: "0.5rem" }}>
            Intelligence <span className="text-gradient">Database</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Search, filter, manage, and export all captured target leads.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {selectedLeads.length > 0 && (
            <button 
              className="btn btn-danger" 
              onClick={handleDeleteSelected}
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem" }}
            >
              <Trash2 size={16} /> Delete Selected ({selectedLeads.length})
            </button>
          )}

          <button 
            className="btn btn-primary" 
            onClick={handleExportCSV}
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem" }}
          >
            <Download size={16} /> Export CSV {selectedLeads.length > 0 ? "Selected" : "All"}
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={handleClearDatabase}
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", color: "var(--error)", borderColor: "rgba(244,63,94,0.15)" }}
          >
            Clear Database
          </button>
        </div>
      </header>

      {error && (
        <div style={{
          background: "rgba(245, 158, 11, 0.1)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          color: "var(--warning)",
          padding: "1rem 1.25rem",
          borderRadius: "12px",
          marginBottom: "1.75rem",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}>
          <Info size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Firestore Database Denied:</strong> {error} Log in to your Firebase Console &gt; Firestore Database &gt; Rules, and set the security rules to allow read/write access.
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      <section className="glass-panel" style={{ marginBottom: "1.75rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        <div style={{ gridColumn: "span 2" }}>
          <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}><Search size={14} /> Global Search</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search names, domains, emails, skills..." 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div>
          <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}><Filter size={14} /> Industry</label>
          <select 
            className="form-input form-select"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="">All Industries</option>
            <option value="Technology">Technology & SaaS</option>
            <option value="Healthcare">Healthcare & Bio</option>
            <option value="Finance">Finance & Banking</option>
            <option value="Marketing">Marketing & Ads</option>
            <option value="Sales">Sales & BD</option>
            <option value="Web Domain">Web Crawls</option>
          </select>
        </div>

        <div>
          <label className="form-label">Company Size</label>
          <select 
            className="form-input form-select"
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
          >
            <option value="">All Sizes</option>
            <option value="1-10 employees">1-10 (Seed)</option>
            <option value="11-50 employees">11-50 (Growth)</option>
            <option value="51-200 employees">51-200 (Mid)</option>
            <option value="201-500 employees">201-500 (Enterprise)</option>
            <option value="500+ employees">500+ (Scale)</option>
          </select>
        </div>

        <div>
          <label className="form-label">Role Designation</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. CTO, Manager" 
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <div>
          <label className="form-label">Geographic Location</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. San Francisco" 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </section>

      {/* Leads Table Card */}
      <section className="glass-panel" style={{ padding: "0" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
            <svg className="spinner" viewBox="0 0 50 50" style={{ width: "36px", height: "36px" }}>
              <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
            </svg>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem", color: "var(--text-secondary)" }}>
            <Database size={44} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
            <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "#f8fafc", marginBottom: "0.5rem" }}>No matching records</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
              No leads match your current search parameters. Clear filters or run a scraper job.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: "40px", paddingRight: "0" }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th>Profile / Lead</th>
                  <th>Job Title</th>
                  <th>Company / Size</th>
                  <th>Email Contact</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const isSelected = selectedLeads.includes(lead.id);
                  return (
                    <tr 
                      key={lead.id} 
                      className={isSelected ? "table-row-selected" : ""}
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td style={{ paddingRight: "0" }} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(lead.id, e as any)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {lead.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {lead.location}
                        </div>
                      </td>
                      <td>{lead.jobTitle}</td>
                      <td>
                        <div style={{ fontWeight: "500" }}>{lead.company}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{lead.companySize}</div>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.825rem" }}>
                        {lead.email || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not available</span>}
                      </td>
                      <td>
                        <span className={`badge ${lead.source === "LinkedIn Search" ? "badge-indigo" : "badge-emerald"}`}>
                          {lead.source === "LinkedIn Search" ? "LinkedIn" : "Website"}
                        </span>
                      </td>
                      <td>
                        <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Details Side Drawer Backdrop */}
      <div 
        className={`drawer-backdrop ${selectedLead ? "active" : ""}`}
        onClick={() => setSelectedLead(null)}
      ></div>

      {/* Details Side Drawer Panel */}
      <aside className={`details-drawer ${selectedLead ? "active" : ""}`}>
        {selectedLead && (
          <>
            <div className="drawer-header">
              <div>
                <h3 style={{ fontSize: "1.35rem", color: "#f8fafc" }}>Lead Intelligence</h3>
                <span style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>ID: {selectedLead.id}</span>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              {/* Header profile info */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "1.5rem", borderRadius: "14px", marginBottom: "0.5rem" }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                  color: "#ffffff",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.85rem",
                  fontFamily: "var(--font-display)"
                }}>
                  {selectedLead.name.charAt(0)}
                </div>
                <h4 style={{ fontSize: "1.2rem", color: "#f8fafc", marginBottom: "0.25rem" }}>{selectedLead.name}</h4>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "500" }}>{selectedLead.jobTitle} at {selectedLead.company}</p>
                <span className={`badge ${selectedLead.source === "LinkedIn Search" ? "badge-indigo" : "badge-emerald"}`} style={{ marginTop: "0.75rem" }}>
                  {selectedLead.source}
                </span>
              </div>

              {/* Core attributes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div className="drawer-section-title">Details & Demographics</div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                  <div className="detail-row">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{selectedLead.location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Industry</span>
                    <span className="detail-value">{selectedLead.industry}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Company Size</span>
                    <span className="detail-value">{selectedLead.companySize}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Scraped Date</span>
                    <span className="detail-value">{new Date(selectedLead.scrapedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />

                <div className="drawer-section-title">Contact Channels</div>
                
                <div className="detail-row">
                  <span className="detail-label">Direct Email</span>
                  <span className="detail-value" style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: selectedLead.email ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {selectedLead.email || "No email scraping yields"}
                  </span>
                </div>

                {selectedLead.phone && (
                  <div className="detail-row">
                    <span className="detail-label">Phone Connection</span>
                    <span className="detail-value" style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                      {selectedLead.phone}
                    </span>
                  </div>
                )}

                <div className="detail-row">
                  <span className="detail-label">Social Coordinates</span>
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
                    {selectedLead.socialLinks?.linkedin && (
                      <a 
                        href={selectedLead.socialLinks.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: "0.45rem 0.85rem", fontSize: "0.75rem", display: "inline-flex", gap: "0.4rem", background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", border: "none" }}
                      >
                        <LinkedinIcon size={14} /> Profile Link <ExternalLink size={10} />
                      </a>
                    )}
                    {selectedLead.socialLinks?.website && (
                      <a 
                        href={selectedLead.socialLinks.website}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: "0.45rem 0.85rem", fontSize: "0.75rem", display: "inline-flex", gap: "0.4rem", background: "rgba(168, 85, 247, 0.1)", color: "var(--accent)", border: "none" }}
                      >
                        <Globe size={14} /> Domain <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />

                <div className="drawer-section-title">Skills & Keywords</div>
                <div className="skills-container">
                  {selectedLead.skills.length === 0 ? (
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>No specific skills parsed</span>
                  ) : (
                    selectedLead.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">
                        <Tag size={12} style={{ marginRight: "0.25rem", display: "inline-block", verticalAlign: "middle", color: "var(--primary)" }} /> {skill}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
