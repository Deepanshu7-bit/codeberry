import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { discoverViaOpenStreetMap } from "@/lib/discovery";
import { auditBusinessWebsite } from "@/lib/auditor";
import { calculateLeadScore } from "@/lib/scorer";
import { generatePitchDraft } from "@/lib/pitch-generator";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || process.env.AGENCY_CITY || "Zirakpur";
    const count = parseInt(searchParams.get("count") || "35", 10);

    const businesses = await discoverViaOpenStreetMap(city, "all", count);
    let newImported = 0;

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

        newImported++;
      }
    }

    return NextResponse.json({
      success: true,
      city,
      totalDiscovered: businesses.length,
      newLeadsPrepared: newImported,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
