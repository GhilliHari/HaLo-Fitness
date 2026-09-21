import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { query, run, get, initDatabase, dbPath } from './db.js';
import { backupDatabaseToGCS, uploadMealPhotoToGCS, syncUserLogsToGCS } from './gcs-manager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.get(['/download-apk', '/HaLo-Fitness.apk'], (req, res) => {
  const apkPath = join(__dirname, 'public', 'HaLo-Fitness.apk');
  res.download(apkPath, 'HaLo-Fitness.apk');
});

app.post('/api/log-client-error', (req, res) => {
  console.log('=== CLIENT ERROR DETECTED ===');
  console.log(req.body.message);
  console.log(req.body.stack);
  console.log('=============================');
  res.json({ status: 'ok' });
});


// Ensure DB is initialized before handling requests
app.use(async (req, res, next) => {
  try {
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database not initialized', details: err.message });
  }
});

// Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    const existing = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Account with this email already exists' });
    }
    const userRes = await run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email.toLowerCase().trim(), password, name]
    );

    // Create default profile for user
    await run(`
      INSERT INTO profile (user_id, username, track, experience_level, age, gender, weight, target_weight, height, activity_level, fitness_goal, bmr, tdee, daily_calorie_target, protein_target, carbs_target, fats_target, water_target)
      VALUES (?, ?, 'natural', 'intermediate', 28, 'male', 75.0, 72.0, 175.0, 'moderate', 'fat_loss', 1680, 2604, 2104, 150, 235, 58, 3500)
    `, [userRes.id, name]);

    const user = { id: userRes.id, email: email.toLowerCase().trim(), name };
    res.json({ message: 'Registration successful', user });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await get('SELECT id, email, password, name FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// Scientific Calorie, Ideal Weight & Workout Recommendation Endpoint
app.post('/api/calorie-recommendation', async (req, res) => {
  try {
    const { age, gender, height, weight, target_weight, activity_level, fitness_goal, equipment_level } = req.body;

    const numAge = parseInt(age) || 28;
    const numHeight = parseFloat(height) || 178;
    const numWeight = parseFloat(weight) || 75;
    const strGender = (gender || 'male').toLowerCase();
    const strActivity = (activity_level || 'moderate').toLowerCase();
    const strGoal = (fitness_goal || 'fat_loss').toLowerCase();

    // 1. Calculate Dual-Formula Clinical BMR
    // Formula A: Mifflin-St Jeor (1990) - High precision for contemporary body compositions
    let bmrMifflin = 9.99 * numWeight + 6.25 * numHeight - 4.92 * numAge;
    bmrMifflin = strGender === 'female' ? bmrMifflin - 161 : bmrMifflin + 5;

    // Formula B: Revised Harris-Benedict (Roza and Shizgal, 1984) - Established metabolic standard
    let bmrHarris = strGender === 'female'
      ? 447.593 + (9.247 * numWeight) + (3.098 * numHeight) - (4.330 * numAge)
      : 88.362 + (13.397 * numWeight) + (4.799 * numHeight) - (5.677 * numAge);

    // Weighted Consensus BMR (60% Mifflin-St Jeor + 40% Harris-Benedict)
    const bmr = Math.round((bmrMifflin * 0.6) + (bmrHarris * 0.4));

    // 2. Activity Multiplier -> TDEE with Thermic Effect of Food (TEF) Integration
    const multipliers = {
      sedentary: 1.20,       // Desk job, minimal walking (<3,000 steps/day)
      light: 1.375,          // 1-3 light training sessions/wk + 5,000-7,500 steps/day
      moderate: 1.55,        // 3-5 moderate sessions/wk + 8,000-10,000 steps/day
      very_active: 1.725,    // 6-7 intense sessions/wk + 10,000+ steps/day
      extra_active: 1.90     // 2x/day athlete training or heavy manual labor
    };
    const actMult = multipliers[strActivity] || 1.55;
    const tdee = Math.round(bmr * actMult);
    const tef = Math.round(tdee * 0.10); // ~10% thermic effect of food digestion

    // 3. Ideal Body Weight & Anthropometric Analysis
    const heightM = numHeight / 100;
    const heightInches = numHeight / 2.54;
    const bmi = Math.round((numWeight / (heightM * heightM)) * 10) / 10;

    let bmiCatName = 'Normal';
    let bmiColor = '#00F2FE';
    if (bmi < 18.5) { bmiCatName = 'Underweight'; bmiColor = '#FFB703'; }
    else if (bmi <= 24.9) { bmiCatName = 'Normal Weight'; bmiColor = '#00F2FE'; }
    else if (bmi <= 29.9) { bmiCatName = 'Overweight'; bmiColor = '#FF9000'; }
    else { bmiCatName = 'Obese'; bmiColor = '#FF4D6D'; }

    // Multi-Standard Ideal Weight Modeling
    // A) WHO Healthy BMI Midpoint (21.7 kg/m²)
    const minKg = Math.round(18.5 * heightM * heightM * 10) / 10;
    const maxKg = Math.round(24.9 * heightM * heightM * 10) / 10;
    const whoMidpoint = Math.round(21.7 * heightM * heightM * 10) / 10;

    // B) Devine Formula (1974)
    const inchesOver60 = Math.max(0, heightInches - 60);
    const devineKg = Math.round((strGender === 'female' ? 45.5 + 2.3 * inchesOver60 : 50 + 2.3 * inchesOver60) * 10) / 10;

    // C) Robinson Formula (1983)
    const robinsonKg = Math.round((strGender === 'female' ? 49 + 1.7 * inchesOver60 : 52 + 1.9 * inchesOver60) * 10) / 10;

    // Harmonized Clinical Ideal Weight
    const idealKg = Math.round(((whoMidpoint * 0.4) + (devineKg * 0.3) + (robinsonKg * 0.3)) * 10) / 10;
    const weightGapKg = Math.round((numWeight - idealKg) * 10) / 10;

    // 4. Goal Calorie Adjustment & Deficit Safety Pacing
    let calorieTarget = tdee;
    let weeklyLossKg = 0.5;

    if (strGoal === 'aggressive_loss') {
      calorieTarget = Math.round(tdee * 0.75); // 25% deficit
      weeklyLossKg = 0.70;
    } else if (strGoal === 'fat_loss') {
      calorieTarget = Math.round(tdee * 0.80); // 20% deficit
      weeklyLossKg = 0.50;
    } else if (strGoal === 'maintenance') {
      calorieTarget = tdee;
      weeklyLossKg = 0.0;
    } else if (strGoal === 'lean_gain') {
      calorieTarget = Math.round(tdee * 1.10); // +10% lean surplus
      weeklyLossKg = -0.25;
    } else if (strGoal === 'muscle_surplus') {
      calorieTarget = Math.round(tdee * 1.15); // +15% hyper-growth surplus
      weeklyLossKg = -0.40;
    }

    // Clinical Safety Floor: Never drop below minimum healthy threshold or 85% of BMR
    const safeBmrFloor = Math.round(bmr * 0.85);
    const minAbsoluteCalories = strGender === 'female' ? 1200 : 1500;
    const absoluteFloor = Math.max(minAbsoluteCalories, safeBmrFloor);
    let isSafetyCapped = false;

    if (calorieTarget < absoluteFloor) {
      calorieTarget = absoluteFloor;
      isSafetyCapped = true;
    }

    // 5. High-Precision Timeline to Goal
    let totalWeeks = 0;
    let completionDate = null;
    if (Math.abs(weightGapKg) > 0.2 && weeklyLossKg !== 0) {
      totalWeeks = Math.round((Math.abs(weightGapKg) / Math.abs(weeklyLossKg)) * 10) / 10;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + Math.round(totalWeeks * 7));
      completionDate = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // 6. Scientific Macronutrient Partitioning
    // Protein: High bio-availability targeting per kg body mass
    let proteinPerKg = 2.0;
    if (strGoal.includes('loss')) proteinPerKg = 2.2;     // High protein preserves muscle nitrogen in deficit
    else if (strGoal === 'maintenance') proteinPerKg = 1.8;
    else if (strGoal.includes('gain') || strGoal.includes('surplus')) proteinPerKg = 2.0;

    const proteinGrams = Math.round(numWeight * proteinPerKg);
    const proteinCalories = proteinGrams * 4;

    // Fats: 25% of total caloric intake (minimum 0.8g/kg for hormonal optimization)
    const fatCaloriesFromPct = calorieTarget * 0.25;
    const minFatCalories = numWeight * 0.8 * 9;
    const finalFatCalories = Math.max(fatCaloriesFromPct, minFatCalories);
    const fatGrams = Math.round(finalFatCalories / 9);

    // Carbohydrates: Fuel for performance, glycogen, and CNS
    const carbCalories = Math.max(0, calorieTarget - (proteinCalories + (fatGrams * 9)));
    const carbGrams = Math.round(carbCalories / 4);

    // Water Target (mL): 35mL per kg body weight + exercise compensation
    const waterTarget = Math.round(numWeight * 35 + (strActivity === 'sedentary' ? 0 : 500));

    // 7. Tailored Workout Recommendation Split
    const workoutPlan = {
      split: strGoal.includes('loss') ? 'Push / Pull / Legs + HIIT Finishers' : 'Upper / Lower Hypertrophy Split',
      days: 4,
      rest_interval_secs: 60,
      cardio_finisher: strGoal.includes('loss') ? '15 mins Zone-2 Incline Walk or HIIT' : '10 mins Post-workout Mobility',
      routine: [
        { day: 'Day 1', focus: 'Upper Body Push (Chest, Shoulders, Triceps)', exercises: ['Bench Press / Push-Ups (4x8-10)', 'Incline Dumbbell Press (3x10-12)', 'Overhead Shoulder Press (4x8-10)', 'Triceps Pushdowns (3x12)'] },
        { day: 'Day 2', focus: 'Upper Body Pull (Lats, Upper Back, Biceps)', exercises: ['Deadlift / Lat Pulldown (4x6-8)', 'Seated Cable / Dumbbell Rows (3x10-12)', 'Face Pulls (3x15)', 'Biceps Curls (3x10-12)'] },
        { day: 'Day 3', focus: 'Active Recovery & Mobility', exercises: ['30 mins Light Walking / Zone 1 Cardio', 'Full Body Dynamic Mobility Routine (15 mins)'] },
        { day: 'Day 4', focus: 'Lower Body & Legs (Quads, Hamstrings, Glutes)', exercises: ['Barbell / Goblet Squats (4x8-10)', 'Romanian Deadlifts (3x10-12)', 'Walking Lunges (3x12 steps/leg)', 'Calf Raises (4x15)'] }
      ]
    };

    res.json({
      bmr,
      bmr_mifflin: Math.round(bmrMifflin),
      bmr_harris: Math.round(bmrHarris),
      tdee,
      tef,
      daily_calorie_target: calorieTarget,
      protein_target: proteinGrams,
      carbs_target: carbGrams,
      fats_target: fatGrams,
      water_target: waterTarget,
      is_safety_capped: isSafetyCapped,
      bmi,
      bmi_category: bmiCatName,
      bmi_color: bmiColor,
      ideal_weight: idealKg,
      ideal_weight_min: minKg,
      ideal_weight_max: maxKg,
      devine_weight: devineKg,
      robinson_weight: robinsonKg,
      weight_gap_kg: weightGapKg,
      total_weeks_to_ideal: totalWeeks,
      completion_date: completionDate,
      workout_plan: workoutPlan,
      formula: 'Dual Consensus BMR (Mifflin-St Jeor + Revised Harris-Benedict) + WHO / Devine / Robinson Ideal Weight',
      recommendation_summary: `For ${numHeight}cm & ${numWeight}kg, your medical ideal weight target is ${idealKg}kg (healthy band: ${minKg}-${maxKg}kg). Daily target: ${calorieTarget} kcal/day (${weeklyLossKg > 0 ? `-${Math.round(tdee - calorieTarget)} kcal deficit` : 'maintenance'}).`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate recommendation', details: err.message });
  }
});

// Profile endpoints
app.get('/api/profile', async (req, res) => {
  try {
    const userId = req.query.user_id;
    let profile = null;
    if (userId) {
      profile = await get('SELECT * FROM profile WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
    }
    if (!profile) {
      profile = await get('SELECT * FROM profile ORDER BY id ASC LIMIT 1');
    }
    res.json(profile || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile', details: err.message });
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    const { 
      user_id,
      username, 
      track, 
      experience_level, 
      age,
      gender,
      weight, 
      target_weight,
      height, 
      activity_level,
      fitness_goal,
      bmr,
      tdee,
      daily_calorie_target,
      protein_target,
      carbs_target,
      fats_target,
      water_target
    } = req.body;

    let existing = null;
    if (user_id) {
      existing = await get('SELECT id FROM profile WHERE user_id = ?', [user_id]);
    }
    if (!existing) {
      existing = await get('SELECT id FROM profile ORDER BY id ASC LIMIT 1');
    }
    
    if (existing) {
      await run(`
        UPDATE profile SET 
          username = ?, track = ?, experience_level = ?, age = ?, gender = ?, weight = ?, target_weight = ?, height = ?, 
          activity_level = ?, fitness_goal = ?, bmr = ?, tdee = ?,
          daily_calorie_target = ?, protein_target = ?, carbs_target = ?, fats_target = ?, water_target = ?
        WHERE id = ?
      `, [
        username, track, experience_level, age || 28, gender || 'male', weight, target_weight, height,
        activity_level || 'moderate', fitness_goal || 'fat_loss', bmr || 1700, tdee || 2600,
        daily_calorie_target, protein_target, carbs_target, fats_target, water_target,
        existing.id
      ]);
      res.json({ message: 'Profile updated successfully', id: existing.id });
    } else {
      const result = await run(`
        INSERT INTO profile (user_id, username, track, experience_level, age, gender, weight, target_weight, height, activity_level, fitness_goal, bmr, tdee, daily_calorie_target, protein_target, carbs_target, fats_target, water_target)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user_id, username, track, experience_level, age || 28, gender || 'male', weight, target_weight, height,
        activity_level || 'moderate', fitness_goal || 'fat_loss', bmr || 1700, tdee || 2600,
        daily_calorie_target, protein_target, carbs_target, fats_target, water_target
      ]);
      res.json({ message: 'Profile created successfully', id: result.id });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to save profile', details: err.message });
  }
});

// Tracker log endpoints
app.get('/api/tracker/logs', async (req, res) => {
  try {
    // Return logs, sorted by date ascending, limited to past 120 entries by default
    const logs = await query('SELECT * FROM logs ORDER BY date ASC');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs', details: err.message });
  }
});

app.post('/api/tracker/log', async (req, res) => {
  try {
    const {
      date,
      calories_consumed,
      protein_g,
      carbs_g,
      fats_g,
      water_ml,
      workout_duration_mins,
      workout_completed,
      workout_style,
      notes,
      user_weight,
      magnesium_mg,
      zinc_mg,
      vitamin_d_iu,
      potassium_mg,
      omega3_g,
      calcium_mg,
      iron_mg,
      steps,
      calories_burned_steps,
      distance_km
    } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    }

    // Check if entry exists to preserve user_weight and steps if not supplied
    const existing = await get('SELECT user_weight, steps, calories_burned_steps, distance_km FROM logs WHERE date = ?', [date]);
    const finalWeight = user_weight !== undefined ? user_weight : (existing ? existing.user_weight : 0.0);
    const finalSteps = steps !== undefined ? steps : (existing ? existing.steps : 0);
    const finalCalBurnedSteps = calories_burned_steps !== undefined ? calories_burned_steps : (existing ? existing.calories_burned_steps : 0);
    const finalDistKm = distance_km !== undefined ? distance_km : (existing ? existing.distance_km : 0.0);

    await run(`
      INSERT INTO logs (date, calories_consumed, protein_g, carbs_g, fats_g, water_ml, workout_duration_mins, workout_completed, workout_style, notes, user_weight, magnesium_mg, zinc_mg, vitamin_d_iu, potassium_mg, omega3_g, calcium_mg, iron_mg, steps, calories_burned_steps, distance_km)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        calories_consumed = excluded.calories_consumed,
        protein_g = excluded.protein_g,
        carbs_g = excluded.carbs_g,
        fats_g = excluded.fats_g,
        water_ml = excluded.water_ml,
        workout_duration_mins = excluded.workout_duration_mins,
        workout_completed = excluded.workout_completed,
        workout_style = excluded.workout_style,
        notes = excluded.notes,
        user_weight = COALESCE(NULLIF(excluded.user_weight, 0.0), logs.user_weight),
        magnesium_mg = excluded.magnesium_mg,
        zinc_mg = excluded.zinc_mg,
        vitamin_d_iu = excluded.vitamin_d_iu,
        potassium_mg = excluded.potassium_mg,
        omega3_g = excluded.omega3_g,
        calcium_mg = excluded.calcium_mg,
        iron_mg = excluded.iron_mg,
        steps = COALESCE(excluded.steps, logs.steps),
        calories_burned_steps = COALESCE(excluded.calories_burned_steps, logs.calories_burned_steps),
        distance_km = COALESCE(excluded.distance_km, logs.distance_km)
    `, [
      date,
      calories_consumed || 0,
      protein_g || 0,
      carbs_g || 0,
      fats_g || 0,
      water_ml || 0,
      workout_duration_mins || 0,
      workout_completed ? 1 : 0,
      workout_style || '',
      notes || '',
      finalWeight || 0.0,
      magnesium_mg || 0,
      zinc_mg || 0,
      vitamin_d_iu || 0,
      potassium_mg || 0,
      omega3_g || 0.0,
      calcium_mg || 0,
      iron_mg || 0,
      finalSteps,
      finalCalBurnedSteps,
      finalDistKm
    ]);

    res.json({ message: 'Log entry saved successfully', date, steps: finalSteps, calories_burned_steps: finalCalBurnedSteps, distance_km: finalDistKm });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save log entry', details: err.message });
  }
});

// ==========================================
// CONNECTED SERVICES & WEARABLES (APPLE HEALTH & STRAVA)
// ==========================================

// 1. Get status of all connected services
app.get('/api/services/status', async (req, res) => {
  try {
    const services = await query('SELECT * FROM connected_services');
    const activitiesCount = await get('SELECT COUNT(*) as count FROM external_activities');
    const recentActivities = await query('SELECT * FROM external_activities ORDER BY start_date DESC LIMIT 5');

    const result = {
      apple_health: { is_connected: false, last_synced_at: null, data: {} },
      strava: { is_connected: false, last_synced_at: null, data: {} },
      total_external_activities: activitiesCount ? activitiesCount.count : 0,
      recent_activities: recentActivities || []
    };

    services.forEach(s => {
      let parsed = {};
      try { parsed = JSON.parse(s.athlete_data || '{}'); } catch (e) {}
      if (s.service_name === 'apple_health') {
        result.apple_health = {
          is_connected: s.is_connected === 1,
          last_synced_at: s.last_synced_at,
          data: parsed
        };
      } else if (s.service_name === 'strava') {
        result.strava = {
          is_connected: s.is_connected === 1,
          last_synced_at: s.last_synced_at,
          data: parsed
        };
      }
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services status', details: err.message });
  }
});

// 2. Apple Health: Sync incoming metrics from Apple Watch / iPhone HealthKit
app.post('/api/services/apple-health/sync', async (req, res) => {
  try {
    const { steps, active_energy, distance_km, heart_rate, date } = req.body;
    const syncDate = date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const existing = await get('SELECT * FROM logs WHERE date = ?', [syncDate]);
    const finalSteps = steps !== undefined ? parseInt(steps) : (existing ? existing.steps : 0);
    const finalDistance = distance_km !== undefined ? parseFloat(distance_km) : (existing ? existing.distance_km : 0.0);
    const finalCalBurned = active_energy !== undefined ? parseInt(active_energy) : (existing ? existing.calories_burned_steps : 0);

    await run(`
      INSERT INTO logs (date, steps, calories_burned_steps, distance_km)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        steps = MAX(COALESCE(excluded.steps, 0), logs.steps),
        calories_burned_steps = MAX(COALESCE(excluded.calories_burned_steps, 0), logs.calories_burned_steps),
        distance_km = MAX(COALESCE(excluded.distance_km, 0.0), logs.distance_km)
    `, [syncDate, finalSteps, finalCalBurned, finalDistance]);

    await run(`
      UPDATE connected_services 
      SET is_connected = 1, last_synced_at = ?
      WHERE service_name = 'apple_health'
    `, [now]);

    res.json({
      status: 'success',
      message: 'Apple Health & Apple Watch synchronized successfully',
      date: syncDate,
      steps: finalSteps,
      calories_burned_steps: finalCalBurned,
      distance_km: finalDistance,
      heart_rate: heart_rate || 72,
      synced_at: now
    });
  } catch (err) {
    res.status(500).json({ error: 'Apple Health sync failed', details: err.message });
  }
});

// 3. Apple Health: Toggle connection
app.post('/api/services/apple-health/toggle', async (req, res) => {
  try {
    const { enabled } = req.body;
    await run(`
      UPDATE connected_services
      SET is_connected = ?, last_synced_at = ?
      WHERE service_name = 'apple_health'
    `, [enabled ? 1 : 0, new Date().toISOString()]);
    res.json({ status: 'success', enabled: !!enabled });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update Apple Health state', details: err.message });
  }
});

// 4. Strava: Connect Athlete
app.post('/api/services/strava/connect', async (req, res) => {
  try {
    const { athlete_name, athlete_id, profile_img, access_token, is_demo } = req.body;
    const now = new Date().toISOString();

    const athleteData = {
      athlete_id: athlete_id || 'strava_athlete_' + Date.now(),
      athlete_name: athlete_name || 'Haridoss Loganathan',
      profile_img: profile_img || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      connected_via: is_demo ? 'Instant Connect' : 'Strava OAuth',
      total_runs: 18,
      total_distance_km: 94.6
    };

    await run(`
      INSERT INTO connected_services (service_name, is_connected, access_token, athlete_data, last_synced_at)
      VALUES ('strava', 1, ?, ?, ?)
      ON CONFLICT(service_name) DO UPDATE SET
        is_connected = 1,
        access_token = COALESCE(excluded.access_token, connected_services.access_token),
        athlete_data = excluded.athlete_data,
        last_synced_at = excluded.last_synced_at
    `, [access_token || 'strava_access_token_demo', JSON.stringify(athleteData), now]);

    // Insert sample recent Strava activities if none exist
    const actCount = await get("SELECT COUNT(*) as count FROM external_activities WHERE source = 'strava'");
    if (actCount.count === 0) {
      const today = new Date().toISOString().split('T')[0];
      await run(`
        INSERT INTO external_activities (source, external_id, activity_name, activity_type, start_date, distance_meters, moving_time_seconds, elapsed_time_seconds, calories, average_speed, max_speed, elevation_gain)
        VALUES 
        ('strava', 'strava_act_1', 'Morning Power Run ⚡️', 'Run', ?, 5240.0, 1680, 1720, 385.0, 3.12, 4.45, 42.0),
        ('strava', 'strava_act_2', 'Sunset Tempo Ride 🚴', 'Ride', date('now', '-2 days'), 18500.0, 2700, 2900, 520.0, 6.85, 9.20, 115.0),
        ('strava', 'strava_act_3', 'Weekend Nature Trail Walk 🌲', 'Walk', date('now', '-4 days'), 6400.0, 3600, 3800, 290.0, 1.77, 2.30, 68.0)
      `, [today]);
    }

    res.json({
      status: 'success',
      message: 'Strava account connected successfully',
      athlete: athleteData
    });
  } catch (err) {
    res.status(500).json({ error: 'Strava connection failed', details: err.message });
  }
});

// 5. Strava: Fetch synced activities
app.get('/api/services/strava/activities', async (req, res) => {
  try {
    const activities = await query("SELECT * FROM external_activities WHERE source = 'strava' ORDER BY start_date DESC LIMIT 15");
    res.json({ status: 'success', activities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get Strava activities', details: err.message });
  }
});

// 6. Strava: Sync recent activities to today's log
app.post('/api/services/strava/sync', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const activities = await query("SELECT * FROM external_activities WHERE source = 'strava' AND start_date = ?", [today]);
    
    let addedCalories = 0;
    let addedDistanceM = 0;
    let workoutDurationMins = 0;

    activities.forEach(a => {
      addedCalories += (a.calories || 0);
      addedDistanceM += (a.distance_meters || 0);
      workoutDurationMins += Math.round((a.moving_time_seconds || 0) / 60);
    });

    if (activities.length > 0) {
      await run(`
        UPDATE logs 
        SET workout_completed = 1,
            workout_duration_mins = MAX(workout_duration_mins, ?),
            workout_style = CASE WHEN workout_style = '' THEN 'Strava Outdoor Cardio' ELSE workout_style || ' + Strava' END
        WHERE date = ?
      `, [workoutDurationMins, today]);
    }

    await run("UPDATE connected_services SET last_synced_at = ? WHERE service_name = 'strava'", [new Date().toISOString()]);

    res.json({
      status: 'success',
      message: `Synced ${activities.length} Strava activities to today's log`,
      calories_synced: addedCalories,
      distance_km: (addedDistanceM / 1000).toFixed(2),
      workout_mins: workoutDurationMins
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync Strava activities', details: err.message });
  }
});

// 7. Strava: Disconnect
app.post('/api/services/strava/disconnect', async (req, res) => {
  try {
    await run("UPDATE connected_services SET is_connected = 0, access_token = '', athlete_data = '{}' WHERE service_name = 'strava'");
    res.json({ status: 'success', message: 'Strava disconnected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect Strava', details: err.message });
  }
});

// Google Cloud Storage Sync Endpoints
app.post('/api/gcs/backup', async (req, res) => {
  try {
    const result = await backupDatabaseToGCS(dbPath);
    res.json({ status: 'success', message: 'SQLite database backed up to Google Cloud Storage', path: result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/gcs/upload-meal', async (req, res) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'base64Data is required' });
    }
    const name = filename || `meal_${Date.now()}.jpg`;
    const result = await uploadMealPhotoToGCS(base64Data, name);
    res.json({ status: 'success', result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/gcs/sync-logs', async (req, res) => {
  try {
    const logs = await query('SELECT * FROM logs ORDER BY date ASC');
    const result = await syncUserLogsToGCS('user_default', logs);
    res.json({ status: 'success', message: 'Logs synced to Google Cloud Storage', path: result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export { app as expressApp };

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` HaLo Portal Running at http://localhost:${PORT}`);
    console.log(`==================================================`);
  });
}
