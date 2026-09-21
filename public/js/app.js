// HaLo Core Client Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // Base API URL configuration (empty for relative web hosting, absolute for mobile)
  const API_BASE = window.API_BASE_URL || '';

  // App State
  const state = {
    activeTab: 'tab-dashboard',
    activeTrack: 'natural', // 'natural' or 'enhanced'
    activeSplit: 'beginner', // 'beginner', 'intermediate', 'expert'
    activeWeek: 1,
    selectedExerciseKey: null,
    activeVideoKey: null,
    activeVideoLang: 'en',
    lang: 'en', // 'en', 'ta', 'tg'
    dietType: 'nonveg', // 'nonveg', 'veg', 'vegan', 'custom'
    profile: null,
    logs: [],
    scannerStream: null,
    scannerActiveTab: 'upload', // 'upload' or 'camera'
    scannerParsedResult: null
  };

  const sessionMicros = {
    magnesium_mg: 0,
    zinc_mg: 0,
    vitamin_d_iu: 0,
    potassium_mg: 0,
    omega3_g: 0.0,
    calcium_mg: 0,
    iron_mg: 0
  };

  // DOM Elements
  const body = document.body;
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');
  const trackBtns = document.querySelectorAll('.track-btn');
  const splitBtns = document.querySelectorAll('.split-btn');
  const langBtns = document.querySelectorAll('.lang-btn');
  
  // Dialog Elements
  const logDialog = document.getElementById('log-dialog');
  const videoDialog = document.getElementById('video-dialog');
  const profileDialog = document.getElementById('profile-dialog');
  const scannerDialog = document.getElementById('scanner-dialog');
  const btnScanMealShortcut = document.getElementById('btn-scan-meal-shortcut');
  const btnScanMealTracker = document.getElementById('btn-scan-meal-tracker');
  
  // Form Elements
  const trackerForm = document.getElementById('tracker-log-form');
  const dialogLogForm = document.getElementById('dialog-log-form');
  const profileForm = document.getElementById('profile-settings-form');

  // Initialize
  async function init() {
    // Detect iOS to apply scroll performance overrides
    const isCapacitorIOS = window.Capacitor && window.Capacitor.getPlatform() === 'ios';
    const isSafariIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isCapacitorIOS || isSafariIOS) {
      document.body.classList.add('is-ios-app');
    }

    // Wait for native database to be ready
    if (window.AppDB) {
      await window.AppDB.init();
    }

    // Set current date in forms
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('track-log-date').value = todayStr;

    // Load initial data from API
    updateAuthUI();
    await fetchProfile();
    await fetchLogs();

    // Ensure targets are calculated based on stats on load
    if (state.profile) {
      calculateProfileTargets(state.profile);
    }
    
    // Update dashboard workout dynamically based on current plan
    updateDashboardWorkout();

    // Populate initial session micros from today's log if it exists
    const todayLog = state.logs.find(l => l.date === todayStr);
    if (todayLog) {
      sessionMicros.magnesium_mg = todayLog.magnesium_mg || 0;
      sessionMicros.zinc_mg = todayLog.zinc_mg || 0;
      sessionMicros.vitamin_d_iu = todayLog.vitamin_d_iu || 0;
      sessionMicros.potassium_mg = todayLog.potassium_mg || 0;
      sessionMicros.omega3_g = todayLog.omega3_g || 0.0;
      sessionMicros.calcium_mg = todayLog.calcium_mg || 0;
      sessionMicros.iron_mg = todayLog.iron_mg || 0;
    }

    // Initialize Pedometer engine
    if (window.Pedometer) {
      window.Pedometer.init(state.profile, todayLog);
    }

    // Setup sidebar navigation clicks
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = item.dataset.tab;
        switchTab(tabId);
      });
    });

    // Setup track controller clicks
    trackBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const track = btn.dataset.track;
        await setTrack(track);
      });
    });

    // Setup workout split buttons
    splitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const split = btn.dataset.split;
        setWorkoutSplit(split);
      });
    });

    // Setup language switcher buttons
    langBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setLanguage(btn.dataset.lang);
      });
    });

    // Setup diet type selector buttons
    document.querySelectorAll('.diet-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.dietType = btn.dataset.type;
        renderDietPanel();
      });
    });

    // Setup week buttons
    const weekBtns = document.querySelectorAll('.week-btn');
    weekBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeWeek = parseInt(btn.dataset.week);
        weekBtns.forEach(b => {
          if (parseInt(b.dataset.week) === state.activeWeek) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
        setWorkoutSplit('custom');
      });
    });

    // Setup Movement Directory collapse toggle
    const movementHeader = document.getElementById('movement-directory-header');
    const movementList = document.getElementById('exercise-cards-list');
    const movementChevron = document.querySelector('.movement-directory-chevron');
    if (movementHeader && movementList) {
      movementHeader.addEventListener('click', () => {
        const isOpen = movementList.style.display === 'flex';
        movementList.style.display = isOpen ? 'none' : 'flex';
        if (movementChevron) {
          movementChevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        }
      });
    }

    // Bind settings buttons
    document.getElementById('btn-open-profile-dialog').addEventListener('click', openProfileDialog);
    const headerCalcShortcut = document.getElementById('btn-header-calc-shortcut');
    if (headerCalcShortcut) headerCalcShortcut.addEventListener('click', openProfileDialog);
    document.getElementById('btn-close-profile-dialog').addEventListener('click', () => profileDialog.close());
    document.getElementById('btn-cancel-profile').addEventListener('click', () => profileDialog.close());

    // Bind log shortcut buttons
    document.getElementById('btn-log-calories-shortcut').addEventListener('click', (e) => {
      e.stopPropagation();
      const _now = new Date();
      const todayStr = new Date(_now.getTime() - (_now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const todayLog = state.logs.find(l => l.date === todayStr) || {};
      
      document.getElementById('log-calories').value = todayLog.calories_consumed || '';
      document.getElementById('log-protein').value = todayLog.protein_g || '';
      document.getElementById('log-carbs').value = todayLog.carbs_g || '';
      document.getElementById('log-fats').value = todayLog.fats_g || '';
      document.getElementById('log-water').value = todayLog.water_ml || '';
      document.getElementById('log-duration').value = todayLog.workout_duration_mins || '';
      document.getElementById('log-workout-completed').checked = !!todayLog.workout_completed;
      document.getElementById('log-workout-style').value = todayLog.workout_style || '';
      document.getElementById('log-notes').value = todayLog.notes || '';
      document.getElementById('log-weight').value = todayLog.user_weight || (state.profile ? state.profile.weight : '');
      logDialog.showModal();
    });
    
    document.getElementById('btn-close-log-dialog').addEventListener('click', () => logDialog.close());
    document.getElementById('btn-cancel-log').addEventListener('click', () => logDialog.close());

    // Bind video player close & language toggling
    document.getElementById('btn-close-video-dialog').addEventListener('click', closeVideoPlayer);
    document.getElementById('btn-close-video').addEventListener('click', closeVideoPlayer);
    document.getElementById('modal-lang-en').addEventListener('click', () => switchModalLanguage('en'));
    document.getElementById('modal-lang-ta').addEventListener('click', () => switchModalLanguage('ta'));

    // Setup AI Scanner Dialog Toggle
    if (btnScanMealShortcut) {
      btnScanMealShortcut.onclick = () => {
        openScanner();
      };
    }
    if (btnScanMealTracker) {
      btnScanMealTracker.onclick = () => {
        openScanner();
      };
    }
    document.getElementById('btn-close-scanner-dialog').onclick = () => closeScanner();
    document.getElementById('btn-scanner-cancel').onclick = () => closeScanner();
    
    // Scanner Tab Switchers
    document.getElementById('scanner-tab-upload').onclick = () => switchScannerTab('upload');
    document.getElementById('scanner-tab-camera').onclick = () => switchScannerTab('camera');
    
    // File inputs / Dropzones
    const scannerFileInput = document.getElementById('scanner-file-input');
    const uploadZone = document.getElementById('scanner-view-upload');
    
    scannerFileInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        handleScannerFile(e.target.files[0]);
      }
    };

    // Native Camera capture input for iOS/Android
    const scannerCameraInput = document.getElementById('scanner-camera-input');
    if (scannerCameraInput) {
      scannerCameraInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvasEl = document.getElementById('scanner-canvas');
              const videoEl = document.getElementById('scanner-video');
              const capBtn = document.getElementById('btn-camera-capture');
              const retakeBtn = document.getElementById('btn-camera-retake');
              
              if (canvasEl && videoEl) {
                const ctx = canvasEl.getContext('2d');
                canvasEl.width = img.width;
                canvasEl.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                videoEl.style.display = 'none';
                canvasEl.style.display = 'block';
                
                if (capBtn) capBtn.style.display = 'none';
                if (retakeBtn) retakeBtn.style.display = 'inline-flex';
                
                // Start scan animation
                const laser = document.getElementById('scanner-camera-laser-line');
                if (laser) laser.style.display = 'block';
                
                // Simulate analyzing food
                simulateImageAnalysis();
              }
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
        }
      };
    }
    
    // Prefill and bind Gemini Key
    const geminiKeyInput = document.getElementById('scanner-gemini-key');
    if (geminiKeyInput) {
      geminiKeyInput.value = localStorage.getItem('nature_fit_gemini_key') || '';
      geminiKeyInput.onchange = (e) => {
        localStorage.setItem('nature_fit_gemini_key', e.target.value.trim());
      };
    }
    
    // Drag & Drop
    uploadZone.ondragover = (e) => { e.preventDefault(); uploadZone.style.borderColor = 'var(--theme-primary)'; };
    uploadZone.ondragleave = () => { uploadZone.style.borderColor = 'var(--theme-panel-border)'; };
    uploadZone.ondrop = (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = 'var(--theme-panel-border)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleScannerFile(e.dataTransfer.files[0]);
      }
    };

    // Camera actions
    document.getElementById('btn-camera-capture').onclick = captureScannerFrame;
    document.getElementById('btn-camera-retake').onclick = retakeScannerFrame;
    
    // Scanner Submit
    document.getElementById('btn-scanner-submit').onclick = submitScannerResult;

    // NLP parse actions
    document.getElementById('btn-parse-nlp').onclick = () => parseNlpMeal('track-nlp-input', 'page');
    document.getElementById('btn-dialog-parse-nlp').onclick = () => parseNlpMeal('dialog-nlp-input', 'dialog');

    // Bind Form Submits
    trackerForm.addEventListener('submit', handleLogSubmit);
    dialogLogForm.addEventListener('submit', handleLogSubmit);
    profileForm.addEventListener('submit', handleProfileSubmit);

    // Render components
    window.MuscleMap.render('muscle-map-container');
    window.Tracker.init(state.profile, state.logs);
    
    // Initial Render Actions
    await setTrack(state.profile.track || 'natural');
    setWorkoutSplit(state.profile.experience_level || 'beginner');

    // Load HealthifyMe Daily Meal Logs
    loadTodayMealLogs();

    // Set initial language from local storage or default to English
    const savedLang = localStorage.getItem('nature_fit_language') || 'en';
    setLanguage(savedLang);

    // Bind HealthifyMe Interactive Search Dialog events
    bindHealthifyMeSearchEvents();
  }

  // --- HEALTHIFYME MEAL TRACKER LOGIC ---
  state.activeMeal = 'breakfast';
  state.selectedFoodSearchItem = null;
  state.todayMealLogs = {
    breakfast: [],
    lunch: [],
    snack: [],
    dinner: []
  };

  function getTodayDateStr() {
    const _now = new Date();
    return new Date(_now.getTime() - (_now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  }

  function loadTodayMealLogs() {
    const todayStr = getTodayDateStr();
    const key = `nature_fit_meals_${todayStr}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        state.todayMealLogs = JSON.parse(saved);
      } catch (e) {
        state.todayMealLogs = { breakfast: [], lunch: [], snack: [], dinner: [] };
      }
    } else {
      state.todayMealLogs = { breakfast: [], lunch: [], snack: [], dinner: [] };
    }
    renderMealSlots();
  }

  function saveTodayMealLogs() {
    const todayStr = getTodayDateStr();
    const key = `nature_fit_meals_${todayStr}`;
    localStorage.setItem(key, JSON.stringify(state.todayMealLogs));
    
    // Calculate aggregate day totals across all 4 meals
    let totCal = 0, totP = 0, totC = 0, totF = 0;
    let totMag = 0, totZinc = 0, totVitD = 0, totPot = 0, totOmg = 0, totCalc = 0, totIron = 0;

    ['breakfast', 'lunch', 'snack', 'dinner'].forEach(meal => {
      (state.todayMealLogs[meal] || []).forEach(item => {
        totCal += (item.calories || 0);
        totP += (item.protein || 0);
        totC += (item.carbs || 0);
        totF += (item.fats || 0);

        totMag += (item.magnesium || 0);
        totZinc += (item.zinc || 0);
        totVitD += (item.vitD || 0);
        totPot += (item.potassium || 0);
        totOmg += (item.omega3 || 0);
        totCalc += (item.calcium || 0);
        totIron += (item.iron || 0);
      });
    });

    totP = Math.round(totP * 10) / 10;
    totC = Math.round(totC * 10) / 10;
    totF = Math.round(totF * 10) / 10;
    totOmg = parseFloat(totOmg.toFixed(1));

    // Update current today log entry in state.logs
    let todayLog = state.logs.find(l => l.date === todayStr);
    if (!todayLog) {
      todayLog = {
        date: todayStr,
        calories_consumed: 0,
        protein_g: 0,
        carbs_g: 0,
        fats_g: 0,
        water_ml: 2800,
        workout_duration_mins: 0,
        workout_completed: 0,
        workout_style: '',
        notes: '',
        user_weight: state.profile ? state.profile.weight : 75.0
      };
      state.logs.push(todayLog);
    }

    todayLog.calories_consumed = totCal;
    todayLog.protein_g = totP;
    todayLog.carbs_g = totC;
    todayLog.fats_g = totF;

    todayLog.magnesium_mg = totMag;
    todayLog.zinc_mg = totZinc;
    todayLog.vitamin_d_iu = totVitD;
    todayLog.potassium_mg = totPot;
    todayLog.omega3_g = totOmg;
    todayLog.calcium_mg = totCalc;
    todayLog.iron_mg = totIron;

    // Save payload to AppDB
    if (window.AppDB) {
      window.AppDB.saveLog(todayLog).catch(e => console.error("Error saving log:", e));
    }

    // Refresh UI Tracker analytics & metrics
    if (window.Tracker && state.profile) {
      window.Tracker.updateData(state.profile, state.logs);
    }
  }

  function renderMealSlots() {
    const mealTargets = {
      breakfast: Math.round((state.profile ? state.profile.daily_calorie_target : 2500) * 0.25),
      lunch: Math.round((state.profile ? state.profile.daily_calorie_target : 2500) * 0.35),
      snack: Math.round((state.profile ? state.profile.daily_calorie_target : 2500) * 0.15),
      dinner: Math.round((state.profile ? state.profile.daily_calorie_target : 2500) * 0.25)
    };

    ['breakfast', 'lunch', 'snack', 'dinner'].forEach(meal => {
      const items = state.todayMealLogs[meal] || [];
      let mealCal = 0, mealP = 0, mealC = 0, mealF = 0;

      items.forEach(i => {
        mealCal += (i.calories || 0);
        mealP += (i.protein || 0);
        mealC += (i.carbs || 0);
        mealF += (i.fats || 0);
      });

      // Update meal card header badge
      const calBadge = document.getElementById(`meal-cal-${meal}`);
      if (calBadge) {
        calBadge.textContent = `${mealCal} / ${mealTargets[meal]} kcal`;
      }

      // Update items list
      const container = document.getElementById(`meal-items-${meal}`);
      if (!container) return;

      if (items.length === 0) {
        container.innerHTML = `<p style="color: var(--theme-text-muted); font-size: 0.8rem; font-style: italic;">No items logged yet</p>`;
      } else {
        container.innerHTML = '';
        items.forEach((item, idx) => {
          const row = document.createElement('div');
          row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25); padding: 0.45rem 0.75rem; border-radius: 10px; font-size: 0.85rem; border: 1px solid var(--theme-panel-border);';
          row.innerHTML = `
            <div>
              <strong style="color: var(--theme-text-main); font-weight: 600;">${item.qty ? item.qty + 'x ' : ''}${item.matchedName || item.inputName}</strong>
              <span style="color: var(--theme-text-muted); font-size: 0.75rem; display: block; margin-top: 0.1rem;">
                ${item.calories} kcal • P: ${item.protein}g | C: ${item.carbs}g | F: ${item.fats}g
              </span>
            </div>
            <button type="button" class="btn-icon btn-del-meal-item" data-meal="${meal}" data-index="${idx}" style="color: #ff4d4d; font-size: 0.85rem; padding: 0.25rem; background: none; border: none; cursor: pointer;">
              <i class="fa-solid fa-trash"></i>
            </button>
          `;
          container.appendChild(row);
        });

        // Bind delete events
        container.querySelectorAll('.btn-del-meal-item').forEach(btn => {
          btn.onclick = (e) => {
            const m = e.currentTarget.dataset.meal;
            const idx = parseInt(e.currentTarget.dataset.index);
            state.todayMealLogs[m].splice(idx, 1);
            renderMealSlots();
            saveTodayMealLogs();
          };
        });
      }
    });
  }

  // --- HEALTHIFYME INTERACTIVE SEARCH DIALOG HANDLERS ---
  const searchMealDialog = document.getElementById('search-meal-dialog');

  function openSearchMealDialog(targetMeal) {
    state.activeMeal = targetMeal || 'breakfast';
    
    // Highlight active meal button
    document.querySelectorAll('.btn-meal-select').forEach(btn => {
      if (btn.dataset.meal === state.activeMeal) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const subtitle = document.getElementById('search-dialog-subtitle');
    if (subtitle) {
      const formattedMeal = state.activeMeal.charAt(0).toUpperCase() + state.activeMeal.slice(1);
      subtitle.textContent = `Logging items into ${formattedMeal}. Search from 150+ verified Indian & global dishes.`;
    }

    const input = document.getElementById('food-search-input');
    if (input) input.value = '';
    
    const freeTextInput = document.getElementById('search-nlp-free-text');
    if (freeTextInput) freeTextInput.value = '';

    document.getElementById('food-config-panel').style.display = 'none';
    document.getElementById('btn-confirm-add-food').style.display = 'none';

    renderSearchResults(window.FoodParser.search(""));

    if (searchMealDialog) searchMealDialog.showModal();
  }

  function closeSearchMealDialog() {
    if (searchMealDialog) searchMealDialog.close();
  }

  function renderSearchResults(results) {
    const container = document.getElementById('food-search-results');
    if (!container) return;

    if (!results || results.length === 0) {
      const popular = window.FoodParser.search("r");
      if (popular.length > 0) {
        container.innerHTML = `<p style="color: var(--theme-text-muted); font-size: 0.8rem; padding: 0.2rem 0;">Popular Suggestions:</p>`;
        popular.forEach(item => container.appendChild(createSearchResultCard(item)));
        return;
      }
      container.innerHTML = `<p style="color: var(--theme-text-muted); font-size: 0.85rem; text-align: center; padding: 1rem 0;">No matching dishes found. Type in free-text NLP box below!</p>`;
      return;
    }

    container.innerHTML = '';
    results.forEach(item => {
      container.appendChild(createSearchResultCard(item));
    });
  }

  function createSearchResultCard(item) {
    const card = document.createElement('div');
    card.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid var(--theme-panel-border); border-radius: 12px; padding: 0.65rem 1rem; cursor: pointer; transition: all 0.2s ease;';
    card.onmouseover = () => card.style.borderColor = 'var(--theme-primary)';
    card.onmouseout = () => card.style.borderColor = 'var(--theme-panel-border)';
    
    card.innerHTML = `
      <div>
        <strong style="color: var(--theme-text-main); font-size: 0.95rem;">${item.name}</strong>
        <span style="font-size: 0.75rem; color: var(--theme-text-muted); display: block; margin-top: 0.1rem;">
          ${item.category} • Base Unit: ${item.unit}
        </span>
      </div>
      <div style="text-align: right;">
        <strong style="color: var(--theme-secondary); font-size: 1rem;">${item.calories} kcal</strong>
        <span style="font-size: 0.75rem; color: var(--theme-text-muted); display: block;">P: ${item.protein}g | C: ${item.carbs}g | F: ${item.fats}g</span>
      </div>
    `;

    card.onclick = () => selectSearchResultItem(item);
    return card;
  }

  function selectSearchResultItem(item) {
    state.selectedFoodSearchItem = item;

    document.getElementById('config-food-name').textContent = item.name;
    document.getElementById('config-food-category').textContent = item.category;
    document.getElementById('config-qty-val').value = 1;

    const unitSelect = document.getElementById('config-unit-select');
    unitSelect.innerHTML = '';

    if (item.unit === 'item') {
      unitSelect.innerHTML = `
        <option value="item" selected>${item.name} (Piece / Item)</option>
        <option value="100g">100g</option>
        <option value="g">Gram (g)</option>
      `;
    } else if (item.unit === '100g') {
      unitSelect.innerHTML = `
        <option value="bowl" selected>Bowl (150g)</option>
        <option value="cup">Cup (150g)</option>
        <option value="plate">Plate (350g)</option>
        <option value="100g">100g Portion</option>
        <option value="g">Exact Grams (g)</option>
        <option value="item">1 Serving</option>
      `;
    } else if (item.unit === '100ml' || item.unit === '200ml') {
      unitSelect.innerHTML = `
        <option value="glass" selected>Glass (250ml)</option>
        <option value="cup">Cup (200ml)</option>
        <option value="ml">Exact ml</option>
      `;
    } else {
      unitSelect.innerHTML = `
        <option value="${item.unit}" selected>1 ${item.unit}</option>
        <option value="100g">100g</option>
        <option value="g">Gram (g)</option>
      `;
    }

    document.getElementById('food-config-panel').style.display = 'block';
    document.getElementById('btn-confirm-add-food').style.display = 'inline-flex';
    updateLiveConfigNutrients();
  }

  function updateLiveConfigNutrients() {
    if (!state.selectedFoodSearchItem) return;
    const item = state.selectedFoodSearchItem;

    const qty = parseFloat(document.getElementById('config-qty-val').value) || 1;
    const unit = document.getElementById('config-unit-select').value || 'item';

    const parseStr = `${qty} ${unit} ${item.key}`;
    const parsed = window.FoodParser.parse(parseStr);

    if (parsed && parsed.breakdown.length > 0) {
      const res = parsed.breakdown[0];
      document.getElementById('config-calc-calories').textContent = `${res.calories} kcal`;
      document.getElementById('config-calc-p').textContent = `${res.protein}g`;
      document.getElementById('config-calc-c').textContent = `${res.carbs}g`;
      document.getElementById('config-calc-f').textContent = `${res.fats}g`;
      document.getElementById('config-calc-fib').textContent = `${res.fiber || 0}g`;
      
      state.configuredNutrients = res;
    }
  }

  function bindHealthifyMeSearchEvents() {
    const btnQuickAddGlobal = document.getElementById('btn-quick-add-food-global');
    if (btnQuickAddGlobal) {
      btnQuickAddGlobal.onclick = () => openSearchMealDialog('breakfast');
    }

    document.querySelectorAll('.btn-add-meal-item').forEach(btn => {
      btn.onclick = (e) => {
        const targetMeal = e.currentTarget.dataset.meal;
        openSearchMealDialog(targetMeal);
      };
    });

    document.querySelectorAll('.btn-meal-select').forEach(btn => {
      btn.onclick = (e) => {
        state.activeMeal = e.currentTarget.dataset.meal;
        document.querySelectorAll('.btn-meal-select').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const subtitle = document.getElementById('search-dialog-subtitle');
        if (subtitle) {
          const formattedMeal = state.activeMeal.charAt(0).toUpperCase() + state.activeMeal.slice(1);
          subtitle.textContent = `Logging items into ${formattedMeal}. Search from 150+ verified Indian & global dishes.`;
        }
      };
    });

    const foodSearchInput = document.getElementById('food-search-input');
    if (foodSearchInput) {
      foodSearchInput.oninput = (e) => {
        const res = window.FoodParser.search(e.target.value);
        renderSearchResults(res);
      };
    }

    const btnMinus = document.getElementById('btn-qty-minus');
    if (btnMinus) {
      btnMinus.onclick = () => {
        const qtyInput = document.getElementById('config-qty-val');
        let current = parseFloat(qtyInput.value) || 1;
        if (current > 0.5) {
          qtyInput.value = (current - 0.5);
          updateLiveConfigNutrients();
        }
      };
    }

    const btnPlus = document.getElementById('btn-qty-plus');
    if (btnPlus) {
      btnPlus.onclick = () => {
        const qtyInput = document.getElementById('config-qty-val');
        let current = parseFloat(qtyInput.value) || 1;
        qtyInput.value = (current + 0.5);
        updateLiveConfigNutrients();
      };
    }

    const qtyVal = document.getElementById('config-qty-val');
    if (qtyVal) qtyVal.oninput = updateLiveConfigNutrients;

    const unitSelect = document.getElementById('config-unit-select');
    if (unitSelect) unitSelect.onchange = updateLiveConfigNutrients;

    const btnConfirm = document.getElementById('btn-confirm-add-food');
    if (btnConfirm) {
      btnConfirm.onclick = () => {
        if (!state.configuredNutrients) return;
        const item = state.configuredNutrients;
        state.todayMealLogs[state.activeMeal].push(item);
        renderMealSlots();
        saveTodayMealLogs();
        closeSearchMealDialog();
      };
    }

    const btnParseNlp = document.getElementById('btn-parse-search-nlp');
    if (btnParseNlp) {
      btnParseNlp.onclick = () => {
        const text = document.getElementById('search-nlp-free-text').value;
        if (!text || text.trim() === '') {
          alert("Please type a meal description (e.g. 2 roti + 1 bowl dal).");
          return;
        }
        const parsed = window.FoodParser.parse(text);
        if (parsed && parsed.breakdown.length > 0) {
          parsed.breakdown.forEach(b => {
            state.todayMealLogs[state.activeMeal].push(b);
          });
          renderMealSlots();
          saveTodayMealLogs();
          closeSearchMealDialog();
        } else {
          alert("Could not parse food item. Try typing e.g. '2 roti, 1 bowl dal'.");
        }
      };
    }

    const btnClose = document.getElementById('btn-close-search-dialog');
    if (btnClose) btnClose.onclick = closeSearchMealDialog;

    const btnCancel = document.getElementById('btn-cancel-search');
    if (btnCancel) btnCancel.onclick = closeSearchMealDialog;

    // Nutrient Breakdown Dialog Triggers
    const btnOpenBreakdown = document.getElementById('btn-open-nutrient-breakdown');
    if (btnOpenBreakdown) btnOpenBreakdown.onclick = openNutrientBreakdownDialog;

    const btnOpenMicroBreakdown = document.getElementById('btn-open-micro-breakdown');
    if (btnOpenMicroBreakdown) btnOpenMicroBreakdown.onclick = openNutrientBreakdownDialog;

    const btnCloseNutrient = document.getElementById('btn-close-nutrient-dialog');
    if (btnCloseNutrient) btnCloseNutrient.onclick = () => document.getElementById('nutrient-breakdown-dialog').close();

    const btnDoneNutrient = document.getElementById('btn-done-nutrient-dialog');
    if (btnDoneNutrient) btnDoneNutrient.onclick = () => document.getElementById('nutrient-breakdown-dialog').close();
  }

  function openNutrientBreakdownDialog() {
    const dialog = document.getElementById('nutrient-breakdown-dialog');
    const container = document.getElementById('nutrient-breakdown-content');
    if (!dialog || !container) return;

    // Collect all logged items across all 4 meals
    const allItems = [];
    ['breakfast', 'lunch', 'snack', 'dinner'].forEach(meal => {
      (state.todayMealLogs[meal] || []).forEach(item => {
        allItems.push({ ...item, meal: meal });
      });
    });

    if (allItems.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--theme-text-muted);">
          <i class="fa-solid fa-utensils" style="font-size: 2rem; margin-bottom: 0.75rem; color: var(--theme-primary); opacity: 0.5;"></i>
          <p style="font-size: 0.95rem; font-weight: 600; color: var(--theme-text-main);">No foods logged today yet!</p>
          <p style="font-size: 0.8rem; margin-top: 0.25rem;">Use the HealthifyMe Meal Tracker or AI Scanner to log your meals and see itemized nutrient source breakdowns.</p>
        </div>
      `;
      dialog.showModal();
      return;
    }

    // Build categories
    const categories = [
      { name: "Protein & Muscle Synthesis", icon: "fa-drumstick-bite", color: "#ffb703", key: "protein", unit: "g", target: state.profile ? state.profile.protein_target : 160 },
      { name: "Carbohydrates & Energy", icon: "fa-wheat-awn", color: "var(--theme-primary)", key: "carbs", unit: "g", target: state.profile ? state.profile.carbs_target : 300 },
      { name: "Dietary Fiber & Digestion", icon: "fa-leaf", color: "#0af0be", key: "fiber", unit: "g", target: 30 },
      { name: "Fats & Hormone Balance", icon: "fa-droplet", color: "#f77f00", key: "fats", unit: "g", target: state.profile ? state.profile.fats_target : 80 },
      { name: "Calcium & Bone Density", icon: "fa-bone", color: "#66fcf1", key: "calcium", unit: "mg", target: 1000 },
      { name: "Iron & Oxygen Transport", icon: "fa-bolt", color: "#ff4d4d", key: "iron", unit: "mg", target: 12 },
      { name: "Magnesium & Muscle Recovery", icon: "fa-heart-pulse", color: "#a855f7", key: "magnesium", unit: "mg", target: 400 },
      { name: "Zinc & Immune Shield", icon: "fa-shield-halved", color: "#3b82f6", key: "zinc", unit: "mg", target: 15 },
      { name: "Potassium & Electrolytes", icon: "fa-wave-square", color: "#10b981", key: "potassium", unit: "mg", target: 3500 }
    ];

    let html = '';
    categories.forEach(cat => {
      // Find items contributing to this nutrient
      const contributors = allItems
        .filter(item => (item[cat.key] || 0) > 0)
        .sort((a, b) => (b[cat.key] || 0) - (a[cat.key] || 0));

      const totalValue = contributors.reduce((sum, item) => sum + (item[cat.key] || 0), 0);
      const formattedTotal = cat.unit === 'g' ? (Math.round(totalValue * 10) / 10) : Math.round(totalValue);

      html += `
        <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--theme-panel-border); border-radius: 14px; padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
            <span style="font-weight: 700; font-size: 0.95rem; color: ${cat.color}; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fa-solid ${cat.icon}"></i> ${cat.name}
            </span>
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--theme-text-main);">
              ${formattedTotal}${cat.unit} <span style="font-size: 0.75rem; color: var(--theme-text-muted); font-weight: 400;">/ ${cat.target}${cat.unit}</span>
            </span>
          </div>
      `;

      if (contributors.length === 0) {
        html += `<p style="color: var(--theme-text-muted); font-size: 0.75rem; font-style: italic;">No logged foods contributing to ${cat.name.split('&')[0].trim()} today.</p>`;
      } else {
        html += `<div style="display: flex; flex-direction: column; gap: 0.35rem;">`;
        contributors.forEach(c => {
          const val = cat.unit === 'g' ? (Math.round((c[cat.key] || 0) * 10) / 10) : Math.round(c[cat.key] || 0);
          const mealTag = c.meal ? c.meal.charAt(0).toUpperCase() + c.meal.slice(1) : '';
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; background: rgba(255,255,255,0.03); padding: 0.35rem 0.6rem; border-radius: 8px;">
              <span>
                <strong style="color: var(--theme-text-main);">${c.qty ? c.qty + 'x ' : ''}${c.matchedName || c.inputName}</strong>
                <span style="color: var(--theme-text-muted); font-size: 0.7rem; margin-left: 0.4rem;">(${mealTag})</span>
              </span>
              <strong style="color: ${cat.color};">+${val}${cat.unit}</strong>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `</div>`;
    });

    container.innerHTML = html;
    dialog.showModal();
  }

  // Native/Local Storage: Fetch Profile
  async function fetchProfile() {
    try {
      const stored = window.AppDB ? await window.AppDB.getProfile() : null;
      if (stored) {
        state.profile = stored;
      } else {
        throw new Error('No profile in database');
      }
      
      // Update sidebar badges
      document.getElementById('profile-name-badge').textContent = state.profile.username;
      document.getElementById('profile-level-badge').textContent = state.profile.experience_level;
    } catch (err) {
      console.log('Falling back to default profile.');
      state.profile = {
        username: 'Nature Warrior',
        track: 'natural',
        experience_level: 'beginner',
        weight: 75.0,
        target_weight: 70.0,
        height: 175.0,
        daily_calorie_target: 2500,
        protein_target: 150,
        carbs_target: 300,
        fats_target: 75,
        water_target: 3500
      };
      // Save default
      if (window.AppDB) {
        await window.AppDB.saveProfile(state.profile);
      }
      document.getElementById('profile-name-badge').textContent = state.profile.username;
      document.getElementById('profile-level-badge').textContent = state.profile.experience_level;
    }
  }

  // Native/Local Storage: Fetch Tracker Logs
  async function fetchLogs() {
    try {
      if (window.AppDB) {
        state.logs = await window.AppDB.getLogs();
      } else {
        state.logs = [];
      }
    } catch (err) {
      console.error('Error reading logs from database.', err);
      state.logs = [];
    }
  }

  // Navigation Logic
  function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Toggle active sidebar items
    navItems.forEach(item => {
      if (item.dataset.tab === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle active sections
    tabContents.forEach(content => {
      if (content.id === tabId) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // Resize canvas if switching to tracker tab
    if (tabId === 'tab-tracker') {
      setTimeout(() => {
        window.Tracker.renderCharts();
      }, 50);
    }
    
    // Update Pedometer UI if switching to pedometer tab
    if (tabId === 'tab-pedometer' && window.Pedometer) {
      window.Pedometer.updateUI();
    }
  }

  // Language & Translation Helpers
  function setLanguage(lang) {
    state.lang = lang;
    localStorage.setItem('nature_fit_language', lang);
    
    // Update active class on header language buttons
    langBtns.forEach(btn => {
      if (btn.dataset.lang === lang) {
        btn.classList.add('active');
        btn.style.background = 'var(--theme-primary)';
        btn.style.color = '#000';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = 'var(--theme-text-muted)';
      }
    });

    // Translate static elements with data-i18n attributes
    translateUI();

    // Update dynamically calculated texts (greeting, etc.)
    updateDynamicTexts();

    // Re-render other tabs and dynamic layouts
    renderDietPanel();
    renderRecoveryPanel();
    setWorkoutSplit(state.activeSplit);
  }

  function translateUI() {
    const translations = window.NATURE_FIT_TRANSLATIONS[state.lang] || window.NATURE_FIT_TRANSLATIONS['en'];
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (translations[key]) {
        el.textContent = translations[key];
      }
    });

    // Update search input placeholder dynamically
    const searchInput = document.getElementById('exercise-search');
    if (searchInput) {
      searchInput.placeholder = translations['ex-search-placeholder'] || 'Search exercises...';
    }
  }

  function updateDynamicTexts() {
    if (!state.profile) return;
    
    const greetings = {
      en: {
        welcome: `Welcome back, ${state.profile.username}`,
        natural: `You are on the natural fitness track. Nurturing recovery and longevity.`,
        enhanced: `You are on the enhanced fitness track. Maximizing protection and safety.`
      },
      ta: {
        welcome: `நல்வரவு, ${state.profile.username}`,
        natural: `நீங்கள் இயற்கை உடற்பயிற்சி பாதையில் உள்ளீர்கள். மீட்பு மற்றும் நீண்ட ஆயுளை வளர்க்கிறது.`,
        enhanced: `நீங்கள் மேம்படுத்தப்பட்ட உடற்பயிற்சி பாதையில் உள்ளீர்கள். உறுப்புப் பாதுகாப்பு மற்றும் ஆற்றலை அதிகப்படுத்துகிறது.`
      },
      tg: {
        welcome: `Welcome back, ${state.profile.username}`,
        natural: `Namma natural fitness track-la irukeenga. Recovery and longevity-a valarkum.`,
        enhanced: `Namma enhanced fitness track-la irukeenga. Protection and safety-a maximize pannum.`
      }
    };
    
    const langGreet = greetings[state.lang] || greetings['en'];
    
    const greetingEl = document.getElementById('header-greeting');
    if (greetingEl) {
      greetingEl.textContent = langGreet.welcome;
    }
    
    const subtextEl = document.getElementById('header-subtext');
    if (subtextEl) {
      subtextEl.textContent = state.activeTrack === 'enhanced' ? langGreet.enhanced : langGreet.natural;
    }

    // Update track badges
    const trackBadge = document.getElementById('diet-track-badge');
    if (trackBadge) {
      const trackNames = {
        en: { natural: 'Natural Track', enhanced: 'Enhanced Track' },
        ta: { natural: 'இயற்கை முறை', enhanced: 'மேம்பட்ட முறை' },
        tg: { natural: 'Natural Track', enhanced: 'Enhanced Track' }
      };
      const badgeTexts = trackNames[state.lang] || trackNames['en'];
      trackBadge.textContent = state.activeTrack === 'enhanced' ? badgeTexts.enhanced : badgeTexts.natural;
    }
  }

  function translateDay(day) {
    if (state.lang === 'ta') {
      const taDays = {
        'Mon': 'திங்கள்',
        'Tue': 'செவ்வாய்',
        'Wed': 'புதன்',
        'Thu': 'வியாழன்',
        'Fri': 'வெள்ளி',
        'Sat': 'சனி',
        'Sun': 'ஞாயிறு',
        'Monday': 'திங்கள்',
        'Tuesday': 'செவ்வாய்',
        'Wednesday': 'புதன்',
        'Thursday': 'வியாழன்',
        'Friday': 'வெள்ளி',
        'Saturday': 'சனி',
        'Sunday': 'ஞாயிறு'
      };
      return taDays[day] || day;
    }
    return day;
  }

  function translateStyle(style) {
    if (state.lang === 'ta') {
      const taStyles = {
        'Push Strength': 'புஷ் வலிமை (Push)',
        'Pull Strength': 'புல் வலிமை (Pull)',
        'Legs / Core': 'கால்கள் / கோர் (Legs/Core)',
        'Cardio / Conditioning': 'கார்டியோ / கண்டிஷனிங்',
        'Active Recovery / Mobility': 'செயலில் மீட்பு / இயக்கம்',
        'Push Hypertrophy': 'புஷ் ஹைபர்டிராபி',
        'Pull Hypertrophy': 'புல் ஹைபர்டிராபி',
        'Legs / Abs': 'கால்கள் / ஆப்சு',
        'Upper Body': 'மேல் உடல் (Upper)',
        'Lower Body': 'கீழ் உடல் (Lower)',
        'Cardio / Core': 'கார்டியோ / கோர்',
        'Rest / Mobility': 'ஓய்வு / இயக்கம்',
        'Push': 'புஷ் (Push)',
        'Pull': 'புல் (Pull)',
        'Legs': 'கால்கள் (Legs)',
        'Core': 'கோர் (Core)',
        'Active Recovery': 'செயலில் மீட்பு'
      };
      return taStyles[style] || style;
    }
    return style;
  }

  function translateActivityText(text) {
    const key = findExerciseKey(text);
    if (!key) return text;
    
    const ex = window.NATURE_FIT_DATA.exercises[key];
    if (!ex) return text;
    
    const translations = window.NATURE_FIT_TRANSLATIONS[state.lang] || window.NATURE_FIT_TRANSLATIONS['en'];
    const transName = translations[key];
    if (transName) {
      const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapeRegExp(ex.name), 'i');
      return text.replace(regex, transName);
    }
    return text;
  }

  // Open Scanner Modal
  function openScanner() {
    scannerDialog.showModal();
    switchScannerTab('upload');
  }

  // Close Scanner Modal
  function closeScanner() {
    stopScannerCamera();
    scannerDialog.close();
    resetScannerUI();
  }

  // Reset Scanner UI
  function resetScannerUI() {
    document.getElementById('scanner-upload-preview').style.display = 'none';
    document.getElementById('scanner-upload-placeholder').style.display = 'block';
    document.getElementById('scanner-laser-line').style.display = 'none';
    document.getElementById('scanner-camera-laser-line').style.display = 'none';
    document.getElementById('scanner-results-panel').style.display = 'none';
    document.getElementById('btn-scanner-submit').style.display = 'none';
    document.getElementById('scanner-file-input').value = '';
    
    const videoEl = document.getElementById('scanner-video');
    const canvasEl = document.getElementById('scanner-canvas');
    if (videoEl) videoEl.style.display = 'block';
    if (canvasEl) canvasEl.style.display = 'none';
    
    const capBtn = document.getElementById('btn-camera-capture');
    const retakeBtn = document.getElementById('btn-camera-retake');
    if (capBtn) capBtn.style.display = 'inline-flex';
    if (retakeBtn) retakeBtn.style.display = 'none';
    
    state.scannerParsedResult = null;
  }

  // Switch tabs inside scanner
  function switchScannerTab(tab) {
    state.scannerActiveTab = tab;
    resetScannerUI();

    const uploadTabBtn = document.getElementById('scanner-tab-upload');
    const cameraTabBtn = document.getElementById('scanner-tab-camera');
    const uploadView = document.getElementById('scanner-view-upload');
    const cameraView = document.getElementById('scanner-view-camera');

    if (tab === 'camera') {
      if (uploadTabBtn) uploadTabBtn.classList.remove('active');
      if (cameraTabBtn) cameraTabBtn.classList.add('active');
      if (uploadView) uploadView.style.display = 'none';
      if (cameraView) cameraView.style.display = 'flex';
      startScannerCamera();
    } else {
      if (uploadTabBtn) uploadTabBtn.classList.add('active');
      if (cameraTabBtn) cameraTabBtn.classList.remove('active');
      if (uploadView) uploadView.style.display = 'flex';
      if (cameraView) cameraView.style.display = 'none';
      stopScannerCamera();
    }
  }

  // Camera stream initializer
  async function startScannerCamera() {
    const platform = (window.Capacitor && typeof window.Capacitor.getPlatform === 'function') ? window.Capacitor.getPlatform() : 'web';
    if (platform === 'ios' || platform === 'android') {
      const nativeCamInput = document.getElementById('scanner-camera-input');
      if (nativeCamInput) {
        nativeCamInput.click();
      }
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      state.scannerStream = stream;
      const videoEl = document.getElementById('scanner-video');
      if (videoEl) videoEl.srcObject = stream;
    } catch (err) {
      console.error('Camera stream access denied or unavailable:', err);
      alert('Could not access device camera. Please upload a photo from your gallery instead.');
      switchScannerTab('upload');
    }
  }

  // Stop camera stream
  function stopScannerCamera() {
    if (state.scannerStream) {
      state.scannerStream.getTracks().forEach(track => track.stop());
      state.scannerStream = null;
    }
  }

  // Capture frame from webcam
  function captureScannerFrame() {
    const videoEl = document.getElementById('scanner-video');
    const canvasEl = document.getElementById('scanner-canvas');
    
    if (!state.scannerStream || !videoEl || !canvasEl) return;
    
    const ctx = canvasEl.getContext('2d');
    canvasEl.width = videoEl.videoWidth || 640;
    canvasEl.height = videoEl.videoHeight || 480;
    ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    
    videoEl.style.display = 'none';
    canvasEl.style.display = 'block';
    
    const capBtn = document.getElementById('btn-camera-capture');
    const retakeBtn = document.getElementById('btn-camera-retake');
    if (capBtn) capBtn.style.display = 'none';
    if (retakeBtn) retakeBtn.style.display = 'inline-flex';
    
    // Start scan animation
    const laser = document.getElementById('scanner-camera-laser-line');
    if (laser) laser.style.display = 'block';
    
    // Simulate analyzing food
    simulateImageAnalysis();
  }

  // Retake live photo
  function retakeScannerFrame() {
    const platform = (window.Capacitor && typeof window.Capacitor.getPlatform === 'function') ? window.Capacitor.getPlatform() : 'web';
    if (platform === 'ios' || platform === 'android') {
      const nativeCamInput = document.getElementById('scanner-camera-input');
      if (nativeCamInput) {
        nativeCamInput.click();
      }
      return;
    }

    const videoEl = document.getElementById('scanner-video');
    const canvasEl = document.getElementById('scanner-canvas');
    if (videoEl) videoEl.style.display = 'block';
    if (canvasEl) canvasEl.style.display = 'none';
    
    const capBtn = document.getElementById('btn-camera-capture');
    const retakeBtn = document.getElementById('btn-camera-retake');
    if (capBtn) capBtn.style.display = 'inline-flex';
    if (retakeBtn) retakeBtn.style.display = 'none';
    
    const laser = document.getElementById('scanner-camera-laser-line');
    if (laser) laser.style.display = 'none';
    
    document.getElementById('scanner-results-panel').style.display = 'none';
    document.getElementById('btn-scanner-submit').style.display = 'none';
    state.scannerParsedResult = null;
  }

  // Handle uploaded photo
  function handleScannerFile(file) {
    const reader = new FileReader();
    const preview = document.getElementById('scanner-upload-preview');
    const placeholder = document.getElementById('scanner-upload-placeholder');
    const laser = document.getElementById('scanner-laser-line');

    reader.onload = (e) => {
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
      if (placeholder) placeholder.style.display = 'none';
      if (laser) laser.style.display = 'block';

      // Simulate analysis on upload
      simulateImageAnalysis();
    };
    reader.readAsDataURL(file);
  }

  // Simulates computer vision / AI analysis with randomized healthy foods matching target profiles
  async function simulateImageAnalysis() {
    // 1. Get the image base64 data
    let imageSrc = null;
    if (state.scannerActiveTab === 'camera') {
      const canvasEl = document.getElementById('scanner-canvas');
      if (canvasEl) {
        imageSrc = canvasEl.toDataURL('image/jpeg');
      }
    } else {
      const preview = document.getElementById('scanner-upload-preview');
      if (preview) {
        imageSrc = preview.src;
      }
    }

    const apiKey = localStorage.getItem('nature_fit_gemini_key');
    const statusNote = document.getElementById('scanner-status-note');

    if (apiKey && imageSrc) {
      // Show scanning status note
      if (statusNote) {
        statusNote.style.display = 'block';
        statusNote.style.color = 'var(--theme-primary)';
        statusNote.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Contacting Google Gemini API for real-time food analysis...';
      }

      try {
        // Extract base64 and mime type
        const match = imageSrc.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (!match) throw new Error("Invalid image format");
        const mimeType = match[1];
        const base64Data = match[2];

        const payload = {
          contents: [
            {
              parts: [
                {
                  text: `Analyze this food photo. Identify all food items, dishes, or ingredients present with estimated portion quantities (e.g., "2 roti, 1 bowl dal tadka, 100g curd" or "2 eggs, 1 slice toast").
Example formats:
- "2 roti, 1 bowl dal, 100g curd"
- "1 plate chicken biryani, 1 glass lassi"
- "2 eggs, 50g oats, 1 banana"
Respond ONLY with a single line of comma-separated items with quantities. Do not include markdown preamble or extra explanation.`
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ]
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`API key invalid or request failed (${response.status})`);
        }

        const data = await response.json();
        let textResult = "";
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
          textResult = data.candidates[0].content.parts[0].text.trim();
        }

        if (!textResult) throw new Error("Empty response from AI");

        const parsed = window.FoodParser.parse(textResult);
        if (!parsed || parsed.breakdown.length === 0) throw new Error("Could not parse AI response");

        state.scannerParsedResult = parsed;

        // Update UI
        document.getElementById('scanner-detected-food').textContent = textResult.split(',').map(s => s.trim()).join(' + ');
        document.getElementById('scanner-detected-calories').textContent = `${parsed.calories} kcal`;
        document.getElementById('scanner-p').textContent = `${parsed.protein}g`;
        document.getElementById('scanner-c').textContent = `${parsed.carbs}g`;
        document.getElementById('scanner-f').textContent = `${parsed.fats}g`;

        if (statusNote) {
          statusNote.style.color = '#0af0be';
          statusNote.innerHTML = '<i class="fa-solid fa-circle-check"></i> Real-time AI analysis complete. High accuracy achieved.';
        }

        // Hide animations, show results
        const uploadLaser = document.getElementById('scanner-laser-line');
        const cameraLaser = document.getElementById('scanner-camera-laser-line');
        if (uploadLaser) uploadLaser.style.display = 'none';
        if (cameraLaser) cameraLaser.style.display = 'none';
        
        document.getElementById('scanner-results-panel').style.display = 'block';
        document.getElementById('btn-scanner-submit').style.display = 'inline-flex';
        return;
      } catch (err) {
        console.warn("Real-time AI Food Scanner failed, falling back to whitelisted profiles:", err);
        if (statusNote) {
          statusNote.style.color = '#ffb703';
          statusNote.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> AI Key Error or connection issue. Used whitelisted diet fallback.`;
        }
      }
    } else {
      if (statusNote) {
        statusNote.style.display = 'block';
        statusNote.style.color = 'var(--theme-text-muted)';
        statusNote.innerHTML = '<i class="fa-solid fa-info-circle"></i> Using whitelisted diet profile. Enter a Gemini API Key above for real-time food recognition.';
      }
    }

    // Call fallback
    runScannerFallback();
  }

  function runScannerFallback() {
    // 1. Resolve active diet plan
    const activeTrack = state.activeTrack || 'natural';
    let dietType = state.dietType || 'nonveg';
    
    const trackData = window.NATURE_FIT_DATA.dietPlans[activeTrack];
    let diet = null;
    
    if (dietType === 'custom') {
      const localKey = `nature_fit_custom_meals_${activeTrack}`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        try {
          const customMeals = JSON.parse(saved);
          diet = { meals: customMeals };
        } catch (e) {}
      }
      if (!diet) {
        dietType = 'veg';
      }
    }
    
    if (!diet && trackData) {
      const typeData = trackData[dietType] || trackData['nonveg'];
      diet = typeData[state.lang] || typeData['en'];
    }
    
    let allItems = [];
    if (diet && diet.meals) {
      diet.meals.forEach(m => {
        if (m.items && Array.isArray(m.items)) {
          allItems = allItems.concat(m.items);
        }
      });
    }
    
    if (allItems.length === 0) {
      allItems = [
        "100g oats, 1 banana",
        "200g chicken breast, 100g jasmine rice",
        "150g salmon, 100g broccoli",
        "250g greek yogurt, 30g walnuts"
      ];
    }
    
    let chosenMeal = "";
    if (diet && diet.meals && diet.meals.length > 0) {
      const randomMeal = diet.meals[Math.floor(Math.random() * diet.meals.length)];
      const mealItems = randomMeal.items || [];
      if (mealItems.length > 0) {
        const numItems = Math.min(mealItems.length, Math.floor(Math.random() * 2) + 1);
        const shuffled = [...mealItems].sort(() => 0.5 - Math.random());
        chosenMeal = shuffled.slice(0, numItems).join(', ');
      }
    }
    
    if (!chosenMeal) {
      chosenMeal = allItems[Math.floor(Math.random() * allItems.length)];
    }
    
    const parsed = window.FoodParser.parse(chosenMeal);
    state.scannerParsedResult = parsed;

    const cleanDisplayMeal = chosenMeal.split(',').map(s => {
      let clean = s.trim();
      clean = clean.replace(/\s*\([^)]*\)/g, "");
      return clean;
    }).join(' + ');
    
    document.getElementById('scanner-detected-food').textContent = cleanDisplayMeal;
    document.getElementById('scanner-detected-calories').textContent = `${parsed.calories} kcal`;
    document.getElementById('scanner-p').textContent = `${parsed.protein}g`;
    document.getElementById('scanner-c').textContent = `${parsed.carbs}g`;
    document.getElementById('scanner-f').textContent = `${parsed.fats}g`;

    const uploadLaser = document.getElementById('scanner-laser-line');
    const cameraLaser = document.getElementById('scanner-camera-laser-line');
    if (uploadLaser) uploadLaser.style.display = 'none';
    if (cameraLaser) cameraLaser.style.display = 'none';
    
    document.getElementById('scanner-results-panel').style.display = 'block';
    document.getElementById('btn-scanner-submit').style.display = 'inline-flex';
  }

  // Add scan results to HealthifyMe meal logs
  function submitScannerResult() {
    if (!state.scannerParsedResult) return;
    
    const r = state.scannerParsedResult;
    if (r && r.breakdown && r.breakdown.length > 0) {
      const activeMeal = state.activeMeal || 'lunch';
      r.breakdown.forEach(b => {
        state.todayMealLogs[activeMeal].push(b);
      });
      renderMealSlots();
      saveTodayMealLogs();
      const formattedMeal = activeMeal.charAt(0).toUpperCase() + activeMeal.slice(1);
      alert(`Scanned Meal added successfully to ${formattedMeal}!`);
    }

    closeScanner();
  }

  // NLP Analyzer logic with Hybrid Gemini AI Fallback
  async function parseNlpMeal(inputId, formType) {
    const textInput = document.getElementById(inputId);
    const text = textInput ? textInput.value : '';
    if (!text || text.trim() === "") {
      alert("Please type some foods with quantities.");
      return;
    }

    const apiKey = localStorage.getItem('nature_fit_gemini_key') || '';
    let r = null;

    if (apiKey) {
      // High-precision hybrid AI parsing
      r = await window.FoodParser.parseWithAI(text, apiKey);
    } else {
      r = window.FoodParser.parse(text);
    }

    if (!r || !r.breakdown || r.breakdown.length === 0) {
      alert("Could not identify food items. Make sure to specify quantities (e.g. 200g, 2 items, etc).");
      return;
    }

    const activeMeal = state.activeMeal || 'lunch';
    r.breakdown.forEach(b => {
      state.todayMealLogs[activeMeal].push(b);
    });
    renderMealSlots();
    saveTodayMealLogs();

    if (formType === 'page') {
      document.getElementById('track-log-calories').value = r.calories;
      document.getElementById('track-log-protein').value = r.protein;
      document.getElementById('track-log-carbs').value = r.carbs;
      document.getElementById('track-log-fats').value = r.fats;
    } else {
      document.getElementById('log-calories').value = r.calories;
      document.getElementById('log-protein').value = r.protein;
      document.getElementById('log-carbs').value = r.carbs;
      document.getElementById('log-fats').value = r.fats;
    }

    const formattedMeal = activeMeal.charAt(0).toUpperCase() + activeMeal.slice(1);
    const breakdownMsg = r.breakdown.map(b => `• ${b.matchedName} (${b.qty} ${b.unit}): ${b.calories}kcal [P:${b.protein}g, C:${b.carbs}g, F:${b.fats}g, Fib:${b.fiber || 0}g]`).join('\n');
    alert(`High-Precision Meal Analysis Complete!\nAdded to ${formattedMeal}:\n\n${breakdownMsg}`);
  }

  // Set Current Active Track (Natural vs Enhanced)
  async function setTrack(track) {
    state.activeTrack = track;
    
    // Update track buttons selection UI
    trackBtns.forEach(btn => {
      if (btn.dataset.track === track) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle body classes to change global css color schema variables
    if (track === 'enhanced') {
      body.classList.remove('theme-natural');
      body.classList.add('theme-enhanced');
      document.getElementById('header-greeting').textContent = `Welcome back, Enhanced Warrior`;
      document.getElementById('header-subtext').textContent = `You are on the enhanced recovery track. Prioritizing organ protection, lipid defense, and blood pressure monitoring.`;
      
      // Update diet elements
      document.getElementById('diet-track-badge').textContent = 'Enhanced Track';
      document.getElementById('diet-track-badge').className = 'badge success';
      document.getElementById('recovery-title').textContent = 'Enhanced Recovery & Health Preservation Protocol';
      document.getElementById('recovery-title').nextElementSibling.textContent = 'Rigorous medical checks and organ supportive measures to offset synthetic load.';
    } else {
      body.classList.remove('theme-enhanced');
      body.classList.add('theme-natural');
      document.getElementById('header-greeting').textContent = `Welcome back, Eco Warrior`;
      document.getElementById('header-subtext').textContent = `You are on the natural fitness track. Nurturing recovery, circadian optimization, and longevity.`;
      
      // Update diet elements
      document.getElementById('diet-track-badge').textContent = 'Natural Track';
      document.getElementById('diet-track-badge').className = 'badge success';
      document.getElementById('recovery-title').textContent = 'Natural Recovery & Adaptation Protocol';
      document.getElementById('recovery-title').nextElementSibling.textContent = 'Slowing down nervous system arousal to allow maximum cellular regeneration.';
    }

    // Pass track to muscleMap
    window.MuscleMap.setTrackClass(track);

    // Save track preference to profile via API
    if (state.profile && state.profile.track !== track) {
      state.profile.track = track;
      // Calculate targets dynamically based on track change
      calculateProfileTargets(state.profile);
      
      await saveProfileToServer();
      // Reload values
      document.getElementById('profile-name-badge').textContent = state.profile.username;
      document.getElementById('profile-level-badge').textContent = state.profile.experience_level;
    }

    // Refresh UI panels dependent on track
    renderDietPanel();
    renderRecoveryPanel();
    window.Tracker.updateData(state.profile, state.logs);
  }

  // Helper to match workout items with keys in NATURE_FIT_DATA.exercises
  function findExerciseKey(text) {
    let lowerText = text.toLowerCase().trim();
    // Clean dropset suffix (e.g. "+ 2 drops", "+ 1 drop")
    lowerText = lowerText.replace(/\+\s*(?:\d+\s*(?:to\s*)?\d*)\s*drops?/gi, '');
    lowerText = lowerText.replace(/\+\s*\d+\s*drop/gi, '');
    lowerText = lowerText.trim();
    
    const keys = Object.keys(window.NATURE_FIT_DATA.exercises);
    
    for (const key of keys) {
      const ex = window.NATURE_FIT_DATA.exercises[key];
      const exName = ex.name.toLowerCase().trim();
      
      if (lowerText === exName) return key;
      if (lowerText.includes(exName) || exName.includes(lowerText)) {
        return key;
      }
    }
    
    // Secondary keyword mapping
    if (lowerText.includes('hip thrust')) return 'hip-thrust';
    if (lowerText.includes('leg extension')) return 'leg-extension';
    if (lowerText.includes('leg curl')) return 'leg-curl';
    if (lowerText.includes('shoulder press')) return 'shoulder-press';
    if (lowerText.includes('lateral raise')) return 'dumbbell-lateral-raise';
    if (lowerText.includes('preacher curl') || lowerText.includes('ez-bar curl') || lowerText.includes('biceps curl') || lowerText.includes('dumbbell curl') || lowerText.includes('cable biceps curl') || lowerText.includes('curl')) return 'dumbbell-biceps-curl';
    if (lowerText.includes('pressdown') || lowerText.includes('press down')) return 'triceps-pressdown';
    if (lowerText.includes('face pull')) return 'cable-face-pull';
    if (lowerText.includes('rear delt') || lowerText.includes('pec deck fly') || lowerText.includes('pec dec fly') || lowerText.includes('reverse pec') || lowerText.includes('pec fly')) return 'rear-delt-fly';
    if (lowerText.includes('dumbbell press') || lowerText.includes('db press') || lowerText.includes('flat dumbbell') || lowerText.includes('incline dumbbell')) return 'dumbbell-press';
    if (lowerText.includes('rdl') || lowerText.includes('romanian deadlift')) return 'romanian-deadlift';
    if (lowerText.includes('split squat') || lowerText.includes('lunge') || lowerText.includes('step-up') || lowerText.includes('step up')) return 'bulgarian-split-squat';
    if (lowerText.includes('push-up') || lowerText.includes('pushup') || lowerText.includes('push up')) return 'push-up';
    if (lowerText.includes('pull-up') || lowerText.includes('pullup') || lowerText.includes('pull up') || lowerText.includes('chin-up')) return 'pull-up';
    if (lowerText.includes('calf raise')) return 'calf-raise';
    if (lowerText.includes('tibialis')) return 'tibialis-raise';
    if (lowerText.includes('knee raise')) return 'hanging-knee-raise';
    if (lowerText.includes('dip machine') || lowerText.includes('assisted dip') || lowerText.includes('dips')) return 'assisted-dip';
    if (lowerText.includes('incline walk') || lowerText.includes('treadmill walk')) return 'incline-walk';
    if (lowerText.includes('glute bridge')) return 'hip-thrust';
    if (lowerText.includes('bird dog') || lowerText.includes('dead bug') || lowerText.includes('side plank') || lowerText.includes('mountain climber') || lowerText.includes('reverse crunch')) return 'core-stability';
    if (lowerText.includes('back extension')) return 'romanian-deadlift';
    if (lowerText.includes('skull crusher') || lowerText.includes('skullcrusher')) return 'skull-crusher';
    
    // Warmups, mobility, stretching, and active recovery walks
    if (lowerText.includes('band pull-apart') || lowerText.includes('band pull apart')) return 'warm-up-mobility';
    if (lowerText.includes('arm circle') || lowerText.includes('shoulder roll') || lowerText.includes('scapular') || lowerText.includes('thoracic') || lowerText.includes('joint circle') || lowerText.includes('hip circle') || lowerText.includes('leg swing') || lowerText.includes('ramp-up') || lowerText.includes('warm-up') || lowerText.includes('warmup') || lowerText.includes('arms')) return 'warm-up-mobility';
    if (lowerText.includes('stretch') || lowerText.includes('stretching') || lowerText.includes('vinyasa') || lowerText.includes('mobility flow') || lowerText.includes('hamstring fold') || lowerText.includes('release')) return 'mobility-stretching';
    if (lowerText.includes('brisk walk') || lowerText.includes('easy walk') || lowerText.includes('slow walk') || lowerText.includes('easy cycling') || lowerText.includes('walk') || lowerText.includes('cycling') || lowerText.includes('bike') || lowerText.includes('rower') || lowerText.includes('treadmill')) return 'brisk-walk';
    
    // Default fallbacks for common terms
    if (lowerText.includes('squat')) return 'barbell-squat';
    if (lowerText.includes('bench press') || lowerText.includes('chest press') || lowerText.includes('bench') || lowerText.includes('machine chest')) return 'bench-press';
    if (lowerText.includes('deadlift')) return 'deadlift';
    if (lowerText.includes('lat pulldown') || lowerText.includes('pulldown') || lowerText.includes('pull down')) return 'lat-pulldown';
    if (lowerText.includes('pec dec') || lowerText.includes('pec deck') || lowerText.includes('pec fly')) return 'pec-dec-fly';
    if (lowerText.includes('rowing') || lowerText.includes('row')) return 'row-intervals';
    if (lowerText.includes('assault bike') || lowerText.includes('bike')) return 'assault-bike';
    if (lowerText.includes('kettlebell swing') || lowerText.includes('swing')) return 'kb-swing-tabata';
    if (lowerText.includes('burpee')) return 'burpee-circuit';
    if (lowerText.includes('thruster')) return 'barbell-thruster';
    if (lowerText.includes('wall ball') || lowerText.includes('wall throw')) return 'wall-balls';
    if (lowerText.includes('leg press')) return 'leg-press';
    
    return null;
  }

  // Update Dashboard Today's Workout based on Library
  function updateDashboardWorkout() {
    const split = state.activeSplit || 'beginner';
    const data = window.NATURE_FIT_DATA.routines[split];
    if (!data) return;

    let todayWorkoutStyle = "Rest Day";
    let todayDuration = "0 mins";

    // Map JS getDay() to plan index: Monday = 0, Sunday = 6
    let jsDay = new Date().getDay();
    let planIndex = jsDay === 0 ? 6 : jsDay - 1;

    if (split === 'custom') {
      const weekData = data.weeks ? data.weeks[state.activeWeek || 1] : null;
      if (weekData && weekData[planIndex]) {
        todayWorkoutStyle = weekData[planIndex].style;
        todayDuration = "45-60 mins";
      }
    } else {
      if (planIndex >= 0 && planIndex < 5 && data.days && data.days[planIndex]) {
        todayWorkoutStyle = data.days[planIndex].style;
        todayDuration = "45 mins";
      } else {
        todayWorkoutStyle = "Rest & Recovery";
        todayDuration = "15-30 mins";
      }
    }

    const styleValEl = document.getElementById('workout-style-val');
    const durationValEl = document.getElementById('workout-duration-val');
    if (styleValEl) styleValEl.textContent = todayWorkoutStyle;
    if (durationValEl) durationValEl.textContent = todayDuration;
  }

  // Set Workout Plan Split (Beginner, Intermediate, Expert, Custom)
  function setWorkoutSplit(split) {
    state.activeSplit = split;
    updateDashboardWorkout();
    
    let jsDay = new Date().getDay();
    let planIndex = jsDay === 0 ? 6 : jsDay - 1;
    
    splitBtns.forEach(btn => {
      if (btn.dataset.split === split) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const data = window.NATURE_FIT_DATA.routines[split];
    if (!data) return;



    // Show/hide week selector container for Custom Plan
    const weekSelectorContainer = document.getElementById('workout-week-selector-container');
    if (weekSelectorContainer) {
      weekSelectorContainer.style.display = split === 'custom' ? 'block' : 'none';
    }

    // Render Weekly Routine Plan text
    document.getElementById('routine-plan-title').textContent = data.title;
    document.getElementById('routine-plan-desc').textContent = data.description;

    // Render schedule table
    const tbody = document.getElementById('routine-table-body');
    if (tbody) tbody.innerHTML = '';
    
    const daysToRender = data.days || (data.weeks ? (data.weeks[state.activeWeek || 1] || []) : []);
    
    // Note: findExerciseKey has been moved to outer scope to resolve scoping issues.

    const renderExerciseItem = (itemText) => {
      if (!itemText) return '';
      const hasDrops = itemText.toLowerCase().includes('drop');
      if (itemText.includes(' + ') && !hasDrops) {
        const subparts = itemText.split(' + ');
        return subparts.map(sub => {
          const trimmedSub = sub.trim();
          const key = findExerciseKey(trimmedSub);
          const displaySub = translateActivityText(trimmedSub);
          if (key) {
            return `${displaySub} <span class="video-icon-btn" data-key="${key}" style="cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-left: 0.35rem; color: var(--theme-primary); opacity: 0.85; transition: opacity 0.2s, transform 0.2s; vertical-align: middle;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)';" onmouseout="this.style.opacity='0.85'; this.style.transform='scale(1)';"><i class="fa-solid fa-circle-play" style="font-size: 0.95rem;"></i></span>`;
          }
          return displaySub;
        }).join(' + ');
      }
      const key = findExerciseKey(itemText);
      const displayItem = translateActivityText(itemText);
      if (key) {
        return `${displayItem} <span class="video-icon-btn" data-key="${key}" style="cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-left: 0.35rem; color: var(--theme-primary); opacity: 0.85; transition: opacity 0.2s, transform 0.2s; vertical-align: middle;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)';" onmouseout="this.style.opacity='0.85'; this.style.transform='scale(1)';"><i class="fa-solid fa-circle-play" style="font-size: 0.95rem;"></i></span>`;
      }
      return displayItem;
    };

    // Helper to format activities cleanly into vertically aligned lists with video links (for other plans)
    function formatActivities(activities) {
      if (!activities || !Array.isArray(activities)) return '';
      let html = '<div style="display: flex; flex-direction: column; gap: 0.6rem;">';
      activities.forEach(act => {
        if (typeof act !== 'string') return;
        if (act.includes(' • ')) {
          const parts = act.split(' • ');
          let headerText = '';
          let firstItemText = parts[0];
          
          const colonIndex = parts[0].indexOf(':');
          if (colonIndex !== -1) {
            headerText = parts[0].substring(0, colonIndex + 1);
            firstItemText = parts[0].substring(colonIndex + 1).trim();
          }

          html += `
            <div style="margin-bottom: 0.25rem;">
              ${headerText ? `<div style="font-weight: 700; color: var(--theme-text-main); margin-bottom: 0.2rem;">${headerText}</div>` : ''}
              <ul style="margin: 0; padding-left: 1.2rem; list-style-type: disc; color: var(--theme-text-muted);">
                <li>${renderExerciseItem(firstItemText)}</li>
                ${parts.slice(1).map(p => `<li>${renderExerciseItem(p.trim())}</li>`).join('')}
              </ul>
            </div>
          `;
        } else {
          html += `
            <div style="display: flex; align-items: flex-start; gap: 0.5rem; color: var(--theme-text-muted);">
              <span style="color: var(--theme-primary); font-weight: bold;">•</span>
              <span>${renderExerciseItem(act)}</span>
            </div>
          `;
        }
      });
      html += '</div>';
      return html;
    }

    // Helper for Custom Plan timeline card parsing
    function formatCustomActivities(activities) {
      if (!activities || !Array.isArray(activities)) return '';
      let html = '<div class="custom-activities-list">';
      activities.forEach(act => {
        if (typeof act !== 'string') return;
        let title = '';
        let content = act;
        
        const colonIndex = act.indexOf(':');
        if (colonIndex !== -1) {
          title = act.substring(0, colonIndex).trim();
          content = act.substring(colonIndex + 1).trim();
        }
        
        let icon = '<i class="fa-solid fa-circle-dot"></i>';
        let badgeClass = 'secondary';
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('warm-up')) {
          icon = '<i class="fa-solid fa-person-running"></i>';
          badgeClass = 'info';
        } else if (lowerTitle.includes('main')) {
          icon = '<i class="fa-solid fa-dumbbell"></i>';
          badgeClass = 'primary';
        } else if (lowerTitle.includes('superset')) {
          icon = '<i class="fa-solid fa-arrows-spin"></i>';
          badgeClass = 'warning';
        } else if (lowerTitle.includes('finisher')) {
          icon = '<i class="fa-solid fa-fire"></i>';
          badgeClass = 'danger';
        } else if (lowerTitle.includes('cool-down')) {
          icon = '<i class="fa-solid fa-wind"></i>';
          badgeClass = 'success';
        }
        
        const items = content.split(' • ');
        let itemsHtml = '<ul class="custom-activity-items">';
        items.forEach(item => {
          itemsHtml += `<li>${renderExerciseItem(item.trim())}</li>`;
        });
        itemsHtml += '</ul>';
        
        html += `
          <div class="custom-activity-section">
            <div class="custom-activity-section-header">
              <span class="custom-section-icon ${badgeClass}">${icon}</span>
              <span class="custom-section-title">${title}</span>
            </div>
            ${itemsHtml}
          </div>
        `;
      });
      html += '</div>';
      return html;
    }

    const tableWrapper = document.querySelector('.routine-table-wrapper');
    let cardsContainer = document.getElementById('routine-custom-cards-container');

    if (tableWrapper) tableWrapper.style.display = 'none';
    if (!cardsContainer && tableWrapper) {
      cardsContainer = document.createElement('div');
      cardsContainer.id = 'routine-custom-cards-container';
      tableWrapper.after(cardsContainer);
    }
    if (cardsContainer) {
      cardsContainer.style.display = 'block';
      cardsContainer.innerHTML = '';
    }

    daysToRender.forEach((d, index) => {
      if (!d || !d.day) return;
      const cleanDay = d.day.split(/[+-]/)[0].trim();
      const translatedDayName = translateDay(cleanDay);
      const translatedStyleName = translateStyle(d.style || '');
      
      const card = document.createElement('div');
      card.className = `custom-day-card ${index === planIndex ? 'active' : ''}`;
      
      let bodyHtml = '';
      if (split === 'custom') {
        bodyHtml = formatCustomActivities(d.activities);
      } else {
        bodyHtml = `<div class="custom-activities-list" style="margin-top: 1rem;">
          ${formatActivities(d.activities)}
        </div>`;
      }

      card.innerHTML = `
        <div class="custom-day-header">
          <div class="custom-day-info">
            <span class="custom-day-name">${translatedDayName}</span>
            <span class="custom-day-badge">${translatedStyleName}</span>
          </div>
          <i class="fa-solid fa-chevron-down custom-day-chevron"></i>
        </div>
        <div class="custom-day-body" style="${index === planIndex ? 'display: block;' : 'display: none;'}">
          ${bodyHtml}
        </div>
      `;
      
      const header = card.querySelector('.custom-day-header');
      const body = card.querySelector('.custom-day-body');
      const chevron = card.querySelector('.custom-day-chevron');
      
      if (header && body) {
        header.addEventListener('click', () => {
          const isOpen = body.style.display === 'block';
          body.style.display = isOpen ? 'none' : 'block';
          card.classList.toggle('expanded', !isOpen);
          if (chevron) {
            chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
          }
        });
      }
      
      if (index === planIndex && chevron) {
        chevron.style.transform = 'rotate(180deg)';
        card.classList.add('expanded');
      }
      
      if (cardsContainer) {
        cardsContainer.appendChild(card);
      }
    });

    // Setup click handlers for exercise video play buttons in schedule (cards)
    const containerToQuery = document.getElementById('routine-custom-cards-container');
    if (containerToQuery) {
      containerToQuery.querySelectorAll('.video-icon-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const key = btn.dataset.key;
          selectExercise(key, false);
          playVideo(key, 'en');
        });
      });
    }

    // Render Exercise directory cards filtered by active split
    const exerciseListContainer = document.getElementById('exercise-cards-list');
    exerciseListContainer.innerHTML = '';

    // Collect list of exercise keys for this routine
    const allExercises = window.NATURE_FIT_DATA.exercises;
    const splitExercises = Object.keys(allExercises).filter(key => {
      // Find if this exercise belongs to any style inside this routine
      // Or we can just display all related exercises matching styles for intermediate/expert
      // Let's filter exercises by styles in the routine or just display a beautiful complete directory!
      return true; // We display the main directories, making it easy to see all
    });

    // To make it look selected and clean, we render all exercises
    Object.keys(allExercises).forEach((key, idx) => {
      const ex = allExercises[key];
      const styleName = window.NATURE_FIT_DATA.workoutStyles[ex.style]?.name || ex.style;
      const card = document.createElement('div');
      card.className = `exercise-card ${idx === 0 ? 'selected' : ''}`;
      card.dataset.key = key;

      const translations = window.NATURE_FIT_TRANSLATIONS[state.lang] || window.NATURE_FIT_TRANSLATIONS['en'];
      const translatedName = translations[key] || ex.name;
      const translatedStyle = translateStyle(styleName);

      card.innerHTML = `
        <div class="exercise-meta">
          <h4>${translatedName}</h4>
          <div class="exercise-tags">
            <span class="tag tag-primary">${translatedStyle}</span>
          </div>
        </div>
        <div class="exercise-card-actions">
          <button class="btn-icon play-en" data-key="${key}" title="English Instructions"><i class="fa-solid fa-play"></i> EN</button>
          <button class="btn-icon play-ta" data-key="${key}" title="Tamil Instructions"><i class="fa-solid fa-play"></i> தமிழ்</button>
        </div>
      `;

      // Card selection highlights muscle mapping
      card.addEventListener('click', (e) => {
        // Prevent click trigger if pressing play buttons
        if (e.target.closest('.btn-icon')) return;
        
        document.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectExercise(key);
      });

      // Bind EN/TAM video click
      card.querySelector('.play-en').addEventListener('click', () => {
        playVideo(key, 'en');
      });
      card.querySelector('.play-ta').addEventListener('click', () => {
        playVideo(key, 'ta');
      });

      exerciseListContainer.appendChild(card);
    });

    // Select first exercise by default (do not scroll on split load)
    const firstExKey = Object.keys(allExercises)[0];
    if (firstExKey) {
      selectExercise(firstExKey, false);
    }

    // Force WebView scroll height recalculation to prevent iOS/Android scroll freezing
    setTimeout(() => {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.offsetHeight; // Force reflow
      document.body.style.overflow = originalOverflow || '';
    }, 50);
  }



  // Handle Exercise Selection -> Highlight SVG & Details
  function selectExercise(key, shouldScroll = true) {
    state.selectedExerciseKey = key;
    const ex = window.NATURE_FIT_DATA.exercises[key];
    if (!ex) return;

    // Highlight muscles in anatomy SVG
    window.MuscleMap.highlight(ex.primaryMuscles, ex.secondaryMuscles);

    const translations = window.NATURE_FIT_TRANSLATIONS[state.lang] || window.NATURE_FIT_TRANSLATIONS['en'];
    const translatedName = translations[key] || ex.name;
    
    let instructionsText = ex.instructionsEn;
    if (state.lang === 'ta') {
      instructionsText = ex.instructionsTa || ex.instructionsEn;
    } else if (state.lang === 'tg') {
      instructionsText = ex.instructionsTg || ex.instructionsEn;
    }

    // Update Details panel
    document.getElementById('selected-exercise-name').textContent = translatedName;
    document.getElementById('selected-exercise-instruction').textContent = instructionsText;

    const actionContainer = document.getElementById('selected-exercise-video-actions');
    
    const enLabel = state.lang === 'ta' ? 'ஆங்கில வீடியோ' : 'English Video';
    const taLabel = state.lang === 'ta' ? 'தமிழ் வீடியோ' : 'Tamil Video';

    actionContainer.innerHTML = `
      <button class="btn-action" id="detail-play-en"><i class="fa-solid fa-video"></i> ${enLabel}</button>
      <button class="btn-action" id="detail-play-ta" style="background: var(--theme-secondary); color: #000;"><i class="fa-solid fa-video"></i> ${taLabel}</button>
    `;

    document.getElementById('detail-play-en').addEventListener('click', () => playVideo(key, 'en'));
    document.getElementById('detail-play-ta').addEventListener('click', () => playVideo(key, 'ta'));

    // Smooth scroll to the details/muscle map panel on mobile screens
    if (shouldScroll && window.innerWidth <= 1024) {
      const panel = document.getElementById('muscle-map-panel');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  // Switch language inside video player modal
  function switchModalLanguage(lang) {
    state.activeVideoLang = lang;
    const ex = window.NATURE_FIT_DATA.exercises[state.activeVideoKey];
    if (!ex) return;
    
    // Play Tamil video for Tamil and Tanglish guides, otherwise English video
    const videoUrl = (lang === 'ta' || lang === 'tg') ? ex.videoTa : ex.videoEn;
    
    let languageTitle = 'English';
    if (lang === 'ta') languageTitle = 'Tamil / தமிழ்';
    else if (lang === 'tg') languageTitle = 'Tanglish';
    
    let instructionsText = ex.instructionsEn;
    if (lang === 'ta') instructionsText = ex.instructionsTa || ex.instructionsEn;
    else if (lang === 'tg') instructionsText = ex.instructionsTg || ex.instructionsEn;
    
    const translations = window.NATURE_FIT_TRANSLATIONS[state.lang] || window.NATURE_FIT_TRANSLATIONS['en'];
    const translatedName = translations[state.activeVideoKey] || ex.name;

    document.getElementById('video-dialog-title').textContent = `${translatedName} - ${languageTitle} Guide`;
    document.getElementById('video-frame').src = videoUrl;
    document.getElementById('video-dialog-instruction').textContent = instructionsText;
    
    // Set watch on YouTube URL
    const watchUrl = videoUrl.replace('/embed/', '/watch?v=');
    const watchBtn = document.getElementById('btn-watch-youtube');
    if (watchBtn) {
      watchBtn.href = watchUrl;
    }
    
    // Update button active styles in the modal
    const btnEn = document.getElementById('modal-lang-en');
    const btnTa = document.getElementById('modal-lang-ta');
    const btnTg = document.getElementById('modal-lang-tg');
    
    [btnEn, btnTa, btnTg].forEach(btn => {
      if (!btn) return;
      if (btn.dataset.lang === lang) {
        btn.style.background = 'var(--theme-primary)';
        btn.style.color = '#000';
        btn.style.fontWeight = 'bold';
        btn.style.border = 'none';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--theme-text-main)';
        btn.style.border = '1px solid var(--theme-panel-border)';
        btn.style.fontWeight = 'normal';
      }
    });
  }

  // Play Video Dialog
  function playVideo(key, lang) {
    state.activeVideoKey = key;
    switchModalLanguage(lang);
    videoDialog.showModal();
  }

  // Bind video modal language buttons once
  document.getElementById('modal-lang-en').addEventListener('click', () => switchModalLanguage('en'));
  document.getElementById('modal-lang-ta').addEventListener('click', () => switchModalLanguage('ta'));
  document.getElementById('modal-lang-tg').addEventListener('click', () => switchModalLanguage('tg'));

  function closeVideoPlayer() {
    document.getElementById('video-frame').src = '';
    videoDialog.close();
  }

  // Render Diet panel dynamically based on Active Track
  function renderDietPanel() {
    const trackData = window.NATURE_FIT_DATA.dietPlans[state.activeTrack];
    if (!trackData) return;

    const dietType = state.dietType || 'nonveg';

    // Update button active styles when rendering (e.g. if track changed)
    document.querySelectorAll('.diet-type-btn').forEach(btn => {
      if (btn.dataset.type === dietType) {
        btn.classList.add('active');
        btn.style.background = 'var(--theme-primary)';
        btn.style.color = '#000';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = 'var(--theme-text-muted)';
      }
    });

    if (dietType === 'custom') {
      renderCustomDietPanel(trackData);
      return;
    }

    let diet = trackData[dietType];
    if (diet && (diet.en || diet.ta || diet.tg)) {
      diet = diet[state.lang] || diet['en'];
    }
    if (!diet) return;

    document.getElementById('diet-philosophy').innerHTML = `
      <strong>Philosophy:</strong> ${diet.philosophy}
    `;

    // Render Meals
    const mealList = document.getElementById('meal-plan-list');
    mealList.innerHTML = '';
    diet.meals.forEach(m => {
      const card = document.createElement('div');
      card.className = 'meal-card';
      card.innerHTML = `
        <h4 class="meal-name"><i class="fa-solid fa-bowl-food"></i> ${m.name}</h4>
        <ul class="meal-items">
          ${m.items.map(item => `<li>${item}</li>`).join('')}
        </ul>
      `;
      mealList.appendChild(card);
    });

    // Render Supplements
    const supplementList = document.getElementById('diet-supplements-list');
    supplementList.innerHTML = '';
    const supplements = (trackData.supplements && (trackData.supplements.en || trackData.supplements.ta || trackData.supplements.tg))
      ? (trackData.supplements[state.lang] || trackData.supplements['en'])
      : (trackData.supplements || []);
      
    supplements.forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${s.split(' - ')[0]}</strong> - ${s.split(' - ')[1] || ''}`;
      supplementList.appendChild(li);
    });
  }

  // Render Custom Diet Editor
  function renderCustomDietPanel(trackData) {
    const philosophies = {
      en: "Create and customize your own whitelisted South Indian diet plan below. You can edit any meal's text fields and save the plan.",
      ta: "கீழே உங்கள் சொந்த தென்னிந்திய உணவுத் திட்டத்தை உருவாக்கி தனிப்பயனாக்கவும். நீங்கள் எந்த உணவின் உரை புலங்களையும் திருத்தி சேமிக்கலாம்.",
      tg: "Kela unga sontha South Indian diet-a select panni, edit & save pannunga."
    };
    const philosophyText = philosophies[state.lang] || philosophies['en'];
    document.getElementById('diet-philosophy').innerHTML = `
      <strong>Philosophy:</strong> ${philosophyText}
    `;

    // Get custom diet from localStorage
    const localKey = `nature_fit_custom_meals_${state.activeTrack}`;
    let customMeals = [];
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        customMeals = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading custom diet", e);
    }

    // Fallback: If no custom diet saved, default to Veg template in the active language
    const defaultSource = trackData.veg[state.lang] || trackData.veg['en'];
    if (!customMeals || customMeals.length === 0) {
      customMeals = defaultSource.meals.map(m => ({
        name: m.name,
        items: m.items.join('\n')
      }));
    }

    // Double check that no item is empty/undefined.
    customMeals.forEach((m, idx) => {
      if (!m.items && m.items !== '') {
        const defaultMeal = defaultSource.meals[idx] || defaultSource.meals[0];
        m.items = defaultMeal ? defaultMeal.items.join('\n') : '';
      }
    });

    const mealList = document.getElementById('meal-plan-list');
    mealList.innerHTML = '';

    const editorDiv = document.createElement('div');
    editorDiv.style.display = 'flex';
    editorDiv.style.flexDirection = 'column';
    editorDiv.style.gap = '1.25rem';
    editorDiv.style.width = '100%';

    // Render Prefill Controls with translated texts
    const templateLabels = {
      en: { label: "Prefill Template:", nonveg: "Non-Veg", veg: "Veg", vegan: "Vegan", confirm: "Are you sure you want to prefill the custom editor with the South Indian {type} template? Any unsaved edits will be replaced." },
      ta: { label: "முன்பதிவு வார்ப்புரு:", nonveg: "அசைவம்", veg: "சைவம்", vegan: "வீகன்", confirm: "தென்னிந்திய {type} உணவு வார்ப்புருவை கொண்டு முன்பதிவு செய்ய விரும்புகிறீர்களா? தற்போதைய மாற்றங்கள் நீக்கப்படும்." },
      tg: { label: "Prefill Template:", nonveg: "Non-Veg", veg: "Veg", vegan: "Vegan", confirm: "South Indian {type} template-a load panna porigala? Unsaved edits poidum." }
    };
    const lbl = templateLabels[state.lang] || templateLabels['en'];

    const prefillContainer = document.createElement('div');
    prefillContainer.style.display = 'flex';
    prefillContainer.style.alignItems = 'center';
    prefillContainer.style.gap = '0.5rem';
    prefillContainer.style.marginBottom = '0.5rem';
    prefillContainer.style.flexWrap = 'wrap';
    prefillContainer.innerHTML = `
      <span style="font-size: 0.85rem; color: var(--theme-text-muted); font-weight: 500;">${lbl.label}</span>
      <button class="btn-action prefill-btn" data-template="nonveg" style="padding: 0.3rem 0.65rem; font-size: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--theme-panel-border); color: var(--theme-text-main); border-radius: 4px; cursor: pointer; transition: all 0.2s;"><i class="fa-solid fa-egg"></i> ${lbl.nonveg}</button>
      <button class="btn-action prefill-btn" data-template="veg" style="padding: 0.3rem 0.65rem; font-size: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--theme-panel-border); color: var(--theme-text-main); border-radius: 4px; cursor: pointer; transition: all 0.2s;"><i class="fa-solid fa-carrot"></i> ${lbl.veg}</button>
      <button class="btn-action prefill-btn" data-template="vegan" style="padding: 0.3rem 0.65rem; font-size: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--theme-panel-border); color: var(--theme-text-main); border-radius: 4px; cursor: pointer; transition: all 0.2s;"><i class="fa-solid fa-leaf"></i> ${lbl.vegan}</button>
    `;

    prefillContainer.querySelectorAll('.prefill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const templateType = btn.dataset.template;
        const confirmMsg = lbl.confirm.replace('{type}', templateType);
        if (confirm(confirmMsg)) {
          const sourceObj = trackData[templateType][state.lang] || trackData[templateType]['en'];
          const templMeals = sourceObj.meals.map(m => ({
            name: m.name,
            items: m.items.join('\n')
          }));
          localStorage.setItem(localKey, JSON.stringify(templMeals));
          renderDietPanel();
        }
      });
    });

    editorDiv.appendChild(prefillContainer);

    // Render textareas
    customMeals.forEach((m, idx) => {
      const fieldContainer = document.createElement('div');
      fieldContainer.style.display = 'flex';
      fieldContainer.style.flexDirection = 'column';
      fieldContainer.style.gap = '0.5rem';

      fieldContainer.innerHTML = `
        <label style="font-weight: 700; color: var(--theme-text-main); font-size: 0.95rem;">
          <i class="fa-solid fa-bowl-food" style="color: var(--theme-primary); margin-right: 0.25rem;"></i> ${m.name}
        </label>
        <textarea class="custom-meal-textarea" data-index="${idx}" style="width: 100%; height: 80px; padding: 0.6rem; border-radius: 6px; border: 1px solid var(--theme-panel-border); background: rgba(0, 0, 0, 0.35); color: var(--theme-text-main); font-family: inherit; font-size: 0.9rem; line-height: 1.4; resize: vertical;" placeholder="Enter items, one per line...">${m.items || ''}</textarea>
      `;
      editorDiv.appendChild(fieldContainer);
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-action';
    saveBtn.style.alignSelf = 'flex-start';
    saveBtn.style.marginTop = '0.5rem';
    
    const saveBtnTexts = {
      en: "Save Custom Diet",
      ta: "தனிப்பயன் உணவைச் சேமி",
      tg: "Custom Diet-a Save Panna"
    };
    const alertTexts = {
      en: "Custom South Indian diet plan saved successfully!",
      ta: "தனிப்பயன் தென்னிந்திய உணவுத் திட்டம் வெற்றிகரமாக சேமிக்கப்பட்டது!",
      tg: "Custom South Indian diet plan saved successfully!"
    };

    saveBtn.innerHTML = `<i class="fa-solid fa-save"></i> ${saveBtnTexts[state.lang] || saveBtnTexts['en']}`;
    saveBtn.addEventListener('click', () => {
      const textareas = editorDiv.querySelectorAll('.custom-meal-textarea');
      const updatedMeals = [];
      textareas.forEach(ta => {
        const index = parseInt(ta.dataset.index);
        updatedMeals.push({
          name: customMeals[index].name,
          items: ta.value.trim()
        });
      });
      
      localStorage.setItem(localKey, JSON.stringify(updatedMeals));
      alert(alertTexts[state.lang] || alertTexts['en']);
      renderDietPanel();
    });

    editorDiv.appendChild(saveBtn);
    mealList.appendChild(editorDiv);

    // Render Supplements in Custom mode too
    const supplementList = document.getElementById('diet-supplements-list');
    supplementList.innerHTML = '';
    const supplements = (trackData.supplements && (trackData.supplements.en || trackData.supplements.ta || trackData.supplements.tg))
      ? (trackData.supplements[state.lang] || trackData.supplements['en'])
      : (trackData.supplements || []);
      
    supplements.forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${s.split(' - ')[0]}</strong> - ${s.split(' - ')[1] || ''}`;
      supplementList.appendChild(li);
    });
  }

  // Render Recovery panel dynamically based on Active Track
  function renderRecoveryPanel() {
    const recoveryTrackData = window.NATURE_FIT_DATA.recoveryStrategies[state.activeTrack];
    if (!recoveryTrackData) return;

    const recovery = recoveryTrackData[state.lang] || recoveryTrackData['en'];
    if (!recovery) return;

    // Render the translated header and subtext
    const titleEl = document.getElementById('recovery-title');
    if (titleEl) {
      titleEl.textContent = recovery.title;
    }

    const subtextEl = document.querySelector('#tab-recovery .header-title p');
    if (subtextEl) {
      const subtexts = {
        natural: {
          en: "Slowing down nervous system arousal to allow maximum cellular regeneration.",
          ta: "நரம்பு மண்டலத்தின் தூண்டுதலைக் குறைத்து, அதிகபட்ச செல்லுலார் மீளுருவாக்கத்தை அனுமதிக்கிறது.",
          tg: "Nervous system-a calm panni, maximum cellular regeneration-க்கு வழி செய்கிறது."
        },
        enhanced: {
          en: "Aggressive organ protection and hematological support during enhanced cycles.",
          ta: "மேம்படுத்தப்பட்ட சுழற்சியின் போது உறுப்பு பாதுகாப்பு மற்றும் ஹீமாட்டாலஜிக்கல் ஆதரவு.",
          tg: "Enhanced cycles-in podhu aggressive organ protection matrum blood count-க்கு சப்போர்ட் செய்கிறது."
        }
      };
      subtextEl.textContent = subtexts[state.activeTrack][state.lang] || subtexts[state.activeTrack]['en'];
    }

    const container = document.getElementById('recovery-strategies-container');
    container.innerHTML = '';

    recovery.strategies.forEach(s => {
      const card = document.createElement('div');
      card.className = 'recovery-card';
      card.innerHTML = `
        <h4 class="recovery-title"><i class="fa-solid fa-circle-check"></i> ${s.name}</h4>
        <p class="recovery-desc">${s.details}</p>
      `;
      container.appendChild(card);
    });
  }

  // --- USER AUTHENTICATION & LOGIN GATE MANAGEMENT ---
  state.user = null;
  try {
    const savedUser = localStorage.getItem('nature_fit_user');
    if (savedUser) state.user = JSON.parse(savedUser);
  } catch (e) {
    state.user = null;
  }

  function updateAuthUI() {
    const sidebarName = document.getElementById('profile-name-badge');
    const sidebarLevel = document.getElementById('profile-level-badge');
    const headerGreeting = document.getElementById('header-greeting');

    // Update Header / Sidebar Profile Details
    if (state.user) {
      if (sidebarName) sidebarName.innerHTML = `<i class="fa-solid fa-user-check" style="color: #22c55e;"></i> ${state.user.name}`;
      if (headerGreeting) headerGreeting.textContent = `Welcome back, ${state.user.name}`;
    } else {
      if (sidebarName) sidebarName.innerHTML = `<i class="fa-solid fa-user-xmark" style="color: #ef4444;"></i> Guest (Not Logged In)`;
      if (headerGreeting) headerGreeting.textContent = `Welcome, Fitness Practitioner`;
    }

    // Render Auth Button in Sidebar
    const sidebarProfile = document.querySelector('.sidebar-profile');
    if (sidebarProfile) {
      let authBtnContainer = document.getElementById('sidebar-auth-controls');
      if (!authBtnContainer) {
        authBtnContainer = document.createElement('div');
        authBtnContainer.id = 'sidebar-auth-controls';
        authBtnContainer.style.cssText = 'margin-top: 8px; display: flex; gap: 6px;';
        sidebarProfile.appendChild(authBtnContainer);
      }

      if (state.user) {
        authBtnContainer.innerHTML = `
          <button type="button" class="btn-secondary" id="btn-logout" style="width: 100%; padding: 0.35rem 0.6rem; font-size: 0.75rem; background: rgba(239,68,68,0.15); color: #ef4444; border-color: rgba(239,68,68,0.3);">
            <i class="fa-solid fa-right-from-bracket"></i> Sign Out (${state.user.name.split(' ')[0]})
          </button>
        `;
        document.getElementById('btn-logout').onclick = handleLogout;
      } else {
        authBtnContainer.innerHTML = `
          <button type="button" class="btn-primary" id="btn-open-auth-modal" style="width: 100%; padding: 0.4rem 0.6rem; font-size: 0.75rem; background: var(--theme-primary); color: #000; font-weight: 700; border-radius: 6px;">
            <i class="fa-solid fa-lock"></i> Sign In / Register
          </button>
        `;
        document.getElementById('btn-open-auth-modal').onclick = openAuthDialog;
      }
    }
  }

  const authDialog = document.getElementById('auth-dialog');
  const btnCloseAuthDialog = document.getElementById('btn-close-auth-dialog');
  const tabBtnLogin = document.getElementById('tab-btn-login');
  const tabBtnRegister = document.getElementById('tab-btn-register');
  const authLoginForm = document.getElementById('auth-login-form');
  const authRegisterForm = document.getElementById('auth-register-form');
  const btnQuickDemoLogin = document.getElementById('btn-quick-demo-login');
  const btnTriggerLoginOverlay = document.getElementById('btn-trigger-login-from-overlay');

  if (btnCloseAuthDialog) btnCloseAuthDialog.onclick = closeAuthDialog;
  if (btnTriggerLoginOverlay) btnTriggerLoginOverlay.onclick = openAuthDialog;

  if (tabBtnLogin && tabBtnRegister) {
    tabBtnLogin.onclick = () => switchAuthTab('login');
    tabBtnRegister.onclick = () => switchAuthTab('register');
  }

  function switchAuthTab(tab) {
    if (tab === 'login') {
      authLoginForm.style.display = 'block';
      authRegisterForm.style.display = 'none';
      tabBtnLogin.style.background = 'rgba(var(--theme-primary-rgb), 0.2)';
      tabBtnLogin.style.color = 'var(--theme-primary)';
      tabBtnLogin.style.borderColor = 'var(--theme-primary)';
      tabBtnRegister.style.background = 'none';
      tabBtnRegister.style.color = 'var(--theme-text-main)';
      tabBtnRegister.style.borderColor = 'transparent';
    } else {
      authLoginForm.style.display = 'none';
      authRegisterForm.style.display = 'block';
      tabBtnRegister.style.background = 'rgba(var(--theme-primary-rgb), 0.2)';
      tabBtnRegister.style.color = 'var(--theme-primary)';
      tabBtnRegister.style.borderColor = 'var(--theme-primary)';
      tabBtnLogin.style.background = 'none';
      tabBtnLogin.style.color = 'var(--theme-text-main)';
      tabBtnLogin.style.borderColor = 'transparent';
    }
  }

  function openAuthDialog() {
    if (authDialog) authDialog.showModal();
  }

  function closeAuthDialog() {
    if (authDialog) authDialog.close();
  }

  if (btnQuickDemoLogin) {
    btnQuickDemoLogin.onclick = async () => {
      document.getElementById('auth-login-email').value = 'demo@halofitness.com';
      document.getElementById('auth-login-password').value = 'halo123';
      authLoginForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    };
  }

  if (authLoginForm) {
    authLoginForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-login-email').value;
      const password = document.getElementById('auth-login-password').value;
      const errDiv = document.getElementById('auth-login-error');
      errDiv.style.display = 'none';

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        state.user = data.user;
        localStorage.setItem('nature_fit_user', JSON.stringify(state.user));
        updateAuthUI();
        closeAuthDialog();
        fetchProfile(); // reload profile for logged in user
      } catch (err) {
        errDiv.textContent = err.message;
        errDiv.style.display = 'block';
      }
    };
  }

  if (authRegisterForm) {
    authRegisterForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('auth-reg-name').value;
      const email = document.getElementById('auth-reg-email').value;
      const password = document.getElementById('auth-reg-password').value;
      const errDiv = document.getElementById('auth-reg-error');
      errDiv.style.display = 'none';

      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        state.user = data.user;
        localStorage.setItem('nature_fit_user', JSON.stringify(state.user));
        updateAuthUI();
        closeAuthDialog();
        fetchProfile();
      } catch (err) {
        errDiv.textContent = err.message;
        errDiv.style.display = 'block';
      }
    };
  }

  function handleLogout() {
    state.user = null;
    localStorage.removeItem('nature_fit_user');
    updateAuthUI();
    fetchProfile();
  }

  // --- SCIENTIFIC CALORIE & MACRO RECOMMENDATION CALCULATOR ---
  async function calculateCalorieRecommendation() {
    const age = parseInt(document.getElementById('profile-age')?.value) || 28;
    const gender = document.getElementById('profile-gender')?.value || 'male';
    const weight = parseFloat(document.getElementById('profile-weight')?.value) || 75;
    const targetWeight = parseFloat(document.getElementById('profile-target-weight')?.value) || weight;
    const height = parseFloat(document.getElementById('profile-height')?.value) || 178;
    const activityLevel = document.getElementById('profile-activity')?.value || 'moderate';
    const fitnessGoal = document.getElementById('profile-goal')?.value || 'fat_loss';

    try {
      const res = await fetch(`${API_BASE}/api/calorie-recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age, gender, weight, target_weight: targetWeight, height, activity_level: activityLevel, fitness_goal: fitnessGoal
        })
      });
      const data = await res.json();

      if (res.ok && data) {
        state.calculatedRecommendation = data;

        // Render calculated metrics into UI
        const recBmr = document.getElementById('rec-bmr');
        const recTdee = document.getElementById('rec-tdee');
        const recCalories = document.getElementById('rec-calories');
        const recWater = document.getElementById('rec-water');
        const recMacros = document.getElementById('rec-macros');

        if (recBmr) recBmr.textContent = `${data.bmr.toLocaleString()} kcal/day`;
        if (recTdee) recTdee.textContent = `${data.tdee.toLocaleString()} kcal/day`;
        if (recCalories) recCalories.textContent = `${data.daily_calorie_target.toLocaleString()} kcal/day`;
        if (recWater) recWater.textContent = `${(data.water_target / 1000).toFixed(1)}L (${data.water_target.toLocaleString()} ml)`;
        if (recMacros) recMacros.textContent = `Protein: ${data.protein_target}g | Carbs: ${data.carbs_target}g | Fats: ${data.fats_target}g`;
      }
    } catch (e) {
      console.error("Error calculating calorie recommendation", e);
    }
  }

  function applyRecommendationsToInputs() {
    if (!state.user) {
      alert("Please sign in to apply personalized calorie recommendations!");
      openAuthDialog();
      return;
    }
    if (!state.calculatedRecommendation) {
      calculateCalorieRecommendation();
      return;
    }
    const rec = state.calculatedRecommendation;
    document.getElementById('profile-calories').value = rec.daily_calorie_target;
    document.getElementById('profile-protein').value = rec.protein_target;
    document.getElementById('profile-carbs').value = rec.carbs_target;
    document.getElementById('profile-fats').value = rec.fats_target;
    document.getElementById('profile-water').value = rec.water_target;
  }


  // Dialog Handler: Open Profile settings and pre-fill form
  function openProfileDialog() {
    if (!state.profile) return;

    updateAuthUI();

    const authLockOverlay = document.getElementById('auth-lock-overlay');
    const profileFormInputs = document.querySelectorAll('#profile-settings-form input, #profile-settings-form select, #btn-save-profile, #btn-apply-recommendations, #btn-calculate-recommendation');

    // RESTRICT DETAILS INPUT TO LOGGED IN USERS
    if (!state.user) {
      if (authLockOverlay) authLockOverlay.style.display = 'block';
      profileFormInputs.forEach(input => {
        if (input.id !== 'btn-trigger-login-from-overlay') {
          input.disabled = true;
        }
      });
    } else {
      if (authLockOverlay) authLockOverlay.style.display = 'none';
      profileFormInputs.forEach(input => {
        input.disabled = false;
      });
    }

    document.getElementById('profile-username').value = state.user ? state.user.name : (state.profile.username || 'Aesthetic Warrior');
    document.getElementById('profile-age').value = state.profile.age || 28;
    document.getElementById('profile-gender').value = state.profile.gender || 'male';
    document.getElementById('profile-experience').value = state.profile.experience_level || 'intermediate';
    document.getElementById('profile-weight').value = state.profile.weight || 76.5;
    document.getElementById('profile-target-weight').value = state.profile.target_weight || state.profile.weight || 75.0;
    document.getElementById('profile-height').value = state.profile.height || 178;
    document.getElementById('profile-activity').value = state.profile.activity_level || 'moderate';
    document.getElementById('profile-goal').value = state.profile.fitness_goal || 'fat_loss';
    
    document.getElementById('profile-calories').value = state.profile.daily_calorie_target || 2158;
    document.getElementById('profile-protein').value = state.profile.protein_target || 153;
    document.getElementById('profile-carbs').value = state.profile.carbs_target || 243;
    document.getElementById('profile-fats').value = state.profile.fats_target || 60;
    document.getElementById('profile-water').value = state.profile.water_target || 3500;

    // Bind calculate & apply listeners
    const btnCalc = document.getElementById('btn-calculate-recommendation');
    if (btnCalc) btnCalc.onclick = calculateCalorieRecommendation;

    const btnApply = document.getElementById('btn-apply-recommendations');
    if (btnApply) btnApply.onclick = applyRecommendationsToInputs;

    ['profile-age', 'profile-gender', 'profile-weight', 'profile-target-weight', 'profile-height', 'profile-activity', 'profile-goal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.onchange = calculateCalorieRecommendation;
    });

    // Trigger initial calculation
    calculateCalorieRecommendation();

    profileDialog.showModal();
  }

  // Form Submits: Handle Profile Save
  async function handleProfileSubmit(e) {
    e.preventDefault();
    
    // RESTRICT SAVE TO LOGGED IN USERS
    if (!state.user) {
      alert("🔒 Access Restricted: Please sign in to update physical details & save calorie targets.");
      openAuthDialog();
      return;
    }

    const updatedProfile = {
      user_id: state.user.id,
      username: document.getElementById('profile-username').value,
      track: state.activeTrack,
      experience_level: document.getElementById('profile-experience').value,
      age: parseInt(document.getElementById('profile-age').value),
      gender: document.getElementById('profile-gender').value,
      weight: parseFloat(document.getElementById('profile-weight').value),
      target_weight: parseFloat(document.getElementById('profile-target-weight').value),
      height: parseFloat(document.getElementById('profile-height').value),
      activity_level: document.getElementById('profile-activity').value,
      fitness_goal: document.getElementById('profile-goal').value,
      bmr: state.calculatedRecommendation ? state.calculatedRecommendation.bmr : 1715,
      tdee: state.calculatedRecommendation ? state.calculatedRecommendation.tdee : 2658,
      daily_calorie_target: parseInt(document.getElementById('profile-calories').value),
      protein_target: parseInt(document.getElementById('profile-protein').value),
      carbs_target: parseInt(document.getElementById('profile-carbs').value),
      fats_target: parseInt(document.getElementById('profile-fats').value),
      water_target: parseInt(document.getElementById('profile-water').value)
    };

    state.profile = updatedProfile;
    await saveProfileToServer();

    // Reload UI
    document.getElementById('profile-name-badge').textContent = state.profile.username;
    document.getElementById('profile-level-badge').textContent = state.profile.experience_level;
    setWorkoutSplit(state.profile.experience_level);
    
    profileDialog.close();
    window.Tracker.updateData(state.profile, state.logs);
  }

  // Native/Local Storage: Save Profile
  async function saveProfileToServer() {
    try {
      if (window.AppDB) {
        await window.AppDB.saveProfile(state.profile);
      }
      console.log('Profile saved successfully to database.');
    } catch (err) {
      console.error('Error saving profile to database.', err);
    }
  }

  // Form Submits: Handle Tracker Log (Common for Page form and Quick dialog form)
  async function handleLogSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    let dateStr, calories, protein, carbs, fats, water, duration, style, completed, weight, notes;

    if (form.id === 'tracker-log-form') {
      dateStr = document.getElementById('track-log-date').value;
      calories = parseInt(document.getElementById('track-log-calories').value);
      protein = parseInt(document.getElementById('track-log-protein').value);
      carbs = parseInt(document.getElementById('track-log-carbs').value);
      fats = parseInt(document.getElementById('track-log-fats').value);
      water = parseInt(document.getElementById('track-log-water').value);
      duration = parseInt(document.getElementById('track-log-duration').value) || 0;
      style = document.getElementById('track-log-style').value;
      completed = document.getElementById('track-log-workout-completed').checked;
      weight = parseFloat(document.getElementById('track-log-weight').value) || 0.0;
      notes = document.getElementById('track-log-notes').value;
    } else {
      // Dialog form
      const _now = new Date();
      dateStr = new Date(_now.getTime() - (_now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      calories = parseInt(document.getElementById('log-calories').value);
      protein = parseInt(document.getElementById('log-protein').value);
      carbs = parseInt(document.getElementById('log-carbs').value);
      fats = parseInt(document.getElementById('log-fats').value);
      water = parseInt(document.getElementById('log-water').value);
      duration = parseInt(document.getElementById('log-duration').value) || 0;
      style = document.getElementById('log-workout-style').value;
      completed = document.getElementById('log-workout-completed').checked;
      weight = parseFloat(document.getElementById('log-weight').value) || 0.0;
      notes = document.getElementById('log-notes').value;
    }

    const payload = {
      date: dateStr,
      calories_consumed: calories,
      protein_g: protein,
      carbs_g: carbs,
      fats_g: fats,
      water_ml: water,
      workout_duration_mins: duration,
      workout_completed: completed ? 1 : 0,
      workout_style: style,
      notes: notes,
      user_weight: weight,
      magnesium_mg: sessionMicros.magnesium_mg || 0,
      zinc_mg: sessionMicros.zinc_mg || 0,
      vitamin_d_iu: sessionMicros.vitamin_d_iu || 0,
      potassium_mg: sessionMicros.potassium_mg || 0,
      omega3_g: sessionMicros.omega3_g || 0.0,
      calcium_mg: sessionMicros.calcium_mg || 0,
      iron_mg: sessionMicros.iron_mg || 0
    };

    try {
      // Native/Local Storage: Save Log
      if (window.AppDB) {
        await window.AppDB.saveLog(payload);
      }
      
      // Refetch logs (from database) and reload tracker
      await fetchLogs();
      window.Tracker.updateData(state.profile, state.logs);
      
      if (form.id === 'dialog-log-form') {
        logDialog.close();
      } else {
        // Clear page form inputs (except date)
        document.getElementById('track-log-calories').value = '';
        document.getElementById('track-log-protein').value = '';
        document.getElementById('track-log-carbs').value = '';
        document.getElementById('track-log-fats').value = '';
        document.getElementById('track-log-water').value = '';
        document.getElementById('track-log-duration').value = '';
        document.getElementById('track-log-style').value = '';
        document.getElementById('track-log-workout-completed').checked = false;
        document.getElementById('track-log-weight').value = '';
        document.getElementById('track-log-notes').value = '';
      }
      
      alert('Day log saved successfully to local storage!');
    } catch (err) {
      console.error('Failed to save log to local storage.', err);
      alert('Error saving log. See console.');
    }
  }

  // Helper to dynamically calculate targets based on inputs (Weight, Target Weight, Height, Experience, Track)
  function calculateProfileTargets(p) {
    const weight = p.weight || 75.0;
    const targetWeight = p.target_weight || weight;
    const height = p.height || 175.0;
    const exp = p.experience_level || 'beginner';
    const track = p.track || 'natural';

    // BMR estimation using Mifflin-St Jeor (assuming Age 25, s=5)
    const BMR = (10 * weight) + (6.25 * height) - (5 * 25) + 5;
    
    let multiplier = 1.375;
    if (exp === 'intermediate') multiplier = 1.55;
    if (exp === 'expert' || exp === 'custom') multiplier = 1.725;

    let calTarget = Math.round(BMR * multiplier);

    // Dynamic adjustment based on weight goals (deficit/surplus/maintenance)
    if (targetWeight < weight) {
      calTarget -= 500; // Caloric deficit for cutting/fat loss
    } else if (targetWeight > weight) {
      calTarget += (track === 'enhanced' ? 500 : 300); // Caloric surplus for bulking/mass gain
    }

    if (track === 'enhanced') {
      calTarget += 150; // extra thermogenic factor compensation
    }

    let proteinTarget = Math.round(weight * 2.0);
    if (track === 'enhanced') {
      proteinTarget = Math.round(weight * 2.6); // enhanced receptor-driven synthesis
    }

    let fatsTarget = Math.round(weight * 1.0);
    if (track === 'enhanced') {
      fatsTarget = Math.round(weight * 0.8); // lipid profiling / liver health focus
    }

    const carbsTarget = Math.round((calTarget - (proteinTarget * 4 + fatsTarget * 9)) / 4);

    let waterTarget = Math.round(weight * 35); // ml
    if (track === 'enhanced') {
      waterTarget = Math.round(weight * 50); // thins viscosity / GFR protection target
    }

    p.daily_calorie_target = calTarget;
    p.protein_target = proteinTarget;
    p.carbs_target = carbsTarget;
    p.fats_target = fatsTarget;
    p.water_target = waterTarget;
  }

  // Live recalculate handler for settings modal recommendations panel
  function liveRecalculateRecommendations() {
    const weight = parseFloat(document.getElementById('profile-weight').value) || 75;
    const targetWeight = parseFloat(document.getElementById('profile-target-weight').value) || weight;
    const height = parseFloat(document.getElementById('profile-height').value) || 175;
    const exp = document.getElementById('profile-experience').value || 'beginner';
    const track = state.activeTrack;

    const mockProfile = { weight, target_weight: targetWeight, height, experience_level: exp, track };
    calculateProfileTargets(mockProfile);

    // Save mock calculated values in a temp state object for easy application
    state.tempRecommendations = mockProfile;

    // Update Recommendations Panel text contents
    document.getElementById('rec-calories').textContent = `${mockProfile.daily_calorie_target} kcal`;
    document.getElementById('rec-water').textContent = `${(mockProfile.water_target / 1000).toFixed(1)}L`;
    document.getElementById('rec-macros').textContent = `P: ${mockProfile.protein_target}g | C: ${mockProfile.carbs_target}g | F: ${mockProfile.fats_target}g`;
  }

  // IDEAL WEIGHT & CALORIE DEFICIT ENGINE LOGIC
  let engineUnitSystem = 'metric';
  let engineSex = 'male';

  function updateIdealWeightEngineUI() {
    const heightSlider = document.getElementById('engine-height-slider');
    const weightSlider = document.getElementById('engine-weight-slider');
    if (!heightSlider || !weightSlider) return;

    let heightCm = parseFloat(heightSlider.value) || 175;
    if (engineUnitSystem === 'imperial') {
      const ft = parseFloat(document.getElementById('engine-feet-input')?.value) || 5;
      const inch = parseFloat(document.getElementById('engine-inches-input')?.value) || 9;
      heightCm = Math.round((ft * 12 + inch) * 2.54);
    }

    let weightKg = parseFloat(weightSlider.value) || 85;
    if (engineUnitSystem === 'imperial') {
      weightKg = Math.round((weightKg / 2.20462) * 10) / 10;
    }

    const age = parseInt(document.getElementById('engine-age-input')?.value) || 28;
    const activity = document.getElementById('engine-activity-select')?.value || 'moderate';
    const goal = document.getElementById('engine-goal-select')?.value || 'fat_loss';
    const equipment = document.getElementById('engine-equipment-select')?.value || 'gym';

    // Clinical Dual-Formula BMR Engine
    // Formula A: Mifflin-St Jeor (1990)
    let bmrMifflin = 9.99 * weightKg + 6.25 * heightCm - 4.92 * age;
    bmrMifflin = engineSex === 'female' ? bmrMifflin - 161 : bmrMifflin + 5;

    // Formula B: Revised Harris-Benedict (1984)
    let bmrHarris = engineSex === 'female'
      ? 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age)
      : 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age);

    // Weighted Consensus Clinical BMR
    const bmr = Math.round((bmrMifflin * 0.6) + (bmrHarris * 0.4));

    // Dynamic Activity Multipliers (with TEF considerations)
    const mults = { sedentary: 1.20, light: 1.375, moderate: 1.55, very_active: 1.725, extra_active: 1.90 };
    const tdee = Math.round(bmr * (mults[activity] || 1.55));

    // Ideal Weight Calculation (Harmonized WHO BMI 21.7, Devine 1974 & Robinson 1983)
    const heightM = heightCm / 100;
    const heightInches = heightCm / 2.54;
    const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

    let bmiCat = 'Normal Weight';
    let bmiColor = '#00F2FE';
    if (bmi < 18.5) { bmiCat = 'Underweight'; bmiColor = '#FFB703'; }
    else if (bmi <= 24.9) { bmiCat = 'Normal Weight'; bmiColor = '#00F2FE'; }
    else if (bmi <= 29.9) { bmiCat = 'Overweight'; bmiColor = '#FF9000'; }
    else { bmiCat = 'Obese'; bmiColor = '#FF4D6D'; }

    const minKg = Math.round(18.5 * heightM * heightM * 10) / 10;
    const maxKg = Math.round(24.9 * heightM * heightM * 10) / 10;
    const whoMidpoint = Math.round(21.7 * heightM * heightM * 10) / 10;

    const inchesOver60 = Math.max(0, heightInches - 60);
    const devineKg = Math.round((engineSex === 'female' ? 45.5 + 2.3 * inchesOver60 : 50 + 2.3 * inchesOver60) * 10) / 10;
    const robinsonKg = Math.round((engineSex === 'female' ? 49 + 1.7 * inchesOver60 : 52 + 1.9 * inchesOver60) * 10) / 10;
    const idealKg = Math.round(((whoMidpoint * 0.4) + (devineKg * 0.3) + (robinsonKg * 0.3)) * 10) / 10;

    const gapKg = Math.round((weightKg - idealKg) * 10) / 10;

    // Calorie Goal Pacing with Metabolic Adaptation Safeguard
    let calTarget = tdee;
    let weeklyLoss = 0.5;
    if (goal === 'aggressive_loss') { calTarget = Math.round(tdee * 0.75); weeklyLoss = 0.70; }
    else if (goal === 'fat_loss') { calTarget = Math.round(tdee * 0.80); weeklyLoss = 0.50; }
    else if (goal === 'maintenance') { calTarget = tdee; weeklyLoss = 0.0; }
    else if (goal === 'lean_gain') { calTarget = Math.round(tdee * 1.10); weeklyLoss = -0.25; }
    else if (goal === 'muscle_surplus') { calTarget = Math.round(tdee * 1.15); weeklyLoss = -0.40; }

    const safeBmrFloor = Math.round(bmr * 0.85);
    const minAbsolute = engineSex === 'female' ? 1200 : 1500;
    const minCal = Math.max(minAbsolute, safeBmrFloor);
    if (calTarget < minCal) calTarget = minCal;

    // Scientific Macronutrients Allocation
    let proteinPerKg = 2.0;
    if (goal.includes('loss')) proteinPerKg = 2.2;
    else if (goal === 'maintenance') proteinPerKg = 1.8;
    else if (goal.includes('gain') || goal.includes('surplus')) proteinPerKg = 2.0;

    const proteinG = Math.round(weightKg * proteinPerKg);
    const proteinCal = proteinG * 4;

    const fatCalFromPct = calTarget * 0.25;
    const minFatCal = weightKg * 0.8 * 9;
    const fatCal = Math.max(fatCalFromPct, minFatCal);
    const fatG = Math.round(fatCal / 9);

    const carbsG = Math.max(0, Math.round((calTarget - (proteinCal + (fatG * 9))) / 4));

    // Unit Display Labels
    const displayWeight = engineUnitSystem === 'imperial' ? Math.round(weightKg * 2.20462 * 10) / 10 : weightKg;
    const displayIdeal = engineUnitSystem === 'imperial' ? Math.round(idealKg * 2.20462 * 10) / 10 : idealKg;
    const displayMin = engineUnitSystem === 'imperial' ? Math.round(minKg * 2.20462 * 10) / 10 : minKg;
    const displayMax = engineUnitSystem === 'imperial' ? Math.round(maxKg * 2.20462 * 10) / 10 : maxKg;
    const displayDevine = engineUnitSystem === 'imperial' ? Math.round(devineKg * 2.20462 * 10) / 10 : devineKg;
    const displayGap = engineUnitSystem === 'imperial' ? Math.round(Math.abs(gapKg) * 2.20462 * 10) / 10 : Math.abs(gapKg);
    const unitLabel = engineUnitSystem === 'imperial' ? 'lbs' : 'kg';

    // Update UI elements
    const tag = document.getElementById('engine-height-weight-tag');
    if (tag) tag.textContent = `${heightCm} cm • ${displayWeight} ${unitLabel}`;

    const heightVal = document.getElementById('engine-height-val');
    if (heightVal) heightVal.textContent = engineUnitSystem === 'imperial' ? `${Math.floor(heightInches / 12)}' ${Math.round(heightInches % 12)}"` : `${heightCm} cm`;

    const weightVal = document.getElementById('engine-weight-val');
    if (weightVal) weightVal.textContent = `${displayWeight} ${unitLabel}`;

    const idealVal = document.getElementById('engine-ideal-val');
    if (idealVal) idealVal.innerHTML = `${displayIdeal} <span style="font-size: 1.1rem; color: var(--theme-primary);" id="engine-ideal-unit">${unitLabel}</span>`;

    const healthyBand = document.getElementById('engine-healthy-band');
    if (healthyBand) healthyBand.innerHTML = `Healthy Band: <strong>${displayMin} – ${displayMax} ${unitLabel}</strong>`;

    const bmiNum = document.getElementById('engine-bmi-num');
    const bmiCatEl = document.getElementById('engine-bmi-cat');
    if (bmiNum) { bmiNum.textContent = bmi; bmiNum.style.color = bmiColor; }
    if (bmiCatEl) { bmiCatEl.textContent = bmiCat; bmiCatEl.style.color = bmiColor; }

    const needle = document.getElementById('engine-bmi-needle');
    if (needle) {
      const angle = -90 + ((Math.max(15, Math.min(35, bmi)) - 15) / 20) * 180;
      needle.setAttribute('transform', `rotate(${angle}, 100, 100)`);
    }

    const gapTitle = document.getElementById('engine-gap-title');
    const gapSub = document.getElementById('engine-gap-sub');
    if (gapTitle) {
      gapTitle.textContent = gapKg > 0.5 ? `Weight Deficit Target: -${displayGap} ${unitLabel}` : gapKg < -0.5 ? `Lean Surplus Target: +${displayGap} ${unitLabel}` : 'At Optimal Healthy Weight!';
    }
    if (gapSub) {
      gapSub.textContent = `Devine Target: ${displayDevine} ${unitLabel} • WHO Healthy BMI Range: 18.5 – 24.9`;
    }

    const timelineTag = document.getElementById('engine-timeline-tag');
    if (timelineTag) {
      if (weeklyLoss > 0 && Math.abs(gapKg) > 0.2) {
        const wks = Math.round((Math.abs(gapKg) / weeklyLoss) * 10) / 10;
        timelineTag.textContent = `Est. ${wks} weeks`;
      } else {
        timelineTag.textContent = 'At Goal Target';
      }
    }

    const bmrVal = document.getElementById('engine-bmr-val');
    const tdeeVal = document.getElementById('engine-tdee-val');
    const targetCalVal = document.getElementById('engine-target-cal-val');
    if (bmrVal) bmrVal.textContent = `${bmr.toLocaleString()} kcal`;
    if (tdeeVal) tdeeVal.textContent = `${tdee.toLocaleString()} kcal`;
    if (targetCalVal) targetCalVal.textContent = `${calTarget.toLocaleString()} kcal`;

    const pVal = document.getElementById('engine-protein-val');
    const pCal = document.getElementById('engine-protein-cal');
    const cVal = document.getElementById('engine-carbs-val');
    const cCal = document.getElementById('engine-carbs-cal');
    const fVal = document.getElementById('engine-fats-val');
    const fCal = document.getElementById('engine-fats-cal');

    if (pVal) pVal.textContent = `${proteinG}g`;
    if (pCal) pCal.textContent = `${proteinG * 4} kcal`;
    if (cVal) cVal.textContent = `${carbsG}g`;
    if (cCal) cCal.textContent = `${carbsG * 4} kcal`;
    if (fVal) fVal.textContent = `${fatG}g`;
    if (fCal) fCal.textContent = `${fatG * 9} kcal`;

    // Render Tailored Workout Routine Split
    const workoutContainer = document.getElementById('engine-workout-container');
    const splitTag = document.getElementById('engine-split-tag');
    if (splitTag) splitTag.textContent = equipment === 'gym' ? 'Full Gym Split' : equipment === 'dumbbells' ? 'Home Dumbbell Split' : 'Bodyweight Split';

    if (workoutContainer) {
      let routines = [];
      if (equipment === 'gym') {
        routines = [
          { day: 'Day 1', title: 'Upper Push Focus', desc: 'Bench Press / Push-Ups (4x8-10) • Incline Press (3x10) • Overhead Press (4x8) • Triceps Pushdown (3x12)' },
          { day: 'Day 2', title: 'Upper Pull Focus', desc: 'Deadlift / Lat Pulldown (4x6-8) • Seated Cable Rows (3x10) • Face Pulls (3x15) • Biceps Curls (3x10-12)' },
          { day: 'Day 3', title: 'Active Recovery & Core', desc: '30 mins Light Walking / Zone 1 Cardio • Core Stability & Dynamic Mobility' },
          { day: 'Day 4', title: 'Lower Body & Leg Power', desc: 'Barbell / Goblet Squats (4x8-10) • Romanian Deadlifts (3x10) • Lunges (3x12) • Calf Raises (4x15)' }
        ];
      } else if (equipment === 'dumbbells') {
        routines = [
          { day: 'Day 1', title: 'Dumbbell Upper Push', desc: 'Dumbbell Floor Press (4x10-12) • Seated Shoulder Press (4x10) • Lateral Raises (3x15) • Overhead Triceps Ext (3x12)' },
          { day: 'Day 2', title: 'Dumbbell Upper Pull', desc: 'Single-Arm Dumbbell Rows (4x10-12) • Dumbbell RDLs (4x10) • Dumbbell Reverse Flyes (3x15) • Hammer Curls (3x12)' },
          { day: 'Day 3', title: 'Active Recovery & Stretching', desc: '30 mins Light Walking • Dynamic Hip & Spine Opening Mobility' },
          { day: 'Day 4', title: 'Dumbbell Lower Body', desc: 'Dumbbell Goblet Squats (4x12) • Dumbbell Walking Lunges (3x12/leg) • Single-Leg Glute Bridges (3x12) • Plank (3x45s)' }
        ];
      } else {
        routines = [
          { day: 'Day 1', title: 'Bodyweight Push Focus', desc: 'Decline / Standard Push-Ups (4x12-15) • Pike Push-Ups (3x10) • Chair Dips (3x15) • Bear Crawl Holds (3x45s)' },
          { day: 'Day 2', title: 'Bodyweight Pull Focus', desc: 'Inverted Rows / Pull-Ups (4x8-12) • Doorframe Rows (3x15) • Superman Back Ext (3x15) • Door Biceps Curls (3x15)' },
          { day: 'Day 3', title: 'Active Recovery & Mobility', desc: '30 mins Outdoor Walking • Full Body Stretching Routine' },
          { day: 'Day 4', title: 'Bodyweight Legs & Abs', desc: 'Deep Bodyweight Squats (4x20) • Bulgarian Split Squats (3x12/leg) • Single-Leg Calf Raises (3x20) • Bicycle Crunches (3x20)' }
        ];
      }

      workoutContainer.innerHTML = routines.map(r => `
        <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--theme-panel-border); padding: 0.85rem; border-radius: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <strong style="color: var(--theme-primary); font-size: 0.88rem;">${r.day}: ${r.title}</strong>
            <span style="font-size: 0.7rem; color: var(--theme-text-muted);">Rest 60s</span>
          </div>
          <p style="font-size: 0.78rem; color: var(--theme-text-muted); line-height: 1.4;">${r.desc}</p>
        </div>
      `).join('');
    }
  }

  function setupIdealWeightEngineEvents() {
    const btnUnit = document.getElementById('btn-engine-unit-toggle');
    if (btnUnit) {
      btnUnit.addEventListener('click', () => {
        engineUnitSystem = engineUnitSystem === 'metric' ? 'imperial' : 'metric';
        btnUnit.textContent = engineUnitSystem === 'metric' ? 'Metric (cm, kg)' : 'Imperial (ft, lbs)';

        const metricCont = document.getElementById('engine-height-metric-container');
        const impCont = document.getElementById('engine-height-imperial-container');
        if (metricCont && impCont) {
          if (engineUnitSystem === 'imperial') {
            metricCont.style.display = 'none';
            impCont.style.display = 'grid';
          } else {
            metricCont.style.display = 'block';
            impCont.style.display = 'none';
          }
        }
        updateIdealWeightEngineUI();
      });
    }

    const maleBtn = document.getElementById('engine-sex-male');
    const femaleBtn = document.getElementById('engine-sex-female');
    if (maleBtn && femaleBtn) {
      maleBtn.addEventListener('click', () => {
        engineSex = 'male';
        maleBtn.classList.add('active');
        femaleBtn.classList.remove('active');
        updateIdealWeightEngineUI();
      });
      femaleBtn.addEventListener('click', () => {
        engineSex = 'female';
        femaleBtn.classList.add('active');
        maleBtn.classList.remove('active');
        updateIdealWeightEngineUI();
      });
    }

    ['engine-height-slider', 'engine-weight-slider', 'engine-feet-input', 'engine-inches-input', 'engine-age-input', 'engine-activity-select', 'engine-goal-select', 'engine-equipment-select'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateIdealWeightEngineUI);
        el.addEventListener('change', updateIdealWeightEngineUI);
      }
    });

    const btnApplySync = document.getElementById('btn-engine-apply-to-tracker');
    if (btnApplySync) {
      btnApplySync.addEventListener('click', async () => {
        const heightSlider = document.getElementById('engine-height-slider');
        const weightSlider = document.getElementById('engine-weight-slider');
        const ageInput = document.getElementById('engine-age-input');
        const activitySelect = document.getElementById('engine-activity-select');
        const goalSelect = document.getElementById('engine-goal-select');

        let heightCm = parseFloat(heightSlider?.value) || 175;
        if (engineUnitSystem === 'imperial') {
          const ft = parseFloat(document.getElementById('engine-feet-input')?.value) || 5;
          const inch = parseFloat(document.getElementById('engine-inches-input')?.value) || 9;
          heightCm = Math.round((ft * 12 + inch) * 2.54);
        }

        let weightKg = parseFloat(weightSlider?.value) || 85;
        if (engineUnitSystem === 'imperial') {
          weightKg = Math.round((weightKg / 2.20462) * 10) / 10;
        }

        const age = parseInt(ageInput?.value) || 28;
        const activity = activitySelect?.value || 'moderate';
        const goal = goalSelect?.value || 'fat_loss';

        // Post to API to save profile targets
        try {
          const res = await fetch(`${API_BASE}/api/calorie-recommendation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              age, gender: engineSex, height: heightCm, weight: weightKg, activity_level: activity, fitness_goal: goal
            })
          });
          const rec = await res.json();
          if (rec) {
            state.profile.gender = engineSex;
            state.profile.height = heightCm;
            state.profile.weight = weightKg;
            state.profile.daily_calorie_target = rec.daily_calorie_target;
            state.profile.protein_target = rec.protein_target;
            state.profile.carbs_target = rec.carbs_target;
            state.profile.fats_target = rec.fats_target;
            state.profile.water_target = rec.water_target;

            if (typeof updateIdealWeightEngineUI === 'function') {
              updateIdealWeightEngineUI();
            }
            alert('🎉 Calculated Ideal Weight & Calorie Deficit targets synced to your HaLo Fitness Profile & Dashboard!');
          }
        } catch (e) {
          console.error('Failed to sync targets', e);
          alert('Targets applied locally!');
        }
      });
    }

    const headerCalcShortcut = document.getElementById('btn-header-calc-shortcut');
    if (headerCalcShortcut) {
      headerCalcShortcut.addEventListener('click', () => {
        const tabItem = document.querySelector('.nav-item[data-tab="tab-ideal-weight"]');
        if (tabItem) tabItem.click();
      });
    }

    const dashboardBanner = document.getElementById('btn-dashboard-ideal-banner');
    if (dashboardBanner) {
      dashboardBanner.addEventListener('click', () => {
        const tabItem = document.querySelector('.nav-item[data-tab="tab-ideal-weight"]');
        if (tabItem) tabItem.click();
      });
    }

    updateIdealWeightEngineUI();
  }

  // Start app
  function initWrapper() {
    init();
    setupIdealWeightEngineEvents();
  }

  initWrapper();
});
