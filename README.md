# PantryPilot — Alexa+ Experience

PantryPilot is a polished, browser-based simulation of a brand experience for Alexa+. A customer asks for a weeknight dinner, Alexa+ coordinates brand tools, and the customer can tune servings or approve missing ingredients without leaving the conversation.

This submission follows the “new to MCP” path in the project brief: it is a self-contained simulated experience, not a production Alexa integration. The interaction model is informed by the [MCP Apps Agent Skills guide](https://apps.extensions.modelcontextprotocol.io/api/#build-with-agent-skills): structured tools drive the same state as the visible interface, tool activity is transparent, and consequential actions require explicit confirmation.

## What the demo shows

- A realistic Alexa+ request-to-result conversation
- A visual dinner recommendation based on pantry, diet, and time constraints
- Adjustable servings with live ingredient scaling
- Three selectable pantry-first meal options
- An approval-gated shopping list with removable items and feedback
- A guided cooking mode with step progress and working timers
- Conversational and one-tap plan refinements
- A live brand-tool trace for `read_pantry`, `find_recipe`, and `build_cart`
- An inspectable JSON result with a clear `purchaseMade: false` boundary
- Responsive desktop and mobile layouts
- Browser-native WebMCP tools that agents can discover and call

## Run locally

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Create a production build with:

```bash
npm run build
```

The repository is a standard Next.js project and can be imported directly into Vercel with no environment variables.

## Agent-facing tools

Browsers that support the proposed imperative WebMCP interface can discover three page-scoped tools:

| Tool | Purpose | Side effect |
| --- | --- | --- |
| `read_current_recipe` | Read the visible recipe, time, servings, and missing-item count | None |
| `select_recipe` | Select one of the three visible recipe options | Updates the active meal |
| `configure_recipe_servings` | Set servings from 1–12 | Updates the visible recipe card and ingredient quantities |
| `add_missing_items_to_list` | Add missing ingredients after `confirmed: true` | Updates the simulated list; never purchases |
| `start_guided_cooking` | Open the selected meal at step one | Opens the visible guided-cooking dialog |

Each tool validates its input and updates the same React state as the on-screen controls. Unsupported browsers simply ignore the optional registration and the visual demo continues to work.

## Interaction checklist

1. Switch among the three meal options or use a quick refinement.
2. Use the plus/minus controls to scale servings and ingredients.
3. Add missing items, then remove individual items from the list if needed.
4. Open **Start guided cooking** and move through the recipe steps or run a timer.
5. Open **Inspect result** to see the structured response data.

## Project structure

```text
app/
  page.tsx       Experience UI, state, and WebMCP registrations
  globals.css    Responsive visual system and interaction states
  layout.tsx     Page metadata and document shell
public/
  grain-bowl.jpg Optimized original recipe photography
  favicon.svg    PantryPilot mark
```

The project uses React 19, TypeScript, Vinext/Next-compatible routing, Tailwind CSS 4, and Lucide icons. It requires no API key, database, account, or external service.

## Accessibility and trust

- Semantic landmarks and useful accessible names
- Visible keyboard focus states
- Reduced-motion support
- Responsive behavior down to mobile widths
- No purchase, checkout, or external transmission in the simulation
- Explicit confirmation before updating the shopping list

## From simulation to production

For a production Alexa+ submission, replace the in-page simulated tools with a self-hosted Streamable HTTP MCP server using specification `2025-11-25` or later, preserve the same tool boundaries, add authentication and durable household state, and test with the current Alexa+ developer preview requirements.

## Asset note

The food photograph was generated specifically for this project. No external runtime assets are fetched.
