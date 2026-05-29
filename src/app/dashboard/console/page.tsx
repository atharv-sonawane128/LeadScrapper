"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { leadService } from "@/lib/leadService";
import { 
  Play, 
  Terminal as TerminalIcon, 
  Globe, 
  Cpu, 
  Database,
  ArrowRight
} from "lucide-react";
import { LinkedinIcon } from "@/components/icons";


export default function ConsolePage() {
  const { user } = useAuth();
  
  // Tab: 'linkedin' or 'website'
  const [activeTab, setActiveTab] = useState<"linkedin" | "website">("linkedin");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // LinkedIn Form inputs
  const [role, setRole] = useState("Chief Technology Officer");
  const [location, setLocation] = useState("San Francisco, CA");
  const [industry, setIndustry] = useState("Technology");
  const [companySize, setCompanySize] = useState("11-50 employees");
  const [keywords, setKeywords] = useState("AI, React, SaaS");
  const [count, setCount] = useState(5);

  // Website Form inputs
  const [targetUrl, setTargetUrl] = useState("stripe.com");
  const [crawlDepth, setCrawlDepth] = useState(1);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Run LinkedIn Scraper
  const handleLinkedinScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setSuccessMsg(null);
    setLogs(["[SYSTEM] Initializing scraping session..."]);

    try {
      const response = await fetch("/api/scrape/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          location,
          industry,
          companySize,
          keywords,
          count
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to execute session");
      }

      // Stream logs slowly for visual realism
      let logIndex = 0;
      const interval = setInterval(async () => {
        if (logIndex < data.logs.length) {
          setLogs((prev) => [...prev, data.logs[logIndex]]);
          logIndex++;
        } else {
          clearInterval(interval);
          
          // Save generated leads in Firestore / LocalStorage
          setLogs((prev) => [...prev, "[DATABASE] Saving scraped profiles to Firestore database..."]);
          
          for (const lead of data.leads) {
            await leadService.addLead(user.uid, lead);
          }
          
          try {
            await leadService.addSearchHistory(user.uid, {
              type: "LinkedIn",
              query: `${role} in ${location}`,
              resultsCount: data.leads.length,
              status: "Success"
            });
          } catch (histErr) {}
          
          setLogs((prev) => [...prev, `[DATABASE] Successfully indexed ${data.leads.length} records.`]);
          setLogs((prev) => [...prev, "[SUCCESS] Scraping job finished successfully."]);
          setSuccessMsg(`Successfully scraped and saved ${data.leads.length} LinkedIn profiles!`);
          setLoading(false);
        }
      }, 400);

    } catch (err: any) {
      setLogs((prev) => [...prev, `[CRITICAL ERROR] ${err.message || err}`]);
      try {
        await leadService.addSearchHistory(user.uid, {
          type: "LinkedIn",
          query: `${role} in ${location}`,
          resultsCount: 0,
          status: "Failed"
        });
      } catch (histErr) {}
      setLoading(false);
    }
  };

  // Run Website Scraper
  const handleWebsiteScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setSuccessMsg(null);
    setLogs(["[SYSTEM] Launching website contact scraper route..."]);

    try {
      const response = await fetch("/api/scrape/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          depth: crawlDepth
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to parse target domain");
      }

      // Stream logs slowly for visual realism
      let logIndex = 0;
      const interval = setInterval(async () => {
        if (logIndex < data.logs.length) {
          setLogs((prev) => [...prev, data.logs[logIndex]]);
          logIndex++;
        } else {
          clearInterval(interval);

          if (data.emails.length === 0 && data.phones.length === 0) {
            setLogs((prev) => [...prev, "[DATABASE] Skipping database write: No valid emails or contact records found."]);
            try {
              await leadService.addSearchHistory(user.uid, {
                type: "Website",
                query: targetUrl,
                resultsCount: 0,
                status: "Success"
              });
            } catch (histErr) {}
            setSuccessMsg("Scraper finished: No contact credentials detected on the crawled subpages.");
            setLoading(false);
            return;
          }

          setLogs((prev) => [...prev, "[DATABASE] Compiling and saving lead profile to Firestore database..."]);
          
          const lead = {
            name: `${data.title || "Contact Lead"}`,
            jobTitle: "Corporate Office Contacts",
            company: data.domain,
            email: data.emails[0] || "",
            phone: data.phones[0] || "",
            location: "United States",
            skills: ["Website Crawled", "Company Contacts"],
            socialLinks: data.socialLinks || {},
            industry: "Web Domain Intelligence",
            companySize: "Varies",
            source: `Web scraping: ${data.domain}`
          };

          await leadService.addLead(user.uid, lead);
          
          try {
            await leadService.addSearchHistory(user.uid, {
              type: "Website",
              query: targetUrl,
              resultsCount: 1,
              status: "Success"
            });
          } catch (histErr) {}
          
          setLogs((prev) => [...prev, `[DATABASE] Successfully saved lead profile for ${data.domain}.`]);
          setLogs((prev) => [...prev, "[SUCCESS] Scraping job finished successfully."]);
          setSuccessMsg(`Successfully scraped and saved website contacts for ${data.domain}!`);
          setLoading(false);
        }
      }, 350);

    } catch (err: any) {
      setLogs((prev) => [...prev, `[CRITICAL ERROR] ${err.message || err}`]);
      try {
        await leadService.addSearchHistory(user.uid, {
          type: "Website",
          query: targetUrl,
          resultsCount: 0,
          status: "Failed"
        });
      } catch (histErr) {}
      setLoading(false);
    }
  };

  // Helper to color log lines
  const getLineClass = (line: string) => {
    if (!line || typeof line !== "string") return "";
    if (line.includes("[SUCCESS]")) return "terminal-line-success";
    if (line.includes("[CRITICAL ERROR]") || line.includes("[ERROR]")) return "terminal-line-error";
    if (line.includes("[DATABASE]") || line.includes("[METADATA]")) return "terminal-line-info";
    if (line.includes("[PROXY]") || line.includes("[CRAWLSTART]")) return "terminal-line-warning";
    return "";
  };

  return (
    <div>
      {/* Page Header */}
      <header style={{ marginBottom: "2.25rem" }}>
        <h1 style={{ fontSize: "2.25rem", fontWeight: "800", fontFamily: "var(--font-display)", color: "#f8fafc", marginBottom: "0.5rem" }}>
          Scraper <span className="text-gradient">Control Console</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Configure, trigger, and monitor real-time Lead Scraping operations.
        </p>
      </header>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === "linkedin" ? "active" : ""}`}
          onClick={() => { setActiveTab("linkedin"); setSuccessMsg(null); }}
          disabled={loading}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <LinkedinIcon size={16} /> LinkedIn Scraper
          </div>
        </button>
        <button 
          className={`tab-btn ${activeTab === "website" ? "active" : ""}`}
          onClick={() => { setActiveTab("website"); setSuccessMsg(null); }}
          disabled={loading}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Globe size={16} /> Website Crawler
          </div>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "1.75rem", alignItems: "start", marginBottom: "2.5rem" }}>
        
        {/* Scraper Config Panel */}
        <section className="glass-panel">
          <h3 style={{ fontSize: "1.25rem", color: "#f8fafc", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Cpu size={18} style={{ color: "var(--primary)" }} /> Configuration
          </h3>

          {activeTab === "linkedin" ? (
            <form onSubmit={handleLinkedinScrape}>
              <div className="form-group">
                <label className="form-label">Role / Designation</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Location</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={location} 
                  onChange={(e) => setLocation(e.target.value)} 
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Industry</label>
                <select 
                  className="form-input form-select"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  disabled={loading}
                >
                  <option value="Technology">Technology & SaaS</option>
                  <option value="Healthcare">Healthcare & Bio</option>
                  <option value="Finance">Finance & Banking</option>
                  <option value="Marketing">Marketing & Advertising</option>
                  <option value="Sales">Sales & Business Development</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Company Size</label>
                <select 
                  className="form-input form-select"
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  disabled={loading}
                >
                  <option value="1-10 employees">1-10 employees (Seed)</option>
                  <option value="11-50 employees">11-50 employees (Growth)</option>
                  <option value="51-200 employees">51-200 employees (Mid-market)</option>
                  <option value="201-500 employees">201-500 employees (Enterprise)</option>
                  <option value="500+ employees">500+ employees (Scale)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Skills Keywords (comma separated)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={keywords} 
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="AI, React, Salesforce"
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "1.75rem" }}>
                <label className="form-label">Profile Extract Count</label>
                <select 
                  className="form-input form-select"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  disabled={loading}
                >
                  <option value="3">3 Profiles</option>
                  <option value="5">5 Profiles</option>
                  <option value="10">10 Profiles</option>
                  <option value="15">15 Profiles</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
                style={{ width: "100%" }}
              >
                {loading ? (
                  <>
                    <svg className="spinner" viewBox="0 0 50 50">
                      <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                    Executing Scraping...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" /> Deploy LinkedIn Scraper
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleWebsiteScrape}>
              <div className="form-group">
                <label className="form-label">Target Domain URL</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={targetUrl} 
                  onChange={(e) => setTargetUrl(e.target.value)} 
                  placeholder="domain.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "1.75rem" }}>
                <label className="form-label">Link Crawl Depth</label>
                <select 
                  className="form-input form-select"
                  value={crawlDepth}
                  onChange={(e) => setCrawlDepth(Number(e.target.value))}
                  disabled={loading}
                >
                  <option value="0">Homepage only (Fastest)</option>
                  <option value="1">Homepage + Primary Contact/About subpages (Recommended)</option>
                  <option value="2">Homepage + Subpages + Nested sublinks (Thorough)</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
                style={{ width: "100%" }}
              >
                {loading ? (
                  <>
                    <svg className="spinner" viewBox="0 0 50 50">
                      <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                    Crawling Website...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" /> Deploy Website Scraper
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        {/* Live Terminal Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          {successMsg && (
            <div className="glass-panel" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              padding: "1rem 1.25rem",
              borderRadius: "14px"
            }}>
              <div>
                <div style={{ fontWeight: "600", color: "#6ee7b7", marginBottom: "0.25rem" }}>Job Completed Successfully</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{successMsg}</div>
              </div>
              <a 
                href="/dashboard/leads" 
                className="btn btn-secondary" 
                style={{ fontSize: "0.8rem", padding: "0.5rem 1rem", background: "rgba(16, 185, 129, 0.15)", border: "none", color: "#6ee7b7" }}
              >
                View Leads <ArrowRight size={14} />
              </a>
            </div>
          )}

          <div className="terminal-container">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="terminal-dot dot-red"></span>
                <span className="terminal-dot dot-yellow"></span>
                <span className="terminal-dot dot-green"></span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <TerminalIcon size={12} /> scraper-terminal-log.sh
              </div>
            </div>

            <div className="terminal-body">
              {logs.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontStyle: "italic", alignSelf: "center", justifySelf: "center", margin: "auto", textAlign: "center" }}>
                  <TerminalIcon size={32} style={{ marginBottom: "0.75rem", opacity: "0.3" }} />
                  <div>Console Idle.</div>
                  <div style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Configure and run a scraper to start.</div>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`terminal-line ${getLineClass(log)}`}>
                    {log}
                  </div>
                ))
              )}
              <div ref={terminalEndRef}></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
