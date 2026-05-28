import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import sqlite3 from "sqlite3";

dotenv.config();

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: "*" });

/* -------------------- OPENROUTER SETUP -------------------- */
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

/* -------------------- SQLITE SETUP -------------------- */
const db = new sqlite3.Database("./movies.db");

db.run(`
  CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_input TEXT,
    recommended_movies TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// TEST ROUTE 
fastify.get("/", async () => {
  return { message: "Backend running 🚀" };
});

//main route
fastify.post("/recommend", async (request, reply) => {
  const { input } = request.body;

  try {
    // AI CALL
    const response = await client.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Give 5 movie recommendations for: ${input}. Return only movie names separated by commas.`,
        },
      ],
    });

    const text = response.choices[0].message.content;

    const movies = text.split(",").map((m) => m.trim());

    // SAVE TO SQLITE
    db.run(
      `INSERT INTO recommendations (user_input, recommended_movies)
       VALUES (?, ?)`,
      [input, JSON.stringify(movies)]
    );

    // RESPONSE
    return {
      success: true,
      input,
      recommendations: movies,
    };

  } catch (err) {
    return reply.code(500).send({ error: err.message });
  }
});

//server
fastify.listen({ port: 5000 }, () => {
  console.log("Server running on http://localhost:5000");
});