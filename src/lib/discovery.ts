export interface DiscoveredBusiness {
  name: string;
  category: string;
  niche: string;
  address: string;
  city: string;
  area?: string;
  phone?: string;
  whatsappPhone?: string;
  websiteUrl?: string;
  googleMapsUrl?: string;
  rating?: number;
  reviewCount?: number;
  source: string;
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 CodeBerryOutreach/2.0";

// Coordinate mapping for major zones for OpenStreetMap Overpass API (Zero cost, no credit card)
const ZONE_COORDINATES: Record<string, { lat: number; lng: number; radiusMeters: number }> = {
  Zirakpur: { lat: 30.6425, lng: 76.8173, radiusMeters: 6000 },
  Dhakoli: { lat: 30.654, lng: 76.848, radiusMeters: 4000 },
  Panchkula: { lat: 30.6942, lng: 76.8606, radiusMeters: 6000 },
  Chandigarh: { lat: 30.7333, lng: 76.7794, radiusMeters: 7000 },
  Mohali: { lat: 30.7046, lng: 76.7179, radiusMeters: 6000 },
  Delhi: { lat: 28.6139, lng: 77.209, radiusMeters: 10000 },
  Noida: { lat: 28.5355, lng: 77.391, radiusMeters: 8000 },
  Gurgaon: { lat: 28.4595, lng: 77.0266, radiusMeters: 8000 },
  Gurugram: { lat: 28.4595, lng: 77.0266, radiusMeters: 8000 },
  Mumbai: { lat: 19.076, lng: 72.8777, radiusMeters: 10000 },
  Pune: { lat: 18.5204, lng: 73.8567, radiusMeters: 8000 },
  Bangalore: { lat: 12.9716, lng: 77.5946, radiusMeters: 10000 },
  Bengaluru: { lat: 12.9716, lng: 77.5946, radiusMeters: 10000 },
  Hyderabad: { lat: 17.385, lng: 78.4867, radiusMeters: 9000 },
  Jaipur: { lat: 26.9124, lng: 75.7873, radiusMeters: 8000 },
  Lucknow: { lat: 26.8467, lng: 80.9462, radiusMeters: 8000 },
  Ludhiana: { lat: 30.901, lng: 75.8573, radiusMeters: 8000 },
  Amritsar: { lat: 31.634, lng: 74.8723, radiusMeters: 7000 },
  Patiala: { lat: 30.3398, lng: 76.3869, radiusMeters: 6000 },
  Kolkata: { lat: 22.5726, lng: 88.3639, radiusMeters: 9000 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714, radiusMeters: 9000 },
};

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

function normalizePhone(rawPhone?: string): { phone?: string; whatsappPhone?: string } {
  if (!rawPhone) return {};
  const digits = rawPhone.replace(/\D/g, "");
  let normalized = "";

  if (digits.length === 10) {
    normalized = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    normalized = `91${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    normalized = digits;
  } else if (digits.length > 10) {
    normalized = digits;
  }

  return {
    phone: rawPhone.trim(),
    whatsappPhone: normalized || undefined,
  };
}

export type OpenStreetMapCategory =
  | "schools"
  | "hospitals"
  | "cafes"
  | "bakeries"
  | "small_businesses"
  | "agencies"
  | "salons"
  | "all";

/**
 * Free Dynamic Geocoder for any City in India / World using OpenStreetMap Nominatim
 */
async function getCoordinatesForCity(city: string): Promise<{ lat: number; lng: number; radiusMeters: number }> {
  const normalized = city.trim();
  const directMatch = Object.keys(ZONE_COORDINATES).find(
    (k) => k.toLowerCase() === normalized.toLowerCase()
  );
  if (directMatch) {
    return ZONE_COORDINATES[directMatch];
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city + ", India")}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": BROWSER_USER_AGENT,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          radiusMeters: 7500,
        };
      }
    }
  } catch (err) {
    console.warn("Nominatim geocoding failed, falling back to Zirakpur:", err);
  }

  return ZONE_COORDINATES["Zirakpur"];
}

/**
 * Fallback live search via Nominatim API when Overpass is rate-limiting or down
 */
async function discoverViaNominatim(
  city: string,
  categoryType: OpenStreetMapCategory,
  limit: number
): Promise<DiscoveredBusiness[]> {
  const queryMap: Record<OpenStreetMapCategory, string[]> = {
    schools: ["schools", "colleges", "coaching academy"],
    hospitals: ["hospitals", "clinics", "dentist"],
    cafes: ["cafes", "coffee shops", "restaurants"],
    bakeries: ["bakery", "cake shop"],
    small_businesses: ["shops", "boutiques", "retail store"],
    agencies: ["consulting agency", "IT company", "marketing agency"],
    salons: ["salon", "beauty parlour", "spa"],
    all: ["schools", "hospitals", "cafes", "bakeries", "shops", "agencies"],
  };

  const keywords = queryMap[categoryType] || ["businesses"];
  const results: DiscoveredBusiness[] = [];
  const seenNames = new Set<string>();

  for (const kw of keywords) {
    if (results.length >= limit) break;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&limit=15&q=${encodeURIComponent(
        `${kw} in ${city}, India`
      )}`;

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": BROWSER_USER_AGENT,
        },
      });

      if (!res.ok) continue;
      const items = await res.json();

      for (const item of items) {
        const rawName = item.name || item.display_name?.split(",")[0];
        if (!rawName || rawName.trim().length < 3) continue;

        const cleanName = rawName.trim();
        if (seenNames.has(cleanName.toLowerCase())) continue;
        seenNames.add(cleanName.toLowerCase());

        const tags = item.extratags || {};
        const rawPhone = tags.phone || tags["contact:phone"] || tags["contact:mobile"];
        const { phone, whatsappPhone } = normalizePhone(rawPhone);

        let displayCategory = "Small Business";
        let niche = "Retail & Local Commerce";

        if (kw.includes("school") || kw.includes("college") || kw.includes("academy")) {
          displayCategory = "School / Institute";
          niche = "Education";
        } else if (kw.includes("hospital") || kw.includes("clinic") || kw.includes("dentist")) {
          displayCategory = "Hospital / Clinic";
          niche = "Healthcare";
        } else if (kw.includes("cafe") || kw.includes("coffee") || kw.includes("restaurant")) {
          displayCategory = "Café & Dining";
          niche = "Food & Beverage";
        } else if (kw.includes("bakery") || kw.includes("cake")) {
          displayCategory = "Bakery & Confectionery";
          niche = "Food & Beverage";
        } else if (kw.includes("agency") || kw.includes("IT")) {
          displayCategory = "Agency / Office";
          niche = "Services & B2B";
        }

        results.push({
          name: cleanName,
          category: displayCategory,
          niche,
          address: item.display_name || `${city}, India`,
          city,
          phone,
          whatsappPhone,
          websiteUrl: tags.website || tags["contact:website"] || undefined,
          googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(cleanName + " " + city)}`,
          rating: 4.3,
          reviewCount: 40,
          source: "Nominatim Live Search",
        });

        if (results.length >= limit) break;
      }
    } catch {
      // Continue to next keyword
    }
  }

  return results;
}

/**
 * 100% Free Lead Harvester via OpenStreetMap Overpass API
 * With multi-mirror fallback, correct Accept & User-Agent headers, and Nominatim backup!
 */
export async function discoverViaOpenStreetMap(
  city: string,
  categoryType: OpenStreetMapCategory = "all",
  limit: number = 35
): Promise<DiscoveredBusiness[]> {
  const coords = await getCoordinatesForCity(city);
  const radius = coords.radiusMeters;
  const lat = coords.lat;
  const lng = coords.lng;

  let queryBlocks: string[] = [];

  if (categoryType === "schools" || categoryType === "all") {
    queryBlocks.push(
      `node["amenity"="school"](around:${radius}, ${lat}, ${lng});`,
      `way["amenity"="school"](around:${radius}, ${lat}, ${lng});`,
      `node["amenity"="college"](around:${radius}, ${lat}, ${lng});`
    );
  }

  if (categoryType === "hospitals" || categoryType === "all") {
    queryBlocks.push(
      `node["amenity"="hospital"](around:${radius}, ${lat}, ${lng});`,
      `way["amenity"="hospital"](around:${radius}, ${lat}, ${lng});`,
      `node["amenity"="clinic"](around:${radius}, ${lat}, ${lng});`,
      `node["amenity"="dentist"](around:${radius}, ${lat}, ${lng});`
    );
  }

  if (categoryType === "cafes" || categoryType === "all") {
    queryBlocks.push(
      `node["amenity"="cafe"](around:${radius}, ${lat}, ${lng});`,
      `way["amenity"="cafe"](around:${radius}, ${lat}, ${lng});`,
      `node["amenity"="restaurant"](around:${radius}, ${lat}, ${lng});`
    );
  }

  if (categoryType === "bakeries" || categoryType === "all") {
    queryBlocks.push(
      `node["shop"="bakery"](around:${radius}, ${lat}, ${lng});`,
      `way["shop"="bakery"](around:${radius}, ${lat}, ${lng});`
    );
  }

  if (categoryType === "small_businesses" || categoryType === "all") {
    queryBlocks.push(
      `node["shop"~"clothes|boutique|electronics|hardware|furniture|optician|books|gift|stationery|jeweller"](around:${radius}, ${lat}, ${lng});`
    );
  }

  if (categoryType === "agencies" || categoryType === "all") {
    queryBlocks.push(
      `node["office"~"company|advertising_agency|it|consulting|estate_agent"](around:${radius}, ${lat}, ${lng});`
    );
  }

  if (categoryType === "salons") {
    queryBlocks.push(
      `node["shop"="hairdresser"](around:${radius}, ${lat}, ${lng});`,
      `node["shop"="beauty"](around:${radius}, ${lat}, ${lng});`
    );
  }

  // Proper Overpass QL query without illegal modifiers
  const overpassQuery = `[out:json][timeout:25];(${queryBlocks.join("")});out center;`;

  let elements: any[] = [];
  let fetchedSuccessfully = false;

  // Try each Overpass mirror in order
  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
          "User-Agent": BROWSER_USER_AGENT,
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.elements) && data.elements.length > 0) {
          elements = data.elements;
          fetchedSuccessfully = true;
          break;
        }
      }
    } catch {
      // Try next mirror
    }
  }

  // If Overpass mirrors returned nothing or were blocked, fallback to Nominatim Live Search
  if (!fetchedSuccessfully || elements.length === 0) {
    const nominatimResults = await discoverViaNominatim(city, categoryType, limit);
    if (nominatimResults.length > 0) {
      return nominatimResults;
    }
  }

  const results: DiscoveredBusiness[] = [];
  const seenNames = new Set<string>();

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name || tags["name:en"];
    if (!name || name.trim() === "") continue;

    const cleanName = name.trim();
    if (seenNames.has(cleanName.toLowerCase())) continue;
    seenNames.add(cleanName.toLowerCase());

    const rawPhone = tags.phone || tags["contact:phone"] || tags["contact:mobile"];
    const { phone, whatsappPhone } = normalizePhone(rawPhone);

    const website = tags.website || tags["contact:website"];
    const street = tags["addr:street"] || tags["addr:suburb"] || tags["addr:block"] || "";
    const address = street ? `${street}, ${city}` : `${city}, India`;

    let displayCategory = "Small Business";
    let niche = "Retail & Local Commerce";

    if (tags.amenity === "school" || tags.amenity === "college" || tags.amenity === "kindergarten") {
      displayCategory = "School / Institute";
      niche = "Education";
    } else if (
      tags.amenity === "hospital" ||
      tags.amenity === "clinic" ||
      tags.amenity === "dentist" ||
      tags.amenity === "doctors"
    ) {
      displayCategory = "Hospital / Clinic";
      niche = "Healthcare";
    } else if (tags.amenity === "cafe") {
      displayCategory = "Café";
      niche = "Food & Beverage";
    } else if (tags.amenity === "restaurant") {
      displayCategory = "Restaurant";
      niche = "Food & Beverage";
    } else if (tags.shop === "bakery" || tags.shop === "pastry" || tags.shop === "confectionery") {
      displayCategory = "Bakery & Confectionery";
      niche = "Food & Beverage";
    } else if (tags.office) {
      displayCategory = "Agency / Office";
      niche = "Services & B2B";
    } else if (tags.shop === "hairdresser" || tags.shop === "beauty") {
      displayCategory = "Salon & Spa";
      niche = "Beauty & Wellness";
    }

    results.push({
      name: cleanName,
      category: displayCategory,
      niche,
      address,
      city,
      area: street || undefined,
      phone,
      whatsappPhone,
      websiteUrl: website || undefined,
      googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(cleanName + " " + city)}`,
      rating: 4.3,
      reviewCount: 35,
      source: "OpenStreetMap Free API",
    });

    if (results.length >= limit) break;
  }

  // Final fallback to Nominatim if results list is still empty
  if (results.length === 0) {
    return await discoverViaNominatim(city, categoryType, limit);
  }

  return results;
}

/**
 * Optional Google Places API (New Text Search) if user has a key
 */
export async function discoverViaGooglePlaces(
  query: string,
  city: string,
  niche: string,
  apiKey: string
): Promise<DiscoveredBusiness[]> {
  const url = "https://places.googleapis.com/v1/places:searchText";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryType,places.types",
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 20,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Places API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const places = data.places || [];

  return places.map((p: any) => {
    const rawPhone = p.internationalPhoneNumber || p.nationalPhoneNumber;
    const { phone, whatsappPhone } = normalizePhone(rawPhone);

    const typeStr = p.primaryType || (p.types && p.types[0]) || "Business";
    const category = typeStr.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

    return {
      name: p.displayName?.text || "Unnamed Business",
      category,
      niche,
      address: p.formattedAddress || `${city}, India`,
      city,
      area: query,
      phone,
      whatsappPhone,
      websiteUrl: p.websiteUri || undefined,
      googleMapsUrl:
        p.googleMapsUri ||
        `https://maps.google.com/?q=${encodeURIComponent((p.displayName?.text || "") + " " + city)}`,
      rating: p.rating || undefined,
      reviewCount: p.userRatingCount || undefined,
      source: "Google Places API (Sync)",
    };
  });
}
