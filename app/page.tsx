"use client";

import {
  ArrowRight,
  Check,
  ChefHat,
  ChevronRight,
  CircleCheck,
  Clock3,
  Flame,
  Leaf,
  ListChecks,
  Mic,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  ShoppingBag,
  Sparkles,
  Timer,
  UtensilsCrossed,
  Waves,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";

type WebMcpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};

type WebMcpDocument = Document & {
  modelContext?: {
    registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void | Promise<void>;
  };
};

type Recipe = {
  id: string;
  title: string;
  kicker: string;
  description: string;
  minutes: number;
  match: number;
  protein: number;
  missing: string[];
  ingredients: Array<{ name: string; amount: number; unit: string }>;
  steps: Array<{ title: string; body: string; minutes: number }>;
};

const recipes: Recipe[] = [
  {
    id: "golden-harvest",
    title: "Golden harvest bowl",
    kicker: "Best pantry match",
    description: "Roasted sweet potato, crisp chickpeas, greens and avocado with a bright lemon–tahini drizzle.",
    minutes: 30,
    match: 96,
    protein: 22,
    missing: ["Avocado", "Kale", "Lemon", "Tahini"],
    ingredients: [
      { name: "Sweet potato", amount: 2, unit: "medium" },
      { name: "Chickpeas", amount: 1, unit: "can" },
      { name: "Avocado", amount: 1, unit: "ripe" },
      { name: "Kale", amount: 1, unit: "bunch" },
    ],
    steps: [
      { title: "Heat the oven", body: "Set the oven to 220°C. Line a large tray and rinse the chickpeas.", minutes: 3 },
      { title: "Roast until golden", body: "Toss sweet potato and chickpeas with olive oil, cumin and salt. Roast for 18 minutes.", minutes: 18 },
      { title: "Make the drizzle", body: "Whisk tahini, lemon, warm water and a pinch of salt until silky.", minutes: 4 },
      { title: "Build the bowls", body: "Layer grains, kale and roasted vegetables. Add avocado, herbs and the drizzle.", minutes: 5 },
    ],
  },
  {
    id: "harissa-crunch",
    title: "Harissa crunch bowl",
    kicker: "Bolder & faster",
    description: "Smoky chickpeas, roasted peppers and herby couscous with cooling yogurt and toasted seeds.",
    minutes: 24,
    match: 91,
    protein: 25,
    missing: ["Red pepper", "Couscous", "Greek yogurt"],
    ingredients: [
      { name: "Chickpeas", amount: 1.5, unit: "cans" },
      { name: "Red pepper", amount: 2, unit: "whole" },
      { name: "Couscous", amount: 1.5, unit: "cups" },
      { name: "Yogurt", amount: 0.75, unit: "cup" },
    ],
    steps: [
      { title: "Bloom the couscous", body: "Cover couscous with hot stock and rest, covered, until tender.", minutes: 6 },
      { title: "Char the vegetables", body: "Cook pepper and chickpeas with harissa until glossy and deeply colored.", minutes: 12 },
      { title: "Season the yogurt", body: "Mix yogurt with lemon zest, salt and chopped herbs.", minutes: 3 },
      { title: "Finish with crunch", body: "Fluff the couscous, pile on vegetables and scatter over seeds.", minutes: 3 },
    ],
  },
  {
    id: "green-goddess",
    title: "Green goddess bowl",
    kicker: "Freshest option",
    description: "Warm grains and garlicky greens with avocado, cucumber and an herby lime dressing.",
    minutes: 20,
    match: 88,
    protein: 19,
    missing: ["Cucumber", "Lime"],
    ingredients: [
      { name: "Cooked grains", amount: 3, unit: "cups" },
      { name: "Kale", amount: 1, unit: "bunch" },
      { name: "Avocado", amount: 1, unit: "ripe" },
      { name: "Cucumber", amount: 1, unit: "large" },
    ],
    steps: [
      { title: "Warm the grains", body: "Heat the grains with a splash of water and a pinch of salt.", minutes: 4 },
      { title: "Wilt the greens", body: "Sauté kale with garlic until glossy but still bright.", minutes: 6 },
      { title: "Blend the dressing", body: "Blend herbs, lime, olive oil and yogurt until smooth.", minutes: 5 },
      { title: "Assemble", body: "Arrange everything in wide bowls and spoon over the dressing.", minutes: 5 },
    ],
  },
];

const plannedDays = [
  { day: "Today", label: "Harvest bowl", recipe: 0 },
  { day: "Thu", label: "Harissa crunch", recipe: 1 },
  { day: "Fri", label: "Green goddess", recipe: 2 },
];

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".0", "");
}

export default function Home() {
  const [recipeIndex, setRecipeIndex] = useState(0);
  const [servings, setServings] = useState(4);
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const [assistantLine, setAssistantLine] = useState("I used what is fresh, what you already have, and your 35-minute limit.");
  const [showTrace, setShowTrace] = useState(false);
  const [cookOpen, setCookOpen] = useState(false);
  const [cookStep, setCookStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const recipe = recipes[recipeIndex];
  const recipeRef = useRef(recipe);
  const servingsRef = useRef(servings);
  const cartRef = useRef(cartItems);

  useEffect(() => {
    recipeRef.current = recipe;
    servingsRef.current = servings;
    cartRef.current = cartItems;
  }, [recipe, servings, cartItems]);

  const scaledIngredients = useMemo(
    () => recipe.ingredients.map((item) => ({ ...item, amount: item.amount * servings / 4 })),
    [recipe, servings],
  );

  const missingInCart = recipe.missing.filter((item) => cartItems.includes(item)).length;
  const timerLabel = `${String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:${String(timerSeconds % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;
    const interval = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          toast.success("Timer finished", { description: "Ready for the next step." });
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  useEffect(() => {
    const context = (document as WebMcpDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: WebMcpTool) => {
      void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    };

    register({
      name: "read_current_recipe",
      title: "Read current recipe",
      description: "Read the recipe currently selected in PantryPilot, including servings and shopping-list state.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({
        id: recipeRef.current.id,
        recipe: recipeRef.current.title,
        minutes: recipeRef.current.minutes,
        servings: servingsRef.current,
        missingItems: recipeRef.current.missing.filter((item) => !cartRef.current.includes(item)),
      }),
    });

    register({
      name: "select_recipe",
      title: "Select recipe",
      description: "Select one of the visible PantryPilot recipe options by its stable ID.",
      inputSchema: {
        type: "object",
        properties: { recipeId: { type: "string", enum: recipes.map((item) => item.id) } },
        required: ["recipeId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const id = (input as { recipeId?: unknown })?.recipeId;
        const index = recipes.findIndex((item) => item.id === id);
        if (index < 0) throw new Error("Unknown recipeId");
        setRecipeIndex(index);
        setCookStep(0);
        return { selected: recipes[index].id, recipe: recipes[index].title };
      },
    });

    register({
      name: "configure_recipe_servings",
      title: "Configure recipe servings",
      description: "Set the visible recipe to between 1 and 12 servings.",
      inputSchema: {
        type: "object",
        properties: { servings: { type: "integer", minimum: 1, maximum: 12 } },
        required: ["servings"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const value = (input as { servings?: unknown })?.servings;
        if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 12) throw new Error("servings must be an integer from 1 to 12");
        setServings(value);
        return { recipe: recipeRef.current.title, servings: value };
      },
    });

    register({
      name: "add_missing_items_to_list",
      title: "Add missing items to list",
      description: "Add the selected recipe's missing ingredients to the simulated list after explicit confirmation. This never purchases anything.",
      inputSchema: {
        type: "object",
        properties: { confirmed: { type: "boolean", description: "Must be true to update the list." } },
        required: ["confirmed"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        if ((input as { confirmed?: unknown })?.confirmed !== true) throw new Error("confirmed must be true");
        const next = Array.from(new Set([...cartRef.current, ...recipeRef.current.missing]));
        setCartItems(next);
        return { added: recipeRef.current.missing.length, listCount: next.length, purchased: false };
      },
    });

    register({
      name: "start_guided_cooking",
      title: "Start guided cooking",
      description: "Open guided cooking for the selected recipe at its first step.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        setCookStep(0);
        setCookOpen(true);
        return { recipe: recipeRef.current.title, step: 1, totalSteps: recipeRef.current.steps.length };
      },
    });

    return () => lifecycle.abort();
  }, []);

  const selectRecipe = (index: number) => {
    setRecipeIndex(index);
    setCookStep(0);
    setAssistantLine(index === 0
      ? "Back to your strongest pantry match—colorful, quick, and almost entirely on hand."
      : `${recipes[index].title} is ready. It stays inside your time limit and needs ${recipes[index].missing.length} extra items.`);
  };

  const addMissingItems = () => {
    const newlyAdded = recipe.missing.filter((item) => !cartItems.includes(item));
    setCartItems((current) => Array.from(new Set([...current, ...recipe.missing])));
    toast.success(newlyAdded.length ? `${newlyAdded.length} items added` : "Your list is already ready", {
      description: "Nothing has been purchased.",
    });
  };

  const removeCartItem = (item: string) => {
    setCartItems((current) => current.filter((entry) => entry !== item));
    toast("Removed from your list", { description: item });
  };

  const refinePlan = (request: string) => {
    const normalized = request.toLowerCase();
    if (normalized.includes("protein")) {
      selectRecipe(1);
      setAssistantLine("I moved you to the higher-protein option: 25g per serving, still under 25 minutes.");
    } else if (normalized.includes("fresh") || normalized.includes("light")) {
      selectRecipe(2);
      setAssistantLine("I picked the freshest option and kept it to two missing ingredients.");
    } else if (normalized.includes("nut")) {
      setAssistantLine("Done—the plan is nut-free. I’ll keep toasted seeds as an optional finish.");
    } else {
      setAssistantLine(`I’ve folded “${request}” into the plan and kept your time and pantry constraints.`);
    }
    setPrompt("");
  };

  const startCooking = () => {
    setCookStep(0);
    setTimerSeconds(0);
    setTimerRunning(false);
    setCookOpen(true);
  };

  const startStepTimer = () => {
    setTimerSeconds(recipe.steps[cookStep].minutes * 60);
    setTimerRunning(true);
  };

  return (
    <main className="app-shell">
      <Toaster theme="light" richColors position="bottom-center" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="PantryPilot home">
          <span className="brand-mark"><Waves size={21} strokeWidth={2.4} /></span>
          <span>pantry<span>pilot</span></span>
        </a>
        <div className="topbar-center" aria-label="Experience status">
          <span className="status-light" />
          <span>Alexa+ is ready in Kitchen</span>
        </div>
        <div className="topbar-actions">
          <button className="cart-button" onClick={() => document.getElementById("shopping-list")?.scrollIntoView({ behavior: "smooth" })}>
            <ShoppingBag size={18} />
            <span>List</span>
            <b>{cartItems.length}</b>
          </button>
          <button className="avatar" aria-label="Household profile">RB</button>
        </div>
      </header>

      <div className="workspace" id="top">
        <aside className="week-rail">
          <div>
            <p className="overline">Wednesday · 17 Sep</p>
            <h2>Good evening,<br />Raghav.</h2>
            <p className="rail-copy">Your week is planned around what is fresh and already at home.</p>
          </div>

          <nav className="day-list" aria-label="Dinner plan">
            <div className="rail-section-title"><span>Dinner plan</span><b>3 meals</b></div>
            {plannedDays.map((item, index) => (
              <button key={item.day} className={`day-card ${recipeIndex === item.recipe ? "active" : ""}`} onClick={() => selectRecipe(item.recipe)}>
                <span>{item.day}</span>
                <strong>{item.label}</strong>
                {index === 0 ? <em>Tonight</em> : <ChevronRight size={16} />}
              </button>
            ))}
          </nav>

          <div className="waste-card">
            <div className="waste-ring"><span>82%</span></div>
            <div><strong>Pantry-first week</strong><p>11 ingredients used before they expire.</p></div>
          </div>
        </aside>

        <section className="main-stage" aria-label="Alexa meal planning experience">
          <div className="stage-heading">
            <div>
              <p className="overline accent">Tonight with Alexa+</p>
              <h1>Your best dinner,<br /><span>already half done.</span></h1>
            </div>
            <div className="time-saved"><Clock3 size={17} /><div><span>Time saved</span><strong>42 min</strong></div></div>
          </div>

          <div className="intent-card">
            <div className="voice-orb"><Sparkles size={19} /></div>
            <div className="intent-copy">
              <span>Your request</span>
              <p>“Something colorful, vegetarian, under 35 minutes—and use the sweet potatoes.”</p>
            </div>
            <button className={`listen-control ${listening ? "is-listening" : ""}`} onClick={() => setListening(!listening)} aria-label={listening ? "Stop listening" : "Refine with voice"}>
              <Mic size={18} /> {listening ? "Listening" : "Refine"}
            </button>
          </div>

          <div className="assistant-note">
            <div><Waves size={17} /></div>
            <p>{assistantLine}</p>
          </div>

          <article className="feature-card" aria-live="polite">
            <div className="feature-image">
              <Image
                src="/grain-bowl.jpg"
                alt="Colorful roasted vegetable and chickpea bowl with greens and avocado"
                fill
                priority
                sizes="(max-width: 760px) 100vw, (max-width: 1180px) 72vw, 700px"
              />
              <span className="match-badge"><Sparkles size={14} /> {recipe.match}% match</span>
              <div className="image-summary">
                <span><Flame size={15} /> {recipe.protein}g protein</span>
                <span><Leaf size={15} /> Vegetarian</span>
              </div>
            </div>

            <div className="feature-content">
              <div className="recipe-title-row">
                <div><p className="overline">{recipe.kicker}</p><h2>{recipe.title}</h2></div>
                <div className="serving-stepper" aria-label="Servings">
                  <button onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Decrease servings"><Minus size={15} /></button>
                  <span><b>{servings}</b> servings</span>
                  <button onClick={() => setServings(Math.min(12, servings + 1))} aria-label="Increase servings"><Plus size={15} /></button>
                </div>
              </div>

              <p className="recipe-description">{recipe.description}</p>
              <div className="recipe-facts">
                <span><Clock3 size={16} /><b>{recipe.minutes}</b> minutes</span>
                <span><UtensilsCrossed size={16} /> Easy</span>
                <span><ShoppingBag size={16} /> {recipe.missing.length - missingInCart} left to add</span>
              </div>

              <div className="ingredient-list">
                {scaledIngredients.map((item) => (
                  <div key={item.name}><span><Check size={14} /> {item.name}</span><strong>{formatAmount(item.amount)} {item.unit}</strong></div>
                ))}
              </div>

              <div className="primary-actions">
                <button className="cook-action" onClick={startCooking}><Play size={17} fill="currentColor" /> Start guided cooking</button>
                <button className={`list-action ${missingInCart === recipe.missing.length ? "complete" : ""}`} onClick={addMissingItems}>
                  {missingInCart === recipe.missing.length ? <><CircleCheck size={17} /> List ready</> : <><Plus size={17} /> Add {recipe.missing.length - missingInCart} items</>}
                </button>
              </div>
            </div>
          </article>

          <div className="alternatives-row">
            <span>Other good fits</span>
            {recipes.map((item, index) => (
              <button key={item.id} className={index === recipeIndex ? "selected" : ""} onClick={() => selectRecipe(index)}>
                <div><strong>{item.title}</strong><span>{item.minutes} min · {item.match}% match</span></div>
                {index === recipeIndex ? <Check size={16} /> : <ArrowRight size={16} />}
              </button>
            ))}
          </div>

          <form className="composer" onSubmit={(event) => { event.preventDefault(); if (prompt.trim()) refinePlan(prompt.trim()); }}>
            <button type="button" className={`composer-mic ${listening ? "is-listening" : ""}`} onClick={() => setListening(!listening)} aria-label="Use voice"><Mic size={19} /></button>
            <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={listening ? "Listening…" : "Ask for a change…"} aria-label="Ask Alexa+ to refine the plan" />
            <button type="submit" disabled={!prompt.trim()} aria-label="Send request"><Send size={18} /></button>
          </form>
          <div className="quick-prompts" aria-label="Quick refinements">
            {["More protein", "Keep it nut-free", "Make it lighter"].map((item) => <button key={item} onClick={() => refinePlan(item)}>{item}</button>)}
          </div>
        </section>

        <aside className="insight-rail">
          <section className="rail-card" id="shopping-list">
            <div className="rail-card-heading">
              <div><p className="overline">FreshCart list</p><h2>{cartItems.length ? "Ready when you are" : "Almost ready"}</h2></div>
              <span className="count-badge">{cartItems.length}</span>
            </div>
            {cartItems.length ? (
              <div className="cart-items">
                {cartItems.map((item) => (
                  <button key={item} onClick={() => removeCartItem(item)} title={`Remove ${item}`}>
                    <span><Check size={14} /> {item}</span><X size={14} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-cart"><ShoppingBag size={23} /><p>Add missing ingredients from the selected recipe.</p></div>
            )}
            <p className="cart-safety"><span /> Nothing is purchased without confirmation.</p>
          </section>

          <section className="rail-card trace-card">
            <div className="trace-title"><div><span className="pulse-dot" /><p className="overline">Live tool activity</p></div><b>MCP</b></div>
            <ol>
              <li><span>01</span><div><strong>read_pantry</strong><p>14 items checked</p></div><Check size={15} /></li>
              <li><span>02</span><div><strong>plan_dinner</strong><p>3 options ranked</p></div><Check size={15} /></li>
              <li><span>03</span><div><strong>build_cart</strong><p>{cartItems.length ? `${cartItems.length} items staged` : "Awaiting approval"}</p></div><em>{cartItems.length ? "done" : "ready"}</em></li>
            </ol>
            <button className="trace-toggle" aria-expanded={showTrace} onClick={() => setShowTrace(!showTrace)}>
              <ListChecks size={16} /> {showTrace ? "Hide result" : "Inspect result"}<ChevronRight size={15} />
            </button>
            {showTrace && <pre className="structured-result">{JSON.stringify({ recipeId: recipe.id, match: recipe.match / 100, servings, shoppingList: cartItems, purchaseMade: false }, null, 2)}</pre>}
          </section>

          <section className="rail-card trust-card">
            <ChefHat size={20} />
            <div><strong>Designed for hands-free flow</strong><p>Every visible action is also available as a structured browser tool.</p></div>
          </section>
        </aside>
      </div>

      <Dialog open={cookOpen} onOpenChange={setCookOpen}>
        <DialogContent className="cook-dialog sm:max-w-[680px]" showCloseButton={true}>
          <DialogHeader>
            <p className="overline accent">Guided cooking · {cookStep + 1} of {recipe.steps.length}</p>
            <DialogTitle>{recipe.steps[cookStep].title}</DialogTitle>
            <DialogDescription>{recipe.title}</DialogDescription>
          </DialogHeader>

          <div className="cook-progress" aria-label={`Step ${cookStep + 1} of ${recipe.steps.length}`}>
            {recipe.steps.map((_, index) => <span key={index} className={index <= cookStep ? "active" : ""} />)}
          </div>

          <div className="cook-body">
            <div className="step-number">{String(cookStep + 1).padStart(2, "0")}</div>
            <p>{recipe.steps[cookStep].body}</p>
          </div>

          <div className="timer-panel">
            <div><Timer size={20} /><span><small>Step timer</small><strong>{timerSeconds ? timerLabel : `${recipe.steps[cookStep].minutes}:00`}</strong></span></div>
            <div className="timer-actions">
              <button onClick={startStepTimer} aria-label="Reset timer"><RotateCcw size={16} /></button>
              <button className="timer-main" onClick={() => timerSeconds ? setTimerRunning(!timerRunning) : startStepTimer()}>
                {timerRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                {timerRunning ? "Pause" : timerSeconds ? "Resume" : "Start timer"}
              </button>
            </div>
          </div>

          <div className="cook-footer">
            <button className="back-step" onClick={() => setCookStep(Math.max(0, cookStep - 1))} disabled={cookStep === 0}>Previous</button>
            <button className="next-step" onClick={() => {
              if (cookStep === recipe.steps.length - 1) {
                setCookOpen(false);
                toast.success("Dinner is ready", { description: "Golden work. Time to plate up." });
              } else {
                setCookStep(cookStep + 1);
                setTimerSeconds(0);
                setTimerRunning(false);
              }
            }}>
              {cookStep === recipe.steps.length - 1 ? "Finish cooking" : "Next step"} <ArrowRight size={17} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
