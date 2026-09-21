window.Tracker = {
  logs: [],
  profile: null,
  activeRange: 'weekly', // 'weekly', 'monthly', 'yearly'
  activeMetric: 'calories', // 'calories', 'weight'

  init: function(profile, logs) {
    this.profile = profile;
    this.logs = logs;
    this.renderMetrics();
    this.renderCharts();
    this.bindEvents();
  },

  updateData: function(profile, logs) {
    this.profile = profile;
    this.logs = logs;
    this.renderMetrics();
    this.renderCharts();
  },

  renderMetrics: function() {
    if (!this.profile) return;
    
    // Get today's log or default empty
    const _now = new Date();
    const todayStr = new Date(_now.getTime() - (_now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const todayLog = this.logs.find(l => l.date === todayStr) || {
      calories_consumed: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
      water_ml: 0,
      workout_duration_mins: 0,
      workout_completed: 0,
      user_weight: this.profile.weight,
      magnesium_mg: 0,
      zinc_mg: 0,
      vitamin_d_iu: 0,
      potassium_mg: 0,
      omega3_g: 0.0,
      calcium_mg: 0,
      iron_mg: 0
    };

    // Update daily calorie widgets
    const calorieTarget = this.profile.daily_calorie_target;
    const caloriesEaten = todayLog.calories_consumed;
    const calPercent = Math.min(100, Math.round((caloriesEaten / calorieTarget) * 100)) || 0;
    
    document.getElementById('cal-progress-bar').style.width = `${calPercent}%`;
    document.getElementById('cal-value').textContent = `${caloriesEaten} / ${calorieTarget} kcal`;
    document.getElementById('cal-percent-text').textContent = `${calPercent}%`;

    // Update macros
    const updateMacro = (id, current, target, label) => {
      const pct = Math.min(100, Math.round((current / target) * 100)) || 0;
      document.getElementById(`${id}-bar`).style.width = `${pct}%`;
      document.getElementById(`${id}-text`).textContent = `${current}g / ${target}g (${label})`;
    };
    updateMacro('protein', todayLog.protein_g, this.profile.protein_target, 'Protein');
    updateMacro('carbs', todayLog.carbs_g, this.profile.carbs_target, 'Carbs');
    updateMacro('fats', todayLog.fats_g, this.profile.fats_target, 'Fats');

    // Update Caloric Energy Distribution Ratio (% Carbs, % Protein, % Fats)
    const pGrams = todayLog.protein_g || 0;
    const cGrams = todayLog.carbs_g || 0;
    const fGrams = todayLog.fats_g || 0;

    const pKcal = pGrams * 4;
    const cKcal = cGrams * 4;
    const fKcal = fGrams * 9;
    const totalMacroKcal = pKcal + cKcal + fKcal;

    let cPct = 33.3, pPct = 33.3, fPct = 33.3;
    if (totalMacroKcal > 0) {
      cPct = Math.round((cKcal / totalMacroKcal) * 100);
      pPct = Math.round((pKcal / totalMacroKcal) * 100);
      fPct = 100 - cPct - pPct;
      if (fPct < 0) fPct = 0;
    }

    const ratioBarC = document.getElementById('macro-ratio-carbs');
    const ratioBarP = document.getElementById('macro-ratio-protein');
    const ratioBarF = document.getElementById('macro-ratio-fats');
    const ratioText = document.getElementById('macro-ratio-text');

    if (ratioBarC && ratioBarP && ratioBarF && ratioText) {
      ratioBarC.style.width = `${cPct}%`;
      ratioBarP.style.width = `${pPct}%`;
      ratioBarF.style.width = `${fPct}%`;
      ratioText.textContent = `${cPct}% C | ${pPct}% P | ${fPct}% F`;
    }

    // Update Dietary Fiber
    const fiberVal = todayLog.fiber_g || 0.0;
    const fiberBar = document.getElementById('fiber-bar');
    const fiberText = document.getElementById('fiber-text');
    if (fiberBar && fiberText) {
      const fiberPct = Math.min(100, Math.round((fiberVal / 30.0) * 100));
      fiberBar.style.width = `${fiberPct}%`;
      fiberText.textContent = `${fiberVal.toFixed(1)}g / 30.0g`;
    }

    // Update water
    const waterTarget = this.profile.water_target;
    const waterDrank = todayLog.water_ml;
    const waterPercent = Math.min(100, Math.round((waterDrank / waterTarget) * 100)) || 0;
    document.getElementById('water-bar').style.width = `${waterPercent}%`;
    document.getElementById('water-text').textContent = `${(waterDrank/1000).toFixed(1)}L / ${(waterTarget/1000).toFixed(1)}L`;

    // Update daily micro-nutrients & status badges
    const updateMicro = (id, current, target, unit) => {
      const pct = Math.min(100, Math.round((current / target) * 100)) || 0;
      const barEl = document.getElementById(`micro-${id}-bar`);
      const textEl = document.getElementById(`micro-${id}-text`);
      const statusEl = document.getElementById(`micro-${id}-status`);

      if (barEl) barEl.style.width = `${pct}%`;
      if (textEl) textEl.textContent = `${current}${unit} / ${target}${unit}`;

      if (statusEl) {
        let statusText = "Deficient";
        let statusStyle = "background: rgba(255, 77, 77, 0.2); color: #ff4d4d;";
        if (pct >= 100) {
          statusText = "Sufficient";
          statusStyle = "background: rgba(247, 127, 0, 0.2); color: #f77f00;";
        } else if (pct >= 70) {
          statusText = "Optimal";
          statusStyle = "background: rgba(10, 240, 190, 0.2); color: #0af0be;";
        } else if (pct >= 35) {
          statusText = "Low";
          statusStyle = "background: rgba(255, 183, 3, 0.2); color: #ffb703;";
        }
        statusEl.textContent = statusText;
        statusEl.style.cssText = `font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 4px; ${statusStyle}`;
      }
    };
    updateMicro('magnesium', todayLog.magnesium_mg || 0, 400, 'mg');
    updateMicro('zinc', todayLog.zinc_mg || 0, 15, 'mg');
    updateMicro('vitd', todayLog.vitamin_d_iu || 0, 2000, ' IU');
    updateMicro('potassium', todayLog.potassium_mg || 0, 3500, 'mg');
    updateMicro('omega3', todayLog.omega3_g || 0.0, 2.0, 'g');
    updateMicro('calcium', todayLog.calcium_mg || 0, 1000, 'mg');
    updateMicro('iron', todayLog.iron_mg || 0, 12, 'mg');

    // Update Workout Info (Only status badge, duration/style come from the plan in app.js)
    if (todayLog.workout_completed) {
      document.getElementById('workout-status-badge').textContent = 'Completed';
      document.getElementById('workout-status-badge').className = 'badge success';
    } else {
      document.getElementById('workout-status-badge').textContent = 'Pending';
      document.getElementById('workout-status-badge').className = 'badge warning';
    }

    // Populate log dialog default values
    document.getElementById('log-calories').value = todayLog.calories_consumed || '';
    document.getElementById('log-protein').value = todayLog.protein_g || '';
    document.getElementById('log-carbs').value = todayLog.carbs_g || '';
    document.getElementById('log-fats').value = todayLog.fats_g || '';
    document.getElementById('log-water').value = todayLog.water_ml || '';
    document.getElementById('log-duration').value = todayLog.workout_duration_mins || '';
    document.getElementById('log-workout-completed').checked = !!todayLog.workout_completed;
    document.getElementById('log-workout-style').value = todayLog.workout_style || '';
    document.getElementById('log-notes').value = todayLog.notes || '';
    document.getElementById('log-weight').value = todayLog.user_weight || '';
  },

  renderCharts: function() {
    const canvas = document.getElementById('analytics-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Resize canvas for high resolution displays
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.width <= 0 || rect.height <= 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Retrieve filtered data based on active range
    const filteredData = this.getFilteredData(this.activeRange);

    if (filteredData.length === 0) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px Outfit';
      ctx.fillText('No data available for this range', width / 2 - 100, height / 2);
      return;
    }

    // Determine colors based on active track
    const isEnhanced = this.profile && this.profile.track === 'enhanced';
    const primaryColor = isEnhanced ? '#ff007f' : '#66fcf1';
    const secondaryColor = '#ffb703';

    // Draw background grid lines
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;
    
    const chartWidth = Math.max(10, width - paddingLeft - paddingRight);
    const chartHeight = Math.max(10, height - paddingTop - paddingBottom);

    // Find min/max values for scaling
    const values = filteredData.map(d => this.activeMetric === 'calories' ? d.val : d.weight);
    const rawMax = Math.max(...values, 100);
    const maxVal = rawMax * 1.1; // 10% ceiling
    const minVal = this.activeMetric === 'weight' ? Math.max(0, Math.min(...values) * 0.95) : 0; // scale weight closely
    const rangeVal = (maxVal - minVal) || 1;

    // Draw Y-axis grid & labels
    const gridCount = 4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '10px Outfit';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridCount; i++) {
      const y = paddingTop + chartHeight - (i / gridCount) * chartHeight;
      const gridVal = minVal + (i / gridCount) * rangeVal;
      
      // Draw grid line
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Draw label
      ctx.fillText(Math.round(gridVal), paddingLeft - 10, y);
    }

    // Draw X-axis labels and points
    const pointCount = filteredData.length;
    const xStep = pointCount > 1 ? chartWidth / (pointCount - 1) : chartWidth;
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const points = [];
    filteredData.forEach((d, idx) => {
      const x = paddingLeft + idx * xStep;
      const val = this.activeMetric === 'calories' ? d.val : d.weight;
      const y = paddingTop + chartHeight - ((val - minVal) / rangeVal) * chartHeight;
      points.push({ x, y, label: d.label, val });

      // Draw X label (skip labels on monthly/yearly to prevent crowding)
      const labelInterval = Math.max(1, Math.round(pointCount / 7));
      if (idx % labelInterval === 0 || idx === pointCount - 1) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText(d.label, x, paddingTop + chartHeight + 10);
      }
    });

    // Draw lines/bars
    if (this.activeRange === 'weekly' && this.activeMetric === 'calories') {
      // Draw Bar Chart for Weekly Calories
      filteredData.forEach((d, idx) => {
        const x = paddingLeft + idx * xStep;
        const val = d.val;
        const y = paddingTop + chartHeight - ((val - minVal) / rangeVal) * chartHeight;
        const barWidth = Math.min(25, xStep * 0.6);
        
        // Gradient fill for bar
        const gradientY = isFinite(y) ? y : paddingTop;
        const gradient = ctx.createLinearGradient(0, gradientY, 0, paddingTop + chartHeight);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x - barWidth / 2, gradientY, barWidth, paddingTop + chartHeight - gradientY, [4, 4, 0, 0]);
        ctx.fill();
      });
    } else {
      // Draw Line Chart for Monthly/Yearly trends and weight
      // Draw smooth line
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      points.forEach((p, idx) => {
        if (idx === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          // Cubic Bezier curve for smoothness
          const cpX1 = points[idx - 1].x + xStep / 2;
          const cpY1 = points[idx - 1].y;
          const cpX2 = p.x - xStep / 2;
          const cpY2 = p.y;
          ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, p.x, p.y);
        }
      });
      ctx.stroke();

      // Create glowing fill under the line
      const fillGradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
      fillGradient.addColorStop(0, `${primaryColor}40`); // 25% opacity
      fillGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = fillGradient;
      ctx.beginPath();
      ctx.moveTo(points[0].x, paddingTop + chartHeight);
      points.forEach((p, idx) => {
        if (idx === 0) {
          ctx.lineTo(p.x, p.y);
        } else {
          const cpX1 = points[idx - 1].x + xStep / 2;
          const cpY1 = points[idx - 1].y;
          const cpX2 = p.x - xStep / 2;
          const cpY2 = p.y;
          ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, p.x, p.y);
        }
      });
      ctx.lineTo(points[points.length - 1].x, paddingTop + chartHeight);
      ctx.closePath();
      ctx.fill();

      // Draw circles on nodes
      points.forEach((p) => {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      });
    }
  },

  getFilteredData: function(range) {
    const today = new Date();
    let limitDays = 7;
    if (range === 'monthly') limitDays = 30;
    if (range === 'yearly') limitDays = 365;

    // Filter logs to time range
    const cutoffDate = new Date();
    cutoffDate.setDate(today.getDate() - limitDays);

    const sortedLogs = [...this.logs].sort((a,b) => new Date(a.date) - new Date(b.date));
    const rangeLogs = sortedLogs.filter(l => new Date(l.date) >= cutoffDate);

    if (range === 'weekly') {
      // Return last 7 days directly
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const log = rangeLogs.find(l => l.date === dStr) || { calories_consumed: 0, user_weight: this.profile.weight };
        
        // Label like 'Mon', 'Tue'
        const label = d.toLocaleDateString('en-US', { weekday: 'short' });
        result.push({
          label: label,
          val: log.calories_consumed,
          weight: log.user_weight
        });
      }
      return result;
    } else if (range === 'monthly') {
      // Group by pairs of days or return all 30 days sampled to prevent crowd
      return rangeLogs.map(l => {
        const d = new Date(l.date);
        return {
          label: `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`,
          val: l.calories_consumed,
          weight: l.user_weight
        };
      });
    } else if (range === 'yearly') {
      // Group by Month/Year
      const months = {};
      rangeLogs.forEach(l => {
        const d = new Date(l.date);
        const mKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (!months[mKey]) {
          months[mKey] = { sumCal: 0, sumWeight: 0, count: 0, label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) };
        }
        months[mKey].sumCal += l.calories_consumed;
        months[mKey].sumWeight += l.user_weight || this.profile.weight;
        months[mKey].count += 1;
      });

      return Object.values(months).map(m => ({
        label: m.label,
        val: Math.round(m.sumCal / m.count),
        weight: parseFloat((m.sumWeight / m.count).toFixed(2))
      }));
    }

    return [];
  },

  bindEvents: function() {
    const rangeButtons = document.querySelectorAll('.range-btn');
    rangeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        rangeButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeRange = e.target.dataset.range;
        this.renderCharts();
      });
    });

    const metricButtons = document.querySelectorAll('.metric-btn');
    metricButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        metricButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeMetric = e.target.dataset.metric;
        this.renderCharts();
      });
    });
  }
};
