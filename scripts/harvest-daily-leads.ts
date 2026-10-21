import { PrismaClient } from "@prisma/client";
import { discoverViaOpenStreetMap, OpenStreetMapCategory } from "../src/lib/discovery";
import { auditBusinessWebsite } from "../src/lib/auditor";
import { calculateLeadScore } from "../src/lib/scorer";
import { generatePitchDraft } from "../src/lib/pitch-generator";

const prisma = new PrismaClient();

async function main() {
  const city = process.argv[2] || "Zirakpur";
  const category = (process.argv[3] || "all") as OpenStreetMapCategory;
  const count = parseInt(process.argv[4] || "35", 10);

  console.log(`\n======================================================`);
  console.log(`⚡ CodeBerry Daily Lead Harvester (100% Free Engine)`);
  console.log(`Target City: ${city}`);
  console.log(`Target Category: ${category}`);
  console.log(`Batch Target: ${count} businesses`);
  console.log(`======================================================\n`);

  console.log(`🔍 Fetching real business listings from OpenStreetMap...`);
  const businesses = await discoverViaOpenStreetMap(city, category, count);
  console.log(`Found ${businesses.length} candidate businesses.\n`);

  let addedCount = 0;
  let auditedCount = 0;

  for (const b of businesses) {
    const existing = await prisma.lead.findFirst({
      where: { name: b.name, city: b.city },
    });

    if (existing) {
      console.log(`⏩ [Skipped Existing] ${b.name} (${b.city})`);
      continue;
    }

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
    addedCount++;

    console.log(`✨ Added: ${lead.name} [${lead.category}] - ${lead.city}`);

    // Audit website
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

    auditedCount++;
    console.log(`   Audited & Pitch Generated (Score: ${scoreOutput.totalScore}/100)`);
  }

  console.log(`\n======================================================`);
  console.log(`✅ Daily Harvest Finished!`);
  console.log(`- New Leads Stored: ${addedCount}`);
  console.log(`- Pitches Ready in Queue: ${auditedCount}`);
  console.log(`\nYou can now run 'npm run daily-outreach' or launch the Daily Sprint in the dashboard!`);
  console.log(`======================================================\n`);
}

main()
  .catch((e) => {
    console.error("Error harvesting leads:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
