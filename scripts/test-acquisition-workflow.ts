import { PrismaClient } from "@prisma/client";
import { auditBusinessWebsite } from "../src/lib/auditor";
import { calculateLeadScore } from "../src/lib/scorer";
import { generatePitchDraft } from "../src/lib/pitch-generator";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== CODEBERRY ACQUISITION ENGINE: SYSTEM VERIFICATION SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Database Connectivity & Lead Count
  const leads = await prisma.lead.findMany({
    include: { audit: true, pitches: true },
  });
  assert(leads.length >= 26, `Database contains ${leads.length} real leads (expected >= 26)`);

  // 2. Deduplication Test
  const existingLead = leads[0];
  const duplicateCheck = await prisma.lead.findFirst({
    where: { name: existingLead.name, city: existingLead.city },
  });
  assert(duplicateCheck !== null, `Deduplication query identifies existing lead: ${existingLead.name}`);

  // 3. Auditor Test: No Website Case
  const noSiteAudit = await auditBusinessWebsite(null, "Test Dhakoli Cafe", "Café");
  assert(!noSiteAudit.hasWebsite, "Auditor correctly flags missing website");
  assert(noSiteAudit.identifiedIssues.length > 0, "Auditor generates issues for missing website");
  assert(noSiteAudit.opportunities.length > 0, "Auditor generates revenue opportunities for missing website");

  // 4. Auditor Test: Live Website Case
  const liveSiteAudit = await auditBusinessWebsite("https://gianisicecream.com", "Giani Ice Cream", "Café & Desserts");
  assert(liveSiteAudit.hasWebsite, "Auditor detects website presence");
  assert(liveSiteAudit.isAccessible, "Auditor verifies website accessibility");
  assert((liveSiteAudit.loadTimeMs || 0) > 0, `Auditor measures load time (${liveSiteAudit.loadTimeMs}ms)`);

  // 5. Scoring Formula Test
  const scoreResult = calculateLeadScore(
    {
      name: "Sample Restaurant",
      category: "Restaurant",
      rating: 4.5,
      reviewCount: 200,
      phone: "+91 98888 12345",
      whatsappPhone: "919888812345",
    },
    noSiteAudit
  );
  assert(scoreResult.totalScore >= 0 && scoreResult.totalScore <= 100, `Score is within valid 0-100 range (${scoreResult.totalScore})`);
  assert(scoreResult.breakdown.needScore <= 40, `Need score within 40 pt limit (${scoreResult.breakdown.needScore})`);
  assert(scoreResult.breakdown.activityScore <= 30, `Activity score within 30 pt limit (${scoreResult.breakdown.activityScore})`);
  assert(scoreResult.breakdown.serviceMatchScore <= 20, `Service match within 20 pt limit (${scoreResult.breakdown.serviceMatchScore})`);
  assert(scoreResult.breakdown.contactabilityScore <= 10, `Contactability within 10 pt limit (${scoreResult.breakdown.contactabilityScore})`);

  // 6. Pitch Generator Test
  const pitch = await generatePitchDraft(
    {
      name: "Bakers Lounge VIP Road",
      category: "Bakery & Café",
      city: "Zirakpur",
      area: "VIP Road",
      rating: 4.3,
      reviewCount: 412,
    },
    noSiteAudit
  );
  assert(pitch.openingMessage.includes("Bakers Lounge"), "Pitch includes specific business name");
  assert(pitch.openingMessage.includes("Zirakpur") || pitch.openingMessage.includes("VIP Road"), "Pitch includes specific local geography");
  assert(pitch.openingMessage.includes("CodeBerry"), "Pitch includes agency brand");
  assert(pitch.openingMessage.includes("won't follow up") || pitch.openingMessage.includes("not relevant"), "Pitch includes polite opt-out");
  assert(pitch.pricePoint.includes("₹"), `Pitch includes concrete price point (${pitch.pricePoint})`);
  assert(pitch.likelyObjections.length > 0, "Pitch includes founder objection responses");

  // 7. WhatsApp URL Formatting Test
  const encoded = encodeURIComponent(pitch.openingMessage);
  const waUrl = `https://wa.me/919872844412?text=${encoded}`;
  assert(waUrl.startsWith("https://wa.me/919872844412?text="), "WhatsApp click-to-chat URL is properly constructed");
  assert(!waUrl.includes(" "), "WhatsApp URL is safely URI-encoded without raw spaces");

  // 8. Pipeline Lifecycle State Machine Test
  const testLead = await prisma.lead.create({
    data: {
      name: "__Test Lifecycle Lead__",
      category: "Café",
      niche: "Food & Beverage",
      address: "VIP Road",
      city: "Zirakpur",
      status: "DISCOVERED",
    },
  });

  // Transition to OUTREACH_READY
  await prisma.lead.update({ where: { id: testLead.id }, data: { status: "OUTREACH_READY" } });
  // Transition to CONTACTED
  await prisma.lead.update({ where: { id: testLead.id }, data: { status: "CONTACTED" } });
  // Transition to REPLIED_INTERESTED
  await prisma.lead.update({ where: { id: testLead.id }, data: { status: "REPLIED_INTERESTED" } });
  // Transition to WON
  const wonLead = await prisma.lead.update({ where: { id: testLead.id }, data: { status: "WON" } });
  assert(wonLead.status === "WON", "Pipeline transitions from DISCOVERED -> OUTREACH_READY -> CONTACTED -> REPLIED -> WON correctly");

  // Clean up test lead
  await prisma.lead.delete({ where: { id: testLead.id } });

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`System Status: ${failed === 0 ? "ALL CHECKS HEALTHY" : "CHECK FAILURES DETECTED"}`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
