window.FoodParser = {
  // Comprehensive Food Database with per-base-unit nutrients (100g, 100ml, item, scoop, etc.)
  dictionary: {
    // --- STAPLES & BREADS ---
    "roti": { category: "Breads", unit: "item", calories: 75, protein: 3.0, carbs: 15.0, fats: 0.8, fiber: 2.5, magnesium: 22, zinc: 0.5, vitD: 0, potassium: 90, omega3: 0, calcium: 15, iron: 0.9 },
    "chapati": { category: "Breads", unit: "item", calories: 75, protein: 3.0, carbs: 15.0, fats: 0.8, fiber: 2.5, magnesium: 22, zinc: 0.5, vitD: 0, potassium: 90, omega3: 0, calcium: 15, iron: 0.9 },
    "phulka": { category: "Breads", unit: "item", calories: 70, protein: 2.8, carbs: 14.5, fats: 0.4, fiber: 2.5, magnesium: 20, zinc: 0.5, vitD: 0, potassium: 85, omega3: 0, calcium: 12, iron: 0.8 },
    "chappathi": { category: "Breads", unit: "item", calories: 75, protein: 3.0, carbs: 15.0, fats: 0.8, fiber: 2.5, magnesium: 22, zinc: 0.5, vitD: 0, potassium: 90, omega3: 0, calcium: 15, iron: 0.9 },
    "paratha": { category: "Breads", unit: "item", calories: 210, protein: 4.5, carbs: 28.0, fats: 9.0, fiber: 3.0, magnesium: 30, zinc: 0.7, vitD: 0, potassium: 120, omega3: 0.1, calcium: 25, iron: 1.2 },
    "aloo paratha": { category: "Breads", unit: "item", calories: 250, protein: 5.0, carbs: 36.0, fats: 10.0, fiber: 3.5, magnesium: 35, zinc: 0.8, vitD: 0, potassium: 240, omega3: 0.1, calcium: 30, iron: 1.5 },
    "paneer paratha": { category: "Breads", unit: "item", calories: 290, protein: 10.0, carbs: 32.0, fats: 14.0, fiber: 3.0, magnesium: 40, zinc: 1.1, vitD: 0, potassium: 180, omega3: 0.1, calcium: 160, iron: 1.6 },
    "naan": { category: "Breads", unit: "item", calories: 260, protein: 8.0, carbs: 45.0, fats: 5.0, fiber: 2.0, magnesium: 25, zinc: 0.6, vitD: 0, potassium: 110, omega3: 0, calcium: 40, iron: 1.5 },
    "butter naan": { category: "Breads", unit: "item", calories: 310, protein: 8.2, carbs: 46.0, fats: 10.5, fiber: 2.0, magnesium: 26, zinc: 0.6, vitD: 0, potassium: 115, omega3: 0, calcium: 45, iron: 1.5 },
    "puri": { category: "Breads", unit: "item", calories: 120, protein: 2.0, carbs: 14.0, fats: 6.5, fiber: 1.2, magnesium: 15, zinc: 0.3, vitD: 0, potassium: 60, omega3: 0, calcium: 10, iron: 0.6 },
    "poori": { category: "Breads", unit: "item", calories: 120, protein: 2.0, carbs: 14.0, fats: 6.5, fiber: 1.2, magnesium: 15, zinc: 0.3, vitD: 0, potassium: 60, omega3: 0, calcium: 10, iron: 0.6 },

    // --- SOUTH INDIAN BREAKFAST & TIFFIN ---
    "dosa": { category: "Tiffin", unit: "item", calories: 120, protein: 3.0, carbs: 22.0, fats: 3.5, fiber: 1.5, magnesium: 18, zinc: 0.4, vitD: 0, potassium: 95, omega3: 0, calcium: 18, iron: 0.8 },
    "dosai": { category: "Tiffin", unit: "item", calories: 120, protein: 3.0, carbs: 22.0, fats: 3.5, fiber: 1.5, magnesium: 18, zinc: 0.4, vitD: 0, potassium: 95, omega3: 0, calcium: 18, iron: 0.8 },
    "தோசை": { category: "Tiffin", unit: "item", calories: 120, protein: 3.0, carbs: 22.0, fats: 3.5, fiber: 1.5, magnesium: 18, zinc: 0.4, vitD: 0, potassium: 95, omega3: 0, calcium: 18, iron: 0.8 },
    "masala dosa": { category: "Tiffin", unit: "item", calories: 230, protein: 5.0, carbs: 38.0, fats: 7.5, fiber: 3.0, magnesium: 32, zinc: 0.6, vitD: 0, potassium: 250, omega3: 0, calcium: 30, iron: 1.5 },
    "ghee roast dosa": { category: "Tiffin", unit: "item", calories: 210, protein: 3.5, carbs: 24.0, fats: 11.0, fiber: 1.5, magnesium: 20, zinc: 0.4, vitD: 0, potassium: 100, omega3: 0, calcium: 22, iron: 0.9 },
    "idli": { category: "Tiffin", unit: "item", calories: 55, protein: 2.0, carbs: 12.0, fats: 0.3, fiber: 1.0, magnesium: 12, zinc: 0.3, vitD: 0, potassium: 50, omega3: 0, calcium: 10, iron: 0.5 },
    "idly": { category: "Tiffin", unit: "item", calories: 55, protein: 2.0, carbs: 12.0, fats: 0.3, fiber: 1.0, magnesium: 12, zinc: 0.3, vitD: 0, potassium: 50, omega3: 0, calcium: 10, iron: 0.5 },
    "இட்லி": { category: "Tiffin", unit: "item", calories: 55, protein: 2.0, carbs: 12.0, fats: 0.3, fiber: 1.0, magnesium: 12, zinc: 0.3, vitD: 0, potassium: 50, omega3: 0, calcium: 10, iron: 0.5 },
    "medu vada": { category: "Tiffin", unit: "item", calories: 150, protein: 3.5, carbs: 14.0, fats: 9.0, fiber: 2.0, magnesium: 25, zinc: 0.5, vitD: 0, potassium: 180, omega3: 0, calcium: 20, iron: 1.1 },
    "vada": { category: "Tiffin", unit: "item", calories: 150, protein: 3.5, carbs: 14.0, fats: 9.0, fiber: 2.0, magnesium: 25, zinc: 0.5, vitD: 0, potassium: 180, omega3: 0, calcium: 20, iron: 1.1 },
    "வடை": { category: "Tiffin", unit: "item", calories: 150, protein: 3.5, carbs: 14.0, fats: 9.0, fiber: 2.0, magnesium: 25, zinc: 0.5, vitD: 0, potassium: 180, omega3: 0, calcium: 20, iron: 1.1 },
    "upma": { category: "Tiffin", unit: "100g", calories: 140, protein: 3.2, carbs: 23.0, fats: 4.2, fiber: 2.0, magnesium: 18, zinc: 0.4, vitD: 0, potassium: 90, omega3: 0, calcium: 15, iron: 0.8 },
    "poha": { category: "Tiffin", unit: "100g", calories: 130, protein: 2.5, carbs: 25.0, fats: 3.0, fiber: 1.8, magnesium: 20, zinc: 0.4, vitD: 0, potassium: 110, omega3: 0, calcium: 18, iron: 2.1 },
    "pongal": { category: "Tiffin", unit: "100g", calories: 175, protein: 4.5, carbs: 26.0, fats: 6.5, fiber: 2.2, magnesium: 28, zinc: 0.6, vitD: 0, potassium: 130, omega3: 0, calcium: 25, iron: 1.2 },
    "ven pongal": { category: "Tiffin", unit: "100g", calories: 175, protein: 4.5, carbs: 26.0, fats: 6.5, fiber: 2.2, magnesium: 28, zinc: 0.6, vitD: 0, potassium: 130, omega3: 0, calcium: 25, iron: 1.2 },
    "uttapam": { category: "Tiffin", unit: "item", calories: 160, protein: 4.0, carbs: 28.0, fats: 4.0, fiber: 2.0, magnesium: 24, zinc: 0.5, vitD: 0, potassium: 140, omega3: 0, calcium: 22, iron: 1.0 },
    "onion uttapam": { category: "Tiffin", unit: "item", calories: 180, protein: 4.2, carbs: 30.0, fats: 4.8, fiber: 2.5, magnesium: 26, zinc: 0.5, vitD: 0, potassium: 160, omega3: 0, calcium: 25, iron: 1.1 },

    // --- RICE DISHES & GRAINS ---
    "rice": { category: "Grains", unit: "100g", calories: 130, protein: 2.7, carbs: 28.0, fats: 0.3, fiber: 0.4, magnesium: 12, zinc: 0.5, vitD: 0, potassium: 35, omega3: 0, calcium: 10, iron: 0.2 },
    "white rice": { category: "Grains", unit: "100g", calories: 130, protein: 2.7, carbs: 28.0, fats: 0.3, fiber: 0.4, magnesium: 12, zinc: 0.5, vitD: 0, potassium: 35, omega3: 0, calcium: 10, iron: 0.2 },
    "basmati rice": { category: "Grains", unit: "100g", calories: 135, protein: 3.0, carbs: 29.0, fats: 0.4, fiber: 0.6, magnesium: 14, zinc: 0.5, vitD: 0, potassium: 40, omega3: 0, calcium: 12, iron: 0.3 },
    "brown rice": { category: "Grains", unit: "100g", calories: 112, protein: 2.6, carbs: 24.0, fats: 0.9, fiber: 1.8, magnesium: 43, zinc: 0.6, vitD: 0, potassium: 85, omega3: 0, calcium: 10, iron: 0.4 },
    "jasmine rice": { category: "Grains", unit: "100g", calories: 130, protein: 2.7, carbs: 28.0, fats: 0.3, fiber: 0.4, magnesium: 12, zinc: 0.5, vitD: 0, potassium: 35, omega3: 0, calcium: 10, iron: 0.2 },
    "curd rice": { category: "Rice Dishes", unit: "100g", calories: 120, protein: 3.2, carbs: 18.0, fats: 3.8, fiber: 0.5, magnesium: 16, zinc: 0.5, vitD: 0, potassium: 90, omega3: 0, calcium: 65, iron: 0.3 },
    "thayir sadam": { category: "Rice Dishes", unit: "100g", calories: 120, protein: 3.2, carbs: 18.0, fats: 3.8, fiber: 0.5, magnesium: 16, zinc: 0.5, vitD: 0, potassium: 90, omega3: 0, calcium: 65, iron: 0.3 },
    "sambar rice": { category: "Rice Dishes", unit: "100g", calories: 135, protein: 3.8, carbs: 24.0, fats: 2.8, fiber: 2.0, magnesium: 25, zinc: 0.6, vitD: 0, potassium: 140, omega3: 0, calcium: 25, iron: 0.8 },
    "lemon rice": { category: "Rice Dishes", unit: "100g", calories: 155, protein: 2.8, carbs: 26.0, fats: 4.8, fiber: 1.0, magnesium: 18, zinc: 0.4, vitD: 0, potassium: 70, omega3: 0, calcium: 15, iron: 0.6 },
    "chicken biryani": { category: "Rice Dishes", unit: "100g", calories: 175, protein: 9.5, carbs: 20.0, fats: 6.5, fiber: 1.0, magnesium: 22, zinc: 1.2, vitD: 0, potassium: 180, omega3: 0.1, calcium: 20, iron: 1.1 },
    "veg biryani": { category: "Rice Dishes", unit: "100g", calories: 145, protein: 3.5, carbs: 24.0, fats: 4.2, fiber: 2.0, magnesium: 20, zinc: 0.6, vitD: 0, potassium: 130, omega3: 0, calcium: 25, iron: 0.8 },
    "mutton biryani": { category: "Rice Dishes", unit: "100g", calories: 215, protein: 11.0, carbs: 19.0, fats: 10.5, fiber: 0.8, magnesium: 24, zinc: 2.5, vitD: 0, potassium: 200, omega3: 0.1, calcium: 22, iron: 1.8 },
    "oats": { category: "Grains", unit: "100g", calories: 389, protein: 16.9, carbs: 66.0, fats: 6.9, fiber: 10.6, magnesium: 177, zinc: 4.0, vitD: 0, potassium: 429, omega3: 0.1, calcium: 54, iron: 4.7 },
    "oatmeal": { category: "Grains", unit: "100g", calories: 389, protein: 16.9, carbs: 66.0, fats: 6.9, fiber: 10.6, magnesium: 177, zinc: 4.0, vitD: 0, potassium: 429, omega3: 0.1, calcium: 54, iron: 4.7 },

    // --- DALS, CURRIES & GRAVIES ---
    "dal": { category: "Dals & Curries", unit: "100g", calories: 110, protein: 6.5, carbs: 16.0, fats: 2.5, fiber: 4.5, magnesium: 35, zinc: 0.9, vitD: 0, potassium: 280, omega3: 0, calcium: 25, iron: 1.6 },
    "toor dal": { category: "Dals & Curries", unit: "100g", calories: 110, protein: 6.5, carbs: 16.0, fats: 2.5, fiber: 4.5, magnesium: 35, zinc: 0.9, vitD: 0, potassium: 280, omega3: 0, calcium: 25, iron: 1.6 },
    "dal tadka": { category: "Dals & Curries", unit: "100g", calories: 125, protein: 6.2, carbs: 15.0, fats: 4.5, fiber: 4.2, magnesium: 33, zinc: 0.8, vitD: 0, potassium: 260, omega3: 0, calcium: 24, iron: 1.5 },
    "dal makhani": { category: "Dals & Curries", unit: "100g", calories: 165, protein: 6.8, carbs: 17.0, fats: 8.2, fiber: 5.0, magnesium: 42, zinc: 1.2, vitD: 0, potassium: 320, omega3: 0.1, calcium: 65, iron: 2.0 },
    "sambar": { category: "Dals & Curries", unit: "100g", calories: 65, protein: 3.0, carbs: 9.5, fats: 1.8, fiber: 2.5, magnesium: 22, zinc: 0.5, vitD: 0, potassium: 180, omega3: 0, calcium: 20, iron: 0.9 },
    "சாம்பார்": { category: "Dals & Curries", unit: "100g", calories: 65, protein: 3.0, carbs: 9.5, fats: 1.8, fiber: 2.5, magnesium: 22, zinc: 0.5, vitD: 0, potassium: 180, omega3: 0, calcium: 20, iron: 0.9 },
    "rasam": { category: "Dals & Curries", unit: "100g", calories: 35, protein: 1.2, carbs: 4.5, fats: 1.2, fiber: 1.0, magnesium: 15, zinc: 0.3, vitD: 0, potassium: 120, omega3: 0, calcium: 15, iron: 0.6 },
    "ரசம்": { category: "Dals & Curries", unit: "100g", calories: 35, protein: 1.2, carbs: 4.5, fats: 1.2, fiber: 1.0, magnesium: 15, zinc: 0.3, vitD: 0, potassium: 120, omega3: 0, calcium: 15, iron: 0.6 },
    "chole": { category: "Dals & Curries", unit: "100g", calories: 150, protein: 7.5, carbs: 20.0, fats: 5.0, fiber: 5.5, magnesium: 45, zinc: 1.3, vitD: 0, potassium: 270, omega3: 0, calcium: 45, iron: 2.4 },
    "chana masala": { category: "Dals & Curries", unit: "100g", calories: 150, protein: 7.5, carbs: 20.0, fats: 5.0, fiber: 5.5, magnesium: 45, zinc: 1.3, vitD: 0, potassium: 270, omega3: 0, calcium: 45, iron: 2.4 },
    "rajma": { category: "Dals & Curries", unit: "100g", calories: 140, protein: 8.0, carbs: 19.0, fats: 3.8, fiber: 6.0, magnesium: 50, zinc: 1.2, vitD: 0, potassium: 340, omega3: 0.1, calcium: 40, iron: 2.6 },
    "sundal": { category: "Dals & Curries", unit: "100g", calories: 164, protein: 8.9, carbs: 27.0, fats: 2.6, fiber: 7.0, magnesium: 48, zinc: 1.5, vitD: 0, potassium: 291, omega3: 0.1, calcium: 49, iron: 2.9 },
    "chickpeas": { category: "Dals & Curries", unit: "100g", calories: 164, protein: 8.9, carbs: 27.0, fats: 2.6, fiber: 7.0, magnesium: 48, zinc: 1.5, vitD: 0, potassium: 291, omega3: 0.1, calcium: 49, iron: 2.9 },

    // --- VEGETABLES & PANEER ---
    "mixed veg": { category: "Veggies", unit: "100g", calories: 65, protein: 2.5, carbs: 12.0, fats: 0.5, fiber: 3.5, magnesium: 20, zinc: 0.4, vitD: 0, potassium: 220, omega3: 0, calcium: 35, iron: 0.8 },
    "mixed vegetables": { category: "Veggies", unit: "100g", calories: 65, protein: 2.5, carbs: 12.0, fats: 0.5, fiber: 3.5, magnesium: 20, zinc: 0.4, vitD: 0, potassium: 220, omega3: 0, calcium: 35, iron: 0.8 },
    "paneer": { category: "Dairy & Veg", unit: "100g", calories: 265, protein: 18.0, carbs: 1.2, fats: 20.8, fiber: 0, magnesium: 25, zinc: 1.1, vitD: 0, potassium: 115, omega3: 0.2, calcium: 480, iron: 0.8 },
    "பன்னீர்": { category: "Dairy & Veg", unit: "100g", calories: 265, protein: 18.0, carbs: 1.2, fats: 20.8, fiber: 0, magnesium: 25, zinc: 1.1, vitD: 0, potassium: 115, omega3: 0.2, calcium: 480, iron: 0.8 },
    "paneer butter masala": { category: "Dals & Curries", unit: "100g", calories: 220, protein: 8.5, carbs: 8.0, fats: 17.5, fiber: 1.2, magnesium: 24, zinc: 1.0, vitD: 0, potassium: 160, omega3: 0.1, calcium: 240, iron: 0.7 },
    "palak paneer": { category: "Dals & Curries", unit: "100g", calories: 160, protein: 9.0, carbs: 5.5, fats: 11.5, fiber: 2.5, magnesium: 48, zinc: 1.2, vitD: 0, potassium: 260, omega3: 0.1, calcium: 280, iron: 2.1 },
    "sweet potato": { category: "Veggies", unit: "100g", calories: 86, protein: 1.6, carbs: 20.0, fats: 0.1, fiber: 3.0, magnesium: 25, zinc: 0.3, vitD: 0, potassium: 337, omega3: 0, calcium: 30, iron: 0.6 },
    "sakkaravalli kizhangu": { category: "Veggies", unit: "100g", calories: 86, protein: 1.6, carbs: 20.0, fats: 0.1, fiber: 3.0, magnesium: 25, zinc: 0.3, vitD: 0, potassium: 337, omega3: 0, calcium: 30, iron: 0.6 },
    "potato": { category: "Veggies", unit: "100g", calories: 77, protein: 2.0, carbs: 17.0, fats: 0.1, fiber: 2.2, magnesium: 23, zinc: 0.3, vitD: 0, potassium: 420, omega3: 0, calcium: 12, iron: 0.8 },
    "aloo": { category: "Veggies", unit: "100g", calories: 77, protein: 2.0, carbs: 17.0, fats: 0.1, fiber: 2.2, magnesium: 23, zinc: 0.3, vitD: 0, potassium: 420, omega3: 0, calcium: 12, iron: 0.8 },
    "broccoli": { category: "Veggies", unit: "100g", calories: 34, protein: 2.8, carbs: 7.0, fats: 0.4, fiber: 2.6, magnesium: 21, zinc: 0.4, vitD: 0, potassium: 316, omega3: 0.1, calcium: 47, iron: 0.7 },
    "spinach": { category: "Veggies", unit: "100g", calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, fiber: 2.2, magnesium: 79, zinc: 0.5, vitD: 0, potassium: 558, omega3: 0.1, calcium: 99, iron: 2.7 },
    "palak": { category: "Veggies", unit: "100g", calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, fiber: 2.2, magnesium: 79, zinc: 0.5, vitD: 0, potassium: 558, omega3: 0.1, calcium: 99, iron: 2.7 },
    "bhindi": { category: "Veggies", unit: "100g", calories: 33, protein: 1.9, carbs: 7.5, fats: 0.2, fiber: 3.2, magnesium: 57, zinc: 0.6, vitD: 0, potassium: 299, omega3: 0, calcium: 82, iron: 0.6 },
    "okra": { category: "Veggies", unit: "100g", calories: 33, protein: 1.9, carbs: 7.5, fats: 0.2, fiber: 3.2, magnesium: 57, zinc: 0.6, vitD: 0, potassium: 299, omega3: 0, calcium: 82, iron: 0.6 },
    "cucumber": { category: "Veggies", unit: "100g", calories: 15, protein: 0.7, carbs: 3.6, fats: 0.1, fiber: 0.5, magnesium: 13, zinc: 0.2, vitD: 0, potassium: 147, omega3: 0, calcium: 16, iron: 0.3 },

    // --- MEAT, FISH & EGGS ---
    "chicken breast": { category: "Meat & Eggs", unit: "100g", calories: 165, protein: 31.0, carbs: 0, fats: 3.6, fiber: 0, magnesium: 29, zinc: 1.0, vitD: 0, potassium: 256, omega3: 0.1, calcium: 15, iron: 1.0 },
    "boiled chicken": { category: "Meat & Eggs", unit: "100g", calories: 165, protein: 31.0, carbs: 0, fats: 3.6, fiber: 0, magnesium: 29, zinc: 1.0, vitD: 0, potassium: 256, omega3: 0.1, calcium: 15, iron: 1.0 },
    "fried chicken": { category: "Meat & Eggs", unit: "100g", calories: 285, protein: 27.0, carbs: 8.0, fats: 16.0, fiber: 0.2, magnesium: 26, zinc: 1.0, vitD: 0, potassium: 240, omega3: 0.1, calcium: 18, iron: 1.1 },
    "grilled chicken": { category: "Meat & Eggs", unit: "100g", calories: 195, protein: 31.0, carbs: 0, fats: 6.0, fiber: 0, magnesium: 30, zinc: 1.1, vitD: 0, potassium: 260, omega3: 0.1, calcium: 16, iron: 1.1 },
    "tandoori chicken": { category: "Meat & Eggs", unit: "100g", calories: 195, protein: 31.0, carbs: 1.5, fats: 6.0, fiber: 0.2, magnesium: 30, zinc: 1.1, vitD: 0, potassium: 260, omega3: 0.1, calcium: 18, iron: 1.2 },
    "chicken": { category: "Meat & Eggs", unit: "100g", calories: 165, protein: 31.0, carbs: 0, fats: 3.6, fiber: 0, magnesium: 29, zinc: 1.0, vitD: 0, potassium: 256, omega3: 0.1, calcium: 15, iron: 1.0 },
    "kozhi": { category: "Meat & Eggs", unit: "100g", calories: 165, protein: 31.0, carbs: 0, fats: 3.6, fiber: 0, magnesium: 29, zinc: 1.0, vitD: 0, potassium: 256, omega3: 0.1, calcium: 15, iron: 1.0 },
    "chicken curry": { category: "Meat & Eggs", unit: "100g", calories: 180, protein: 18.0, carbs: 4.0, fats: 10.0, fiber: 0.8, magnesium: 26, zinc: 1.1, vitD: 0, potassium: 230, omega3: 0.1, calcium: 20, iron: 1.2 },
    "butter chicken": { category: "Meat & Eggs", unit: "100g", calories: 235, protein: 16.0, carbs: 6.5, fats: 16.5, fiber: 0.8, magnesium: 25, zinc: 1.0, vitD: 0, potassium: 210, omega3: 0.1, calcium: 40, iron: 1.1 },
    "egg": { category: "Meat & Eggs", unit: "item", calories: 70, protein: 6.0, carbs: 0.6, fats: 5.0, fiber: 0, magnesium: 6, zinc: 0.6, vitD: 44, potassium: 69, omega3: 0.1, calcium: 28, iron: 0.9 },
    "eggs": { category: "Meat & Eggs", unit: "item", calories: 70, protein: 6.0, carbs: 0.6, fats: 5.0, fiber: 0, magnesium: 6, zinc: 0.6, vitD: 44, potassium: 69, omega3: 0.1, calcium: 28, iron: 0.9 },
    "muttai": { category: "Meat & Eggs", unit: "item", calories: 70, protein: 6.0, carbs: 0.6, fats: 5.0, fiber: 0, magnesium: 6, zinc: 0.6, vitD: 44, potassium: 69, omega3: 0.1, calcium: 28, iron: 0.9 },
    "egg white": { category: "Meat & Eggs", unit: "item", calories: 17, protein: 3.6, carbs: 0.2, fats: 0.1, fiber: 0, magnesium: 4, zinc: 0.0, vitD: 0, potassium: 54, omega3: 0, calcium: 2, iron: 0.0 },
    "egg bhurji": { category: "Meat & Eggs", unit: "100g", calories: 160, protein: 11.0, carbs: 3.0, fats: 11.5, fiber: 0.5, magnesium: 14, zinc: 1.1, vitD: 60, potassium: 130, omega3: 0.1, calcium: 45, iron: 1.5 },
    "omelette": { category: "Meat & Eggs", unit: "item", calories: 150, protein: 12.0, carbs: 1.5, fats: 11.0, fiber: 0.2, magnesium: 14, zinc: 1.2, vitD: 80, potassium: 140, omega3: 0.2, calcium: 55, iron: 1.8 },
    "salmon": { category: "Meat & Eggs", unit: "100g", calories: 208, protein: 20.0, carbs: 0, fats: 13.0, fiber: 0, magnesium: 30, zinc: 0.5, vitD: 500, potassium: 363, omega3: 2.5, calcium: 12, iron: 0.3 },
    "fish": { category: "Meat & Eggs", unit: "100g", calories: 140, protein: 20.0, carbs: 0, fats: 6.0, fiber: 0, magnesium: 28, zinc: 0.6, vitD: 250, potassium: 340, omega3: 1.2, calcium: 20, iron: 0.8 },
    "meen": { category: "Meat & Eggs", unit: "100g", calories: 140, protein: 20.0, carbs: 0, fats: 6.0, fiber: 0, magnesium: 28, zinc: 0.6, vitD: 250, potassium: 340, omega3: 1.2, calcium: 20, iron: 0.8 },
    "fish fry": { category: "Meat & Eggs", unit: "100g", calories: 210, protein: 19.0, carbs: 4.0, fats: 13.0, fiber: 0.5, magnesium: 26, zinc: 0.6, vitD: 200, potassium: 320, omega3: 1.0, calcium: 22, iron: 0.9 },
    "mutton": { category: "Meat & Eggs", unit: "100g", calories: 294, protein: 25.0, carbs: 0, fats: 21.0, fiber: 0, magnesium: 24, zinc: 4.5, vitD: 0, potassium: 310, omega3: 0.2, calcium: 16, iron: 2.8 },
    "beef": { category: "Meat & Eggs", unit: "100g", calories: 250, protein: 26.0, carbs: 0, fats: 15.0, fiber: 0, magnesium: 22, zinc: 6.3, vitD: 0, potassium: 318, omega3: 0.2, calcium: 18, iron: 2.6 },

    // --- DAIRY, BEVERAGES & BRANDS ---
    "curd": { category: "Dairy", unit: "100g", calories: 60, protein: 3.5, carbs: 4.7, fats: 3.3, fiber: 0, magnesium: 12, zinc: 0.4, vitD: 0, potassium: 104, omega3: 0, calcium: 83, iron: 0.1 },
    "yogurt": { category: "Dairy", unit: "100g", calories: 60, protein: 3.5, carbs: 4.7, fats: 3.3, fiber: 0, magnesium: 12, zinc: 0.4, vitD: 0, potassium: 104, omega3: 0, calcium: 83, iron: 0.1 },
    "yogurt shake": { category: "Beverages", unit: "100ml", calories: 80, protein: 2.8, carbs: 11.0, fats: 2.8, fiber: 0, magnesium: 9, zinc: 0.3, vitD: 0, potassium: 90, omega3: 0, calcium: 75, iron: 0.1 },
    "hatsun yogurt": { category: "Beverages", unit: "100ml", calories: 80, protein: 2.8, carbs: 11.0, fats: 2.8, fiber: 0, magnesium: 9, zinc: 0.3, vitD: 0, potassium: 90, omega3: 0, calcium: 75, iron: 0.1 },
    "hatsun curd": { category: "Dairy", unit: "100g", calories: 60, protein: 3.5, carbs: 4.7, fats: 3.3, fiber: 0, magnesium: 12, zinc: 0.4, vitD: 0, potassium: 104, omega3: 0, calcium: 83, iron: 0.1 },
    "amul milk": { category: "Dairy", unit: "100ml", calories: 62, protein: 3.2, carbs: 4.8, fats: 3.3, fiber: 0, magnesium: 10, zinc: 0.4, vitD: 40, potassium: 140, omega3: 0.1, calcium: 120, iron: 0.1 },
    "nandini milk": { category: "Dairy", unit: "100ml", calories: 60, protein: 3.2, carbs: 4.7, fats: 3.2, fiber: 0, magnesium: 10, zinc: 0.4, vitD: 40, potassium: 140, omega3: 0.1, calcium: 120, iron: 0.1 },
    "aavin milk": { category: "Dairy", unit: "100ml", calories: 58, protein: 3.1, carbs: 4.7, fats: 3.0, fiber: 0, magnesium: 10, zinc: 0.4, vitD: 40, potassium: 140, omega3: 0.1, calcium: 120, iron: 0.1 },
    "epigamia yogurt": { category: "Dairy", unit: "100g", calories: 85, protein: 8.0, carbs: 9.0, fats: 1.5, fiber: 0, magnesium: 11, zinc: 0.5, vitD: 0, potassium: 140, omega3: 0, calcium: 115, iron: 0.1 },
    "dahi": { category: "Dairy", unit: "100g", calories: 60, protein: 3.5, carbs: 4.7, fats: 3.3, fiber: 0, magnesium: 12, zinc: 0.4, vitD: 0, potassium: 104, omega3: 0, calcium: 83, iron: 0.1 },
    "thayir": { category: "Dairy", unit: "100g", calories: 60, protein: 3.5, carbs: 4.7, fats: 3.3, fiber: 0, magnesium: 12, zinc: 0.4, vitD: 0, potassium: 104, omega3: 0, calcium: 83, iron: 0.1 },
    "greek yogurt": { category: "Dairy", unit: "100g", calories: 59, protein: 10.0, carbs: 3.6, fats: 0.4, fiber: 0, magnesium: 11, zinc: 0.6, vitD: 0, potassium: 141, omega3: 0, calcium: 110, iron: 0.1 },
    "milk": { category: "Dairy", unit: "100ml", calories: 62, protein: 3.2, carbs: 4.8, fats: 3.3, fiber: 0, magnesium: 10, zinc: 0.4, vitD: 40, potassium: 140, omega3: 0.1, calcium: 120, iron: 0.1 },
    "toned milk": { category: "Dairy", unit: "100ml", calories: 58, protein: 3.1, carbs: 4.7, fats: 3.0, fiber: 0, magnesium: 10, zinc: 0.4, vitD: 40, potassium: 140, omega3: 0.1, calcium: 120, iron: 0.1 },
    "skimmed milk": { category: "Dairy", unit: "100ml", calories: 35, protein: 3.4, carbs: 5.0, fats: 0.2, fiber: 0, magnesium: 11, zinc: 0.4, vitD: 40, potassium: 150, omega3: 0, calcium: 125, iron: 0.1 },
    "ghee": { category: "Fats", unit: "10g", calories: 90, protein: 0, carbs: 0, fats: 9.9, fiber: 0, magnesium: 0, zinc: 0, vitD: 10, potassium: 0, omega3: 0.1, calcium: 0, iron: 0 },
    "butter": { category: "Fats", unit: "10g", calories: 72, protein: 0.1, carbs: 0.1, fats: 8.1, fiber: 0, magnesium: 0, zinc: 0, vitD: 6, potassium: 3, omega3: 0.1, calcium: 2, iron: 0 },
    "oil": { category: "Fats", unit: "10g", calories: 88, protein: 0, carbs: 0, fats: 10.0, fiber: 0, magnesium: 0, zinc: 0, vitD: 0, potassium: 0, omega3: 0.1, calcium: 0, iron: 0 },
    "chai": { category: "Beverages", unit: "item", calories: 80, protein: 2.0, carbs: 10.0, fats: 3.0, fiber: 0, magnesium: 6, zinc: 0.2, vitD: 15, potassium: 80, omega3: 0, calcium: 70, iron: 0.1 },
    "tea": { category: "Beverages", unit: "item", calories: 80, protein: 2.0, carbs: 10.0, fats: 3.0, fiber: 0, magnesium: 6, zinc: 0.2, vitD: 15, potassium: 80, omega3: 0, calcium: 70, iron: 0.1 },
    "coffee": { category: "Beverages", unit: "item", calories: 75, protein: 1.8, carbs: 9.0, fats: 2.8, fiber: 0, magnesium: 8, zinc: 0.2, vitD: 15, potassium: 90, omega3: 0, calcium: 65, iron: 0.1 },
    "filter coffee": { category: "Beverages", unit: "item", calories: 85, protein: 2.2, carbs: 10.5, fats: 3.2, fiber: 0, magnesium: 9, zinc: 0.2, vitD: 15, potassium: 95, omega3: 0, calcium: 75, iron: 0.1 },
    "lassi": { category: "Beverages", unit: "200ml", calories: 160, protein: 5.5, carbs: 22.0, fats: 5.5, fiber: 0, magnesium: 18, zinc: 0.6, vitD: 0, potassium: 180, omega3: 0, calcium: 150, iron: 0.2 },
    "buttermilk": { category: "Beverages", unit: "200ml", calories: 60, protein: 3.0, carbs: 5.0, fats: 2.2, fiber: 0, magnesium: 14, zinc: 0.4, vitD: 0, potassium: 160, omega3: 0, calcium: 110, iron: 0.1 },
    "chaas": { category: "Beverages", unit: "200ml", calories: 60, protein: 3.0, carbs: 5.0, fats: 2.2, fiber: 0, magnesium: 14, zinc: 0.4, vitD: 0, potassium: 160, omega3: 0, calcium: 110, iron: 0.1 },

    // --- FRUITS & NUTS ---
    "banana": { category: "Fruits", unit: "item", calories: 90, protein: 1.1, carbs: 23.0, fats: 0.3, fiber: 2.6, magnesium: 27, zinc: 0.15, vitD: 0, potassium: 358, omega3: 0, calcium: 5, iron: 0.26 },
    "bananas": { category: "Fruits", unit: "item", calories: 90, protein: 1.1, carbs: 23.0, fats: 0.3, fiber: 2.6, magnesium: 27, zinc: 0.15, vitD: 0, potassium: 358, omega3: 0, calcium: 5, iron: 0.26 },
    "apple": { category: "Fruits", unit: "item", calories: 95, protein: 0.5, carbs: 25.0, fats: 0.3, fiber: 4.4, magnesium: 9, zinc: 0.04, vitD: 0, potassium: 195, omega3: 0, calcium: 11, iron: 0.22 },
    "apples": { category: "Fruits", unit: "item", calories: 95, protein: 0.5, carbs: 25.0, fats: 0.3, fiber: 4.4, magnesium: 9, zinc: 0.04, vitD: 0, potassium: 195, omega3: 0, calcium: 11, iron: 0.22 },
    "mango": { category: "Fruits", unit: "item", calories: 150, protein: 1.4, carbs: 35.0, fats: 0.6, fiber: 3.0, magnesium: 18, zinc: 0.1, vitD: 0, potassium: 280, omega3: 0, calcium: 20, iron: 0.3 },
    "papaya": { category: "Fruits", unit: "100g", calories: 43, protein: 0.5, carbs: 11.0, fats: 0.3, fiber: 1.7, magnesium: 21, zinc: 0.1, vitD: 0, potassium: 182, omega3: 0, calcium: 20, iron: 0.3 },
    "pomegranate": { category: "Fruits", unit: "item", calories: 175, protein: 3.5, carbs: 40.0, fats: 2.5, fiber: 7.0, magnesium: 26, zinc: 0.7, vitD: 0, potassium: 500, omega3: 0.1, calcium: 20, iron: 0.7 },
    "guava": { category: "Fruits", unit: "item", calories: 45, protein: 1.6, carbs: 9.5, fats: 0.6, fiber: 4.5, magnesium: 15, zinc: 0.2, vitD: 0, potassium: 280, omega3: 0.1, calcium: 12, iron: 0.2 },
    "almonds": { category: "Nuts", unit: "30g", calories: 180, protein: 6.0, carbs: 6.0, fats: 15.0, fiber: 3.5, magnesium: 80, zinc: 0.9, vitD: 0, potassium: 200, omega3: 0, calcium: 75, iron: 1.1 },
    "almond": { category: "Nuts", unit: "30g", calories: 180, protein: 6.0, carbs: 6.0, fats: 15.0, fiber: 3.5, magnesium: 80, zinc: 0.9, vitD: 0, potassium: 200, omega3: 0, calcium: 75, iron: 1.1 },
    "walnuts": { category: "Nuts", unit: "30g", calories: 185, protein: 4.3, carbs: 3.9, fats: 18.5, fiber: 2.0, magnesium: 45, zinc: 0.9, vitD: 0, potassium: 125, omega3: 2.5, calcium: 28, iron: 0.8 },
    "walnut": { category: "Nuts", unit: "30g", calories: 185, protein: 4.3, carbs: 3.9, fats: 18.5, fiber: 2.0, magnesium: 45, zinc: 0.9, vitD: 0, potassium: 125, omega3: 2.5, calcium: 28, iron: 0.8 },
    "peanuts": { category: "Nuts", unit: "30g", calories: 170, protein: 7.3, carbs: 4.8, fats: 14.5, fiber: 2.4, magnesium: 50, zinc: 0.9, vitD: 0, potassium: 190, omega3: 0, calcium: 26, iron: 1.3 },
    "dates": { category: "Fruits", unit: "item", calories: 20, protein: 0.2, carbs: 5.3, fats: 0.03, fiber: 0.6, magnesium: 3, zinc: 0.03, vitD: 0, potassium: 47, omega3: 0, calcium: 4, iron: 0.07 },

    // --- SUPPLEMENTS & PROTEIN ---
    "whey": { category: "Supplements", unit: "scoop", calories: 120, protein: 24.0, carbs: 3.0, fats: 1.5, fiber: 0, magnesium: 25, zinc: 0.2, vitD: 0, potassium: 160, omega3: 0, calcium: 140, iron: 0.2 },
    "whey protein": { category: "Supplements", unit: "scoop", calories: 120, protein: 24.0, carbs: 3.0, fats: 1.5, fiber: 0, magnesium: 25, zinc: 0.2, vitD: 0, potassium: 160, omega3: 0, calcium: 140, iron: 0.2 },
    "protein powder": { category: "Supplements", unit: "scoop", calories: 120, protein: 24.0, carbs: 3.0, fats: 1.5, fiber: 0, magnesium: 25, zinc: 0.2, vitD: 0, potassium: 160, omega3: 0, calcium: 140, iron: 0.2 },
    "protein bar": { category: "Supplements", unit: "item", calories: 210, protein: 20.0, carbs: 22.0, fats: 7.0, fiber: 8.0, magnesium: 35, zinc: 0.8, vitD: 0, potassium: 150, omega3: 0, calcium: 100, iron: 1.5 }
  },

  // Serving unit conversion factors to base unit weight/quantity
  unitConversions: {
    "roti": { gramWeight: 30 },
    "chapati": { gramWeight: 30 },
    "phulka": { gramWeight: 25 },
    "paratha": { gramWeight: 80 },
    "puri": { gramWeight: 35 },
    "poori": { gramWeight: 35 },
    "dosa": { gramWeight: 80 },
    "idli": { gramWeight: 50 },
    "vada": { gramWeight: 50 },
    "medu vada": { gramWeight: 50 },
    "bowl": { defaultGrams: 150 },
    "katori": { defaultGrams: 150 },
    "cup": { defaultGrams: 150, defaultMl: 240 },
    "plate": { defaultGrams: 350 },
    "glass": { defaultMl: 250 },
    "tbsp": { defaultGrams: 15 },
    "tablespoon": { defaultGrams: 15 },
    "tsp": { defaultGrams: 5 },
    "teaspoon": { defaultGrams: 5 },
    "scoop": { defaultGrams: 30 },
    "slice": { defaultGrams: 30 },
    "piece": { defaultMultiplier: 1.0 },
    "item": { defaultMultiplier: 1.0 },
    "pc": { defaultMultiplier: 1.0 },
    "g": { isDirectGram: true },
    "gram": { isDirectGram: true },
    "grams": { isDirectGram: true },
    "ml": { isDirectMl: true }
  },

  search: function(query) {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      const defaultKeys = ["roti", "dosa", "idli", "rice", "dal", "paneer", "chicken", "egg", "curd", "chai"];
      return defaultKeys.map(k => ({
        key: k,
        name: k.charAt(0).toUpperCase() + k.slice(1),
        category: this.dictionary[k].category || "General",
        unit: this.dictionary[k].unit,
        calories: this.dictionary[k].calories,
        protein: this.dictionary[k].protein,
        carbs: this.dictionary[k].carbs,
        fats: this.dictionary[k].fats,
        data: this.dictionary[k]
      }));
    }
    
    const q = query.toLowerCase().trim();
    const matches = [];
    const seen = new Set();

    for (let key in this.dictionary) {
      if (seen.has(key)) continue;
      if (key === q || key.startsWith(q)) {
        seen.add(key);
        const item = this.dictionary[key];
        matches.push({
          key: key,
          name: key.charAt(0).toUpperCase() + key.slice(1),
          category: item.category || "General",
          unit: item.unit,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fats: item.fats,
          data: item
        });
      }
      if (matches.length >= 12) break;
    }

    if (matches.length < 12) {
      for (let key in this.dictionary) {
        if (seen.has(key)) continue;
        if (key.includes(q)) {
          seen.add(key);
          const item = this.dictionary[key];
          matches.push({
            key: key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            category: item.category || "General",
            unit: item.unit,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            data: item
          });
        }
        if (matches.length >= 12) break;
      }
    }

    return matches;
  },

  findBestMatch: function(foodName) {
    let q = foodName.toLowerCase().trim();
    if (!q) return null;

    q = q.replace(/\bvef\b/g, 'veg')
         .replace(/\bof\b/g, '')
         .replace(/\bsmall\b/g, '')
         .replace(/\blarge\b/g, '')
         .replace(/\bmedium\b/g, '')
         .replace(/\s+/g, ' ')
         .trim();

    if (!q) return null;

    if (this.dictionary[q]) {
      return { key: q, data: this.dictionary[q] };
    }

    for (let dictKey in this.dictionary) {
      const regex = new RegExp(`\\b${dictKey}\\b`, 'i');
      if (regex.test(q)) {
        return { key: dictKey, data: this.dictionary[dictKey] };
      }
    }

    for (let dictKey in this.dictionary) {
      if (q.startsWith(dictKey) || dictKey.startsWith(q)) {
        return { key: dictKey, data: this.dictionary[dictKey] };
      }
    }

    for (let dictKey in this.dictionary) {
      if (q.includes(dictKey) || dictKey.includes(q)) {
        return { key: dictKey, data: this.dictionary[dictKey] };
      }
    }

    return null;
  },

  // Multimodal Food Scanner using Gemini 2.5 Flash Vision
  parseImageWithAI: async function(base64Data, mimeType = 'image/jpeg', apiKey) {
    if (!apiKey) {
      throw new Error("Gemini API key is required for image nutrition scanning.");
    }
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Analyze this meal photo carefully. Identify all food items, estimate their weight/portion size, and calculate total calories, macros (protein, carbs, fats), fiber, and micronutrients." },
              { inlineData: { mimeType: mimeType, data: cleanBase64 } }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                summary: { type: "STRING" },
                calories: { type: "NUMBER" },
                protein: { type: "NUMBER" },
                carbs: { type: "NUMBER" },
                fats: { type: "NUMBER" },
                fiber: { type: "NUMBER" },
                magnesium: { type: "NUMBER" },
                zinc: { type: "NUMBER" },
                vitD: { type: "NUMBER" },
                potassium: { type: "NUMBER" },
                omega3: { type: "NUMBER" },
                calcium: { type: "NUMBER" },
                iron: { type: "NUMBER" },
                breakdown: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      inputName: { type: "STRING" },
                      matchedName: { type: "STRING" },
                      qty: { type: "NUMBER" },
                      unit: { type: "STRING" },
                      calories: { type: "NUMBER" },
                      protein: { type: "NUMBER" },
                      carbs: { type: "NUMBER" },
                      fats: { type: "NUMBER" }
                    }
                  }
                }
              },
              required: ["calories", "protein", "carbs", "fats"]
            }
          }
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        return JSON.parse(data.candidates[0].content.parts[0].text);
      }
      throw new Error("No response content from Gemini Vision API.");
    } catch (e) {
      console.error("Gemini Vision AI meal scanning error:", e);
      throw e;
    }
  },

  // Hybrid AI Fallback Parser using Gemini API
  parseWithAI: async function(text, apiKey) {
    if (!apiKey) {
      return this.parse(text);
    }
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze this meal description: "${text}".`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                calories: { type: "NUMBER" },
                protein: { type: "NUMBER" },
                carbs: { type: "NUMBER" },
                fats: { type: "NUMBER" },
                fiber: { type: "NUMBER" },
                magnesium: { type: "NUMBER" },
                zinc: { type: "NUMBER" },
                vitD: { type: "NUMBER" },
                potassium: { type: "NUMBER" },
                omega3: { type: "NUMBER" },
                calcium: { type: "NUMBER" },
                iron: { type: "NUMBER" }
              },
              required: ["calories", "protein", "carbs", "fats"]
            }
          }
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        return JSON.parse(data.candidates[0].content.parts[0].text);
      }
      return this.parse(text);
    } catch (e) {
      console.warn("Gemini AI parsing failed, falling back to local dictionary parser.", e);
      return this.parse(text);
    }
  },

  // Core Local NLP Parsing Algorithm with Cooking Modifiers
  parse: function(text) {
    if (!text || text.trim() === "") return null;
    
    let cleanText = text.toLowerCase()
      .replace(/\bvef\b/g, 'veg')
      .replace(/(\d+)\s*(g|grams|gram|ml|cups?|bowls?|items?|scoops?|slices?|pieces?|pcs?|roti|chapati|dosa|idli|banana|yogurt|shake|glass)\b/g, '$1$2');

    const rawItems = cleanText.split(/,|\+|\band\b|\n|\s+(?=\d+\s*(?:g|ml|cup|bowl|katori|plate|glass|scoop|item|piece|pc|roti|chapati|dosa|idli|banana|shake)\b)/i);

    const results = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      magnesium: 0,
      zinc: 0,
      vitD: 0,
      potassium: 0,
      omega3: 0,
      calcium: 0,
      iron: 0,
      breakdown: []
    };

    rawItems.forEach(rawItem => {
      let trimmed = rawItem.trim();
      if (!trimmed) return;

      let qty = 1.0;
      let unitType = "item";
      let foodName = trimmed;

      const startMatch = trimmed.match(/^([\d.]+)\s*(g|grams|gram|ml|cups|cup|bowls|bowl|katori|plates|plate|glasses|glass|scoops|scoop|items|item|pieces|piece|pcs|pc|rotis|roti|chapatis|chapati|dosas|dosa|idlis|idli|tbsp|tsp|slices|slice)?\s*(.+)$/);
      const endMatch = trimmed.match(/^(.+?)\s+([\d.]+)\s*(g|grams|gram|ml|cups|cup|bowls|bowl|katori|plates|plate|glasses|glass|scoops|scoop|items|item|pieces|piece|pcs|pc|rotis|roti|chapatis|chapati|dosas|dosa|idlis|idli|tbsp|tsp|slices|slice)?$/);

      if (startMatch) {
        qty = parseFloat(startMatch[1]);
        unitType = startMatch[2] ? startMatch[2].toLowerCase() : "item";
        foodName = startMatch[3].trim();
      } else if (endMatch) {
        foodName = endMatch[1].trim();
        qty = parseFloat(endMatch[2]);
        unitType = endMatch[3] ? endMatch[3].toLowerCase() : "item";
      }

      foodName = foodName.replace(/^(of|a|an|small|large|medium)\s+/i, '').trim();

      if (this.unitConversions[unitType] && this.unitConversions[unitType].gramWeight && (!foodName || foodName.length === 0)) {
        foodName = unitType;
      }

      // Detect Cooking Style Modifiers
      let extraCal = 0;
      let extraFat = 0;
      const isGramMl = (unitType === 'g' || unitType === 'ml' || unitType === 'gram' || unitType === 'grams');
      const portionScale = isGramMl ? (qty / 100.0) : qty;

      if (/\b(fried|deep fried)\b/i.test(trimmed) && !matchedDataHasFried(foodName)) {
        extraCal = Math.round(120 * portionScale);
        extraFat = Math.round(10 * portionScale * 10) / 10;
      } else if (/\b(ghee roast|butter roast|butter|ghee)\b/i.test(trimmed)) {
        extraCal = Math.round(90 * portionScale);
        extraFat = Math.round(9 * portionScale * 10) / 10;
      } else if (/\b(grilled|tandoori|roasted)\b/i.test(trimmed)) {
        extraCal = Math.round(30 * portionScale);
        extraFat = Math.round(2 * portionScale * 10) / 10;
      }

      function matchedDataHasFried(name) {
        return name.includes("fried chicken") || name.includes("fish fry");
      }

      const matchObj = this.findBestMatch(foodName);
      const matchedKey = matchObj ? matchObj.key : null;
      const matchedData = matchObj ? matchObj.data : null;

      if (matchedData) {
        let multiplier = 1.0;

        if (matchedData.unit === "100g" || matchedData.unit === "100ml") {
          if (unitType === "g" || unitType === "gram" || unitType === "grams" || unitType === "ml") {
            multiplier = qty / 100.0;
          } else if (unitType === "bowl" || unitType === "bowls" || unitType === "katori") {
            multiplier = (qty * 150.0) / 100.0;
          } else if (unitType === "cup" || unitType === "cups") {
            multiplier = (qty * 150.0) / 100.0;
          } else if (unitType === "plate" || unitType === "plates") {
            multiplier = (qty * 350.0) / 100.0;
          } else if (unitType === "glass" || unitType === "glasses") {
            multiplier = (qty * 250.0) / 100.0;
          } else if (unitType === "tbsp") {
            multiplier = (qty * 15.0) / 100.0;
          } else if (unitType === "tsp") {
            multiplier = (qty * 5.0) / 100.0;
          } else {
            multiplier = qty;
          }
        } else if (matchedData.unit === "200ml") {
          if (unitType === "ml") {
            multiplier = qty / 200.0;
          } else if (unitType === "glass" || unitType === "glasses") {
            multiplier = (qty * 250.0) / 200.0;
          } else if (unitType === "cup" || unitType === "cups") {
            multiplier = (qty * 200.0) / 200.0;
          } else {
            multiplier = qty;
          }
        } else if (matchedData.unit === "30g") {
          if (unitType === "g" || unitType === "gram" || unitType === "grams") {
            multiplier = qty / 30.0;
          } else {
            multiplier = qty;
          }
        } else {
          if (unitType === "g" || unitType === "gram" || unitType === "grams") {
            const weightPerItem = (this.unitConversions[matchedKey] && this.unitConversions[matchedKey].gramWeight) ? this.unitConversions[matchedKey].gramWeight : 50;
            multiplier = qty / weightPerItem;
          } else {
            multiplier = qty;
          }
        }

        const itemCal = Math.round(matchedData.calories * multiplier) + extraCal;
        const itemPro = Math.round(matchedData.protein * multiplier * 10) / 10;
        const itemCarb = Math.round(matchedData.carbs * multiplier * 10) / 10;
        const itemFat = Math.round((matchedData.fats * multiplier + extraFat) * 10) / 10;
        const itemFib = Math.round((matchedData.fiber || 0) * multiplier * 10) / 10;
        
        const itemMag = Math.round((matchedData.magnesium || 0) * multiplier);
        const itemZinc = Math.round((matchedData.zinc || 0) * multiplier * 10) / 10;
        const itemVitD = Math.round((matchedData.vitD || 0) * multiplier);
        const itemPot = Math.round((matchedData.potassium || 0) * multiplier);
        const itemOmega = parseFloat(((matchedData.omega3 || 0) * multiplier).toFixed(1));
        const itemCalc = Math.round((matchedData.calcium || 0) * multiplier);
        const itemIron = Math.round((matchedData.iron || 0) * multiplier * 10) / 10;

        results.calories += itemCal;
        results.protein += itemPro;
        results.carbs += itemCarb;
        results.fats += itemFat;
        results.fiber += itemFib;

        results.magnesium += itemMag;
        results.zinc += itemZinc;
        results.vitD += itemVitD;
        results.potassium += itemPot;
        results.omega3 += itemOmega;
        results.calcium += itemCalc;
        results.iron += itemIron;

        results.breakdown.push({
          inputName: trimmed,
          matchedName: matchedKey.charAt(0).toUpperCase() + matchedKey.slice(1),
          qty: qty,
          unit: unitType,
          calories: itemCal,
          protein: itemPro,
          carbs: itemCarb,
          fats: itemFat,
          fiber: itemFib,
          magnesium: itemMag,
          zinc: itemZinc,
          vitD: itemVitD,
          potassium: itemPot,
          omega3: itemOmega,
          calcium: itemCalc,
          iron: itemIron
        });
      } else {
        let portionMult = qty;
        if (unitType === "g" || unitType === "gram" || unitType === "grams" || unitType === "ml") {
          portionMult = qty / 100.0;
        }

        let estCal = Math.round(130 * portionMult) + extraCal;
        let estPro = Math.round(5 * portionMult);
        let estCarb = Math.round(18 * portionMult);
        let estFat = Math.round(4 * portionMult + extraFat);
        let estFib = Math.round(1.5 * portionMult);

        if (foodName.includes("chicken") || foodName.includes("fish") || foodName.includes("meat") || foodName.includes("mutton") || foodName.includes("beef") || foodName.includes("egg")) {
          estCal = Math.round(165 * portionMult) + extraCal; estPro = Math.round(31 * portionMult); estCarb = 0; estFat = Math.round(3.6 * portionMult + extraFat); estFib = 0;
        } else if (foodName.includes("veg") || foodName.includes("broccoli") || foodName.includes("spinach") || foodName.includes("salad")) {
          estCal = Math.round(40 * portionMult) + extraCal; estPro = Math.round(2.5 * portionMult); estCarb = Math.round(8 * portionMult); estFat = Math.round(0.4 * portionMult + extraFat); estFib = Math.round(3 * portionMult);
        } else if (foodName.includes("rice") || foodName.includes("potato") || foodName.includes("biryani") || foodName.includes("poha") || foodName.includes("upma")) {
          estCal = Math.round(140 * portionMult) + extraCal; estPro = Math.round(3 * portionMult); estCarb = Math.round(28 * portionMult); estFat = Math.round(1.5 * portionMult + extraFat); estFib = 1;
        } else if (foodName.includes("dal") || foodName.includes("curry") || foodName.includes("sambar") || foodName.includes("chole") || foodName.includes("rajma")) {
          estCal = Math.round(120 * portionMult) + extraCal; estPro = Math.round(6 * portionMult); estCarb = Math.round(15 * portionMult); estFat = Math.round(3 * portionMult + extraFat); estFib = 3;
        } else if (foodName.includes("yogurt") || foodName.includes("shake") || foodName.includes("curd") || foodName.includes("milk")) {
          estCal = Math.round(75 * portionMult) + extraCal; estPro = Math.round(3.5 * portionMult); estCarb = Math.round(10 * portionMult); estFat = Math.round(2.5 * portionMult + extraFat); estFib = 0;
        }

        results.calories += estCal;
        results.protein += estPro;
        results.carbs += estCarb;
        results.fats += estFat;
        results.fiber += estFib;

        results.breakdown.push({
          inputName: trimmed,
          matchedName: foodName + " (Estimated)",
          qty: qty,
          unit: unitType,
          calories: estCal,
          protein: estPro,
          carbs: estCarb,
          fats: estFat,
          fiber: estFib,
          magnesium: Math.round(15 * portionMult),
          zinc: Math.round(0.5 * portionMult * 10) / 10,
          vitD: 0,
          potassium: Math.round(150 * portionMult),
          omega3: 0,
          calcium: Math.round(20 * portionMult),
          iron: Math.round(0.5 * portionMult * 10) / 10
        });
      }
    });

    results.protein = Math.round(results.protein * 10) / 10;
    results.carbs = Math.round(results.carbs * 10) / 10;
    results.fats = Math.round(results.fats * 10) / 10;
    results.fiber = Math.round(results.fiber * 10) / 10;
    results.omega3 = parseFloat(results.omega3.toFixed(1));

    return results;
  }
};
