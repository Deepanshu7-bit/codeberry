import { AuditResult } from "./auditor";

export interface ScoreOutput {
  totalScore: number; // 0-100
  scoreReason: string;
  breakdown: {
    needScore: number;        // Max 40
    activityScore: number;    // Max 30
    serviceMatchScore: number;// Max 20
    contactabilityScore: number; // Max 10
  };
}

export function calculateLeadScore(
  lead: {
    name: string;
    category: string;
    rating?: number | null;
    reviewCount?: number | null;
    phone?: string | null;
    whatsappPhone?: string | null;
  },
  audit: AuditResult
): ScoreOutput {
  let needScore = 0;
  let activityScore = 0;
  let serviceMatchScore = 0;
  let contactabilityScore = 0;

  // 1. Need & Opportunity (Max 40 points)
  if (!audit.hasWebsite) {
    // Huge need: no site at all
    needScore += 35;
  } else if (!audit.isAccessible) {
    // Broken site: huge urgency
    needScore += 38;
  } else {
    // Has a site, check deficiencies
    if (!audit.hasWhatsAppWidget) needScore += 12;
    if (!audit.isMobileResponsive) needScore += 10;
    if (audit.loadTimeMs && audit.loadTimeMs > 2000) needScore += 8;
    if (!audit.hasMetaTags) needScore += 5;
    if (!audit.hasOnlineOrdering && (lead.category.includes("Café") || lead.category.includes("Restaurant"))) {
      needScore += 8;
    }
    if (!audit.hasBookingSystem && (lead.category.includes("Salon") || lead.category.includes("Spa"))) {
      needScore += 8;
    }
  }
  needScore = Math.min(40, needScore);

  // 2. Business Activity & Legitimacy (Max 30 points)
  const reviews = lead.reviewCount || 0;
  const rating = lead.rating || 0;

  if (reviews >= 100) activityScore += 18;
  else if (reviews >= 30) activityScore += 14;
  else if (reviews >= 10) activityScore += 8;
  else activityScore += 4;

  if (rating >= 4.5) activityScore += 12;
  else if (rating >= 4.0) activityScore += 10;
  else if (rating >= 3.5) activityScore += 6;
  else activityScore += 2;

  activityScore = Math.min(30, activityScore);

  // 3. Service Match Fit (Max 20 points)
  const cat = lead.category.toLowerCase();
  if (cat.includes("restaurant") || cat.includes("café") || cat.includes("bakery")) {
    serviceMatchScore = 20; // Prime target: WhatsApp menu & ordering
  } else if (cat.includes("salon") || cat.includes("spa") || cat.includes("beauty")) {
    serviceMatchScore = 18; // Secondary comparison target: appointment booking
  } else {
    serviceMatchScore = 12;
  }

  // 4. Contactability (Max 10 points)
  if (lead.whatsappPhone || lead.phone) {
    contactabilityScore += 10;
  }

  const totalScore = needScore + activityScore + serviceMatchScore + contactabilityScore;

  let rationale = "";
  if (totalScore >= 80) {
    rationale = `High-Priority Prospect (${totalScore}/100): High customer activity (${reviews} reviews, ${rating}★) with clear digital deficiencies (${audit.identifiedIssues[0] || "no direct WhatsApp conversion"}). Ready for immediate outreach.`;
  } else if (totalScore >= 65) {
    rationale = `Good Fit (${totalScore}/100): Solid local presence with actionable improvement opportunities.`;
  } else {
    rationale = `Moderate / Exploratory (${totalScore}/100): Valid lead, but either has an existing system or lower verified review volume.`;
  }

  return {
    totalScore,
    scoreReason: rationale,
    breakdown: {
      needScore,
      activityScore,
      serviceMatchScore,
      contactabilityScore,
    },
  };
}
