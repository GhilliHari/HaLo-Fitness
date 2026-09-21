window.MuscleMap = {
  render: function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // SVG markup with inline style definitions for a premium look
    const svgHTML = `
      <svg id="muscle-svg" viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <!-- Definitions for glowing filters -->
        <defs>
          <filter id="glow-primary-nat" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-secondary" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <style>
          .muscle-group {
            fill: rgba(255, 255, 255, 0.04);
            stroke: rgba(255, 255, 255, 0.15);
            stroke-width: 1.5;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
          }
          .muscle-group:hover {
            fill: rgba(255, 255, 255, 0.12);
            stroke: rgba(255, 255, 255, 0.3);
          }
          .body-outline {
            fill: none;
            stroke: rgba(255, 255, 255, 0.06);
            stroke-width: 1;
            stroke-dasharray: 4 2;
          }
          .label {
            fill: rgba(255, 255, 255, 0.4);
            font-family: 'Outfit', sans-serif;
            font-size: 10px;
            font-weight: 500;
            text-anchor: middle;
          }
          
          /* Active Classes for Track-Specific Colors */
          /* Natural Track (Cyan/Emerald) */
          .track-natural .active-primary {
            fill: rgba(10, 240, 190, 0.4) !important;
            stroke: rgb(10, 240, 190) !important;
            filter: url(#glow-primary-nat);
          }
          .track-natural .active-secondary {
            fill: rgba(255, 183, 3, 0.3) !important;
            stroke: rgb(255, 183, 3) !important;
            filter: url(#glow-secondary);
          }

          /* Enhanced Track (Magenta/Pink & Amber) */
          .track-enhanced .active-primary {
            fill: rgba(255, 0, 127, 0.4) !important;
            stroke: rgb(255, 0, 127) !important;
            filter: url(#glow-primary-nat);
          }
          .track-enhanced .active-secondary {
            fill: rgba(255, 183, 3, 0.3) !important;
            stroke: rgb(255, 183, 3) !important;
            filter: url(#glow-secondary);
          }
        </style>

        <!-- FRONT VIEW (Center X = 100) -->
        <g id="front-body" class="body-view">
          <text x="100" y="25" class="label">FRONT</text>
          
          <!-- Outer Reference Guides -->
          <circle cx="100" cy="150" r="135" class="body-outline" />
          <line x1="100" y1="20" x2="100" y2="280" class="body-outline" />

          <!-- Head & Neck -->
          <circle cx="100" cy="45" r="14" class="muscle-group" style="fill: rgba(255,255,255,0.01)" />
          <path d="M94 58 L106 58 L104 68 L96 68 Z" class="muscle-group" style="fill: rgba(255,255,255,0.01)" />

          <!-- Chest -->
          <g id="muscle-group-chest" class="muscle-group-wrapper">
            <!-- Left Chest -->
            <path d="M100 68 L76 74 L73 98 L100 96 Z" class="muscle-group chest" data-muscle="chest" />
            <!-- Right Chest -->
            <path d="M100 68 L124 74 L127 98 L100 96 Z" class="muscle-group chest" data-muscle="chest" />
          </g>

          <!-- Shoulders (Front Delts) -->
          <g id="muscle-group-shoulders-front" class="muscle-group-wrapper">
            <path d="M76 74 L62 82 L65 98 L73 88 Z" class="muscle-group shoulders" data-muscle="shoulders" />
            <path d="M124 74 L138 82 L135 98 L127 88 Z" class="muscle-group shoulders" data-muscle="shoulders" />
          </g>

          <!-- Biceps -->
          <g id="muscle-group-biceps" class="muscle-group-wrapper">
            <rect x="55" y="98" width="12" height="28" rx="6" class="muscle-group biceps" data-muscle="biceps" />
            <rect x="133" y="98" width="12" height="28" rx="6" class="muscle-group biceps" data-muscle="biceps" />
          </g>

          <!-- Abs (Core) -->
          <g id="muscle-group-abs" class="muscle-group-wrapper">
            <path d="M78 100 L122 100 L120 152 L80 152 Z" class="muscle-group abs" data-muscle="abs" />
          </g>

          <!-- Legs (Quads) -->
          <g id="muscle-group-legs-front" class="muscle-group-wrapper">
            <!-- Left Quad -->
            <path d="M80 154 L98 154 L96 215 L78 215 Z" class="muscle-group legs" data-muscle="legs" />
            <!-- Right Quad -->
            <path d="M102 154 L120 154 L122 215 L104 215 Z" class="muscle-group legs" data-muscle="legs" />
          </g>

          <!-- Calves (Front) -->
          <g id="muscle-group-calves-front" class="muscle-group-wrapper">
            <rect x="80" y="220" width="14" height="45" rx="5" class="muscle-group calves" data-muscle="calves" />
            <rect x="106" y="220" width="14" height="45" rx="5" class="muscle-group calves" data-muscle="calves" />
          </g>
        </g>

        <!-- BACK VIEW (Center X = 300) -->
        <g id="back-body" class="body-view">
          <text x="300" y="25" class="label">BACK</text>
          
          <!-- Outer Reference Guides -->
          <circle cx="300" cy="150" r="135" class="body-outline" />
          <line x1="300" y1="20" x2="300" y2="280" class="body-outline" />

          <!-- Head & Neck -->
          <circle cx="300" cy="45" r="14" class="muscle-group" style="fill: rgba(255,255,255,0.01)" />
          <path d="M294 58 L306 58 L304 68 L296 68 Z" class="muscle-group" style="fill: rgba(255,255,255,0.01)" />

          <!-- Back (Upper & Lats) -->
          <g id="muscle-group-back" class="muscle-group-wrapper">
            <!-- Traps & Upper Back -->
            <path d="M300 68 L280 74 L275 105 L300 115 Z" class="muscle-group back" data-muscle="back" />
            <path d="M300 68 L320 74 L325 105 L300 115 Z" class="muscle-group back" data-muscle="back" />
            <!-- Lats -->
            <path d="M275 105 L300 115 L300 152 L280 148 Z" class="muscle-group back" data-muscle="back" />
            <path d="M325 105 L300 115 L300 152 L320 148 Z" class="muscle-group back" data-muscle="back" />
          </g>

          <!-- Shoulders (Rear Delts) -->
          <g id="muscle-group-shoulders-back" class="muscle-group-wrapper">
            <path d="M278 74 L264 82 L266 98 L275 88 Z" class="muscle-group shoulders" data-muscle="shoulders" />
            <path d="M322 74 L336 82 L334 98 L325 88 Z" class="muscle-group shoulders" data-muscle="shoulders" />
          </g>

          <!-- Triceps -->
          <g id="muscle-group-triceps" class="muscle-group-wrapper">
            <rect x="254" y="98" width="12" height="28" rx="6" class="muscle-group triceps" data-muscle="triceps" />
            <rect x="334" y="98" width="12" height="28" rx="6" class="muscle-group triceps" data-muscle="triceps" />
          </g>

          <!-- Glutes (Gluteus Maximus) -->
          <g id="muscle-group-glutes" class="muscle-group-wrapper">
            <path d="M278 152 L322 152 L320 180 L300 182 L280 180 Z" class="muscle-group glutes" data-muscle="glutes" />
          </g>

          <!-- Hamstrings (Legs Back) -->
          <g id="muscle-group-legs-back" class="muscle-group-wrapper">
            <!-- Left Hamstring -->
            <path d="M280 182 L298 184 L296 225 L278 223 Z" class="muscle-group legs" data-muscle="legs" />
            <!-- Right Hamstring -->
            <path d="M302 184 L320 182 L322 223 L304 225 Z" class="muscle-group legs" data-muscle="legs" />
          </g>

          <!-- Calves (Back) -->
          <g id="muscle-group-calves-back" class="muscle-group-wrapper">
            <rect x="278" y="228" width="14" height="42" rx="5" class="muscle-group calves" data-muscle="calves" />
            <rect x="308" y="228" width="14" height="42" rx="5" class="muscle-group calves" data-muscle="calves" />
          </g>
        </g>
      </svg>
    `;

    container.innerHTML = svgHTML;
  },

  highlight: function(primaryMuscles, secondaryMuscles) {
    this.clear();
    
    const svg = document.getElementById('muscle-svg');
    if (!svg) return;

    // Highlight primary muscles
    if (primaryMuscles && Array.isArray(primaryMuscles)) {
      primaryMuscles.forEach(muscle => {
        const elements = svg.querySelectorAll(`.${muscle}`);
        elements.forEach(el => {
          el.classList.add('active-primary');
        });
      });
    }

    // Highlight secondary muscles
    if (secondaryMuscles && Array.isArray(secondaryMuscles)) {
      secondaryMuscles.forEach(muscle => {
        const elements = svg.querySelectorAll(`.${muscle}`);
        elements.forEach(el => {
          el.classList.add('active-secondary');
        });
      });
    }
  },

  clear: function() {
    const svg = document.getElementById('muscle-svg');
    if (!svg) return;

    const highlighted = svg.querySelectorAll('.active-primary, .active-secondary');
    highlighted.forEach(el => {
      el.classList.remove('active-primary', 'active-secondary');
    });
  },

  setTrackClass: function(track) {
    const svg = document.getElementById('muscle-svg');
    if (!svg) return;
    
    if (track === 'enhanced') {
      svg.classList.remove('track-natural');
      svg.classList.add('track-enhanced');
    } else {
      svg.classList.remove('track-enhanced');
      svg.classList.add('track-natural');
    }
  }
};
