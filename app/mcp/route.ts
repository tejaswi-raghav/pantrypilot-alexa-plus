import {
  createMcpHandler,
  McpServer,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { findPantryRecipe, pantryItems, pantryRecipes } from "@/lib/pantry-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const recipeIds = pantryRecipes.map((recipe) => recipe.id) as [string, ...string[]];

function toolResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

function createPantryPilotServer() {
  const server = new McpServer({
    name: "pantrypilot-alexa-plus",
    version: "1.0.0",
  });

  server.registerResource(
    "current-pantry",
    "pantry://current",
    {
      title: "Current Pantry",
      description: "The simulated household pantry used by PantryPilot.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({ items: pantryItems, updatedAt: "2026-09-17T00:00:00Z" }),
      }],
    }),
  );

  server.registerTool(
    "read_pantry",
    {
      title: "Read pantry",
      description: "Read the ingredients currently available in the simulated household pantry.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        items: z.array(z.string()),
        itemCount: z.number().int(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => toolResult({ items: [...pantryItems], itemCount: pantryItems.length }),
  );

  server.registerTool(
    "find_recipes",
    {
      title: "Find pantry-first recipes",
      description: "Rank vegetarian dinner recipes using time, pantry coverage, and an optional ingredient preference.",
      inputSchema: z.object({
        maxMinutes: z.number().int().min(10).max(90).default(35),
        vegetarian: z.boolean().default(true),
        useIngredient: z.string().min(1).max(80).optional(),
      }),
      outputSchema: z.object({
        recipes: z.array(z.object({
          id: z.string(),
          title: z.string(),
          minutes: z.number().int(),
          match: z.number(),
          proteinGrams: z.number().int(),
          missingItemCount: z.number().int(),
        })),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ maxMinutes, vegetarian, useIngredient }) => {
      const preference = useIngredient?.toLowerCase();
      const recipes = pantryRecipes
        .filter((recipe) => recipe.minutes <= maxMinutes && (!vegetarian || recipe.vegetarian))
        .map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          minutes: recipe.minutes,
          match: preference && recipe.description.toLowerCase().includes(preference)
            ? Number(Math.min(1, recipe.match + 0.03).toFixed(2))
            : recipe.match,
          proteinGrams: recipe.proteinGrams,
          missingItemCount: recipe.missingItems.length,
        }))
        .sort((a, b) => b.match - a.match);

      return toolResult({ recipes });
    },
  );

  server.registerTool(
    "get_recipe",
    {
      title: "Get recipe",
      description: "Get the full guided-cooking plan for one PantryPilot recipe.",
      inputSchema: z.object({ recipeId: z.enum(recipeIds) }),
      outputSchema: z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        minutes: z.number().int(),
        proteinGrams: z.number().int(),
        missingItems: z.array(z.string()),
        steps: z.array(z.string()),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ recipeId }) => {
      const recipe = findPantryRecipe(recipeId);
      if (!recipe) throw new Error(`Unknown recipeId: ${recipeId}`);
      return toolResult({
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        minutes: recipe.minutes,
        proteinGrams: recipe.proteinGrams,
        missingItems: [...recipe.missingItems],
        steps: [...recipe.steps],
      });
    },
  );

  server.registerTool(
    "build_shopping_list",
    {
      title: "Build shopping list",
      description: "Stage a recipe's missing ingredients after explicit confirmation. This tool never purchases anything.",
      inputSchema: z.object({
        recipeId: z.enum(recipeIds),
        confirmed: z.literal(true).describe("Must be true before the list is staged."),
      }),
      outputSchema: z.object({
        recipeId: z.string(),
        items: z.array(z.string()),
        itemCount: z.number().int(),
        purchaseMade: z.literal(false),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ recipeId }) => {
      const recipe = findPantryRecipe(recipeId);
      if (!recipe) throw new Error(`Unknown recipeId: ${recipeId}`);
      return toolResult({
        recipeId: recipe.id,
        items: [...recipe.missingItems],
        itemCount: recipe.missingItems.length,
        purchaseMade: false,
      });
    },
  );

  return server;
}

const handler = createMcpHandler(createPantryPilotServer, {
  legacy: "stateless",
  responseMode: "auto",
});

function allowedOriginHostnames() {
  const hostnames = new Set([
    "localhost",
    "127.0.0.1",
    "pantrypilot-alexa-plus.vercel.app",
  ]);

  for (const value of [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    if (value) hostnames.add(value.split(":")[0]);
  }

  return [...hostnames];
}

function withCors(response: Response, origin: string | null) {
  const headers = new Headers(response.headers);
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Expose-Headers", "MCP-Session-Id, MCP-Protocol-Version");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function serve(request: Request) {
  const rejected = originValidationResponse(request, allowedOriginHostnames());
  if (rejected) return rejected;
  return withCors(await handler.fetch(request), request.headers.get("origin"));
}

export const POST = serve;
export const GET = serve;
export const DELETE = serve;

export function OPTIONS(request: Request) {
  const rejected = originValidationResponse(request, allowedOriginHostnames());
  if (rejected) return rejected;

  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: {
      ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID",
      "Access-Control-Expose-Headers": "MCP-Session-Id, MCP-Protocol-Version",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
