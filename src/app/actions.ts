"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auditBusinessWebsite } from "@/lib/auditor";
import { calculateLeadScore } from "@/lib/scorer";
import { generatePitchDraft } from "@/lib/pitch-generator";
import {
  discoverViaGooglePlaces,
  discoverViaOpenStreetMap,
  OpenStreetMapCategory,
} from "@/lib/discovery";

export async function getDashboardData() {
  const leads = await prisma.lead.findMany({
    include: {
      audit: true,
      pitches: true,
      interactions: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [
      { leadScore: "desc" },
      { createdAt: "desc" },
    ],
  });

  const totalLeads = leads.length;
  const highPriority = leads.filter((l) => (l.leadScore || 0) >= 80).length;
  const outreachReady = leads.filter((l) => l.status === "OUTREACH_READY").length;
  const contacted = leads.filter((l) => l.status === "CONTACTED").length;
  const interested = leads.filter((l) => l.status === "REPLIED_INTERESTED").length;
  const meetings = leads.filter((l) => l.status === "MEETING_SCHEDULED").length;
  const won = leads.filter((l) => l.status === "WON").length;

  return {
    leads,
    stats: {
      totalLeads,
      highPriority,
      outreachReady,
      contacted,
      interested,
      meetings,
      won,
    },
  };
}

export async function updateLeadStatus(leadId: string, status: string, notes?: string) {
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      status,
      ...(notes ? { notes } : {}),
    },
  });

  await prisma.interaction.create({
    data: {
      leadId,
      type: "STATUS_CHANGE",
      content: `Status updated to ${status}${notes ? `. Notes: ${notes}` : ""}`,
    },
  });

  revalidatePath("/");
  return lead;
}

export async function markWhatsAppOpened(leadId: string, pitchId: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "CONTACTED" },
  });

  await prisma.pitchDraft.update({
    where: { id: pitchId },
    data: {
      status: "OPENED_IN_WHATSAPP",
      dispatchedAt: new Date(),
    },
  });

  await prisma.interaction.create({
    data: {
      leadId,
      type: "WHATSAPP_OPENED",
      content: "Founder dispatched personalized pitch via WhatsApp Web / App.",
    },
  });

  revalidatePath("/");
}

export async function addInteraction(leadId: string, type: string, content: string) {
  const interaction = await prisma.interaction.create({
    data: {
      leadId,
      type,
      content,
    },
  });

  revalidatePath("/");
  return interaction;
}

export async function quickAddLead(data: {
  name: string;
  category: string;
  niche: string;
  city: string;
  area?: string;
  phone?: string;
  websiteUrl?: string;
}) {
  const digits = data.phone ? data.phone.replace(/\D/g, "") : "";
  let whatsappPhone = "";
  if (digits.length === 10) whatsappPhone = `91${digits}`;
  else if (digits.length === 11 && digits.startsWith("0")) whatsappPhone = `91${digits.slice(1)}`;
  else if (digits.length >= 12 && digits.startsWith("91")) whatsappPhone = digits;

  // Check duplicate
  const existing = await prisma.lead.findFirst({
    where: { name: data.name, city: data.city },
  });
  if (existing) {
    throw new Error(`Business "${data.name}" in ${data.city} already exists in your database.`);
  }

  const lead = await prisma.lead.create({
    data: {
      name: data.name,
      category: data.category,
      niche: data.niche,
      address: data.area ? `${data.area}, ${data.city}` : data.city,
      city: data.city,
      area: data.area,
      phone: data.phone,
      whatsappPhone: whatsappPhone || undefined,
      websiteUrl: data.websiteUrl || undefined,
      source: "Manual Direct Entry",
      status: "DISCOVERED",
    },
  });

  // Run audit
  const auditResult = await auditBusinessWebsite(lead.websiteUrl, lead.name, lead.category);

  await prisma.audit.create({
    data: {
      leadId: lead.id,
      hasWebsite: auditResult.hasWebsite,
      isAccessible: auditResult.isAccessible,
      statusCode: auditResult.statusCode,
      loadTimeMs: auditResult.loadTimeMs,
      isMobileResponsive: auditResult.isMobileResponsive,
      hasSsl: auditResult.hasSsl,
      hasMetaTags: auditResult.hasMetaTags,
      title: auditResult.title,
      metaDescription: auditResult.metaDescription,
      hasOnlineOrdering: auditResult.hasOnlineOrdering,
      hasBookingSystem: auditResult.hasBookingSystem,
      hasWhatsAppWidget: auditResult.hasWhatsAppWidget,
      hasSocialLinks: auditResult.hasSocialLinks,
      socialLinks: JSON.stringify(auditResult.socialLinks),
      identifiedIssues: JSON.stringify(auditResult.identifiedIssues),
      opportunities: JSON.stringify(auditResult.opportunities),
      auditSummary: auditResult.auditSummary,
    },
  });

  const scoreOutput = calculateLeadScore(lead, auditResult);
  const pitch = await generatePitchDraft(lead, auditResult);

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      leadScore: scoreOutput.totalScore,
      scoreReason: scoreOutput.scoreReason,
      scoreBreakdown: JSON.stringify(scoreOutput.breakdown),
      status: "OUTREACH_READY",
    },
  });

  await prisma.pitchDraft.create({
    data: {
      leadId: lead.id,
      recommendedService: pitch.recommendedService,
      suggestedOffer: pitch.suggestedOffer,
      pricePoint: pitch.pricePoint,
      turnaroundDays: pitch.turnaroundDays,
      openingMessage: pitch.openingMessage,
      openingMessageHinglish: pitch.openingMessageHinglish,
      followUpMessage: pitch.followUpMessage,
      followUpMessageHinglish: pitch.followUpMessageHinglish,
      demoUrl: pitch.demoUrl,
      likelyObjections: JSON.stringify(pitch.likelyObjections),
      status: "DRAFT",
    },
  });

  revalidatePath("/");
  return lead;
}

/**
 * 100% Free Daily Lead Discovery & Outreach Auto-Preparation
 * Discovers 30-40 fresh businesses from OpenStreetMap, audits websites,
 * generates Hinglish & English pitches, and loads them into today's queue!
 */
export async function discoverFreeLeadsAction(
  city: string,
  category: OpenStreetMapCategory = "all",
  targetCount: number = 35
) {
  const businesses = await discoverViaOpenStreetMap(city, category, targetCount);
  let newCount = 0;

  for (const b of businesses) {
    const existing = await prisma.lead.findFirst({
      where: { name: b.name, city: b.city },
    });

    if (!existing) {
      const lead = await prisma.lead.create({
        data: {
          name: b.name,
          category: b.category,
          niche: b.niche,
          address: b.address,
          city: b.city,
          area: b.area,
          phone: b.phone,
          whatsappPhone: b.whatsappPhone,
          websiteUrl: b.websiteUrl,
          googleMapsUrl: b.googleMapsUrl,
          rating: b.rating,
          reviewCount: b.reviewCount,
          source: b.source,
          status: "DISCOVERED",
        },
      });

      const auditResult = await auditBusinessWebsite(lead.websiteUrl, lead.name, lead.category);

      await prisma.audit.create({
        data: {
          leadId: lead.id,
          hasWebsite: auditResult.hasWebsite,
          isAccessible: auditResult.isAccessible,
          statusCode: auditResult.statusCode,
          loadTimeMs: auditResult.loadTimeMs,
          isMobileResponsive: auditResult.isMobileResponsive,
          hasSsl: auditResult.hasSsl,
          hasMetaTags: auditResult.hasMetaTags,
          title: auditResult.title,
          metaDescription: auditResult.metaDescription,
          hasOnlineOrdering: auditResult.hasOnlineOrdering,
          hasBookingSystem: auditResult.hasBookingSystem,
          hasWhatsAppWidget: auditResult.hasWhatsAppWidget,
          hasSocialLinks: auditResult.hasSocialLinks,
          socialLinks: JSON.stringify(auditResult.socialLinks),
          identifiedIssues: JSON.stringify(auditResult.identifiedIssues),
          opportunities: JSON.stringify(auditResult.opportunities),
          auditSummary: auditResult.auditSummary,
        },
      });

      const scoreOutput = calculateLeadScore(lead, auditResult);
      const pitch = await generatePitchDraft(lead, auditResult);

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          leadScore: scoreOutput.totalScore,
          scoreReason: scoreOutput.scoreReason,
          scoreBreakdown: JSON.stringify(scoreOutput.breakdown),
          status: "OUTREACH_READY",
        },
      });

      await prisma.pitchDraft.create({
        data: {
          leadId: lead.id,
          recommendedService: pitch.recommendedService,
          suggestedOffer: pitch.suggestedOffer,
          pricePoint: pitch.pricePoint,
          turnaroundDays: pitch.turnaroundDays,
          openingMessage: pitch.openingMessage,
          openingMessageHinglish: pitch.openingMessageHinglish,
          followUpMessage: pitch.followUpMessage,
          followUpMessageHinglish: pitch.followUpMessageHinglish,
          demoUrl: pitch.demoUrl,
          likelyObjections: JSON.stringify(pitch.likelyObjections),
          status: "DRAFT",
        },
      });

      newCount++;
    }
  }

  revalidatePath("/");
  return {
    totalFound: businesses.length,
    newImported: newCount,
  };
}

export async function discoverGooglePlacesAction(
  searchQuery: string,
  city: string,
  niche: string,
  customApiKey?: string
) {
  const apiKey = customApiKey?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Google Places API Key is required. Please provide it in the input or save GOOGLE_API_KEY in your .env file."
    );
  }

  const places = await discoverViaGooglePlaces(searchQuery, city, niche, apiKey);

  let newCount = 0;
  for (const p of places) {
    const existing = await prisma.lead.findFirst({
      where: { name: p.name, city: p.city },
    });

    if (!existing) {
      const lead = await prisma.lead.create({
        data: {
          name: p.name,
          category: p.category,
          niche: p.niche,
          address: p.address,
          city: p.city,
          area: p.area,
          phone: p.phone,
          whatsappPhone: p.whatsappPhone,
          websiteUrl: p.websiteUrl,
          googleMapsUrl: p.googleMapsUrl,
          rating: p.rating,
          reviewCount: p.reviewCount,
          source: p.source,
          status: "DISCOVERED",
        },
      });

      const auditResult = await auditBusinessWebsite(lead.websiteUrl, lead.name, lead.category);

      await prisma.audit.create({
        data: {
          leadId: lead.id,
          hasWebsite: auditResult.hasWebsite,
          isAccessible: auditResult.isAccessible,
          statusCode: auditResult.statusCode,
          loadTimeMs: auditResult.loadTimeMs,
          isMobileResponsive: auditResult.isMobileResponsive,
          hasSsl: auditResult.hasSsl,
          hasMetaTags: auditResult.hasMetaTags,
          title: auditResult.title,
          metaDescription: auditResult.metaDescription,
          hasOnlineOrdering: auditResult.hasOnlineOrdering,
          hasBookingSystem: auditResult.hasBookingSystem,
          hasWhatsAppWidget: auditResult.hasWhatsAppWidget,
          hasSocialLinks: auditResult.hasSocialLinks,
          socialLinks: JSON.stringify(auditResult.socialLinks),
          identifiedIssues: JSON.stringify(auditResult.identifiedIssues),
          opportunities: JSON.stringify(auditResult.opportunities),
          auditSummary: auditResult.auditSummary,
        },
      });

      const scoreOutput = calculateLeadScore(lead, auditResult);
      const pitch = await generatePitchDraft(lead, auditResult);

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          leadScore: scoreOutput.totalScore,
          scoreReason: scoreOutput.scoreReason,
          scoreBreakdown: JSON.stringify(scoreOutput.breakdown),
          status: "OUTREACH_READY",
        },
      });

      await prisma.pitchDraft.create({
        data: {
          leadId: lead.id,
          recommendedService: pitch.recommendedService,
          suggestedOffer: pitch.suggestedOffer,
          pricePoint: pitch.pricePoint,
          turnaroundDays: pitch.turnaroundDays,
          openingMessage: pitch.openingMessage,
          openingMessageHinglish: pitch.openingMessageHinglish,
          followUpMessage: pitch.followUpMessage,
          followUpMessageHinglish: pitch.followUpMessageHinglish,
          demoUrl: pitch.demoUrl,
          likelyObjections: JSON.stringify(pitch.likelyObjections),
          status: "DRAFT",
        },
      });

      newCount++;
    }
  }

  revalidatePath("/");
  return {
    totalFound: places.length,
    newImported: newCount,
  };
}

export async function reAuditLead(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) throw new Error("Lead not found");

  const auditResult = await auditBusinessWebsite(lead.websiteUrl, lead.name, lead.category);

  await prisma.audit.upsert({
    where: { leadId },
    create: {
      leadId,
      hasWebsite: auditResult.hasWebsite,
      isAccessible: auditResult.isAccessible,
      statusCode: auditResult.statusCode,
      loadTimeMs: auditResult.loadTimeMs,
      isMobileResponsive: auditResult.isMobileResponsive,
      hasSsl: auditResult.hasSsl,
      hasMetaTags: auditResult.hasMetaTags,
      title: auditResult.title,
      metaDescription: auditResult.metaDescription,
      hasOnlineOrdering: auditResult.hasOnlineOrdering,
      hasBookingSystem: auditResult.hasBookingSystem,
      hasWhatsAppWidget: auditResult.hasWhatsAppWidget,
      hasSocialLinks: auditResult.hasSocialLinks,
      socialLinks: JSON.stringify(auditResult.socialLinks),
      identifiedIssues: JSON.stringify(auditResult.identifiedIssues),
      opportunities: JSON.stringify(auditResult.opportunities),
      auditSummary: auditResult.auditSummary,
    },
    update: {
      hasWebsite: auditResult.hasWebsite,
      isAccessible: auditResult.isAccessible,
      statusCode: auditResult.statusCode,
      loadTimeMs: auditResult.loadTimeMs,
      isMobileResponsive: auditResult.isMobileResponsive,
      hasSsl: auditResult.hasSsl,
      hasMetaTags: auditResult.hasMetaTags,
      title: auditResult.title,
      metaDescription: auditResult.metaDescription,
      hasOnlineOrdering: auditResult.hasOnlineOrdering,
      hasBookingSystem: auditResult.hasBookingSystem,
      hasWhatsAppWidget: auditResult.hasWhatsAppWidget,
      hasSocialLinks: auditResult.hasSocialLinks,
      socialLinks: JSON.stringify(auditResult.socialLinks),
      identifiedIssues: JSON.stringify(auditResult.identifiedIssues),
      opportunities: JSON.stringify(auditResult.opportunities),
      auditSummary: auditResult.auditSummary,
    },
  });

  const scoreOutput = calculateLeadScore(lead, auditResult);
  const pitch = await generatePitchDraft(lead, auditResult);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadScore: scoreOutput.totalScore,
      scoreReason: scoreOutput.scoreReason,
      scoreBreakdown: JSON.stringify(scoreOutput.breakdown),
    },
  });

  const existingPitch = await prisma.pitchDraft.findFirst({
    where: { leadId },
  });

  if (existingPitch) {
    await prisma.pitchDraft.update({
      where: { id: existingPitch.id },
      data: {
        recommendedService: pitch.recommendedService,
        suggestedOffer: pitch.suggestedOffer,
        pricePoint: pitch.pricePoint,
        turnaroundDays: pitch.turnaroundDays,
        openingMessage: pitch.openingMessage,
        openingMessageHinglish: pitch.openingMessageHinglish,
        followUpMessage: pitch.followUpMessage,
        followUpMessageHinglish: pitch.followUpMessageHinglish,
        demoUrl: pitch.demoUrl,
        likelyObjections: JSON.stringify(pitch.likelyObjections),
      },
    });
  }

  revalidatePath("/");
}
