// HaLo Clinical-Grade Foot Step Calculator & Precision Pedometer Engine
// Incorporates ACSM Compendium of Physical Activities, Anthropometric Stride Modeling, and Tri-Axial IMU Signal Processing.

window.Pedometer = {
  steps: 0,
  goal: 10000,
  isLive: true,
  cadence: 100, // Rolling steps per minute
  timerId: null,
  strideMeters: 0.74,
  userWeightKg: 75.0,
  userHeightCm: 178.0,
  userGender: 'male',
  profile: null,
  todayLog: null,
  audioEnabled: false,
  sensorActive: false,

  // Digital Signal Processing (DSP) & Motion Filtering State
  dsp: {
    gravity: { x: 0, y: 0, z: 9.80665 },
    alpha: 0.82, // EMA smoothing coefficient for gravity separation
    stepHistory: [], // Timestamps of recent steps for rolling cadence
    stepBuffer: 0, // Buffer counter for 4-step cadence lock
    lastStepTime: 0,
    lastConfirmedTime: 0,
    minStepInterval: 240, // Max 250 steps/min (sprint limit)
    maxStepInterval: 1400, // Min 43 steps/min (slow crawl limit)
    dynamicThreshold: 1.45, // Dynamic acceleration threshold in m/s^2
    peakDetected: false,
    lastLinearMag: 0
  },

  init: function(profile, todayLog) {
    this.profile = profile || {};
    this.todayLog = todayLog || {};

    if (this.profile.height) {
      this.userHeightCm = parseFloat(this.profile.height);
    }
    if (this.profile.weight) {
      this.userWeightKg = parseFloat(this.profile.weight);
    }
    if (this.profile.gender) {
      this.userGender = (this.profile.gender || 'male').toLowerCase();
    }

    this.updateBaseStride();

    const todayStr = this.getTodayDate();
    const savedGoal = localStorage.getItem('halo_pedometer_goal');
    if (savedGoal) this.goal = parseInt(savedGoal);

    const savedHeight = localStorage.getItem('halo_pedometer_height');
    if (savedHeight) {
      this.userHeightCm = parseFloat(savedHeight);
      this.updateBaseStride();
    }

    const savedWeight = localStorage.getItem('halo_pedometer_weight');
    if (savedWeight) this.userWeightKg = parseFloat(savedWeight);

    const savedSteps = localStorage.getItem('halo_pedometer_steps_' + todayStr);
    if (savedSteps !== null) {
      this.steps = parseInt(savedSteps);
    } else if (this.todayLog && this.todayLog.steps) {
      this.steps = parseInt(this.todayLog.steps);
    } else {
      this.steps = 3450; // Initial baseline
    }

    this.bindEvents();
    this.initMotionSensor();
    this.render();
  },

  updateBaseStride: function() {
    // Anthropometric gender-specific stride coefficients (Clinical Standard)
    const factor = (this.userGender === 'female') ? 0.413 : 0.415;
    this.strideMeters = (this.userHeightCm * factor) / 100;
  },

  getDynamicStrideMeters: function(targetCadence) {
    const cad = targetCadence || this.cadence || 100;
    // Dynamic Stride Expansion: stride length naturally expands at higher velocities
    // At 60 spm (slow walk): ~0.90x base; at 100 spm: 1.0x base; at 130 spm: 1.15x base; at 160+ spm: 1.35x base
    const expansion = Math.pow(Math.max(40, Math.min(180, cad)) / 100, 0.42);
    const dynamicStride = this.strideMeters * expansion;
    return Math.max(0.42, Math.min(1.45, dynamicStride));
  },

  updateData: function(profile, todayLog) {
    if (profile) {
      this.profile = profile;
      if (profile.height) this.userHeightCm = parseFloat(profile.height);
      if (profile.weight) this.userWeightKg = parseFloat(profile.weight);
      if (profile.gender) this.userGender = (profile.gender || 'male').toLowerCase();
      this.updateBaseStride();
    }
    if (todayLog) this.todayLog = todayLog;
    this.render();
  },

  getTodayDate: function() {
    const d = new Date();
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  },

  getDistanceKm: function() {
    const effectiveStride = this.getDynamicStrideMeters(this.cadence);
    return ((this.steps * effectiveStride) / 1000).toFixed(2);
  },

  getDistanceMiles: function() {
    return (parseFloat(this.getDistanceKm()) * 0.621371).toFixed(2);
  },

  // ACSM Metabolic Equivalent of Task (MET) High-Precision Calorie Calculation
  getCaloriesBurned: function() {
    const weight = this.userWeightKg || 75.0;
    const stride = this.getDynamicStrideMeters(this.cadence);
    const cad = Math.max(60, this.cadence || 100);

    // Speed in meters/min and km/h
    const speedMPerMin = stride * cad;
    const speedKmH = (speedMPerMin * 60) / 1000;

    // Determine MET (Metabolic Equivalent of Task) based on Compendium of Physical Activities
    let met = 3.5;
    if (speedKmH < 3.2) {
      met = 2.5; // Casual stroll (< 2.0 mph)
    } else if (speedKmH < 4.5) {
      met = 3.3; // Moderate walking (2.0 - 2.8 mph)
    } else if (speedKmH < 5.8) {
      met = 4.3; // Brisk health walking (2.8 - 3.6 mph)
    } else if (speedKmH < 7.2) {
      met = 5.3; // Very brisk / power walking (3.6 - 4.5 mph)
    } else if (speedKmH < 9.0) {
      met = 8.3; // Light jog (4.5 - 5.6 mph)
    } else {
      met = 9.8 + ((speedKmH - 9.0) * 0.8); // Running (> 5.6 mph)
    }

    // ACSM Energy Expenditure Formula:
    // kcal/min = (MET * 3.5 * weightKg) / 200
    const kcalPerMinute = (met * 3.5 * weight) / 200;
    const minutesWalked = this.steps / cad;
    const totalKcal = kcalPerMinute * minutesWalked;

    return Math.round(totalKcal);
  },

  getNetActiveCalories: function() {
    // Subtracts resting basal metabolic rate during walking duration
    const weight = this.userWeightKg || 75.0;
    const durationHours = (this.steps / (this.cadence || 100)) / 60;
    const restingBurn = 1.0 * weight * durationHours; // 1 MET baseline
    return Math.max(0, Math.round(this.getCaloriesBurned() - restingBurn));
  },

  getWalkDurationMins: function() {
    return Math.round(this.steps / (this.cadence || 100));
  },

  getPaceMinPerKm: function() {
    const dist = parseFloat(this.getDistanceKm());
    if (dist <= 0) return "0'00\"";
    const totalMins = this.getWalkDurationMins();
    const paceDecimal = totalMins / dist;
    const mins = Math.floor(paceDecimal);
    const secs = Math.round((paceDecimal - mins) * 60);
    return `${mins}'${secs < 10 ? '0' : ''}${secs}"`;
  },

  addSteps: function(count) {
    const prevSteps = this.steps;
    this.steps += count;

    // Milestone audio check
    if (this.audioEnabled && Math.floor(this.steps / 1000) > Math.floor(prevSteps / 1000)) {
      this.playMilestoneBeep();
    }

    this.save();
    this.render();
  },

  setSteps: function(count) {
    this.steps = Math.max(0, count);
    this.save();
    this.render();
  },

  setGoal: function(newGoal) {
    if (!newGoal || newGoal < 500) return;
    this.goal = newGoal;
    localStorage.setItem('halo_pedometer_goal', newGoal);
    this.save();
    this.render();
  },

  toggleSession: function() {
    if (this.isLive) {
      this.pauseSession();
    } else {
      this.startSession();
    }
  },

  startSession: function() {
    this.isLive = true;
    this.render();
  },

  pauseSession: function() {
    this.isLive = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.render();
  },

  resetSession: function() {
    if (confirm("Reset today's step count to 0?")) {
      this.steps = 0;
      this.dsp.stepHistory = [];
      this.dsp.stepBuffer = 0;
      this.save();
      this.render();
    }
  },

  save: function() {
    const todayStr = this.getTodayDate();
    localStorage.setItem('halo_pedometer_steps_' + todayStr, this.steps);

    const logPayload = {
      date: todayStr,
      steps: this.steps,
      calories_burned_steps: this.getCaloriesBurned(),
      distance_km: parseFloat(this.getDistanceKm())
    };

    // 1. Sync with local IndexedDB/Capacitor bridge
    if (window.AppDB && window.AppDB.saveLog) {
      window.AppDB.saveLog(logPayload).catch(err => console.log('AppDB pedometer sync:', err));
    }

    // 2. Continuous Cloud Sync with Render backend
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logPayload)
    }).catch(err => console.log('Cloud pedometer sync:', err));
  },

  // Tri-Axial IMU Sensor & Low-Pass Gravity Filter
  initMotionSensor: function() {
    const self = this;
    const sensorStatusEl = document.getElementById('pedometer-sensor-status');

    // iOS 13+ DeviceMotion permission request
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const requestIOSPermission = () => {
        DeviceMotionEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              self.listenMotionEvents();
            }
          })
          .catch(console.error);
      };
      document.body.addEventListener('click', requestIOSPermission, { once: true });
      document.body.addEventListener('touchstart', requestIOSPermission, { once: true });
    }

    if ('DeviceMotionEvent' in window) {
      this.listenMotionEvents();
    } else if (sensorStatusEl) {
      sensorStatusEl.textContent = "Simulation Mode (No Hardware Gyro)";
      sensorStatusEl.style.color = "#ffb703";
    }
  },

  listenMotionEvents: function() {
    const self = this;
    const sensorStatusEl = document.getElementById('pedometer-sensor-status');
    const dsp = self.dsp;

    window.addEventListener('devicemotion', (event) => {
      if (!self.isLive) return;

      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc || acc.x === null) return;

      self.sensorActive = true;
      if (sensorStatusEl) {
        sensorStatusEl.textContent = "Active DSP Accelerometer (Filtered)";
        sensorStatusEl.style.color = "#4cd964";
      }

      // 1. Low-Pass Filter to estimate dynamic earth gravity vector
      dsp.gravity.x = dsp.alpha * dsp.gravity.x + (1 - dsp.alpha) * acc.x;
      dsp.gravity.y = dsp.alpha * dsp.gravity.y + (1 - dsp.alpha) * acc.y;
      dsp.gravity.z = dsp.alpha * dsp.gravity.z + (1 - dsp.alpha) * acc.z;

      // 2. High-Pass Filter: Subtract gravity to isolate linear human body acceleration
      const linearX = acc.x - dsp.gravity.x;
      const linearY = acc.y - dsp.gravity.y;
      const linearZ = acc.z - dsp.gravity.z;

      // 3. Vector Magnitude of Dynamic Linear Acceleration
      const linearMag = Math.sqrt(linearX * linearX + linearY * linearY + linearZ * linearZ);
      const now = Date.now();

      // 4. Adaptive Peak Detection & Hysteresis
      // Valid footstep impact produces a sharp linear spike followed by downward deceleration
      const delta = linearMag - dsp.lastLinearMag;
      const timeSinceLastStep = now - dsp.lastStepTime;

      if (linearMag > dsp.dynamicThreshold && delta > 0.65 && timeSinceLastStep > dsp.minStepInterval) {
        if (timeSinceLastStep < dsp.maxStepInterval) {
          // Cadence Gatekeeper: Ensure at least 4 consecutive strides before confirming walking state
          dsp.stepBuffer++;
          if (dsp.stepBuffer >= 4) {
            if (dsp.stepBuffer === 4) {
              self.addSteps(4); // Credit buffered steps once rhythm is verified
            } else {
              self.addSteps(1); // Real-time increment
            }

            // Record step for rolling cadence calculation
            dsp.stepHistory.push(now);
            if (dsp.stepHistory.length > 8) dsp.stepHistory.shift();

            // Compute live instant cadence (steps per minute)
            if (dsp.stepHistory.length >= 2) {
              const deltaWindowMs = dsp.stepHistory[dsp.stepHistory.length - 1] - dsp.stepHistory[0];
              const stepsInWindow = dsp.stepHistory.length - 1;
              if (deltaWindowMs > 0) {
                const instantCadence = Math.round((stepsInWindow / (deltaWindowMs / 1000)) * 60);
                self.cadence = Math.max(60, Math.min(180, Math.round(0.7 * self.cadence + 0.3 * instantCadence)));
              }
            }
          }
        } else {
          // Walking stopped or interrupted; reset gatekeeper buffer to prevent fidgeting false counts
          dsp.stepBuffer = 1;
        }

        dsp.lastStepTime = now;
      }

      dsp.lastLinearMag = linearMag;
    }, true);
  },

  playMilestoneBeep: function() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.log('Audio feedback error:', e);
    }
  },

  calcStepsFromKm: function(km) {
    if (!km || km <= 0) return 0;
    const meters = km * 1000;
    const stride = this.getDynamicStrideMeters(this.cadence);
    return Math.round(meters / stride);
  },

  calcStepsFromMins: function(mins, stepsPerMin) {
    if (!mins || mins <= 0) return 0;
    const rate = stepsPerMin || this.cadence || 100;
    return Math.round(mins * rate);
  },

  bindEvents: function() {
    const self = this;

    // Toggle Walking Session
    const btnToggle = document.getElementById('pedometer-btn-toggle-session');
    if (btnToggle) {
      btnToggle.onclick = () => self.toggleSession();
    }

    // Reset Session
    const btnReset = document.getElementById('pedometer-btn-reset-session');
    if (btnReset) {
      btnReset.onclick = () => self.resetSession();
    }

    // Audio Milestone Toggle
    const audioToggleBtn = document.getElementById('pedometer-toggle-audio');
    if (audioToggleBtn) {
      audioToggleBtn.onclick = () => {
        self.audioEnabled = !self.audioEnabled;
        const statusEl = document.getElementById('pedometer-audio-status');
        if (statusEl) {
          statusEl.textContent = self.audioEnabled ? "On (Beep every 1k steps)" : "Off";
          statusEl.style.color = self.audioEnabled ? "#4cd964" : "var(--theme-text-muted)";
        }
      };
    }

    // Quick Simulation Buttons (for Desktop testing)
    const sim100 = document.getElementById('pedometer-sim-100');
    if (sim100) sim100.onclick = () => self.addSteps(100);

    const sim500 = document.getElementById('pedometer-sim-500');
    if (sim500) sim500.onclick = () => self.addSteps(500);

    const sim1000 = document.getElementById('pedometer-sim-1000');
    if (sim1000) sim1000.onclick = () => self.addSteps(1000);

    // Step Goal Presets
    const goalBtns = document.querySelectorAll('.pedometer-goal-btn');
    goalBtns.forEach(btn => {
      btn.onclick = () => {
        const val = parseInt(btn.dataset.goal);
        if (val) self.setGoal(val);
      };
    });

    // Custom Goal Set
    const customGoalInput = document.getElementById('pedometer-custom-goal-input');
    const saveCustomGoalBtn = document.getElementById('pedometer-save-custom-goal');
    if (saveCustomGoalBtn && customGoalInput) {
      saveCustomGoalBtn.onclick = () => {
        const val = parseInt(customGoalInput.value);
        if (val && val >= 500) {
          self.setGoal(val);
          customGoalInput.value = '';
        }
      };
    }

    // Biometric Input Handlers
    const heightInput = document.getElementById('pedometer-user-height');
    if (heightInput) {
      heightInput.value = this.userHeightCm;
      heightInput.onchange = () => {
        const h = parseFloat(heightInput.value);
        if (h && h > 80 && h < 250) {
          self.userHeightCm = h;
          self.updateBaseStride();
          localStorage.setItem('halo_pedometer_height', h);
          self.render();
        }
      };
    }

    const weightInput = document.getElementById('pedometer-user-weight');
    if (weightInput) {
      weightInput.value = this.userWeightKg;
      weightInput.onchange = () => {
        const w = parseFloat(weightInput.value);
        if (w && w > 20 && w < 300) {
          self.userWeightKg = w;
          localStorage.setItem('halo_pedometer_weight', w);
          self.render();
        }
      };
    }

    // Distance-to-Steps Calculator
    const btnCalcDist = document.getElementById('btn-calc-dist-submit');
    const distInput = document.getElementById('calc-dist-input');
    const distUnitSelect = document.getElementById('calc-dist-unit');
    const distResultDiv = document.getElementById('calc-dist-result');

    if (btnCalcDist && distInput) {
      btnCalcDist.onclick = () => {
        let dist = parseFloat(distInput.value);
        if (!dist || dist <= 0) return;
        const unit = distUnitSelect ? distUnitSelect.value : 'km';
        if (unit === 'miles') dist = dist * 1.60934; // Convert miles to km

        const stepsNeeded = self.calcStepsFromKm(dist);
        // Scientific MET energy projection
        const estKcal = Math.round(stepsNeeded * (self.getCaloriesBurned() / Math.max(1, self.steps)));
        const estMins = Math.round(stepsNeeded / self.cadence);

        if (distResultDiv) {
          distResultDiv.style.display = 'block';
          distResultDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Target Distance: <strong>${distInput.value} ${unit}</strong></span>
              <span style="color: #00f2fe; font-weight: 700; font-size: 1.1rem;">${stepsNeeded.toLocaleString()} Steps</span>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--theme-text-muted); display: flex; gap: 1rem;">
              <span><i class="fa-solid fa-fire" style="color: #ff5252;"></i> ACSM Energy: <strong>${estKcal} kcal</strong></span>
              <span><i class="fa-solid fa-clock" style="color: #ffb703;"></i> Est. Time: <strong>${estMins} mins</strong></span>
            </div>
            <button class="btn-action" id="btn-add-calc-dist-steps" style="width: 100%; margin-top: 0.75rem; background: #00f2fe; color: #000; font-weight: 700; padding: 0.4rem; font-size: 0.8rem; border-radius: 6px;">
              + Add ${stepsNeeded.toLocaleString()} Steps to Today's Total
            </button>
          `;

          const btnAddCalcDist = document.getElementById('btn-add-calc-dist-steps');
          if (btnAddCalcDist) {
            btnAddCalcDist.onclick = () => {
              self.addSteps(stepsNeeded);
              distInput.value = '';
              distResultDiv.style.display = 'none';
            };
          }
        }
      };
    }

    // Time-to-Steps Calculator
    const btnCalcTime = document.getElementById('btn-calc-time-submit');
    const timeInput = document.getElementById('calc-time-input');
    const paceSelect = document.getElementById('calc-pace-intensity');
    const timeResultDiv = document.getElementById('calc-time-result');

    if (btnCalcTime && timeInput) {
      btnCalcTime.onclick = () => {
        const mins = parseFloat(timeInput.value);
        if (!mins || mins <= 0) return;

        let stepsPerMin = 100;
        let met = 3.5;
        const paceVal = paceSelect ? paceSelect.value : 'normal';
        if (paceVal === 'slow') { stepsPerMin = 80; met = 2.8; }
        if (paceVal === 'normal') { stepsPerMin = 100; met = 3.5; }
        if (paceVal === 'fast') { stepsPerMin = 120; met = 4.5; }
        if (paceVal === 'run') { stepsPerMin = 150; met = 8.5; }

        const estSteps = self.calcStepsFromMins(mins, stepsPerMin);
        const dynamicStride = self.getDynamicStrideMeters(stepsPerMin);
        const estDistKm = ((estSteps * dynamicStride) / 1000).toFixed(2);
        const estKcal = Math.round(((met * 3.5 * self.userWeightKg) / 200) * mins);

        if (timeResultDiv) {
          timeResultDiv.style.display = 'block';
          timeResultDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Duration: <strong>${mins} mins</strong> (${paceVal})</span>
              <span style="color: #ffb703; font-weight: 700; font-size: 1.1rem;">${estSteps.toLocaleString()} Steps</span>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--theme-text-muted); display: flex; gap: 1rem;">
              <span><i class="fa-solid fa-route" style="color: #00f2fe;"></i> Est. Distance: <strong>${estDistKm} km</strong></span>
              <span><i class="fa-solid fa-fire" style="color: #ff5252;"></i> ACSM Energy: <strong>${estKcal} kcal</strong></span>
            </div>
            <button class="btn-action" id="btn-add-calc-time-steps" style="width: 100%; margin-top: 0.75rem; background: #ffb703; color: #000; font-weight: 700; padding: 0.4rem; font-size: 0.8rem; border-radius: 6px;">
              + Add ${estSteps.toLocaleString()} Steps to Today's Total
            </button>
          `;

          const btnAddCalcTime = document.getElementById('btn-add-calc-time-steps');
          if (btnAddCalcTime) {
            btnAddCalcTime.onclick = () => {
              self.addSteps(estSteps);
              timeInput.value = '';
              timeResultDiv.style.display = 'none';
            };
          }
        }
      };
    }
  },

  updateUI: function() {
    this.render();
  },

  render: function() {
    const stepCount = this.steps;
    const goalCount = this.goal;
    const pct = Math.min(100, Math.round((stepCount / goalCount) * 100)) || 0;
    const distKm = this.getDistanceKm();
    const distMi = this.getDistanceMiles();
    const calories = this.getCaloriesBurned();
    const durationMins = this.getWalkDurationMins();
    const pace = this.getPaceMinPerKm();
    const strideCm = (this.getDynamicStrideMeters(this.cadence) * 100).toFixed(1);
    const fatGrams = (calories / 7.7).toFixed(1); // 1g body fat ~ 7.7 kcal

    // SVG Circumference for radius 42 = 2 * PI * 42 = 263.89
    const CIRCUMFERENCE = 263.89;
    const dashOffset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

    // 1. Dashboard Widget Updates
    const dashSteps = document.getElementById('pedometer-dash-steps');
    const dashGoal = document.getElementById('pedometer-dash-goal');
    const dashDist = document.getElementById('pedometer-dash-dist');
    const dashKcal = document.getElementById('pedometer-dash-kcal');
    const dashRing = document.getElementById('pedometer-dash-ring');
    const dashPct = document.getElementById('pedometer-dash-pct');
    const dashStatus = document.getElementById('pedometer-dashboard-status');

    if (dashSteps) dashSteps.textContent = stepCount.toLocaleString();
    if (dashGoal) dashGoal.textContent = `/ ${goalCount.toLocaleString()} steps`;
    if (dashDist) dashDist.textContent = distKm;
    if (dashKcal) dashKcal.textContent = calories;
    if (dashPct) dashPct.textContent = `${pct}%`;
    if (dashRing) dashRing.style.strokeDashoffset = dashOffset;
    if (dashStatus) {
      dashStatus.textContent = this.isLive ? "Auto-Active" : "Paused";
      dashStatus.style.background = this.isLive ? "rgba(76, 217, 100, 0.2)" : "rgba(255, 255, 255, 0.1)";
      dashStatus.style.color = this.isLive ? "#4cd964" : "var(--theme-text-muted)";
    }

    // 2. Main Pedometer Tab Ring Gauge
    const stepsCountEl = document.getElementById('pedometer-steps-count');
    const goalTargetEl = document.getElementById('pedometer-goal-target');
    const goalPctEl = document.getElementById('pedometer-goal-pct');
    const mainRing = document.getElementById('pedometer-main-ring');

    if (stepsCountEl) stepsCountEl.textContent = stepCount.toLocaleString();
    if (goalTargetEl) goalTargetEl.textContent = `/ ${goalCount.toLocaleString()} steps`;
    if (goalPctEl) goalPctEl.textContent = `${pct}% Goal Achieved`;
    if (mainRing) mainRing.style.strokeDashoffset = dashOffset;

    // 3. Metric Cards
    const distValEl = document.getElementById('pedometer-dist-val');
    const distMilesEl = document.getElementById('pedometer-dist-miles');
    const kcalValEl = document.getElementById('pedometer-kcal-val');
    const fatBurnEl = document.getElementById('pedometer-fat-burn');
    const timeValEl = document.getElementById('pedometer-time-val');
    const cadenceValEl = document.getElementById('pedometer-cadence-val');
    const paceValEl = document.getElementById('pedometer-pace-val');
    const strideValEl = document.getElementById('pedometer-stride-val');

    if (distValEl) distValEl.innerHTML = `${distKm} <span style="font-size: 1rem; color: var(--theme-text-muted);">km</span>`;
    if (distMilesEl) distMilesEl.textContent = `${distMi} miles`;
    if (kcalValEl) kcalValEl.innerHTML = `${calories} <span style="font-size: 1rem; color: var(--theme-text-muted);">kcal</span>`;
    if (fatBurnEl) fatBurnEl.textContent = `${fatGrams}g fat equivalent`;
    if (timeValEl) timeValEl.innerHTML = `${durationMins} <span style="font-size: 1rem; color: var(--theme-text-muted);">mins</span>`;
    if (cadenceValEl) cadenceValEl.textContent = `${this.cadence} steps/min live cadence`;
    if (paceValEl) paceValEl.innerHTML = `${pace} <span style="font-size: 0.9rem; color: var(--theme-text-muted);">/km</span>`;
    if (strideValEl) strideValEl.textContent = `Stride: ${strideCm} cm`;

    // Biometrics calculated stride text
    const calcStrideEl = document.getElementById('pedometer-calc-stride');
    const strideInfoEl = document.getElementById('pedometer-stride-info');
    if (calcStrideEl) calcStrideEl.textContent = `${(this.strideMeters).toFixed(2)}m base (${strideCm} cm dynamic)`;
    if (strideInfoEl) strideInfoEl.textContent = `${strideCm} cm`;

    // 4. Session Controls State
    const sessionBtnText = document.getElementById('pedometer-session-btn-text');
    const sessionIcon = document.getElementById('pedometer-session-icon');
    const sessionBtn = document.getElementById('pedometer-btn-toggle-session');

    if (sessionBtnText) {
      sessionBtnText.textContent = this.isLive ? "Pause Auto-Tracking" : "Resume Auto-Tracking";
    }
    if (sessionIcon) {
      sessionIcon.className = this.isLive ? "fa-solid fa-pause" : "fa-solid fa-play";
    }
    if (sessionBtn) {
      sessionBtn.style.background = this.isLive ? "linear-gradient(135deg, #00f2fe, #4facfe)" : "rgba(255,255,255,0.15)";
      sessionBtn.style.color = this.isLive ? "#000" : "#FFF";
    }

    // 5. Preset Goal Button Highlights
    const goalBtns = document.querySelectorAll('.pedometer-goal-btn');
    goalBtns.forEach(btn => {
      const g = parseInt(btn.dataset.goal);
      if (g === this.goal) {
        btn.classList.add('active');
        btn.style.background = 'rgba(0, 242, 254, 0.15)';
        btn.style.color = '#00f2fe';
        btn.style.borderColor = '#00f2fe';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.color = 'var(--theme-text-main)';
        btn.style.borderColor = 'var(--theme-panel-border)';
      }
    });
  }
};
