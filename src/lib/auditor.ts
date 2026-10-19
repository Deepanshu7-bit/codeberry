import * as cheerio from "cheerio";

export interface AuditResult {
  hasWebsite: boolean;
  isAccessible: boolean;
  statusCode?: number;
  loadTimeMs?: number;
  isMobileResponsive: boolean;
  hasSsl: boolean;
  hasMetaTags: boolean;
  title?: string;
  metaDescription?: string;
  hasOnlineOrdering: boolean;
  hasBookingSystem: boolean;
  hasWhatsAppWidget: boolean;
  hasSocialLinks: boolean;
  socialLinks: string[];
  identifiedIssues: string[];
  opportunities: string[];
  auditSummary: string;
}

export async function auditBusinessWebsite(
  urlOrNull: string | null | undefined,
  businessName: string,
  category: string
): Promise<AuditResult> {
  if (!urlOrNull || urlOrNull.trim() === "" || urlOrNull === "N/A") {
    const issues = [
      "No independent business website found",
      "Relies entirely on third-party aggregators or static maps listing",
      "No direct customer capture or retention channel",
    ];

    const opportunities = [
      category.toLowerCase().includes("salon") || category.toLowerCase().includes("spa")
        ? "Launch a high-converting 48-hour mobile booking page with direct WhatsApp slot booking"
        : "Deploy an interactive digital menu where diners can order directly via WhatsApp without paying 25-30% platform commissions",
      "Set up Google Business review booster link to rank in the top 3 on Google Maps locally",
    ];

    return {
      hasWebsite: false,
      isAccessible: false,
      isMobileResponsive: false,
      hasSsl: false,
      hasMetaTags: false,
      hasOnlineOrdering: false,
      hasBookingSystem: false,
      hasWhatsAppWidget: false,
      hasSocialLinks: false,
      socialLinks: [],
      identifiedIssues: issues,
      opportunities: opportunities,
      auditSummary: `${businessName} has no independent website. Customers discovering them online either rely on maps or third-party platforms with high commissions. Creating a fast, 1-click WhatsApp-enabled landing page will immediately convert local search traffic into direct customers.`,
    };
  }

  let normalizedUrl = urlOrNull.trim();
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  const startTime = Date.now();
  let statusCode = 0;
  let hasSsl = normalizedUrl.startsWith("https://");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(timeout);
    statusCode = response.status;
    const loadTimeMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        hasWebsite: true,
        isAccessible: false,
        statusCode,
        loadTimeMs,
        isMobileResponsive: false,
        hasSsl,
        hasMetaTags: false,
        hasOnlineOrdering: false,
        hasBookingSystem: false,
        hasWhatsAppWidget: false,
        hasSocialLinks: false,
        socialLinks: [],
        identifiedIssues: [
          `Website returned HTTP error status ${statusCode}`,
          "Potential customers visiting the site hit a broken or inaccessible page",
        ],
        opportunities: [
          "Restore page reliability with high-speed, modern static hosting",
          "Add direct WhatsApp conversion mechanism",
        ],
        auditSummary: `${businessName}'s website is currently inaccessible (HTTP ${statusCode}). Any traffic sent here is bouncing immediately.`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Meta analysis
    const title = $("title").first().text().trim() || undefined;
    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      undefined;
    const viewport = $('meta[name="viewport"]').attr("content");
    const isMobileResponsive = !!viewport && viewport.includes("width=device-width");
    const hasMetaTags = !!(title && metaDescription);

    // Conversion & integrations analysis
    const allLinks: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href) allLinks.push(href.toLowerCase());
    });

    const hasWhatsAppWidget = allLinks.some(
      (l) => l.includes("wa.me") || l.includes("whatsapp.com") || l.includes("api.whatsapp")
    );

    const hasOnlineOrdering = allLinks.some(
      (l) =>
        l.includes("zomato.com") ||
        l.includes("swiggy.com") ||
        l.includes("dotpe.in") ||
        l.includes("petpooja") ||
        l.includes("thrive") ||
        l.includes("order") ||
        l.includes("menu")
    );

    const hasBookingSystem = allLinks.some(
      (l) =>
        l.includes("booking") ||
        l.includes("appointment") ||
        l.includes("fresha.com") ||
        l.includes("calendly") ||
        l.includes("reserve")
    );

    const socialLinks: string[] = [];
    allLinks.forEach((l) => {
      if (l.includes("instagram.com") && !socialLinks.includes("Instagram")) socialLinks.push("Instagram");
      if (l.includes("facebook.com") && !socialLinks.includes("Facebook")) socialLinks.push("Facebook");
    });

    // Concrete issues detection
    const identifiedIssues: string[] = [];
    if (!isMobileResponsive) {
      identifiedIssues.push("Missing mobile viewport configuration (poor smartphone display)");
    }
    if (loadTimeMs > 2500) {
      identifiedIssues.push(`Slow page response time (${(loadTimeMs / 1000).toFixed(1)}s initial server response)`);
    }
    if (!hasWhatsAppWidget) {
      identifiedIssues.push("No direct 1-click WhatsApp contact or ordering action on the page");
    }
    if (!hasMetaTags) {
      identifiedIssues.push("Missing SEO meta description tag (hurts Google search rankings)");
    }
    if (!hasOnlineOrdering && (category.toLowerCase().includes("café") || category.toLowerCase().includes("restaurant"))) {
      identifiedIssues.push("No direct online ordering or interactive digital menu");
    }
    if (!hasBookingSystem && (category.toLowerCase().includes("salon") || category.toLowerCase().includes("spa"))) {
      identifiedIssues.push("No instant appointment booking or slot reservation system");
    }

    // Concrete opportunities
    const opportunities: string[] = [];
    if (!hasWhatsAppWidget) {
      opportunities.push("Add a floating WhatsApp instant inquiry/booking trigger to capture bounce traffic");
    }
    if (category.toLowerCase().includes("restaurant") || category.toLowerCase().includes("café")) {
      opportunities.push("Deploy a fast QR-based WhatsApp direct ordering menu to bypass aggregator fees");
    } else {
      opportunities.push("Implement a mobile slot booking funnel directly linked to WhatsApp");
    }
    opportunities.push("Improve mobile page speed under 1.2s to increase conversion rates from local ads/search");

    let summary = `${businessName} has an active website (${loadTimeMs}ms load time). `;
    if (identifiedIssues.length > 0) {
      summary += `Key areas for improvement: ${identifiedIssues.slice(0, 2).join(", ")}. `;
    } else {
      summary += `The site is structurally functional. `;
    }
    summary += `Primary growth opportunity: ${opportunities[0]}.`;

    return {
      hasWebsite: true,
      isAccessible: true,
      statusCode,
      loadTimeMs,
      isMobileResponsive,
      hasSsl,
      hasMetaTags,
      title: title?.slice(0, 100),
      metaDescription: metaDescription?.slice(0, 200),
      hasOnlineOrdering,
      hasBookingSystem,
      hasWhatsAppWidget,
      hasSocialLinks: socialLinks.length > 0,
      socialLinks,
      identifiedIssues,
      opportunities,
      auditSummary: summary,
    };
  } catch (error: any) {
    const isTimeout = error.name === "AbortError";
    return {
      hasWebsite: true,
      isAccessible: false,
      statusCode: 0,
      loadTimeMs: Date.now() - startTime,
      isMobileResponsive: false,
      hasSsl,
      hasMetaTags: false,
      hasOnlineOrdering: false,
      hasBookingSystem: false,
      hasWhatsAppWidget: false,
      hasSocialLinks: false,
      socialLinks: [],
      identifiedIssues: [
        isTimeout ? "Connection timed out after 8 seconds" : `Failed to connect: ${error.message}`,
        "Domain may be expired, misconfigured, or server down",
      ],
      opportunities: [
        "Rebuild on high-performance modern web stack with 99.9% uptime",
        "Capture local search traffic with a reliable mobile landing page",
      ],
      auditSummary: `Attempted to audit ${businessName}'s website (${normalizedUrl}), but connection failed (${isTimeout ? "Timeout" : error.message}).`,
    };
  }
}
