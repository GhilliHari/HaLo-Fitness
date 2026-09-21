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

    // 1. Calculate BMR (Mifflin-St Jeor)
    let bmr = 10 * numWeight + 6.25 * numHeight - 5 * numAge;
    if (strGender === 'female') {
      bmr -= 161;
    } else {
      bmr += 5;
    }
    bmr = Math.round(bmr);

    // 2. Activity Multiplier -> TDEE
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      very_active: 1.725,
      extra_active: 1.9
    };
    const actMult = multipliers[strActivity] || 1.55;
    const tdee = Math.round(bmr * actMult);

    // 3. Ideal Weight & BMI Calculation
    const heightM = numHeight / 100;
    const heightInches = numHeight / 2.54;
    const bmi = Math.round((numWeight / (heightM * heightM)) * 10) / 10;

    let bmiCatName = 'Normal';
    let bmiColor = '#00F2FE';
    if (bmi < 18.5) { bmiCatName = 'Underweight'; bmiColor = '#FFB703'; }
    else if (bmi <= 24.9) { bmiCatName = 'Normal Weight'; bmiColor = '#00F2FE'; }
    else if (bmi <= 29.9) { bmiCatName = 'Overweight'; bmiColor = '#FF9000'; }
    else { bmiCatName = 'Obese'; bmiColor = '#FF4D6D'; }

    const minKg = Math.round(18.5 * heightM * heightM * 10) / 10;
    const maxKg = Math.round(24.9 * heightM * heightM * 10) / 10;
    const bmiMidpoint = (minKg + maxKg) / 2;

    const inchesOver60 = Math.max(0, heightInches - 60);
    const devineKg = Math.round((strGender === 'female' ? 45.5 + 2.3 * inchesOver60 : 50 + 2.3 * inchesOver60) * 10) / 10;
    const idealKg = Math.round(((devineKg + bmiMidpoint) / 2) * 10) / 10;

    const weightGapKg = Math.round((numWeight - idealKg) * 10) / 10;

    // 4. Goal Calorie Adjustment & Deficit Pacing
    let calorieTarget = tdee;
    let weeklyLossKg = 0.5;

    if (strGoal === 'aggressive_loss') { calorieTarget = tdee - 750; weeklyLossKg = 0.75; }
    else if (strGoal === 'fat_loss') { calorieTarget = tdee - 500; weeklyLossKg = 0.5; }
    else if (strGoal === 'maintenance') { calorieTarget = tdee; weeklyLossKg = 0; }
    else if (strGoal === 'lean_gain') { calorieTarget = tdee + 300; weeklyLossKg = -0.3; }
    else if (strGoal === 'muscle_surplus') { calorieTarget = tdee + 500; weeklyLossKg = -0.5; }

    // Safety check minimum floor
    const minCalories = strGender === 'female' ? 1200 : 1500;
    let isSafetyCapped = false;
    if (calorieTarget < minCalories) {
      calorieTarget = minCalories;
      isSafetyCapped = true;
    }

    // 5. Timeline Forecast
    let totalWeeks = 0;
    let completionDate = null;
    if (weeklyLossKg > 0 && Math.abs(weightGapKg) > 0.2) {
      totalWeeks = Math.round((Math.abs(weightGapKg) / weeklyLossKg) * 10) / 10;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + Math.round(totalWeeks * 7));
      completionDate = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // 6. Macro Allocation
    const proteinGrams = Math.round(numWeight * 2.0);
    const proteinCalories = proteinGrams * 4;

    const fatCalories = calorieTarget * 0.25;
    const fatGrams = Math.round(fatCalories / 9);

    const carbCalories = Math.max(0, calorieTarget - (proteinCalories + fatCalories));
    const carbGrams = Math.round(carbCalories / 4);

    const waterTarget = Math.round(numWeight * 35);

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
      tdee,
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
      weight_gap_kg: weightGapKg,
      total_weeks_to_ideal: totalWeeks,
      completion_date: completionDate,
      workout_plan: workoutPlan,
      formula: 'Mifflin-St Jeor BMR + WHO Healthy BMI (18.5-24.9) & Devine Ideal Weight',
      recommendation_summary: `For height ${numHeight}cm & weight ${numWeight}kg, your medical ideal weight target is ${idealKg}kg (healthy band: ${minKg}-${maxKg}kg). Daily target: ${calorieTarget} kcal/day (${weeklyLossKg > 0 ? `-${Math.round(tdee - calorieTarget)} kcal deficit` : 'maintenance'}).`
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
      iron_mg
    } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    }

    // Check if entry exists to preserve user_weight if not supplied
    const existing = await get('SELECT user_weight FROM logs WHERE date = ?', [date]);
    const finalWeight = user_weight !== undefined ? user_weight : (existing ? existing.user_weight : 0.0);

    await run(`
      INSERT INTO logs (date, calories_consumed, protein_g, carbs_g, fats_g, water_ml, workout_duration_mins, workout_completed, workout_style, notes, user_weight, magnesium_mg, zinc_mg, vitamin_d_iu, potassium_mg, omega3_g, calcium_mg, iron_mg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        iron_mg = excluded.iron_mg
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
      iron_mg || 0
    ]);

    res.json({ message: 'Log entry saved successfully', date });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save log entry', details: err.message });
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
