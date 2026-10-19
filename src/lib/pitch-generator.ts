import { AuditResult } from "./auditor";

export interface GeneratedPitch {
  recommendedService: string;
  suggestedOffer: string;
  pricePoint: string;
  turnaroundDays: number;
  openingMessage: string;
  followUpMessage: string;
  likelyObjections: { objection: string; response: string }[];
}

export async function generatePitchDraft(
  lead: {
    name: string;
    category: string;
    city: string;
    area?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
  },
  audit: AuditResult
): Promise<GeneratedPitch> {
  const isFood =
    lead.category.toLowerCase().includes("restaurant") ||
    lead.category.toLowerCase().includes("café") ||
    lead.category.toLowerCase().includes("bakery");

  const locationLabel = lead.area ? `${lead.area}, ${lead.city}` : lead.city;

  // Check if GEMINI_API_KEY is available for custom LLM polish
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim() !== "") {
    try {
      const prompt = `You are a B2B sales strategist for CodeBerry Technologies, a web development & digital systems agency based in Zirakpur/Chandigarh.
Generate a concise, respectful, professional WhatsApp pitch for a local business owner.
Business Name: ${lead.name}
Category: ${lead.category}
Location: ${locationLabel}
Google Rating: ${lead.rating || "N/A"} (${lead.reviewCount || 0} reviews)
Audit Summary: ${audit.auditSummary}
Verified Issues: ${audit.identifiedIssues.join(", ")}
Opportunities: ${audit.opportunities.join(", ")}

Requirements:
- Sound like a polite, knowledgeable local technologist.
- NO marketing buzzwords, fake compliments, or pushy urgency.
- Mention a specific verified observation from the audit.
- Keep the WhatsApp message under 120 words.
- Include a polite opt-out at the end.
- Return pure valid JSON with fields:
  {
    "recommendedService": string,
    "suggestedOffer": string,
    "pricePoint": string,
    "turnaroundDays": number,
    "openingMessage": string,
    "followUpMessage": string,
    "likelyObjections": [{"objection": string, "response": string}]
  }`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            recommendedService: parsed.recommendedService || "Direct Digital Ordering System",
            suggestedOffer: parsed.suggestedOffer || "48-Hour Digital Menu & Direct Ordering",
            pricePoint: parsed.pricePoint || (isFood ? "₹8,999" : "₹9,999"),
            turnaroundDays: parsed.turnaroundDays || 2,
            openingMessage: parsed.openingMessage,
            followUpMessage: parsed.followUpMessage,
            likelyObjections: parsed.likelyObjections || [],
          };
        }
      }
    } catch (e) {
      console.warn("Gemini API call failed or timed out, falling back to heuristic pitch engine:", e);
    }
  }

  // Robust Heuristic Engine (Tailored specifically for Indian Tricity Businesses)
  if (isFood) {
    const openingMessage = `Hi team ${lead.name},

I’m Nugen from CodeBerry Technologies here in ${lead.city}.

I was checking out popular dining spots around ${lead.area || lead.city} and came across your listing. You have great customer feedback (${lead.rating || 4.5}★ on Google).

I noticed that customers looking you up online don't have a fast way to view an updated interactive menu and place direct orders via WhatsApp—most direct takeout customers still get redirected to 3rd-party apps with 25-30% commissions.

We’ve built a fast, 1-click WhatsApp menu system that lets your regular diners browse items and send orders straight to your counter on WhatsApp in seconds.

Would you be open to seeing a quick 60-second interactive demo for ${lead.name}? Happy to share it here if you’re interested.

(If this isn't relevant, please let me know and I won't follow up.)`;

    const followUpMessage = `Hi team ${lead.name}, just wanted to check if you had a moment to see the quick WhatsApp menu concept I put together for ${lead.name}? No worries if you're busy right now—happy to share a quick preview whenever convenient.`;

    return {
      recommendedService: "Direct WhatsApp Ordering & Digital Menu",
      suggestedOffer: "48-Hour WhatsApp Digital Menu + Table Reservation + Google Review QR",
      pricePoint: "₹8,999",
      turnaroundDays: 2,
      openingMessage,
      followUpMessage,
      likelyObjections: [
        {
          objection: "We already get orders on Zomato / Swiggy.",
          response:
            "Zomato and Swiggy are great for finding new people, but they take 25% to 30% of your bill. This WhatsApp system is for your direct and repeat diners, so you keep 100% of the bill without paying commission.",
        },
        {
          objection: "We don't have time to manage another system.",
          response:
            "There's no new software to learn. When a customer taps 'Order', it sends a formatted WhatsApp message with items, quantities, and their table/delivery address directly to your existing WhatsApp number.",
        },
        {
          objection: "How much does it cost?",
          response:
            "It’s a flat one-time setup of ₹8,999 with zero monthly commission. We can deliver it ready to use within 48 hours.",
        },
      ],
    };
  } else {
    // Salon / Spa / Clinic
    const openingMessage = `Hi team ${lead.name},

I’m Nugen from CodeBerry Technologies here in ${lead.city}.

I came across ${lead.name} while researching top salons & aesthetic clinics around ${lead.area || lead.city}. Really impressive client reviews!

I noticed that clients booking appointments or inquiring about services don't have a direct 1-click WhatsApp slot booking page from your Google Maps profile, so many potential clients drop off without inquiring.

We create clean, 48-hour mobile booking funnels that let clients pick their service and book a confirmed slot directly on your WhatsApp in 2 taps.

Would you be open to taking a look at a quick 60-second sample page we designed for ${lead.name}?

(If you're not looking to upgrade your digital bookings right now, please let me know and I won't message again.)`;

    const followUpMessage = `Hi team ${lead.name}, following up briefly on my earlier note regarding a direct WhatsApp appointment booking page for ${lead.name}. Would love to share a quick preview if you have 2 minutes this week.`;

    return {
      recommendedService: "1-Click WhatsApp Booking Funnel & Mobile Overhaul",
      suggestedOffer: "48-Hour Service Menu & WhatsApp Appointment Funnel + Google Maps Booster",
      pricePoint: "₹9,999",
      turnaroundDays: 2,
      openingMessage,
      followUpMessage,
      likelyObjections: [
        {
          objection: "Clients just call us directly.",
          response:
            "Calls are great, but our data shows over 60% of evening searches happen after 8 PM or during busy hours when staff are serving clients. A 1-click WhatsApp booking button captures those clients before they look at another salon.",
        },
        {
          objection: "Is it complicated to set up?",
          response:
            "Not at all. We handle everything from design to hosting and launch within 48 hours. Your team only receives the confirmed appointment details on WhatsApp.",
        },
      ],
    };
  }
}
