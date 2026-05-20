import { Response } from "express";
import { HumanMessage } from "@langchain/core/messages";
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

// Part 3 — Chatbot
export const chatbot = async (req: AuthRequest, res: Response): Promise<void> => {};

// Part 4 — Recommendations
export const recommend = async (req: AuthRequest, res: Response): Promise<void> => {};

// Part 5 — Review Summary
export const reviewSummary = async (req: AuthRequest, res: Response): Promise<void> => {};