import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Promisify database operations
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export async function initDatabase() {
  // Create users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create profile table
  await run(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT DEFAULT 'Aesthetic Warrior',
      track TEXT DEFAULT 'natural',
      experience_level TEXT DEFAULT 'intermediate',
      age INTEGER DEFAULT 28,
      gender TEXT DEFAULT 'male',
      weight REAL DEFAULT 78.5,
      target_weight REAL DEFAULT 75.0,
      height REAL DEFAULT 178.0,
      activity_level TEXT DEFAULT 'moderate',
      fitness_goal TEXT DEFAULT 'fat_loss',
      bmr REAL DEFAULT 1715.0,
      tdee REAL DEFAULT 2658.0,
      daily_calorie_target INTEGER DEFAULT 2158,
      protein_target INTEGER DEFAULT 157,
      carbs_target INTEGER DEFAULT 243,
      fats_target INTEGER DEFAULT 60,
      water_target INTEGER DEFAULT 3500,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Safely add missing columns to profile if table existed previously
  const tableInfo = await query("PRAGMA table_info(profile)");
  const colNames = tableInfo.map(c => c.name);
  if (!colNames.includes('age')) await run("ALTER TABLE profile ADD COLUMN age INTEGER DEFAULT 28");
  if (!colNames.includes('gender')) await run("ALTER TABLE profile ADD COLUMN gender TEXT DEFAULT 'male'");
  if (!colNames.includes('activity_level')) await run("ALTER TABLE profile ADD COLUMN activity_level TEXT DEFAULT 'moderate'");
  if (!colNames.includes('fitness_goal')) await run("ALTER TABLE profile ADD COLUMN fitness_goal TEXT DEFAULT 'fat_loss'");
  if (!colNames.includes('bmr')) await run("ALTER TABLE profile ADD COLUMN bmr REAL DEFAULT 1715.0");
  if (!colNames.includes('tdee')) await run("ALTER TABLE profile ADD COLUMN tdee REAL DEFAULT 2658.0");
  if (!colNames.includes('user_id')) await run("ALTER TABLE profile ADD COLUMN user_id INTEGER");

  await run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      date TEXT UNIQUE,
      calories_consumed INTEGER DEFAULT 0,
      protein_g INTEGER DEFAULT 0,
      carbs_g INTEGER DEFAULT 0,
      fats_g INTEGER DEFAULT 0,
      water_ml INTEGER DEFAULT 0,
      workout_duration_mins INTEGER DEFAULT 0,
      workout_completed INTEGER DEFAULT 0,
      workout_style TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      user_weight REAL DEFAULT 0.0,
      magnesium_mg INTEGER DEFAULT 0,
      zinc_mg INTEGER DEFAULT 0,
      vitamin_d_iu INTEGER DEFAULT 0,
      potassium_mg INTEGER DEFAULT 0,
      omega3_g REAL DEFAULT 0.0,
      calcium_mg INTEGER DEFAULT 0,
      iron_mg INTEGER DEFAULT 0
    )
  `);

  // Seed default demo user if not existing
  let demoUser = await get("SELECT * FROM users WHERE email = ?", ['demo@halofitness.com']);
  if (!demoUser) {
    const res = await run(
      "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
      ['demo@halofitness.com', 'halo123', 'Haridoss Loganathan']
    );
    demoUser = { id: res.id, email: 'demo@halofitness.com', name: 'Haridoss Loganathan' };
    console.log('Demo user seeded:', demoUser.email);
  }

  // Seed default profile if not exists
  const existingProfile = await get('SELECT * FROM profile LIMIT 1');
  if (!existingProfile) {
    await run(`
      INSERT INTO profile (user_id, username, track, experience_level, age, gender, weight, target_weight, height, activity_level, fitness_goal, bmr, tdee, daily_calorie_target, protein_target, carbs_target, fats_target, water_target)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [demoUser.id, 'Haridoss Loganathan', 'natural', 'intermediate', 28, 'male', 76.5, 75.0, 178.0, 'moderate', 'fat_loss', 1700, 2635, 2135, 153, 240, 58, 3500]);
    console.log('Default profile seeded.');
  }

  // Seed historical logs if table is empty (for weekly/monthly/yearly charts)
  const logCount = await get('SELECT COUNT(*) as count FROM logs');
  if (logCount.count === 0) {
    console.log('Seeding historical logs for visualization...');
    const today = new Date();
    
    // Let's seed logs for the last 120 days
    const insertStmt = `
      INSERT OR REPLACE INTO logs (date, calories_consumed, protein_g, carbs_g, fats_g, water_ml, workout_duration_mins, workout_completed, workout_style, notes, user_weight, magnesium_mg, zinc_mg, vitamin_d_iu, potassium_mg, omega3_g, calcium_mg, iron_mg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Base weight is 78.5 kg, let's simulate it decreasing slightly over 120 days to 76.5 kg
    let currentSimulatedWeight = 78.5;

    for (let i = 120; i >= 0; i--) {
      const logDate = new Date(today);
      logDate.setDate(today.getDate() - i);
      const dateString = logDate.toISOString().split('T')[0];

      // Simulate some fluctuations
      const dayOfWeek = logDate.getDay(); // 0 is Sunday, 6 is Saturday
      const isWorkoutDay = dayOfWeek !== 0 && dayOfWeek !== 4; // Workout 5 days a week
      
      const calorieTarget = 2600;
      let calories = calorieTarget + Math.floor(Math.random() * 400) - 200; // ±200 calories
      let protein = 150 + Math.floor(Math.random() * 30) - 10;
      let carbs = 280 + Math.floor(Math.random() * 50) - 25;
      let fats = 75 + Math.floor(Math.random() * 20) - 10;
      let water = 2800 + Math.floor(Math.random() * 1000);
      let duration = isWorkoutDay ? 45 + Math.floor(Math.random() * 30) : 0;
      let completed = isWorkoutDay ? 1 : 0;

      const styles = ['VO2max', 'HIIT', 'Strength', 'Metabolism Circuit', 'Machine Focus'];
      let style = isWorkoutDay ? styles[Math.floor(Math.random() * styles.length)] : '';
      let note = isWorkoutDay ? 'Felt strong, solid pump.' : 'Active recovery rest day.';
      
      // Micro-nutrients
      let magnesium = 250 + Math.floor(Math.random() * 250); // 250-500mg
      let zinc = 8 + Math.floor(Math.random() * 12); // 8-20mg
      let vitD = 800 + Math.floor(Math.random() * 3200); // 800-4000 IU
      let potassium = 1800 + Math.floor(Math.random() * 2200); // 1800-4000mg
      let omega3 = parseFloat((0.5 + Math.random() * 3.5).toFixed(1)); // 0.5-4.0g
      let calcium = 600 + Math.floor(Math.random() * 800); // 600-1400mg
      let iron = 6 + Math.floor(Math.random() * 14); // 6-20mg

      // Simulate weight change
      if (isWorkoutDay) {
        currentSimulatedWeight -= 0.03 + (Math.random() * 0.02 - 0.01);
      } else {
        currentSimulatedWeight += 0.01 + (Math.random() * 0.02 - 0.01);
      }
      
      // Keep weight within a sensible range
      const finalWeight = parseFloat(currentSimulatedWeight.toFixed(2));

      await run(insertStmt, [
        dateString,
        calories,
        protein,
        carbs,
        fats,
        water,
        duration,
        completed,
        style,
        note,
        finalWeight,
        magnesium,
        zinc,
        vitD,
        potassium,
        omega3,
        calcium,
        iron
      ]);
    }
    console.log('Seeded 120 days of historical tracking data.');
  }
}

// Initialize database when db.js is imported / run directly
initDatabase().catch(err => {
  console.error('Database initialization failed:', err);
});

export default db;
