import { ChatGroq } from "@langchain/groq";

// General model
export const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0.7,
  apiKey: process.env["GROQ_API_KEY"],
});

// Deterministic model — filter extraction only
export const filterModel = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  apiKey: process.env["GROQ_API_KEY"],
});