import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

// Helper to clean and validate emails
const cleanEmail = (email: string): string => {
  return email.trim().replace(/[,\s]+$/, "").toLowerCase();
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,20}/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

export async function POST(req: Request) {
  try {
    const { url, depth = 1 } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Clean URL
    let startUrl = url.trim();
    if (!/^https?:\/\//i.test(startUrl)) {
      startUrl = `https://${startUrl}`;
    }

    const parsedUrl = new URL(startUrl);
    const domain = parsedUrl.hostname.replace("www.", "");

    const visited = new Set<string>();
    const toVisit: { url: string; currentDepth: number }[] = [{ url: startUrl, currentDepth: 0 }];

    const emails = new Set<string>();
    const phones = new Set<string>();
    const socialLinks: { [key: string]: string } = {};
    const logs: string[] = [];
    let pageTitle = "";
    let pageDescription = "";

    logs.push(`[CRAWL START] Starting crawl for ${startUrl} (Max depth: ${depth})`);

    // Basic User-Agent to avoid blocks
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    };

    while (toVisit.length > 0) {
      const current = toVisit.shift();
      if (!current) continue;

      const { url: currentUrl, currentDepth } = current;

      if (visited.has(currentUrl) || currentDepth > depth) continue;
      visited.add(currentUrl);

      logs.push(`[FETCHING] Depth ${currentDepth} - ${currentUrl}`);

      try {
        const response = await axios.get(currentUrl, { 
          headers, 
          timeout: 7000, 
          validateStatus: (status) => status === 200 
        });
        
        const html = response.data;
        if (typeof html !== "string") continue;

        const $ = cheerio.load(html);

        // Fetch meta details on first page
        if (currentDepth === 0) {
          pageTitle = $("title").text().trim();
          pageDescription = $('meta[name="description"]').attr("content")?.trim() || "";
          logs.push(`[METADATA] Title: "${pageTitle}"`);
        }

        // Extract emails from text
        const bodyText = $("body").text();
        const foundEmails = bodyText.match(EMAIL_REGEX);
        if (foundEmails) {
          foundEmails.forEach((email) => {
            const cleaned = cleanEmail(email);
            // Basic exclusion of image types commonly matched in wrong regex
            if (!/\.(png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2)$/i.test(cleaned)) {
              emails.add(cleaned);
            }
          });
        }

        // Extract phone numbers
        const foundPhones = bodyText.match(PHONE_REGEX);
        if (foundPhones) {
          foundPhones.forEach((phone) => {
            const cleaned = phone.trim();
            if (cleaned.length >= 10 && cleaned.length <= 20) {
              phones.add(cleaned);
            }
          });
        }

        // Crawl page links & socials
        $("a[href]").each((_, elem) => {
          const href = $(elem).attr("href")?.trim();
          if (!href) return;

          // Check if link is social
          if (/linkedin\.com\/(company|in)\//i.test(href)) {
            socialLinks.linkedin = href;
          } else if (/twitter\.com|x\.com/i.test(href)) {
            socialLinks.twitter = href;
          } else if (/facebook\.com/i.test(href)) {
            socialLinks.facebook = href;
          } else if (/instagram\.com/i.test(href)) {
            socialLinks.instagram = href;
          }

          // Recursive crawling of internal links
          if (currentDepth < depth) {
            try {
              let absoluteUrl = "";
              if (href.startsWith("/")) {
                absoluteUrl = `${parsedUrl.protocol}//${parsedUrl.host}${href}`;
              } else if (href.startsWith("http")) {
                const parsedHref = new URL(href);
                if (parsedHref.hostname.replace("www.", "") === domain) {
                  absoluteUrl = href;
                }
              }

              if (absoluteUrl) {
                // Focus crawl on high-yield contact subpages
                const isContactOrAbout = /contact|about|team|privacy|careers|help/i.test(absoluteUrl);
                if (isContactOrAbout && !visited.has(absoluteUrl) && !toVisit.some(item => item.url === absoluteUrl)) {
                  toVisit.push({ url: absoluteUrl, currentDepth: currentDepth + 1 });
                  logs.push(`[QUEUED] Internal contact page discovered: ${absoluteUrl}`);
                }
              }
            } catch (err) {
              // Ignore malformed URL inside tags
            }
          }
        });

      } catch (err: any) {
        logs.push(`[ERROR] Failed fetching ${currentUrl}: ${err.message || err}`);
      }
    }

    logs.push(`[CRAWL COMPLETED] Finished traversing website. Found ${emails.size} emails and ${phones.size} phone numbers.`);

    return NextResponse.json({
      success: true,
      title: pageTitle || domain,
      description: pageDescription,
      emails: Array.from(emails),
      phones: Array.from(phones),
      socialLinks,
      logs,
      domain
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to parse website" }, { status: 500 });
  }
}
