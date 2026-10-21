import { AuditResult } from "./auditor";

export interface GeneratedPitch {
  recommendedService: string;
  suggestedOffer: string;
  pricePoint: string;
  turnaroundDays: number;
  openingMessage: string;
  openingMessageHinglish: string;
  followUpMessage: string;
  followUpMessageHinglish: string;
  demoUrl: string;
  likelyObjections: { objection: string; response: string }[];
}

// Industry demo links (can be updated or customized in .env)
const DEMO_LINKS = {
  school: process.env.DEMO_URL_SCHOOL || "https://codeberry.in/demos/school",
  clinic: process.env.DEMO_URL_CLINIC || "https://codeberry.in/demos/clinic",
  cafe: process.env.DEMO_URL_CAFE || "https://codeberry.in/demos/cafe",
  bakery: process.env.DEMO_URL_BAKERY || "https://codeberry.in/demos/bakery",
  retail: process.env.DEMO_URL_RETAIL || "https://codeberry.in/demos/store",
  agency: process.env.DEMO_URL_AGENCY || "https://codeberry.in/demos/agency",
  salon: process.env.DEMO_URL_SALON || "https://codeberry.in/demos/salon",
};

export async function generatePitchDraft(
  lead: {
    name: string;
    category: string;
    city: string;
    area?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    websiteUrl?: string | null;
  },
  audit: AuditResult
): Promise<GeneratedPitch> {
  const cat = (lead.category || "").toLowerCase();
  const hasWebsite = audit.hasWebsite && audit.isAccessible;
  const locationLabel = lead.area ? `${lead.area}, ${lead.city}` : lead.city;

  // Determine Industry Niche
  const isSchool =
    cat.includes("school") ||
    cat.includes("college") ||
    cat.includes("institute") ||
    cat.includes("academy") ||
    cat.includes("coaching") ||
    cat.includes("tuition") ||
    cat.includes("education");

  const isHospital =
    cat.includes("hospital") ||
    cat.includes("clinic") ||
    cat.includes("doctor") ||
    cat.includes("dentist") ||
    cat.includes("dental") ||
    cat.includes("healthcare") ||
    cat.includes("medical");

  const isBakery =
    cat.includes("bakery") ||
    cat.includes("baker") ||
    cat.includes("cake") ||
    cat.includes("pastry") ||
    cat.includes("sweet") ||
    cat.includes("confection");

  const isCafe =
    !isBakery &&
    (cat.includes("café") ||
      cat.includes("cafe") ||
      cat.includes("coffee") ||
      cat.includes("restaurant") ||
      cat.includes("dhaba") ||
      cat.includes("bistro") ||
      cat.includes("food"));

  const isAgency =
    cat.includes("agency") ||
    cat.includes("marketing") ||
    cat.includes("consulting") ||
    cat.includes("software") ||
    cat.includes("it") ||
    cat.includes("company");

  const isSalon =
    cat.includes("salon") ||
    cat.includes("spa") ||
    cat.includes("beauty") ||
    cat.includes("hair") ||
    cat.includes("parlour");

  // Gemini Polish (Optional Free Tier)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim() !== "") {
    try {
      const prompt = `You are a cold outreach assistant for a web developer contacting local Indian business owners.
Generate TWO short outreach messages (English and Hinglish) for WhatsApp.
Business: ${lead.name}
Category: ${lead.category}
City: ${lead.city}
Has Website: ${hasWebsite ? "Yes (" + lead.websiteUrl + ")" : "No"}
Issues: ${audit.identifiedIssues.join(", ") || "None"}

Requirements:
- Very short (under 75 words each).
- State you saw their business / website in ${lead.city}.
- Mention how a quick 48-hour website/system helps their business (more admissions/patients/direct orders).
- Mention it can be delivered in a very short span of time (48 hours) and is very feasible / budget-friendly.
- Mention demo link placeholder: [DEMO_LINK].
- End with low-pressure CTA: "Please let us know if you are interested or what, we can share a quick 1-min preview."
- Hinglish should be natural Indian business conversational (e.g. "Hi team {name}, humne aapka business dekha...").
- Return pure JSON:
{
  "recommendedService": string,
  "suggestedOffer": string,
  "pricePoint": string,
  "turnaroundDays": number,
  "openingMessage": string,
  "openingMessageHinglish": string,
  "followUpMessage": string,
  "followUpMessageHinglish": string,
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
          const demoUrl = isSchool
            ? DEMO_LINKS.school
            : isHospital
            ? DEMO_LINKS.clinic
            : isCafe
            ? DEMO_LINKS.cafe
            : isBakery
            ? DEMO_LINKS.bakery
            : isAgency
            ? DEMO_LINKS.agency
            : DEMO_LINKS.retail;

          return {
            recommendedService: parsed.recommendedService || "Fast High-Converting Web Funnel",
            suggestedOffer: parsed.suggestedOffer || "48-Hour Website & WhatsApp Lead Funnel",
            pricePoint: parsed.pricePoint || "₹4,999",
            turnaroundDays: parsed.turnaroundDays || 2,
            openingMessage: (parsed.openingMessage || "").replace(/\[DEMO_LINK\]/g, demoUrl),
            openingMessageHinglish: (parsed.openingMessageHinglish || "").replace(/\[DEMO_LINK\]/g, demoUrl),
            followUpMessage: parsed.followUpMessage || "Hi team, following up to see if you had a moment to check the demo?",
            followUpMessageHinglish: parsed.followUpMessageHinglish || "Hi team, bas check karne ke liye message kiya ki kya aapne demo preview dekha?",
            demoUrl,
            likelyObjections: parsed.likelyObjections || [],
          };
        }
      }
    } catch {
      // Fallback directly to high-converting built-in heuristic templates
    }
  }

  // --- 100% FREE BUILT-IN HEURISTIC ENGINE (Specially calibrated for Indian Businesses) ---

  // 1. SCHOOL / COLLEGE / COACHING
  if (isSchool) {
    const demoUrl = DEMO_LINKS.school;
    const observationEn = hasWebsite
      ? `We reviewed your website and noticed the admission prospectus & direct parent WhatsApp inquiry isn't optimized for mobile.`
      : `We saw your institute listing on Google and noticed you don't have a modern admission landing page for parents searching online.`;

    const observationHi = hasWebsite
      ? `Humne aapki website check ki aur notice kiya ki mobile pe admission prospectus aur direct WhatsApp inquiry option missing hai.`
      : `Humne aapka institute Google pe dekha, listing acchi hai par official admission page nahi hai jahan se parents direct fees/courses dekh sakein.`;

    const openingMessage = `Hi team ${lead.name},

We came across your institute in ${lead.city}—great student reviews!

${observationEn}

We build fast admission inquiry funnels that help schools capture 2x more direct parent WhatsApp inquiries. It can be delivered in just 48 hours and is very feasible / budget-friendly.

Here is a quick live demo of our work: ${demoUrl}

Please let us know if you are interested or what, we'd love to share a quick 1-min preview!`;

    const openingMessageHinglish = `Hi team ${lead.name},

Humne aapka institute ${lead.city} me dekha, reviews kaafi acche hain!

${observationHi}

Humne schools ke liye ek direct WhatsApp admission funnel banaya hai jisse parent admissions inquiries 2x badh jaati hain. Ye sirf 48 hours me deliver ho jata hai aur cost bohot hi feasible / pocket-friendly hai.

Hamare recent demo yahan dekh sakte hain: ${demoUrl}

Batayein agar aap interested hain ya {name} ke liye quick preview dekhna chahein to!`;

    const followUpMessage = `Hi team ${lead.name}, just following up briefly to see if you had a chance to check the admission demo? Happy to send a quick preview whenever convenient!`;
    const followUpMessageHinglish = `Hi team ${lead.name}, bas check karne ke liye message kiya tha ki kya aapne admission demo preview dekha? Batayein agar 1 minute ka sample share karein to!`;

    return {
      recommendedService: "School Admission & Parent WhatsApp Funnel",
      suggestedOffer: "48-Hour Admissions Page + Course Prospectus + WhatsApp Connect",
      pricePoint: "₹4,999",
      turnaroundDays: 2,
      openingMessage,
      openingMessageHinglish,
      followUpMessage,
      followUpMessageHinglish,
      demoUrl,
      likelyObjections: [
        {
          objection: "Admissions session abhi start nahi hua.",
          response:
            "Bilkul samajh sakta hoon! Setup abhi 48 hours me ready ho jayega taaki jaise hi parent queries shuru hon, aapki site ready ho aur inquiries miss na hon.",
        },
        {
          objection: "What is the cost?",
          response: "It’s a flat one-time setup of ₹4,999 with zero monthly charges. Ready in 48 hours.",
        },
      ],
    };
  }

  // 2. HOSPITAL / CLINIC / DOCTOR / DENTIST
  if (isHospital) {
    const demoUrl = DEMO_LINKS.clinic;
    const observationEn = hasWebsite
      ? `We saw your clinic website and noticed patients can't easily check doctor timings or book OPD slots directly on WhatsApp.`
      : `We saw your clinic profile on Google and noticed there's no direct 1-tap WhatsApp appointment booking page for patients.`;

    const observationHi = hasWebsite
      ? `Humne aapki website dekhi aur notice kiya ki patients easily OPD timing dekh kar direct WhatsApp appointment book nahi kar pate.`
      : `Humne Google pe aapka clinic dekha, patient reviews acche hain par direct 1-click WhatsApp appointment booking link missing hai.`;

    const openingMessage = `Hi team ${lead.name},

We saw your clinic profile in ${lead.city}—impressive patient feedback!

${observationEn}

We create clean clinic funnels that let patients book slots in 2 taps on WhatsApp, reducing front-desk calling load by 60%. Delivered in just 48 hours and very feasible pricing.

Live clinic demo: ${demoUrl}

Please let us know if you are interested or what, happy to share a quick 1-min preview!`;

    const openingMessageHinglish = `Hi team ${lead.name},

Humne aapka clinic/hospital ${lead.city} me dekha, patient feedback bohot badhiya hai!

${observationHi}

Isse patients 2 taps me apna OPD slot book kar sakte hain aur staff ka phone handling time 70% kam ho jata hai. Ye sirf 48 hours me ready ho jata hai aur pricing bohot hi feasible hai.

Clinic demo yahan dekh sakte hain: ${demoUrl}

Batayein agar aap interested hain ya ${lead.name} ke liye sample preview dekhna chahein to!`;

    const followUpMessage = `Hi team ${lead.name}, following up briefly on the 1-click appointment booking demo for ${lead.name}. Would love to share a 1-minute preview if you have a moment this week!`;
    const followUpMessageHinglish = `Hi team ${lead.name}, clinic appointment booking demo ke regarding follow up tha. Agar 1 minute ho to batayein, quick sample send kar dete hain!`;

    return {
      recommendedService: "1-Click Clinic Appointment & OPD Booking",
      suggestedOffer: "48-Hour Doctor Schedule & WhatsApp Appointment Funnel",
      pricePoint: "₹4,999",
      turnaroundDays: 2,
      openingMessage,
      openingMessageHinglish,
      followUpMessage,
      followUpMessageHinglish,
      demoUrl,
      likelyObjections: [
        {
          objection: "Patients usually direct call our reception.",
          response:
            "Calls are great, but many patients search in the evening when reception is closed or lines are busy. A 1-click WhatsApp booking button captures those patients instantly.",
        },
      ],
    };
  }

  // 3. CAFE & RESTAURANT
  if (isCafe) {
    const demoUrl = DEMO_LINKS.cafe;
    const observationEn = hasWebsite
      ? `We saw your website and noticed diners don't have an interactive mobile menu to place direct WhatsApp takeaway orders.`
      : `We saw your cafe listing on Google and noticed customers have no direct interactive WhatsApp menu, redirecting takeout diners to apps taking 25-30% commissions.`;

    const observationHi = hasWebsite
      ? `Aapki website pe digital interactive menu aur direct WhatsApp order link missing hai.`
      : `Google pe aapka cafe dekha, food reviews acche hain par direct WhatsApp menu nahi hai, jisse customers order ke liye 25-30% Zomato commission me chale jate hain.`;

    const openingMessage = `Hi team ${lead.name},

We saw your business in ${locationLabel}—great food reviews!

${observationEn}

We build sleek 1-click WhatsApp menus where diners browse dishes and send direct orders to your counter—saving 100% of your margins. Ready in just 48 hours and very feasible one-time cost.

Here is a live demo of our work: ${demoUrl}

Please let us know if you are interested or what, happy to share a quick preview for ${lead.name}!`;

    const openingMessageHinglish = `Hi team ${lead.name},

Humne aapka cafe ${locationLabel} me dekha, food reviews zabardast hain!

${observationHi}

Humne ek sleek WhatsApp menu banaya hai jahan diners direct mobile pe menu dekh kar counter pe order bhej sakte hain—100% margin aapka bachta hai. Sirf 48 hours me live ho jata hai aur cost bohot pocket-friendly / feasible hai.

Recent cafe demo: ${demoUrl}

Batayein agar aap interested hain to hum ek sample demo preview share karte hain!`;

    const followUpMessage = `Hi team ${lead.name}, just checking if you got a moment to see the direct WhatsApp menu demo for ${lead.name}? Happy to share a 60-second preview whenever convenient!`;
    const followUpMessageHinglish = `Hi team ${lead.name}, bas check kar rahe the ki kya aapne cafe WhatsApp menu ka demo dekha? Agar free hon to batayein, quick preview send kar dete hain!`;

    return {
      recommendedService: "Direct WhatsApp Menu & Table Booking",
      suggestedOffer: "48-Hour Digital Menu + Direct WhatsApp Takeout Ordering",
      pricePoint: "₹3,999",
      turnaroundDays: 2,
      openingMessage,
      openingMessageHinglish,
      followUpMessage,
      followUpMessageHinglish,
      demoUrl,
      likelyObjections: [
        {
          objection: "Hum Zomato Swiggy pe hain already.",
          response:
            "Zomato Swiggy naye logo ke liye accha hai, par 25-30% commission leta hai. Ye direct menu aapke regular customers ke liye hai jahan 100% profit aapka bachta hai.",
        },
      ],
    };
  }

  // 4. BAKERY & CONFECTIONERY
  if (isBakery) {
    const demoUrl = DEMO_LINKS.bakery;
    const openingMessage = `Hi team ${lead.name},

We saw your bakery in ${lead.city}—amazing cake designs and reviews!

We noticed you don't have a fast visual WhatsApp catalog where customers can choose cake flavors, weights, and place custom orders without long phone conversations.

Our 48-hour digital bakery catalog helps you capture direct cake orders in 2 taps. It can be delivered in a very short span of time and is very feasible / budget-friendly.

Live bakery demo: ${demoUrl}

Please let us know if you are interested or what, we can share a quick preview!`;

    const openingMessageHinglish = `Hi team ${lead.name},

Humne aapki bakery ${lead.city} me dekhi, cake designs aur reviews lajawab hain!

Notice kiya ki custom cake orders aur daily bakery items ke liye koi direct WhatsApp catalog page nahi hai jahan se customer photo dekh kar order kare.

Hamare digital catalog se customers direct flavor aur size pick karke WhatsApp order bhej dete hain. Setup sirf 48 hours me ready ho jata hai aur pricing bohot feasible hai.

Bakery demo yahan dekhein: ${demoUrl}

Batayein agar aap interested hain to hum ${lead.name} ka preview ready karein!`;

    const followUpMessage = `Hi team ${lead.name}, following up on the digital cake catalog demo for ${lead.name}. Would love to share a 1-minute preview if you have a moment!`;
    const followUpMessageHinglish = `Hi team ${lead.name}, cake catalog demo ke regarding message kiya tha. Batayein agar sample dekhna chahein to!`;

    return {
      recommendedService: "Visual WhatsApp Cake Catalog & Order Funnel",
      suggestedOffer: "48-Hour Custom Cake Showcase & WhatsApp Order Button",
      pricePoint: "₹3,999",
      turnaroundDays: 2,
      openingMessage,
      openingMessageHinglish,
      followUpMessage,
      followUpMessageHinglish,
      demoUrl,
      likelyObjections: [
        {
          objection: "Customers send photos on WhatsApp anyway.",
          response:
            "A catalog organizes your flavors, eggless options, and starting rates in one link, saving staff from answering the same questions 20 times a day.",
        },
      ],
    };
  }

  // 5. AGENCY / IT / CONSULTANCY
  if (isAgency) {
    const demoUrl = DEMO_LINKS.agency;
    const observationEn = hasWebsite
      ? `We saw your website and noticed the portfolio layout and client inquiry funnel could convert much better on mobile.`
      : `We came across your agency listing and noticed you don't have a dedicated modern portfolio landing page.`;

    const observationHi = hasWebsite
      ? `Humne aapki website dekhi aur notice kiya ki mobile pe portfolio aur direct client inquiry form aur sharp ho sakta hai.`
      : `Humne aapki agency dekhi, profile acchi hai par high-converting portfolio landing page missing hai.`;

    const openingMessage = `Hi team ${lead.name},

We came across your agency in ${lead.city}!

${observationEn}

We build ultra-fast, high-converting agency landing pages with case-study funnels that turn traffic into booked client discovery calls. Delivered in just 48-72 hours and very feasible pricing.

Live agency demo: ${demoUrl}

Please let us know if you are interested or what, happy to share a quick preview!`;

    const openingMessageHinglish = `Hi team ${lead.name},

Humne aapki agency ${lead.city} me dekhi!

${observationHi}

Humne B2B agencies ke liye modern portfolio funnels banaye hain jo website visitors ko high-intent client leads me convert karte hain. Delivery sirf 2-3 din me ho jati hai aur setup cost bohot feasible hai.

Live agency demo: ${demoUrl}

Batayein agar aap interested hain to hum quick concept preview share karte hain!`;

    const followUpMessage = `Hi team ${lead.name}, following up to see if you had a moment to review the agency portfolio demo? Happy to share details whenever convenient!`;
    const followUpMessageHinglish = `Hi team ${lead.name}, bas check kar rahe the ki kya aapne portfolio demo dekha? Batayein agar 1-min preview share karein to!`;

    return {
      recommendedService: "Modern Agency Portfolio & Inbound Client Funnel",
      suggestedOffer: "72-Hour Case Study Landing Page + Discovery Call Booking",
      pricePoint: "₹6,999",
      turnaroundDays: 3,
      openingMessage,
      openingMessageHinglish,
      followUpMessage,
      followUpMessageHinglish,
      demoUrl,
      likelyObjections: [
        {
          objection: "We get clients via referrals.",
          response:
            "Referrals are gold! But when a referred client Googles your agency, a premium mobile portfolio immediately establishes credibility and commands higher ticket pricing.",
        },
      ],
    };
  }

  // 6. SMALL BUSINESS / RETAIL / SALON / GENERAL
  const demoUrl = isSalon ? DEMO_LINKS.salon : DEMO_LINKS.retail;
  const observationEn = hasWebsite
    ? `We saw your website and noticed it takes time to load on phones and lacks a fast 1-tap WhatsApp inquiry button.`
    : `We saw your business profile on Google and noticed you don't have a modern 1-page website where customers can view your catalog/services.`;

  const observationHi = hasWebsite
    ? `Aapki website phone pe slow load hoti hai aur direct WhatsApp inquiry button missing hai.`
    : `Humne Google pe aapka business dekha, listing acchi hai par modern 1-page catalog website missing hai jahan se local buyers direct WhatsApp quote le sakein.`;

  const openingMessage = `Hi team ${lead.name},

We came across your business in ${locationLabel}!

${observationEn}

We create high-converting 1-page business websites that turn local Google searchers into direct WhatsApp inquiries. Delivered in just 48 hours and very feasible / budget-friendly.

Live demo of our work: ${demoUrl}

Please let us know if you are interested or what, happy to share a quick 1-min preview!`;

  const openingMessageHinglish = `Hi team ${lead.name},

Humne aapka business ${locationLabel} me dekha!

${observationHi}

Humne local businesses ke liye sleek 1-page websites banayi hain jisse Google Maps pe search karne wale customers direct WhatsApp inquiry bhejte hain. Delivery sirf 48 hours me ho jati hai aur pricing bohot hi feasible hai.

Hamare work ka live demo yahan dekhein: ${demoUrl}

Batayein agar aap interested hain to hum ${lead.name} ke liye ek quick 1-min preview share karte hain!`;

  const followUpMessage = `Hi team ${lead.name}, following up briefly on the demo for ${lead.name}. Would love to share a 1-minute sample if you have a moment this week!`;
  const followUpMessageHinglish = `Hi team ${lead.name}, bas check karne ke liye message kiya tha ki kya aapne demo dekha? Batayein agar quick sample preview send karein to!`;

  return {
    recommendedService: "1-Page High-Converting Business Website & WhatsApp Funnel",
    suggestedOffer: "48-Hour Mobile-First Showcase + Direct WhatsApp Inquiry Button",
    pricePoint: "₹3,999",
    turnaroundDays: 2,
    openingMessage,
    openingMessageHinglish,
    followUpMessage,
    followUpMessageHinglish,
    demoUrl,
    likelyObjections: [
      {
        objection: "Website ki zarurat nahi lagti.",
        response:
          "Aaj kal 80% log shop visit karne ya call karne se pehle Google pe photos aur rates check karte hain. Ek clean 1-page site se unka trust banta hai aur direct WhatsApp lead aati hai.",
      },
    ],
  };
}
