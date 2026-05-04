export interface Macros {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface MealOption {
  id: string
  name: string
  description: string
  macros: Macros
  ingredients: string[]
  prepSteps: string[]
}

export interface MealCategory {
  id: 'breakfast' | 'lunch' | 'dinner'
  label: string
  emoji: string
  options: MealOption[]
}

export const mockMeals: MealCategory[] = [
  {
    id: 'breakfast',
    label: 'Breakfast',
    emoji: '🌅',
    options: [
      {
        id: 'b1',
        name: 'Protein Oats',
        description: 'Creamy oats with whey protein and banana',
        macros: { calories: 420, protein: 32, carbs: 55, fat: 8 },
        ingredients: ['80g rolled oats', '1 scoop whey protein', '1 banana', '250ml milk', '1 tbsp almond butter'],
        prepSteps: ['Heat milk in a pot over medium heat.', 'Add oats and stir for 5 minutes until creamy.', 'Remove from heat, mix in protein powder.', 'Top with sliced banana and almond butter.'],
      },
      {
        id: 'b2',
        name: 'Egg & Veggie Scramble',
        description: '3-egg scramble with spinach and peppers',
        macros: { calories: 320, protein: 26, carbs: 10, fat: 18 },
        ingredients: ['3 eggs', '1 cup spinach', '½ bell pepper', '¼ onion', '1 tbsp olive oil', 'salt & pepper'],
        prepSteps: ['Heat olive oil in a pan.', 'Sauté chopped onion and pepper for 3 minutes.', 'Add spinach and cook 1 minute.', 'Pour in beaten eggs and scramble until just set.', 'Season with salt and pepper.'],
      },
      {
        id: 'b3',
        name: 'Greek Yogurt Bowl',
        description: 'High-protein yogurt with granola and berries',
        macros: { calories: 370, protein: 22, carbs: 48, fat: 9 },
        ingredients: ['200g Greek yogurt (0%)', '40g granola', '½ cup mixed berries', '1 tsp honey', '1 tbsp chia seeds'],
        prepSteps: ['Spoon yogurt into a bowl.', 'Top with granola, berries, and chia seeds.', 'Drizzle honey on top. Serve immediately.'],
      },
    ],
  },
  {
    id: 'lunch',
    label: 'Lunch',
    emoji: '☀️',
    options: [
      {
        id: 'l1',
        name: 'Chicken Rice Bowl',
        description: 'Grilled chicken breast with brown rice and greens',
        macros: { calories: 520, protein: 45, carbs: 52, fat: 11 },
        ingredients: ['150g chicken breast', '100g brown rice (dry)', '1 cup broccoli', '1 tbsp olive oil', 'garlic, salt, pepper'],
        prepSteps: ['Cook brown rice according to package instructions.', 'Season chicken with garlic, salt, and pepper.', 'Grill chicken 6 minutes per side until cooked through.', 'Steam broccoli for 4 minutes.', 'Assemble bowl and drizzle with olive oil.'],
      },
      {
        id: 'l2',
        name: 'Tuna Wrap',
        description: 'Whole wheat wrap with tuna, greens, and avocado',
        macros: { calories: 440, protein: 38, carbs: 36, fat: 14 },
        ingredients: ['1 whole wheat tortilla', '1 can tuna in water', '¼ avocado', 'lettuce', '1 tbsp Greek yogurt', 'lemon juice'],
        prepSteps: ['Drain tuna and mix with Greek yogurt and lemon juice.', 'Mash avocado with a fork and season.', 'Lay tortilla flat, add lettuce, tuna mix, and avocado.', 'Roll tightly and serve.'],
      },
      {
        id: 'l3',
        name: 'Lentil Salad',
        description: 'High-fiber lentils with roasted veggies',
        macros: { calories: 390, protein: 22, carbs: 58, fat: 9 },
        ingredients: ['150g cooked lentils', '1 zucchini', '1 tomato', '½ cucumber', '2 tbsp olive oil', 'lemon, herbs'],
        prepSteps: ['Dice zucchini and roast at 200°C for 20 minutes.', 'Combine lentils, chopped tomato, and cucumber.', 'Add roasted zucchini.', 'Dress with olive oil, lemon juice, and fresh herbs.'],
      },
    ],
  },
  {
    id: 'dinner',
    label: 'Dinner',
    emoji: '🌙',
    options: [
      {
        id: 'd1',
        name: 'Salmon & Quinoa',
        description: 'Baked salmon fillet with quinoa and asparagus',
        macros: { calories: 550, protein: 48, carbs: 38, fat: 22 },
        ingredients: ['180g salmon fillet', '80g quinoa (dry)', '150g asparagus', '1 lemon', '1 tbsp olive oil', 'dill, salt, pepper'],
        prepSteps: ['Preheat oven to 200°C.', 'Season salmon with lemon juice, dill, salt, and pepper.', 'Bake salmon 15-18 minutes.', 'Cook quinoa according to package.', 'Roast asparagus with olive oil for 12 minutes.', 'Plate together.'],
      },
      {
        id: 'd2',
        name: 'Turkey Meatballs',
        description: 'Lean turkey meatballs in tomato sauce with pasta',
        macros: { calories: 490, protein: 40, carbs: 48, fat: 13 },
        ingredients: ['200g ground turkey', '80g whole wheat pasta', '½ cup tomato sauce', '1 egg', 'garlic, Italian herbs'],
        prepSteps: ['Mix turkey with egg, garlic, and herbs. Form into balls.', 'Brown meatballs in a pan for 3 minutes each side.', 'Add tomato sauce, cover and simmer 10 minutes.', 'Cook pasta al dente.', 'Serve meatballs and sauce over pasta.'],
      },
      {
        id: 'd3',
        name: 'Stir-Fry Tofu',
        description: 'Crispy tofu with vegetables and soy-ginger sauce',
        macros: { calories: 380, protein: 24, carbs: 34, fat: 16 },
        ingredients: ['200g firm tofu', '1 cup mixed veggies', '2 tbsp soy sauce', '1 tsp ginger', '1 tsp sesame oil', '80g brown rice'],
        prepSteps: ['Press tofu dry and cut into cubes.', 'Pan-fry tofu until golden on all sides.', 'Stir-fry vegetables in sesame oil with ginger.', 'Add soy sauce and tofu, toss together.', 'Serve over cooked brown rice.'],
      },
    ],
  },
]

export interface MockMealFromIngredients {
  name: string
  ingredients: string[]
  macros: Macros
  prepSteps: string[]
}

export const mockMealFromIngredients: MockMealFromIngredients = {
  name: 'Veggie Egg Fried Rice',
  ingredients: ['2 eggs', '100g leftover rice', '½ cup frozen peas', '1 carrot', '2 tbsp soy sauce', '1 tsp sesame oil'],
  macros: { calories: 410, protein: 20, carbs: 52, fat: 12 },
  prepSteps: [
    'Beat eggs and scramble in a hot wok. Set aside.',
    'Stir-fry diced carrot and peas for 3 minutes.',
    'Add cold rice and stir-fry on high heat for 2 minutes.',
    'Push rice to the side, add eggs back in.',
    'Mix everything, add soy sauce and sesame oil.',
    'Serve immediately.',
  ],
}
