import { Response } from "express";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { model, filterModel } from "../config/ai";
import prisma from "../prisma";
import { getCache, setCache, clearCache } from "../config/cache";
import { AuthRequest } from "../middlewares/auth.middleware";

export const aiSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
    const limit = Math.max(1, parseInt(req.query["limit"] as string) || 10);
    const skip = (page - 1) * limit;

    if (!query) {
      res.status(400).json({ error: "query is required" });
      return;
    }

    const extractionPrompt = `
You are a search filter extractor for a property rental platform.
Extract search filters from the user's query and return ONLY a JSON object.
No explanation, no markdown, no extra text — just raw JSON.

Listing types available: APARTMENT, HOUSE, VILLA, CABIN

Return this exact structure:
{
  "location": "string or null",
  "type": "APARTMENT | HOUSE | VILLA | CABIN or null",
  "maxPrice": "number or null",
  "guests": "number or null"
}

User query: "${query}"
`;

    const filterResponse = await filterModel.invoke([
      new HumanMessage(extractionPrompt),
    ]);

    let filters: {
      location: string | null;
      type: string | null;
      maxPrice: number | null;
      guests: number | null;
    };

    try {
      const rawText = filterResponse.content as string;
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      filters = JSON.parse(cleaned);
    } catch {
      res.status(500).json({ error: "AI returned invalid response, please try again" });
      return;
    }

    const hasFilters = Object.values(filters).some((v) => v !== null);
    if (!hasFilters) {
      res.status(400).json({
        error: "Could not extract any filters from your query, please be more specific",
      });
      return;
    }

    const where: any = {};
    if (filters.location) {
      where.location = { contains: filters.location, mode: "insensitive" };
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.maxPrice) {
      where.pricePerNight = { lte: filters.maxPrice };
    }
    if (filters.guests) {
      where.guests = { gte: filters.guests };
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        include: {
          host: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      filters,
      data: listings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    if (error?.status === 429) {
      res.status(429).json({ error: "AI service is busy, please try again in a moment" });
      return;
    }
    if (error?.status === 401) {
      res.status(500).json({ error: "AI service configuration error" });
      return;
    }
    console.error("AI Search error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const generateDescription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params["id"] as string;
    const { tone = "professional" } = req.body;
    const userId = req.userId;

    const validTones = ["professional", "casual", "luxury"];
    if (!validTones.includes(tone)) {
      res.status(400).json({ error: "tone must be professional, casual, or luxury" });
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    if (listing.hostId !== userId) {
      res.status(403).json({ error: "You are not the owner of this listing" });
      return;
    }

    const toneInstructions = {
      professional: "Write in a formal, clear, and business-like tone. Focus on facts and features.",
      casual: "Write in a friendly, relaxed, and conversational tone. Make it feel warm and inviting.",
      luxury: "Write in an elegant, premium, and aspirational tone. Make it sound exclusive and high-end.",
    };

    const prompt = `
You are a property listing copywriter.
Generate a compelling description for this property listing.
${toneInstructions[tone as keyof typeof toneInstructions]}
Return ONLY the description text, no extra commentary.

Property details:
- Title: ${listing.title}
- Location: ${listing.location}
- Type: ${listing.type}
- Price per night: $${listing.pricePerNight}
- Max guests: ${listing.guests}
- Amenities: ${listing.amenities.join(", ")}
`;

    const response = await model.invoke([new HumanMessage(prompt)]);
    const description = (response.content as string).trim();

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: { description },
    });

    res.json({ description, listing: updatedListing });

  } catch (error: any) {
    if (error?.status === 429) {
      res.status(429).json({ error: "AI service is busy, please try again in a moment" });
      return;
    }
    if (error?.status === 401) {
      res.status(500).json({ error: "AI service configuration error" });
      return;
    }
    console.error("Generate Description error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// In-memory session storage
const sessionHistory: Map<string, { role: string; content: string }[]> = new Map();

export const chatbot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, message, listingId } = req.body;

    if (!sessionId || !message) {
      res.status(400).json({ error: "sessionId and message are required" });
      return;
    }

    // Step 1 — Get or create session history
    if (!sessionHistory.has(sessionId)) {
      sessionHistory.set(sessionId, []);
    }
    const history = sessionHistory.get(sessionId)!;

    // Step 2 — Build system prompt
    let systemPrompt = "You are a helpful guest support assistant for an Airbnb-like platform.";

    if (listingId) {
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (listing) {
        systemPrompt = `You are a helpful guest support assistant for an Airbnb-like platform.
You are currently helping a guest with questions about this specific listing:

Title: ${listing.title}
Location: ${listing.location}
Price per night: $${listing.pricePerNight}
Max guests: ${listing.guests}
Type: ${listing.type}
Amenities: ${listing.amenities.join(", ")}
Description: ${listing.description}

Answer questions about this listing accurately based on the details above.
If asked something not covered by the listing details, say you don't have that information.`;
      }
    }

    // Step 3 — Add user message to history
    history.push({ role: "user", content: message });

    // Step 4 — Trim history to last 10 exchanges (20 messages)
    while (history.length > 20) {
      history.shift();
    }

    // Step 5 — Build messages array for AI
    const messages = [
      new SystemMessage(systemPrompt),
      ...history.map((h) =>
        h.role === "user" ? new HumanMessage(h.content) : new SystemMessage(h.content)
      ),
    ];

    // Step 6 — Invoke AI
    const response = await model.invoke(messages);
    const reply = (response.content as string).trim();

    // Step 7 — Add AI response to history
    history.push({ role: "assistant", content: reply });

    // Step 8 — Trim again after adding AI response
    while (history.length > 20) {
      history.shift();
    }

    // Step 9 — Update session
    sessionHistory.set(sessionId, history);

    res.json({
      response: reply,
      sessionId,
      messageCount: history.length,
    });

  } catch (error: any) {
    if (error?.status === 429) {
      res.status(429).json({ error: "AI service is busy, please try again in a moment" });
      return;
    }
    if (error?.status === 401) {
      res.status(500).json({ error: "AI service configuration error" });
      return;
    }
    console.error("Chatbot error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Part 4 — Recommendations
export const recommend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    // Step 1 — Fetch last 5 bookings with listing details
    const bookings = await prisma.booking.findMany({
      where: { guestId: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { listing: true },
    });

    if (bookings.length === 0) {
      res.status(400).json({
        error: "No booking history found. Make some bookings first to get recommendations.",
      });
      return;
    }

    // Step 2 — Build booking history summary
    const historySummary = bookings.map((b) => `
- Title: ${b.listing.title}
- Location: ${b.listing.location}
- Type: ${b.listing.type}
- Price per night: $${b.listing.pricePerNight}
- Guests: ${b.listing.guests}
`).join("\n");

    // Step 3 — Ask AI to analyze and return filters
    const prompt = `
You are a property recommendation engine.
Analyze this user's booking history and return ONLY a JSON object.
No explanation, no markdown, no extra text — just raw JSON.

Booking history:
${historySummary}

Return this exact structure:
{
  "preferences": "string describing what the user likes",
  "searchFilters": {
    "location": "string or null",
    "type": "APARTMENT | HOUSE | VILLA | CABIN or null",
    "maxPrice": "number or null",
    "guests": "number or null"
  },
  "reason": "string explaining the recommendation"
}
`;

    const aiResponse = await model.invoke([new HumanMessage(prompt)]);

    let result: {
      preferences: string;
      searchFilters: {
        location: string | null;
        type: string | null;
        maxPrice: number | null;
        guests: number | null;
      };
      reason: string;
    };

    try {
      const rawText = aiResponse.content as string;
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      res.status(500).json({ error: "AI returned invalid response, please try again" });
      return;
    }

    // Step 4 — Build Prisma where clause from AI filters
    const where: any = {
      // Exclude already booked listings
      id: { notIn: bookings.map((b) => b.listingId) },
    };
    if (result.searchFilters.location) {
      where.location = { contains: result.searchFilters.location, mode: "insensitive" };
    }
    if (result.searchFilters.type) {
      where.type = result.searchFilters.type;
    }
    if (result.searchFilters.maxPrice) {
      where.pricePerNight = { lte: result.searchFilters.maxPrice };
    }
    if (result.searchFilters.guests) {
      where.guests = { gte: result.searchFilters.guests };
    }

    // Step 5 — Fetch recommended listings
    const recommendations = await prisma.listing.findMany({
      where,
      take: 5,
    });

    res.json({
      preferences: result.preferences,
      reason: result.reason,
      searchFilters: result.searchFilters,
      recommendations,
    });

  } catch (error: any) {
    if (error?.status === 429) {
      res.status(429).json({ error: "AI service is busy, please try again in a moment" });
      return;
    }
    if (error?.status === 401) {
      res.status(500).json({ error: "AI service configuration error" });
      return;
    }
    console.error("Recommend error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
// Part 5 — Review Summary
export const reviewSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params["id"] as string;

    // Step 1 — Check cache first
    const cacheKey = `review-summary:${id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Step 2 — Check listing exists
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    // Step 3 — Fetch all reviews
    const reviews = await prisma.review.findMany({
      where: { listingId: id },
      include: { user: { select: { name: true } } },
    });

    // Step 4 — Check minimum reviews
    if (reviews.length < 3) {
      res.status(400).json({
        error: "Not enough reviews to generate a summary (minimum 3 required)",
      });
      return;
    }

    // Step 5 — Calculate averageRating in code
    const averageRating = Math.round(
      (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
    ) / 10;

    // Step 6 — Format reviews for AI
    const reviewsText = reviews.map((r) =>
      `- ${r.user.name} (${r.rating}/5): ${r.comment}`
    ).join("\n");

    // Step 7 — Ask AI to summarize
    const prompt = `
You are a property review analyst.
Analyze these guest reviews and return ONLY a JSON object.
No explanation, no markdown, no extra text — just raw JSON.

Reviews:
${reviewsText}

Return this exact structure:
{
  "summary": "2-3 sentence overall summary of guest experience",
  "positives": ["thing 1", "thing 2", "thing 3"],
  "negatives": ["thing 1"] 
}

Note: negatives can be an empty array if there are no complaints.
Do NOT calculate averageRating — that will be added separately.
`;

    const aiResponse = await model.invoke([new HumanMessage(prompt)]);

    let result: {
      summary: string;
      positives: string[];
      negatives: string[];
    };

    try {
      const rawText = aiResponse.content as string;
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      res.status(500).json({ error: "AI returned invalid response, please try again" });
      return;
    }

    // Step 8 — Build final response
    const finalResponse = {
      summary: result.summary,
      positives: result.positives,
      negatives: result.negatives,
      averageRating,
      totalReviews: reviews.length,
    };

    // Step 9 — Cache for 10 minutes
    setCache(cacheKey, finalResponse, 600);

    res.json(finalResponse);

  } catch (error: any) {
    if (error?.status === 429) {
      res.status(429).json({ error: "AI service is busy, please try again in a moment" });
      return;
    }
    if (error?.status === 401) {
      res.status(500).json({ error: "AI service configuration error" });
      return;
    }
    console.error("Review Summary error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};