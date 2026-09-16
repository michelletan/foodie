// Source data for the 4 recipe PDFs in "helper cooking". Used by
// importPdfRecipes.js. Kept as plain data (not run once and discarded) so
// the same import can be re-run against a fresh environment, e.g. a new
// browser profile now, or the real Supabase backend once M1 lands.
export const PDF_RECIPES = [
  {
    title: 'Baby porridge in instant pot',
    format: 'structured',
    ingredients: [
      { name: 'rice', quantity: '150', unit: 'ml' },
      { name: 'barley', quantity: '2', unit: 'tbsp' },
      { name: 'water', quantity: '1000', unit: 'ml' },
      { name: 'dashi powder', quantity: '2', unit: 'tsp' },
      { name: 'frozen carrots', quantity: '150', unit: 'ml' },
      { name: 'frozen spinach', quantity: '1', unit: 'cube' },
      { name: 'meat, or 100g fish, or 2 eggs (add near the end)', quantity: '75', unit: 'g' },
    ],
    instructions: `1. Put all ingredients except the meat/fish/egg into the instant pot.
2. Press "Pressure Cook" and set time to 15 min.
3. After it is done cooking, wait for 10 mins then release the pressure switch.
4. Open the lid.
5. Press "Sauté" and set Temperature to "Medium".
6. Put in the meat/fish/egg and cook for 2-3 mins until done.`,
    notes: 'Freeze in 250ml portions.',
  },
  {
    title: 'Beef and Mushroom Gravy',
    format: 'structured',
    ingredients: [
      { name: 'minced beef or pork', quantity: '135', unit: 'g' },
      { name: 'frozen white button mushrooms, chopped small', quantity: '75', unit: 'g' },
      { name: 'butternut squash or pumpkin, peeled and diced small', quantity: '50', unit: 'g' },
      { name: 'finely diced carrot (optional)', quantity: '45', unit: 'ml' },
      { name: 'finely chopped onion', quantity: '30', unit: 'ml' },
      { name: 'water or unsalted stock', quantity: '240', unit: 'ml' },
      { name: 'oil', quantity: '1', unit: 'tsp' },
      { name: 'light soy sauce (optional, minimal)', quantity: '1', unit: 'tsp' },
      { name: 'cornstarch slurry (cornstarch + water)', quantity: '4 + 11', unit: 'ml' },
    ],
    instructions: `1. Heat oil in a small pot. Add onion and cook until soft. Add minced beef and break up well; cook until no longer pink.
2. Add mushrooms, butternut squash, and carrot. Cook 3-4 minutes until mushrooms and squash start to soften.
3. Add water or stock. Simmer gently 10-12 minutes until squash/pumpkin is very soft.
4. Add cornstarch slurry while stirring. Simmer 1-2 minutes until gravy thickens and coats a spoon.
5. Add soy sauce if using.`,
    notes: 'Freeze in 125ml portions.',
  },
  {
    title: 'Chicken vegetable sauce',
    format: 'structured',
    ingredients: [
      { name: 'boneless chicken leg (~200g)', quantity: '1', unit: '' },
      { name: 'frozen mushrooms', quantity: '80', unit: 'g' },
      { name: 'frozen spinach', quantity: '2', unit: 'pc' },
      { name: 'frozen peas', quantity: '2', unit: 'tbsp' },
      { name: 'chicken stock', quantity: '125', unit: 'ml' },
      { name: 'dashi powder', quantity: '1', unit: 'tsp' },
      { name: 'garlic, minced', quantity: '1', unit: 'clove' },
      { name: 'onion, finely chopped', quantity: '1/4', unit: '' },
      { name: 'milk', quantity: '60', unit: 'ml' },
      { name: 'unsalted butter', quantity: '1', unit: 'pc' },
    ],
    instructions: `1. Steam chicken 20 mins.
2. When done, shred it and set aside.
3. Heat up pan on low, add a little bit of oil and fry garlic and onions.
4. Cook mushrooms until it stops giving off water.
5. Add chicken stock, water and dashi and wait until it heats up.
6. Add peas and spinach, wait until spinach melts.
7. Add shredded chicken.
8. Simmer 5 mins.
9. Add milk and butter.
10. Simmer 1 min.`,
    notes: 'Freeze in 125ml portions.',
  },
  {
    title: 'Salmon and Potato Stew',
    format: 'structured',
    ingredients: [
      { name: 'salmon fillets (200-250g)', quantity: '2', unit: '' },
      { name: 'medium Holland potato, peeled and cut into small cubes', quantity: '1', unit: '' },
      { name: 'small carrot, very small dice', quantity: '1', unit: '' },
      { name: 'onion, finely chopped', quantity: '1/4', unit: '' },
      { name: 'sweetcorn', quantity: '2', unit: 'tbsp' },
      { name: 'frozen peas', quantity: '2', unit: 'tbsp' },
      { name: 'milk', quantity: '180', unit: 'ml' },
      { name: 'water or chicken stock', quantity: '120', unit: 'ml' },
      { name: 'salted butter', quantity: '1', unit: 'pc' },
    ],
    instructions: `1. Steam salmon for 10 mins. Tear into flakes and remove any bones.
2. Heat pan on low heat, melt the butter.
3. Add the onion and cook until soft and translucent.
4. Add carrot and potato. Stir for 2 to 3 minutes.
5. Add the water or stock to pan.
6. Simmer 10 to 15 minutes until the potato is very soft.
7. Add milk, salmon, and sweetcorn and peas.
8. Simmer gently for 3 to 4 minutes.
9. Mash about 30 to 50 percent of the stew directly in the pot, or blend briefly.`,
    notes: 'Freeze in 125ml portions.',
  },
]
