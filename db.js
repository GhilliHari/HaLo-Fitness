import { neon } from '@neondatabase/serverless';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const getPostgresUrl = () =>
  process.env.DATABASE_URL || process.env.POSTGRES_URL || null;

export const isPostgres = () => Boolean(getPostgresUrl());

// Lazy Neon SQL client (safe at build time if DATABASE_URL isn't set yet)
let _neonSql = null;
function getNeonSql() {
  if (!_neonSql) {
    const url = getPostgresUrl();
    if (!url) throw new Error('DATABASE_URL is not configured');
    _neonSql = neon(url);
  }
  return _neonSql;
}

// Convert SQLite `?` placeholders to PostgreSQL `$1, $2, ...`
function toPgParams(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

// Lazy SQLite fallback for local offline desktop/Electron dev when DATABASE_URL is absent
let _sqliteDb = null;
let _sqliteDbPath = null;
export const dbPath =
  process.env.DATABASE_PATH ||
  join(
    process.env.DATA_DIR ||
      (fs.existsSync('/app/data')
        ? '/app/data'
        : process.env.VERCEL
          ? '/tmp'
          : __dirname),
    'database.db'
  );

async function getSqliteDb() {
  if (_sqliteDb) return _sqliteDb;
  const mod = await import('sqlite3');
  const sqlite3 = mod.default || mod;
  const dir = dirname(dbPath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('Could not create dataDir:', e.message);
    }
  }
  _sqliteDbPath = dbPath;
  _sqliteDb = await new Promise((resolve, reject) => {
    const conn = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else {
        console.log('Connected to local SQLite database at:', dbPath);
        resolve(conn);
      }
    });
  });
  return _sqliteDb;
}

// Unified database helpers supporting both Neon Postgres and local SQLite
export const query = async (sql, params = []) => {
  if (isPostgres()) {
    const client = getNeonSql();
    return await client.query(toPgParams(sql), params);
  }
  const db = await getSqliteDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const get = async (sql, params = []) => {
  if (isPostgres()) {
    const rows = await query(sql, params);
    return rows[0] || undefined;
  }
  const db = await getSqliteDb();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = async (sql, params = []) => {
  if (isPostgres()) {
    const client = getNeonSql();
    let pgSql = toPgParams(sql).trim();
    const isInsert = /^INSERT\s+INTO\s+/i.test(pgSql);
    const hasReturning = /\bRETURNING\b/i.test(pgSql);
    const hasDoNothing = /\bDO\s+NOTHING\b/i.test(pgSql);
    if (isInsert && !hasReturning && !hasDoNothing) {
      pgSql = `${pgSql} RETURNING id`;
    }
    const rows = await client.query(pgSql, params);
    const first = Array.isArray(rows) ? rows[0] : undefined;
    return {
      id: first && first.id !== undefined ? first.id : null,
      changes: Array.isArray(rows) ? rows.length : 0,
    };
  }
  const db = await getSqliteDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export async function initDatabase() {
  const pg = isPostgres();
  const idCol = pg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const floatType = pg ? 'DOUBLE PRECISION' : 'REAL';
  const tsCol = pg ? 'TIMESTAMPTZ DEFAULT NOW()' : 'TEXT DEFAULT CURRENT_TIMESTAMP';

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id ${idCol},
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at ${tsCol}
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS profile (
      id ${idCol},
      user_id INTEGER REFERENCES users(id),
      username TEXT DEFAULT 'Aesthetic Warrior',
      track TEXT DEFAULT 'natural',
      experience_level TEXT DEFAULT 'intermediate',
      age INTEGER DEFAULT 28,
      gender TEXT DEFAULT 'male',
      weight ${floatType} DEFAULT 78.5,
      target_weight ${floatType} DEFAULT 75.0,
      height ${floatType} DEFAULT 178.0,
      activity_level TEXT DEFAULT 'moderate',
      fitness_goal TEXT DEFAULT 'fat_loss',
      bmr ${floatType} DEFAULT 1715.0,
      tdee ${floatType} DEFAULT 2658.0,
      daily_calorie_target INTEGER DEFAULT 2158,
      protein_target INTEGER DEFAULT 157,
      carbs_target INTEGER DEFAULT 243,
      fats_target INTEGER DEFAULT 60,
      water_target INTEGER DEFAULT 3500
    )
  `);

  if (!pg) {
    const safeAddColumn = async (table, col, def) => {
      try {
        const info = await query(`PRAGMA table_info(${table})`);
        const names = info.map((c) => c.name);
        if (!names.includes(col)) {
          await run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
        }
      } catch (_) {}
    };
    await safeAddColumn('profile', 'age', 'INTEGER DEFAULT 28');
    await safeAddColumn('profile', 'gender', "TEXT DEFAULT 'male'");
    await safeAddColumn('profile', 'activity_level', "TEXT DEFAULT 'moderate'");
    await safeAddColumn('profile', 'fitness_goal', "TEXT DEFAULT 'fat_loss'");
    await safeAddColumn('profile', 'bmr', 'REAL DEFAULT 1715.0');
    await safeAddColumn('profile', 'tdee', 'REAL DEFAULT 2658.0');
    await safeAddColumn('profile', 'user_id', 'INTEGER');
  }

  await run(`
    CREATE TABLE IF NOT EXISTS logs (
      id ${idCol},
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
      user_weight ${floatType} DEFAULT 0.0,
      magnesium_mg INTEGER DEFAULT 0,
      zinc_mg INTEGER DEFAULT 0,
      vitamin_d_iu INTEGER DEFAULT 0,
      potassium_mg INTEGER DEFAULT 0,
      omega3_g ${floatType} DEFAULT 0.0,
      calcium_mg INTEGER DEFAULT 0,
      iron_mg INTEGER DEFAULT 0,
      steps INTEGER DEFAULT 0,
      calories_burned_steps INTEGER DEFAULT 0,
      distance_km ${floatType} DEFAULT 0.0
    )
  `);

  if (!pg) {
    const safeAddColumn = async (table, col, def) => {
      try {
        const info = await query(`PRAGMA table_info(${table})`);
        const names = info.map((c) => c.name);
        if (!names.includes(col)) {
          await run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
        }
      } catch (_) {}
    };
    await safeAddColumn('logs', 'steps', 'INTEGER DEFAULT 0');
    await safeAddColumn('logs', 'calories_burned_steps', 'INTEGER DEFAULT 0');
    await safeAddColumn('logs', 'distance_km', 'REAL DEFAULT 0.0');
  }

  await run(`
    CREATE TABLE IF NOT EXISTS connected_services (
      id ${idCol},
      user_id INTEGER DEFAULT 1,
      service_name TEXT UNIQUE NOT NULL,
      is_connected INTEGER DEFAULT 0,
      client_id TEXT DEFAULT '',
      client_secret TEXT DEFAULT '',
      access_token TEXT DEFAULT '',
      refresh_token TEXT DEFAULT '',
      token_expires_at INTEGER DEFAULT 0,
      athlete_data TEXT DEFAULT '{}',
      last_synced_at TEXT DEFAULT '',
      created_at ${tsCol}
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS external_activities (
      id ${idCol},
      user_id INTEGER DEFAULT 1,
      source TEXT NOT NULL,
      external_id TEXT UNIQUE,
      activity_name TEXT,
      activity_type TEXT,
      start_date TEXT,
      distance_meters ${floatType} DEFAULT 0.0,
      moving_time_seconds INTEGER DEFAULT 0,
      elapsed_time_seconds INTEGER DEFAULT 0,
      calories ${floatType} DEFAULT 0.0,
      average_speed ${floatType} DEFAULT 0.0,
      max_speed ${floatType} DEFAULT 0.0,
      elevation_gain ${floatType} DEFAULT 0.0,
      raw_data TEXT DEFAULT '{}',
      created_at ${tsCol}
    )
  `);

  // Seed default wearable rows
  await run(
    `INSERT INTO connected_services (user_id, service_name, is_connected, athlete_data)
     VALUES (1, 'apple_health', 1, ?)
     ON CONFLICT (service_name) DO NOTHING`,
    [JSON.stringify({ device: 'Apple Watch & iPhone HealthKit', auto_sync: true, sync_steps: true, sync_calories: true })]
  );
  await run(
    `INSERT INTO connected_services (user_id, service_name, is_connected, athlete_data)
     VALUES (1, 'strava', 0, ?)
     ON CONFLICT (service_name) DO NOTHING`,
    [JSON.stringify({ athlete_name: '', total_activities: 0 })]
  );

  // Seed default demo user
  let demoUser = await get('SELECT * FROM users WHERE email = ?', ['demo@halofitness.com']);
  if (!demoUser) {
    const res = await run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      ['demo@halofitness.com', 'halo123', 'Haridoss Loganathan']
    );
    demoUser = { id: res.id, email: 'demo@halofitness.com', name: 'Haridoss Loganathan' };
  }

  // Seed default profile
  const existingProfile = await get('SELECT * FROM profile LIMIT 1');
  if (!existingProfile) {
    await run(
      `INSERT INTO profile (user_id, username, track, experience_level, age, gender, weight, target_weight, height, activity_level, fitness_goal, bmr, tdee, daily_calorie_target, protein_target, carbs_target, fats_target, water_target)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [demoUser.id, 'Haridoss Loganathan', 'natural', 'intermediate', 28, 'male', 76.5, 75.0, 178.0, 'moderate', 'fat_loss', 1700, 2635, 2135, 153, 240, 58, 3500]
    );
  }

  // Seed recent 30 days of historical logs on fresh DB (fast on cold start)
  const logCountRow = await get('SELECT COUNT(*) AS count FROM logs');
  const logCount = Number(logCountRow?.count || 0);
  if (logCount === 0) {
    const today = new Date();
    const styles = ['VO2max', 'HIIT', 'Strength', 'Metabolism Circuit', 'Machine Focus'];
    let currentSimulatedWeight = 78.5;

    for (let i = 30; i >= 0; i--) {
      const logDate = new Date(today);
      logDate.setDate(today.getDate() - i);
      const dateString = logDate.toISOString().split('T')[0];
      const dayOfWeek = logDate.getDay();
      const isWorkoutDay = dayOfWeek !== 0 && dayOfWeek !== 4;

      const calories = 2600 + Math.floor(Math.random() * 400) - 200;
      const protein = 150 + Math.floor(Math.random() * 30) - 10;
      const carbs = 280 + Math.floor(Math.random() * 50) - 25;
      const fats = 75 + Math.floor(Math.random() * 20) - 10;
      const water = 2800 + Math.floor(Math.random() * 1000);
      const duration = isWorkoutDay ? 45 + Math.floor(Math.random() * 30) : 0;
      const completed = isWorkoutDay ? 1 : 0;
      const style = isWorkoutDay ? styles[Math.floor(Math.random() * styles.length)] : '';
      const note = isWorkoutDay ? 'Felt strong, solid pump.' : 'Active recovery rest day.';
      const magnesium = 250 + Math.floor(Math.random() * 250);
      const zinc = 8 + Math.floor(Math.random() * 12);
      const vitD = 800 + Math.floor(Math.random() * 3200);
      const potassium = 1800 + Math.floor(Math.random() * 2200);
      const omega3 = parseFloat((0.5 + Math.random() * 3.5).toFixed(1));
      const calcium = 600 + Math.floor(Math.random() * 800);
      const iron = 6 + Math.floor(Math.random() * 14);

      if (isWorkoutDay) currentSimulatedWeight -= 0.05;
      else currentSimulatedWeight += 0.01;
      const finalWeight = parseFloat(currentSimulatedWeight.toFixed(2));

      await run(
        `INSERT INTO logs (date, calories_consumed, protein_g, carbs_g, fats_g, water_ml, workout_duration_mins, workout_completed, workout_style, notes, user_weight, magnesium_mg, zinc_mg, vitamin_d_iu, potassium_mg, omega3_g, calcium_mg, iron_mg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (date) DO NOTHING`,
        [dateString, calories, protein, carbs, fats, water, duration, completed, style, note, finalWeight, magnesium, zinc, vitD, potassium, omega3, calcium, iron]
      );
    }
  }
}

let _initPromise = null;
export function ensureDbInitialized() {
  if (!_initPromise) {
    _initPromise = initDatabase().catch((err) => {
      _initPromise = null;
      console.error('Database initialization failed:', err);
      throw err;
    });
  }
  return _initPromise;
}

export default { query, get, run, initDatabase, ensureDbInitialized, isPostgres, dbPath };
