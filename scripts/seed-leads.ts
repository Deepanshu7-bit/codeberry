import { PrismaClient } from "@prisma/client";
import { auditBusinessWebsite } from "../src/lib/auditor";
import { calculateLeadScore } from "../src/lib/scorer";
import { generatePitchDraft } from "../src/lib/pitch-generator";

const prisma = new PrismaClient();

interface InitialLeadData {
  name: string;
  category: string;
  niche: string;
  address: string;
  city: string;
  area: string;
  phone: string;
  whatsappPhone: string;
  websiteUrl: string | null;
  googleMapsUrl: string;
  rating: number;
  reviewCount: number;
  notes: string;
}

const initialLeads: InitialLeadData[] = [
  // --- Zirakpur & Dhakoli Restaurants & Cafés ---
  {
    name: "The Brew Estate Zirakpur",
    category: "Café & Brewery",
    niche: "Food & Beverage",
    address: "SCO 4-5, VIP Road, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "VIP Road",
    phone: "+91 98887 88883",
    whatsappPhone: "919888788883",
    websiteUrl: "https://thebrewestate.in",
    googleMapsUrl: "https://maps.google.com/?q=The+Brew+Estate+Zirakpur",
    rating: 4.4,
    reviewCount: 3240,
    notes: "High footfall microbrewery and café on VIP road. Heavy social presence.",
  },
  {
    name: "Bakers Lounge VIP Road",
    category: "Bakery & Café",
    niche: "Food & Beverage",
    address: "Booth 12, High Ground Road, VIP Road, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "VIP Road",
    phone: "+91 98728 44412",
    whatsappPhone: "919872844412",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Bakers+Lounge+VIP+Road+Zirakpur",
    rating: 4.3,
    reviewCount: 412,
    notes: "Busy local bakery. Has no website. All takeaway orders routed via Swiggy or manual phone calls.",
  },
  {
    name: "Pyramid Café Lounge Zirakpur",
    category: "Café & Dining",
    niche: "Food & Beverage",
    address: "NH 21, Near Cosmo Mall, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "Ambala Highway",
    phone: "+91 70879 60000",
    whatsappPhone: "917087960000",
    websiteUrl: "https://thepyramid.co.in",
    googleMapsUrl: "https://maps.google.com/?q=Pyramid+Cafe+Lounge+Zirakpur",
    rating: 4.2,
    reviewCount: 1850,
    notes: "Popular lounge and casual dining destination. Website is heavy and lacks direct booking.",
  },
  {
    name: "Bake Studio Dhakoli",
    category: "Bakery & Confectionery",
    niche: "Food & Beverage",
    address: "Shop 7, Main Market, MS Enclave, Dhakoli, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "Dhakoli",
    phone: "+91 98150 12345",
    whatsappPhone: "919815012345",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Bake+Studio+Dhakoli",
    rating: 4.5,
    reviewCount: 189,
    notes: "Prime local Dhakoli cake shop. High repeat custom birthday cake orders. Ideal for WhatsApp catalog.",
  },
  {
    name: "Chai Sutta Bar Dhakoli",
    category: "Café & Fast Casual",
    niche: "Food & Beverage",
    address: "Near Old Kalka Road, Dhakoli, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "Dhakoli",
    phone: "+91 82880 99911",
    whatsappPhone: "918288099911",
    websiteUrl: "https://chaisuttabarindia.com",
    googleMapsUrl: "https://maps.google.com/?q=Chai+Sutta+Bar+Dhakoli",
    rating: 4.1,
    reviewCount: 310,
    notes: "Youth hangout. Franchise page exists but no outlet-specific ordering or takeaway page.",
  },
  {
    name: "Amrit Sweets & Family Restaurant",
    category: "Restaurant & Sweets",
    niche: "Food & Beverage",
    address: "Dhakoli Main Road, Opp SBI, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "Dhakoli",
    phone: "+91 94172 33441",
    whatsappPhone: "919417233441",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Amrit+Sweets+Dhakoli",
    rating: 4.2,
    reviewCount: 890,
    notes: "Very high weekend rush for sweets, snacks, and thalis. No online order system outside Swiggy.",
  },
  {
    name: "Haveli Zirakpur",
    category: "Traditional Restaurant",
    niche: "Food & Beverage",
    address: "Chandigarh-Ambala National Highway, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "Highway",
    phone: "+91 1762 509999",
    whatsappPhone: "911762509999",
    websiteUrl: "https://haveli.co.in",
    googleMapsUrl: "https://maps.google.com/?q=Haveli+Zirakpur",
    rating: 4.3,
    reviewCount: 14200,
    notes: "Iconic highway stop. Massive brand, corporate website has no instant WhatsApp reservation desk.",
  },
  {
    name: "Burger Chowk Dhakoli",
    category: "Fast Food & Café",
    niche: "Food & Beverage",
    address: "Sector 19 Road, Near Railway Crossing, Dhakoli, Zirakpur 140603",
    city: "Zirakpur",
    area: "Dhakoli",
    phone: "+91 97800 12890",
    whatsappPhone: "919780012890",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Burger+Chowk+Dhakoli",
    rating: 4.4,
    reviewCount: 145,
    notes: "Popular evening snack spot with local college crowd. Needs a simple QR menu.",
  },
  {
    name: "Giani Ice Cream VIP Road",
    category: "Dessert Parlour & Café",
    niche: "Food & Beverage",
    address: "Showroom 15, VIP Road, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "VIP Road",
    phone: "+91 99155 77881",
    whatsappPhone: "919915577881",
    websiteUrl: "https://gianisicecream.com",
    googleMapsUrl: "https://maps.google.com/?q=Giani+Ice+Cream+VIP+Road+Zirakpur",
    rating: 4.3,
    reviewCount: 520,
    notes: "Franchise brand, lacks direct local home-delivery channel for VIP road residents.",
  },
  {
    name: "Sagar Ratna Zirakpur",
    category: "South Indian Restaurant",
    niche: "Food & Beverage",
    address: "Global Business Park, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "Ambala Highway",
    phone: "+91 1762 506789",
    whatsappPhone: "911762506789",
    websiteUrl: "https://sagarratna.in",
    googleMapsUrl: "https://maps.google.com/?q=Sagar+Ratna+Zirakpur",
    rating: 4.1,
    reviewCount: 2100,
    notes: "Established family restaurant chain. High takeaway demand.",
  },

  // --- Panchkula Restaurants & Cafés ---
  {
    name: "Nik Baker's Panchkula",
    category: "Bakery & European Café",
    niche: "Food & Beverage",
    address: "SCO 47, Sector 9, Panchkula, Haryana 134109",
    city: "Panchkula",
    area: "Sector 9",
    phone: "+91 172 258 5544",
    whatsappPhone: "911722585544",
    websiteUrl: "https://nikbakers.com",
    googleMapsUrl: "https://maps.google.com/?q=Nik+Bakers+Sector+9+Panchkula",
    rating: 4.5,
    reviewCount: 4800,
    notes: "Premium bakery brand in Tricity. Strong website but missing instant WhatsApp cake customizer.",
  },
  {
    name: "Falcon Café Lounge Panchkula",
    category: "Café & Lounge",
    niche: "Food & Beverage",
    address: "Site No. 5, Sector 16, Panchkula, Haryana 134113",
    city: "Panchkula",
    area: "Sector 16",
    phone: "+91 98889 00016",
    whatsappPhone: "919888900016",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Falcon+Cafe+Lounge+Panchkula",
    rating: 4.3,
    reviewCount: 1620,
    notes: "Spacious cafe lounge in Panchkula. No working independent website on Google listing.",
  },
  {
    name: "The Bella Vista Café Panchkula",
    category: "Fine Dining & Café",
    niche: "Food & Beverage",
    address: "SM-8, City Centre, Sector 5, Panchkula, Haryana 134109",
    city: "Panchkula",
    area: "Sector 5",
    phone: "+91 172 506 4848",
    whatsappPhone: "911725064848",
    websiteUrl: "https://hotelbellavista.in",
    googleMapsUrl: "https://maps.google.com/?q=The+Bella+Vista+Panchkula",
    rating: 4.2,
    reviewCount: 3100,
    notes: "Boutique dining. Hotel site is dated and slow on mobile devices.",
  },
  {
    name: "Uncle Jack's Panchkula",
    category: "American Diner & QSR",
    niche: "Food & Beverage",
    address: "Booth 18, Sector 8 Market, Panchkula, Haryana 134109",
    city: "Panchkula",
    area: "Sector 8",
    phone: "+91 70870 00055",
    whatsappPhone: "917087000055",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Uncle+Jacks+Sector+8+Panchkula",
    rating: 4.4,
    reviewCount: 2200,
    notes: "Heavy youth takeaway demand. Huge opportunity for direct WhatsApp re-ordering.",
  },
  {
    name: "The Willow Cafe",
    category: "Boutique Café",
    niche: "Food & Beverage",
    address: "SCO 01, Near Sector 10 Market, Panchkula / Chandigarh",
    city: "Panchkula",
    area: "Sector 10",
    phone: "+91 84370 02000",
    whatsappPhone: "918437002000",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=The+Willow+Cafe+Chandigarh",
    rating: 4.4,
    reviewCount: 3900,
    notes: "Very aesthetic English style café. Missing an updated web reservation page.",
  },
  {
    name: "Chili's Grill & Bar Panchkula/Zirakpur",
    category: "Casual Dining",
    niche: "Food & Beverage",
    address: "NH 22, Near Sector 20 Border, Zirakpur 140603",
    city: "Zirakpur",
    area: "Sector 20 Border",
    phone: "+91 1762 522001",
    whatsappPhone: "911762522001",
    websiteUrl: "https://chilisindia.com",
    googleMapsUrl: "https://maps.google.com/?q=Chilis+Zirakpur",
    rating: 4.3,
    reviewCount: 2750,
    notes: "American franchise restaurant. Good target for localized table reservation page.",
  },
  {
    name: "Café Coffee Day Panchkula Sector 9",
    category: "Café",
    niche: "Food & Beverage",
    address: "SCO 385, Sector 9, Panchkula, Haryana 134109",
    city: "Panchkula",
    area: "Sector 9",
    phone: "+91 172 257 8899",
    whatsappPhone: "911722578899",
    websiteUrl: "https://cafecoffeeday.com",
    googleMapsUrl: "https://maps.google.com/?q=CCD+Sector+9+Panchkula",
    rating: 4.0,
    reviewCount: 890,
    notes: "Franchise outlet. Corporate page only.",
  },
  {
    name: "Dastaan Fine Dining",
    category: "North Indian Restaurant",
    niche: "Food & Beverage",
    address: "SCO 43, Backside Sector 7 / Panchkula Border",
    city: "Panchkula",
    area: "Sector 7 Border",
    phone: "+91 172 400 4444",
    whatsappPhone: "911724004444",
    websiteUrl: "https://dastaanrestaurant.com",
    googleMapsUrl: "https://maps.google.com/?q=Dastaan+Restaurant+Chandigarh",
    rating: 4.6,
    reviewCount: 3800,
    notes: "High-end Indian cuisine. Website is flash-style and slow on smartphones.",
  },
  {
    name: "Baking Moments Sector 20",
    category: "Bakery & Desserts",
    niche: "Food & Beverage",
    address: "Shop 14, Sector 20 Market, Panchkula, Haryana 134116",
    city: "Panchkula",
    area: "Sector 20",
    phone: "+91 98144 55667",
    whatsappPhone: "919814455667",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Baking+Moments+Sector+20+Panchkula",
    rating: 4.3,
    reviewCount: 240,
    notes: "Local bakery in high-density residential Sector 20 Panchkula. No website.",
  },
  {
    name: "Kathi Junction VIP Road",
    category: "Quick Service Food",
    niche: "Food & Beverage",
    address: "Booth 8, VIP Road Market, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "VIP Road",
    phone: "+91 97818 22110",
    whatsappPhone: "919781822110",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Kathi+Junction+VIP+Road+Zirakpur",
    rating: 4.1,
    reviewCount: 380,
    notes: "Quick roll takeout joint. Ideal candidate for low-cost digital menu.",
  },

  // --- Salons & Spas Comparison Group (Panchkula, Zirakpur, Dhakoli) ---
  {
    name: "Headmasters Salon & Spa Panchkula",
    category: "Luxury Salon & Spa",
    niche: "Beauty & Wellness",
    address: "SCO 84-85, Sector 8, Panchkula, Haryana 134109",
    city: "Panchkula",
    area: "Sector 8",
    phone: "+91 172 466 7777",
    whatsappPhone: "911724667777",
    websiteUrl: "https://headmasters.in",
    googleMapsUrl: "https://maps.google.com/?q=Headmasters+Sector+8+Panchkula",
    rating: 4.3,
    reviewCount: 2150,
    notes: "High ticket salon. Main website lacks branch-level instant WhatsApp booking.",
  },
  {
    name: "Looks Salon Zirakpur",
    category: "Premium Salon",
    niche: "Beauty & Wellness",
    address: "Shop 21, Cosmo Mall, NH 21, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "Cosmo Mall",
    phone: "+91 98888 23456",
    whatsappPhone: "919888823456",
    websiteUrl: "https://lookssalon.in",
    googleMapsUrl: "https://maps.google.com/?q=Looks+Salon+Cosmo+Mall+Zirakpur",
    rating: 4.2,
    reviewCount: 940,
    notes: "Mall-based salon. Customers searching on Google Maps hit corporate locator without direct booking.",
  },
  {
    name: "Femina Plus Salon Panchkula",
    category: "Bridal & Hair Salon",
    niche: "Beauty & Wellness",
    address: "SCO 359, Sector 9, Panchkula, Haryana 134109",
    city: "Panchkula",
    area: "Sector 9",
    phone: "+91 172 258 4400",
    whatsappPhone: "911722584400",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Femina+Plus+Sector+9+Panchkula",
    rating: 4.4,
    reviewCount: 1120,
    notes: "Extremely busy bridal makeup salon in Sector 9. No website. Relies on phone calls and walk-ins.",
  },
  {
    name: "Toni & Guy Panchkula",
    category: "Hairdressing & Salon",
    niche: "Beauty & Wellness",
    address: "SCO 42, Sector 9, Panchkula, Haryana 134109",
    city: "Panchkula",
    area: "Sector 9",
    phone: "+91 172 401 2233",
    whatsappPhone: "911724012233",
    websiteUrl: "https://toniandguy.com",
    googleMapsUrl: "https://maps.google.com/?q=Toni+and+Guy+Panchkula",
    rating: 4.5,
    reviewCount: 1480,
    notes: "International chain with high client spend. International website has zero Panchkula appointment integration.",
  },
  {
    name: "Glam Studios Dhakoli",
    category: "Salon & Beauty Parlour",
    niche: "Beauty & Wellness",
    address: "Near Guru Nanak Enclave, Dhakoli, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "Dhakoli",
    phone: "+91 80100 00777",
    whatsappPhone: "918010000777",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Glam+Studios+Dhakoli",
    rating: 4.1,
    reviewCount: 230,
    notes: "Neighborhood beauty salon. Zero web presence.",
  },
  {
    name: "Matrix Salon VIP Road",
    category: "Hair & Skin Salon",
    niche: "Beauty & Wellness",
    address: "SCO 9, VIP Road, Near Domino's, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    area: "VIP Road",
    phone: "+91 98765 11220",
    whatsappPhone: "919876511220",
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?q=Matrix+Salon+VIP+Road+Zirakpur",
    rating: 4.2,
    reviewCount: 380,
    notes: "VIP Road hair salon with great walk-in crowd. Missing mobile appointment link on Google listing.",
  },
];

async function main() {
  console.log(`Starting lead seed process for ${initialLeads.length} target businesses...`);

  let createdCount = 0;
  let auditedCount = 0;

  for (const item of initialLeads) {
    // Check if lead already exists
    let lead = await prisma.lead.findFirst({
      where: { name: item.name, city: item.city },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          name: item.name,
          category: item.category,
          niche: item.niche,
          address: item.address,
          city: item.city,
          area: item.area,
          phone: item.phone,
          whatsappPhone: item.whatsappPhone,
          websiteUrl: item.websiteUrl,
          googleMapsUrl: item.googleMapsUrl,
          rating: item.rating,
          reviewCount: item.reviewCount,
          source: "Local Market Directory (Dhakoli/Zirakpur/Panchkula)",
          status: "DISCOVERED",
          notes: item.notes,
        },
      });
      createdCount++;
    }

    // Now run audit if not yet audited
    const existingAudit = await prisma.audit.findUnique({
      where: { leadId: lead.id },
    });

    let auditRecord = existingAudit;

    if (!existingAudit) {
      console.log(`Auditing [${lead.category}] ${lead.name} (${lead.websiteUrl || "NO WEBSITE"})...`);
      const auditResult = await auditBusinessWebsite(lead.websiteUrl, lead.name, lead.category);

      auditRecord = await prisma.audit.create({
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

      // Calculate transparent lead score
      const scoreOutput = calculateLeadScore(lead, auditResult);

      // Generate Pitch Draft
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
          followUpMessage: pitch.followUpMessage,
          likelyObjections: JSON.stringify(pitch.likelyObjections),
          status: "DRAFT",
        },
      });

      auditedCount++;
    }
  }

  console.log(`\nSeed & Audit Complete:`);
  console.log(`- Total Leads Processed: ${initialLeads.length}`);
  console.log(`- New Leads Inserted: ${createdCount}`);
  console.log(`- Leads Audited & Scored: ${auditedCount}`);
}

main()
  .catch((e) => {
    console.error("Error seeding leads:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
