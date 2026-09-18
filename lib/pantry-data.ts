export const pantryItems = [
  "Sweet potato",
  "Chickpeas",
  "Cooked grains",
  "Olive oil",
  "Garlic",
  "Cumin",
  "Harissa",
  "Cherry tomatoes",
  "Pumpkin seeds",
  "Fresh herbs",
  "Salt",
  "Black pepper",
  "Vegetable stock",
  "Red onion",
] as const;

export const pantryRecipes = [
  {
    id: "golden-harvest",
    title: "Golden harvest bowl",
    description: "Roasted sweet potato, crisp chickpeas, greens and avocado with a lemon-tahini drizzle.",
    minutes: 30,
    match: 0.96,
    proteinGrams: 22,
    vegetarian: true,
    missingItems: ["Avocado", "Kale", "Lemon", "Tahini"],
    steps: [
      "Heat the oven to 220°C and rinse the chickpeas.",
      "Roast the sweet potato and chickpeas for 18 minutes.",
      "Whisk tahini, lemon, warm water and salt.",
      "Layer the grains, kale and vegetables; finish with avocado and drizzle.",
    ],
  },
  {
    id: "harissa-crunch",
    title: "Harissa crunch bowl",
    description: "Smoky chickpeas, roasted peppers and herby couscous with cooling yogurt and toasted seeds.",
    minutes: 24,
    match: 0.91,
    proteinGrams: 25,
    vegetarian: true,
    missingItems: ["Red pepper", "Couscous", "Greek yogurt"],
    steps: [
      "Cover the couscous with hot stock and rest for 6 minutes.",
      "Char the peppers and chickpeas with harissa.",
      "Season the yogurt with lemon zest and herbs.",
      "Fluff the couscous and finish with vegetables, yogurt and seeds.",
    ],
  },
  {
    id: "green-goddess",
    title: "Green goddess bowl",
    description: "Warm grains and garlicky greens with avocado, cucumber and an herby lime dressing.",
    minutes: 20,
    match: 0.88,
    proteinGrams: 19,
    vegetarian: true,
    missingItems: ["Cucumber", "Lime"],
    steps: [
      "Warm the grains with a splash of water and salt.",
      "Wilt the kale with garlic until bright and glossy.",
      "Blend herbs, lime, olive oil and yogurt.",
      "Arrange the bowls and spoon over the dressing.",
    ],
  },
] as const;

export type PantryRecipe = (typeof pantryRecipes)[number];

export function findPantryRecipe(recipeId: string): PantryRecipe | undefined {
  return pantryRecipes.find((recipe) => recipe.id === recipeId);
}
