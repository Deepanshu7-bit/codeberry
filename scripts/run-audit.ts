import { PrismaClient } from "@prisma/client";
import { auditBusinessWebsite } from "../src/lib/auditor";
import { calculateLeadScore } from "../src/lib/scorer";
import { generatePitchDraft } from "../src/lib/pitch-generator";

const prisma = new PrismaClient();

async function runAudits() {
  console.log("Starting real network audit for all saved leads...");
  const leads = await prisma.lead.findMany({
    include: { audit: true },
  });

  console.log(`Found ${leads.length} leads in database.`);

  for (const lead of leads) {
    console.log(`Auditing [${lead.category}] ${lead.name} (${lead.websiteUrl || "NO WEBSITE"})...`);
    const auditResult = await auditBusinessWebsite(lead.websiteUrl, lead.name, lead.category);

    // Update or create Audit
    await prisma.audit.upsert({
      where: { leadId: lead.id },
      create: {
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

    // Recompute score
    const scoreOutput = calculateLeadScore(lead, auditResult);

    // Re-generate pitch
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

    // Update first pitch draft if exists, or create
    const firstPitch = await prisma.pitchDraft.findFirst({
      where: { leadId: lead.id },
    });

    if (firstPitch) {
      await prisma.pitchDraft.update({
        where: { id: firstPitch.id },
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
    } else {
      await prisma.pitchDraft.create({
        data: {
          leadId: lead.id,
          recommendedService: pitch.recommendedService,
          suggestedOffer: pitch.suggestedOffer,
          pricePoint: pitch.pricePoint,
          turnaroundDays: pitch.turnaroundDays,
          openingMessage: pitch.openingMessage,
          followUpMessage: pitch.followUpMessage,
          likelyObjections: JSON.stringify(pitch.likelyObjections),
          status: "DRAFT",
        },
      });
    }
  }

  console.log("Real network audits successfully updated for all leads!");
}

runAudits()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
