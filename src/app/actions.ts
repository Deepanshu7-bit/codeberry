"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auditBusinessWebsite } from "@/lib/auditor";
import { calculateLeadScore } from "@/lib/scorer";
import { generatePitchDraft } from "@/lib/pitch-generator";

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
      content: "Founder opened personalized WhatsApp draft in WhatsApp Web / App.",
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
        followUpMessage: pitch.followUpMessage,
        likelyObjections: JSON.stringify(pitch.likelyObjections),
      },
    });
  }

  revalidatePath("/");
}
