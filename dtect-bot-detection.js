/**
 * dtect-bot-detection.js
 * A JavaScript SDK to detect bot-like behavior by analyzing user interactions
 * 
 * @version 1.0.0
 * @author dtect
 * @license MIT
 */

(function(window) {
  'use strict';
  
  // Prevent multiple initializations
  if (window.dtect) {
    console.warn('dtect bot detection SDK already initialized');
    return window.dtect;
  }
  
  /**
   * Main dtect object
   */
  const dtect = {
    version: '1.0.0',
    config: {
      minSamples: 10,                // Minimum number of interactions before making a determination
      typingSpeedThreshold: 200,     // WPM threshold above which is suspicious
      clickSpeedThreshold: 100,      // Milliseconds between clicks threshold below which is suspicious
      movementStraightnessThreshold: 0.85, // Threshold for straight line movement (0-1)
      reportInterval: 5000,          // Milliseconds between automated reports
      debugMode: false,              // Enable/disable debug logging
      sensitivity: 0.7,              // Overall sensitivity (0-1)
      trackFields: true,             // Track typing behavior in input fields
      trackClicks: true,             // Track mouse/touch clicks
      trackMovement: true,           // Track mouse/touch movement
      sendReports: true,             // Automatically send reports
      reportEndpoint: null,          // Custom endpoint for sending reports
      onBotDetected: null,           // Callback when bot is detected
      onReport: null                 // Callback when a report is generated
    },
    
    // Internal state
    _state: {
      initialized: false,
      tracking: false,
      botScore: 0,                   // 0-1 score, higher means more bot-like
      confidence: 0,                 // 0-1 confidence in the botScore
      interactionCount: 0,
      typing: {
        keypresses: [],
        wpm: 0,
        consistency: 0
      },
      clicks: {
        timestamps: [],
        positions: [],
        speed: 0,
        patternScore: 0
      },
      movement: {
        positions: [],
        speed: 0,
        straightness: 0,
        naturalness: 0,
        lastPosition: null,
        lastTimestamp: null
      },
      focusBlur: {
        events: [],
        tabSwitchFrequency: 0
      },
      copyPaste: {
        events: [],
        textCopied: [],
        textPasted: [],
        copyPasteCount: 0,          // Number of copy/paste actions
        externalPasteCount: 0,       // Number of pastes from outside sources
        averageTimeBetweenCopyPaste: 0,  // Average time between copy and paste
        suspiciousScore: 0           // 0-1 score of suspicious copy/paste behavior
      },
      startTime: null,
      reportTimer: null
    },
    
    /**
     * Initialize the SDK with custom configuration
     * @param {Object} customConfig - Custom configuration options
     * @returns {Object} - The dtect instance for chaining
     */
    init: function(customConfig = {}) {
      if (this._state.initialized) {
        console.warn('dtect SDK already initialized');
        return this;
      }
      
      // Merge custom config with defaults
      this.config = Object.assign({}, this.config, customConfig);
      
      // Setup event listeners
      this._setupEventListeners();
      
      // Set state
      this._state.initialized = true;
      this._state.startTime = Date.now();
      
      if (this.config.debugMode) {
        console.log('dtect bot detection SDK initialized with config:', this.config);
      }
      
      // Start automated reporting if enabled
      if (this.config.sendReports && this.config.reportInterval > 0) {
        this._state.reportTimer = setInterval(() => {
          this.generateReport();
        }, this.config.reportInterval);
      }
      
      return this;
    },
    
    /**
     * Start tracking user behavior
     * @returns {Object} - The dtect instance for chaining
     */
    startTracking: function() {
      this._state.tracking = true;
      return this;
    },
    
    /**
     * Stop tracking user behavior
     * @returns {Object} - The dtect instance for chaining
     */
    stopTracking: function() {
      this._state.tracking = false;
      return this;
    },
    
    /**
     * Check if the current user is likely a bot
     * @param {number} threshold - Optional threshold (0-1) to consider as bot
     * @returns {boolean} - True if user is likely a bot
     */
    isBot: function(threshold = 0.7) {
      // Require minimum samples for confidence
      if (this._state.interactionCount < this.config.minSamples) {
        return false;
      }
      
      return this._state.botScore > threshold;
    },
    
    /**
     * Generate a report of the current user behavior
     * @param {boolean} sendReport - Whether to send the report to the endpoint
     * @returns {Object} - The report object
     */
    generateReport: function(sendReport = true) {
      const report = {
        timestamp: Date.now(),
        sessionDuration: Date.now() - this._state.startTime,
        botScore: this._state.botScore,
        confidence: this._state.confidence,
        interactionCount: this._state.interactionCount,
        metrics: {
          typing: {
            wpm: this._state.typing.wpm,
            consistency: this._state.typing.consistency,
            samples: this._state.typing.keypresses.length
          },
          clicks: {
            speed: this._state.clicks.speed,
            patternScore: this._state.clicks.patternScore,
            samples: this._state.clicks.timestamps.length
          },
          movement: {
            speed: this._state.movement.speed,
            straightness: this._state.movement.straightness,
            naturalness: this._state.movement.naturalness,
            samples: this._state.movement.positions.length
          },
          tabSwitching: {
            frequency: this._state.focusBlur.tabSwitchFrequency,
            samples: this._state.focusBlur.events.length
          },
          copyPaste: {
            copyPasteCount: this._state.copyPaste.copyPasteCount,
            externalPasteCount: this._state.copyPaste.externalPasteCount,
            averageTimeBetweenCopyPaste: this._state.copyPaste.averageTimeBetweenCopyPaste,
            suspiciousScore: this._state.copyPaste.suspiciousScore,
            samples: this._state.copyPaste.events.length
          }
        }
      };
      
      // Execute callback if provided
      if (typeof this.config.onReport === 'function') {
        this.config.onReport(report);
      }
      
      // Send report if enabled
      if (sendReport && this.config.sendReports && this.config.reportEndpoint) {
        this._sendReport(report);
      }
      
      // Debug logging
      if (this.config.debugMode) {
        console.log('dtect bot detection report:', report);
      }
      
      return report;
    },
    
    /**
     * Setup all event listeners
     * @private
     */
    _setupEventListeners: function() {
      if (this.config.trackFields) {
        document.addEventListener('keydown', this._handleKeydown.bind(this), true);
        document.addEventListener('keyup', this._handleKeyup.bind(this), true);
      }
      
      if (this.config.trackClicks) {
        document.addEventListener('mousedown', this._handleMouseDown.bind(this), true);
        document.addEventListener('touchstart', this._handleTouchStart.bind(this), true);
      }
      
      if (this.config.trackMovement) {
        document.addEventListener('mousemove', this._handleMouseMove.bind(this), true);
        document.addEventListener('touchmove', this._handleTouchMove.bind(this), true);
      }
      
      // Tab switching detection
      window.addEventListener('focus', this._handleFocus.bind(this), true);
      window.addEventListener('blur', this._handleBlur.bind(this), true);
      
      // Copy/paste detection
      document.addEventListener('copy', this._handleCopy.bind(this), true);
      document.addEventListener('cut', this._handleCopy.bind(this), true);
      document.addEventListener('paste', this._handlePaste.bind(this), true);
      
      // Form submission tracking
      document.addEventListener('submit', this._handleFormSubmit.bind(this), true);
    },
    
    /**
     * Handle keydown events for typing analysis
     * @private
     * @param {KeyboardEvent} event - The keyboard event
     */
    _handleKeydown: function(event) {
      if (!this._state.initialized || !this._state.tracking) return;
      
      // Skip modifier keys
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      
      // Skip non-input fields
      if (!this._isInputField(event.target)) return;
      
      const keypress = {
        key: event.key,
        timestamp: Date.now(),
        target: event.target.tagName.toLowerCase(),
        targetType: event.target.type,
        modifiers: {
          shift: event.shiftKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          meta: event.metaKey
        }
      };
      
      this._state.typing.keypresses.push(keypress);
      this._state.interactionCount++;
      
      // Calculate typing metrics after enough samples
      if (this._state.typing.keypresses.length >= 5) {
        this._calculateTypingMetrics();
      }
      
      // Update bot score
      this._updateBotScore();
    },
    
    /**
     * Handle keyup events for typing analysis
     * @private
     * @param {KeyboardEvent} event - The keyboard event
     */
    _handleKeyup: function(event) {
      if (!this._state.initialized || !this._state.tracking) return;
      
      // Implementation details if needed
    },
    
    /**
     * Handle mouse down events for click analysis
     * @private
     * @param {MouseEvent} event - The mouse event
     */
    _handleMouseDown: function(event) {
      if (!this._state.initialized || !this._state.tracking) return;
      
      const click = {
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now(),
        target: event.target.tagName.toLowerCase(),
        button: event.button
      };
      
      this._state.clicks.timestamps.push(click.timestamp);
      this._state.clicks.positions.push({ x: click.x, y: click.y });
      this._state.interactionCount++;
      
      // Calculate click metrics after enough samples
      if (this._state.clicks.timestamps.length >= 3) {
        this._calculateClickMetrics();
      }
      
      // Update bot score
      this._updateBotScore();
    },
    
    /**
     * Handle touch start events for tap analysis
     * @private
     * @param {TouchEvent} event - The touch event
     */
    _handleTouchStart: function(event) {
      if (!this._state.initialized || !this._state.tracking) return;
      if (!event.touches || !event.touches[0]) return;
      
      const touch = event.touches[0];
      const tap = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
        target: event.target.tagName.toLowerCase()
      };
      
      this._state.clicks.timestamps.push(tap.timestamp);
      this._state.clicks.positions.push({ x: tap.x, y: tap.y });
      this._state.interactionCount++;
      
      // Calculate tap metrics after enough samples
      if (this._state.clicks.timestamps.length >= 3) {
        this._calculateClickMetrics();
      }
      
      // Update bot score
      this._updateBotScore();
    },
    
    /**
     * Handle mouse move events for movement analysis
     * @private
     * @param {MouseEvent} event - The mouse event
     */
    _handleMouseMove: function(event) {
      if (!this._state.initialized || !this._state.tracking) return;
      
      const now = Date.now();
      const position = { x: event.clientX, y: event.clientY, timestamp: now };
      
      // Throttle movement recording (every 50ms)
      if (this._state.movement.lastTimestamp && 
          now - this._state.movement.lastTimestamp < 50) {
        return;
      }
      
      // Track position
      this._state.movement.positions.push(position);
      this._state.movement.lastPosition = position;
      this._state.movement.lastTimestamp = now;
      
      // Limit the array size to avoid memory issues
      if (this._state.movement.positions.length > 100) {
        this._state.movement.positions.shift();
      }
      
      // Calculate movement metrics after enough samples
      if (this._state.movement.positions.length >= 10) {
        this._calculateMovementMetrics();
      }
      
      // Don't count movement for interaction count to avoid over-counting
    },
    
    /**
     * Handle touch move events for movement analysis
     * @private
     * @param {TouchEvent} event - The touch event
     */
    _handleTouchMove: function(event) {
      if (!this._state.initialized || !this._state.tracking) return;
      if (!event.touches || !event.touches[0]) return;
      
      const touch = event.touches[0];
      const now = Date.now();
      const position = { x: touch.clientX, y: touch.clientY, timestamp: now };
      
      // Throttle movement recording (every 50ms)
      if (this._state.movement.lastTimestamp && 
          now - this._state.movement.lastTimestamp < 50) {
        return;
      }
      
      // Track position
      this._state.movement.positions.push(position);
      this._state.movement.lastPosition = position;
      this._state.movement.lastTimestamp = now;
      
      // Limit the array size to avoid memory issues
      if (this._state.movement.positions.length > 100) {
        this._state.movement.positions.shift();
      }
      
      // Calculate movement metrics after enough samples
      if (this._state.movement.positions.length >= 10) {
        this._calculateMovementMetrics();
      }
      
      // Don't count movement for interaction count to avoid over-counting
    },
    
    /**
     * Handle window focus events
     * @private
     * @param {FocusEvent} event - The focus event
     */
    _handleFocus: function(event) {
      if (!this._state.initialized || !this._state.tracking) return;
      
      this._state.focusBlur.events.push({
        type: 'focus',
        timestamp: Date.now()
      });
      
      this._calculateTabSwitchingMetrics();
    },
    
    /**
     * Handle window blur events
     * @private
     * @param {FocusEvent} event - The blur event
     */
    _handleBlur: function(event) {
      if (!this._state.initialized || !this._state.tracking) return;
      
      this._state.focusBlur.events.push({
        type: 'blur',
        timestamp: Date.now()
      });
      
      this._calculateTabSwitchingMetrics();
    },
    
    /**
     * Handle form submission events
     * @private
     * @param {SubmitEvent} event - The submit event
     */
    _handleFormSubmit: function(event) {
      if (!this._state.initialized || !this._state.tracking) return;
      
      // Generate a report when a form is submitted
      const report = this.generateReport(this.config.sendReports);
      
      // Optionally prevent submission for highly suspicious activity
      if (this.isBot(0.9) && this._state.confidence > 0.8) {
        if (this.config.debugMode) {
          console.warn('dtect detected highly suspicious bot-like behavior on form submission');
        }
        
        // Trigger callback if provided
        if (typeof this.config.onBotDetected === 'function') {
          const preventSubmission = this.config.onBotDetected(report);
          
          // Allow callback to prevent submission
          if (preventSubmission === true) {
            event.preventDefault();
            if (this.config.debugMode) {
              console.warn('Form submission prevented by onBotDetected callback');
            }
          }
        }
      }
    },
    
    /**
     * Calculate typing metrics based on collected data
     * @private
     */
    _calculateTypingMetrics: function() {
      const keypresses = this._state.typing.keypresses;
      if (keypresses.length < 5) return;
      
      // Calculate words per minute (WPM)
      // Assuming 5 keypresses = 1 word (standard measure)
      const firstKeypressTime = keypresses[0].timestamp;
      const lastKeypressTime = keypresses[keypresses.length - 1].timestamp;
      const timeSpanMs = lastKeypressTime - firstKeypressTime;
      
      if (timeSpanMs <= 0) return;
      
      // Convert to minutes and calculate WPM
      const timeSpanMinutes = timeSpanMs / 60000;
      const wordCount = keypresses.length / 5;
      
      this._state.typing.wpm = wordCount / timeSpanMinutes;
      
      // Calculate typing consistency (variance in time between keypresses)
      const intervals = [];
      for (let i = 1; i < keypresses.length; i++) {
        intervals.push(keypresses[i].timestamp - keypresses[i-1].timestamp);
      }
      
      // Calculate average interval
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      
      // Calculate variance
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
      
      // Convert variance to a 0-1 consistency score (higher is more consistent)
      // Uses a sigmoid-like function to normalize
      this._state.typing.consistency = 1 - Math.min(1, Math.sqrt(variance) / 500);
    },
    
    /**
     * Calculate click metrics based on collected data
     * @private
     */
    _calculateClickMetrics: function() {
      const timestamps = this._state.clicks.timestamps;
      const positions = this._state.clicks.positions;
      
      if (timestamps.length < 3) return;
      
      // Calculate click speed (average time between clicks in ms)
      const clickIntervals = [];
      for (let i = 1; i < timestamps.length; i++) {
        clickIntervals.push(timestamps[i] - timestamps[i-1]);
      }
      
      this._state.clicks.speed = clickIntervals.reduce((sum, val) => sum + val, 0) / clickIntervals.length;
      
      // Analyze click patterns for bot-like behavior
      // Check for uniform click positions which might indicate automation
      let patternScore = 0;
      
      // Check for grid-like patterns
      const xCoords = positions.map(p => p.x);
      const yCoords = positions.map(p => p.y);
      
      // Calculate standard deviation of x and y coordinates
      const xAvg = xCoords.reduce((sum, val) => sum + val, 0) / xCoords.length;
      const yAvg = yCoords.reduce((sum, val) => sum + val, 0) / yCoords.length;
      
      const xVariance = xCoords.reduce((sum, val) => sum + Math.pow(val - xAvg, 2), 0) / xCoords.length;
      const yVariance = yCoords.reduce((sum, val) => sum + Math.pow(val - yAvg, 2), 0) / yCoords.length;
      
      const xStdDev = Math.sqrt(xVariance);
      const yStdDev = Math.sqrt(yVariance);
      
      // Very low standard deviation might indicate bot-like precision
      if (xStdDev < 5 || yStdDev < 5) {
        patternScore += 0.3;
      }
      
      // Check for perfectly timed clicks (suspiciously consistent intervals)
      const intervalAvg = clickIntervals.reduce((sum, val) => sum + val, 0) / clickIntervals.length;
      const intervalVariance = clickIntervals.reduce((sum, val) => sum + Math.pow(val - intervalAvg, 2), 0) / clickIntervals.length;
      const intervalStdDev = Math.sqrt(intervalVariance);
      
      // Very low standard deviation in click timing is suspicious
      if (intervalStdDev < 20) {
        patternScore += 0.4;
      }
      
      // Extremely fast clicks are suspicious
      if (intervalAvg < this.config.clickSpeedThreshold) {
        patternScore += 0.3;
      }
      
      this._state.clicks.patternScore = Math.min(1, patternScore);
    },
    
    /**
     * Calculate movement metrics based on collected positions
     * @private
     */
    _calculateMovementMetrics: function() {
      const positions = this._state.movement.positions;
      if (positions.length < 10) return;
      
      // Calculate movement speed
      let totalDistance = 0;
      let totalTime = 0;
      
      for (let i = 1; i < positions.length; i++) {
        const p1 = positions[i-1];
        const p2 = positions[i];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        const time = p2.timestamp - p1.timestamp;
        
        if (time > 0) {
          totalDistance += distance;
          totalTime += time;
        }
      }
      
      this._state.movement.speed = totalTime > 0 ? totalDistance / totalTime : 0;
      
      // Calculate straightness of movement (ratio of direct distance to actual path)
      // Bots often move in perfectly straight lines
      const firstPos = positions[0];
      const lastPos = positions[positions.length - 1];
      
      const directDistance = Math.sqrt(
        Math.pow(lastPos.x - firstPos.x, 2) + 
        Math.pow(lastPos.y - firstPos.y, 2)
      );
      
      // Straightness is the ratio of direct distance to total path distance
      // 1.0 = perfectly straight line
      this._state.movement.straightness = totalDistance > 0 ? 
        Math.min(1, directDistance / totalDistance) : 0;
      
      // Calculate naturalness of movement (based on acceleration patterns)
      // Humans have variable acceleration patterns
      let accelerationChanges = 0;
      let lastSpeed = null;
      let accelerationDirection = 0; // -1 decreasing, 0 same, 1 increasing
      
      for (let i = 2; i < positions.length; i++) {
        const p0 = positions[i-2];
        const p1 = positions[i-1];
        const p2 = positions[i];
        
        const time1 = p1.timestamp - p0.timestamp;
        const time2 = p2.timestamp - p1.timestamp;
        
        if (time1 <= 0 || time2 <= 0) continue;
        
        const dx1 = p1.x - p0.x;
        const dy1 = p1.y - p0.y;
        const dx2 = p2.x - p1.x;
        const dy2 = p2.y - p1.y;
        
        const dist1 = Math.sqrt(dx1*dx1 + dy1*dy1);
        const dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);
        
        const speed1 = dist1 / time1;
        const speed2 = dist2 / time2;
        
        if (lastSpeed !== null) {
          const newDirection = speed2 > speed1 ? 1 : (speed2 < speed1 ? -1 : 0);
          
          // Count direction changes in acceleration
          if (newDirection !== accelerationDirection && newDirection !== 0) {
            accelerationChanges++;
          }
          
          accelerationDirection = newDirection;
        }
        
        lastSpeed = speed2;
      }
      
      // More acceleration changes = more natural movement
      // Normalize to 0-1 range where higher is more natural (more human-like)
      const movementSamples = positions.length - 2;
      const maxExpectedChanges = movementSamples / 3; // Rough heuristic
      
      this._state.movement.naturalness = Math.min(1, accelerationChanges / maxExpectedChanges);
    },
    
    /**
     * Calculate tab switching metrics
     * @private
     */
    _calculateTabSwitchingMetrics: function() {
      const events = this._state.focusBlur.events;
      if (events.length < 2) return;
      
      // Calculate frequency (switches per minute)
      const firstEvent = events[0].timestamp;
      const lastEvent = events[events.length - 1].timestamp;
      const timeSpanMinutes = (lastEvent - firstEvent) / 60000;
      
      if (timeSpanMinutes <= 0) return;
      
      // Count actual switches (pairs of blur+focus)
      let switchCount = 0;
      for (let i = 1; i < events.length; i++) {
        if (events[i].type !== events[i-1].type) {
          switchCount++;
        }
      }
      
      this._state.focusBlur.tabSwitchFrequency = switchCount / timeSpanMinutes;
    },
    
    /**
     * Update overall bot score based on all metrics
     * @private
     */
    _updateBotScore: function() {
      // Skip if not enough data
      if (this._state.interactionCount < this.config.minSamples) {
        this._state.botScore = 0;
        this._state.confidence = 0;
        return;
      }
      
      let botScore = 0;
      let confidenceScore = 0;
      let factorsUsed = 0;
      
      // Factor 1: Typing speed (WPM too high is suspicious)
      if (this._state.typing.keypresses.length >= 5) {
        const wpmScore = Math.max(0, Math.min(1, 
          (this._state.typing.wpm - 100) / (this.config.typingSpeedThreshold - 100)
        ));
        
        // Typing consistency (too consistent is suspicious)
        const consistencyScore = this._state.typing.consistency > 0.95 ? 
          (this._state.typing.consistency - 0.95) * 20 : 0;
        
        const typingScore = (wpmScore * 0.7) + (consistencyScore * 0.3);
        
        botScore += typingScore * 0.3; // Typing is a strong signal
        confidenceScore += 0.35 * Math.min(1, this._state.typing.keypresses.length / 20);
        factorsUsed++;
      }
      
      // Factor 2: Click patterns
      if (this._state.clicks.timestamps.length >= 3) {
        // Click speed (too fast is suspicious)
        const speedScore = Math.max(0, Math.min(1, 
          (this.config.clickSpeedThreshold - this._state.clicks.speed) / this.config.clickSpeedThreshold
        ));
        
        // Pattern score is already 0-1
        const clickScore = (speedScore * 0.5) + (this._state.clicks.patternScore * 0.5);
        
        botScore += clickScore * 0.2; // Click pattern is a moderate signal
        confidenceScore += 0.25 * Math.min(1, this._state.clicks.timestamps.length / 10);
        factorsUsed++;
      }
      
      // Factor 3: Movement patterns
      if (this._state.movement.positions.length >= 10) {
        // Movement straightness (too straight is suspicious)
        const straightnessScore = this._state.movement.straightness > 
          this.config.movementStraightnessThreshold ? 
          (this._state.movement.straightness - this.config.movementStraightnessThreshold) / 
          (1 - this.config.movementStraightnessThreshold) : 0;
        
        // Speed consistency
        const naturalScore = 1 - this._state.movement.naturalness;
        
        const movementScore = (straightnessScore * 0.6) + (naturalScore * 0.4);
        
        botScore += movementScore * 0.2; // Movement is a moderate signal
        confidenceScore += 0.25 * Math.min(1, this._state.movement.positions.length / 50);
        factorsUsed++;
      }
      
      // Factor 4: Tab switching behavior
      if (this._state.focusBlur.events.length >= 2) {
        // Very high or very low tab switching can be suspicious
        const tabSwitchFreq = this._state.focusBlur.tabSwitchFrequency;
        
        // Normalize to 0-1 score (both extremes are suspicious)
        const tabScore = tabSwitchFreq < 0.1 ? 0.5 : // Very low switching
                         tabSwitchFreq > 10 ? 0.8 :  // Very high switching
                         0.2; // Normal range
        
        botScore += tabScore * 0.1; // Tab switching is a weak signal
        confidenceScore += 0.05;
        factorsUsed++;
      }
      
      // Factor 5: Copy/Paste behavior 
      if (this._state.copyPaste.events.length >= 2) {
        // Use the calculated suspicious score directly
        const copyPasteScore = this._state.copyPaste.suspiciousScore;
        
        // Copy/paste behavior is a very strong signal for surveys/forms
        botScore += copyPasteScore * 0.3; 
        
        // Confidence increases with more samples
        confidenceScore += 0.3 * Math.min(1, this._state.copyPaste.events.length / 5);
        factorsUsed++;
        
        // Debug logging of copy/paste metrics
        if (this.config.debugMode && copyPasteScore > 0.5) {
          console.warn('dtect: Suspicious copy/paste behavior detected', {
            score: copyPasteScore,
            externalPastes: this._state.copyPaste.externalPasteCount,
            totalPastes: this._state.copyPaste.textPasted.length,
            avgTimeBetweenCopyPaste: this._state.copyPaste.averageTimeBetweenCopyPaste
          });
        }
      }
      
      // Normalize bot score based on factors used
      this._state.botScore = factorsUsed > 0 ? 
        Math.min(1, botScore / factorsUsed) * this.config.sensitivity : 0;
      
      // Calculate confidence level
      this._state.confidence = factorsUsed > 0 ? 
        Math.min(1, confidenceScore / factorsUsed) : 0;
      
      // Trigger callback if bot detected with high confidence
      if (this._state.botScore > 0.7 && 
          this._state.confidence > 0.6 && 
          typeof this.config.onBotDetected === 'function') {
        
        this.config.onBotDetected(this.generateReport(false));
      }
    },
    
    /**
     * Send a report to the configured endpoint
     * @private
     * @param {Object} report - The report object to send
     */
    _sendReport: function(report) {
      if (!this.config.reportEndpoint) return;
      
      try {
        fetch(this.config.reportEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report),
          // Use keepalive to ensure the request completes even if page is unloading
          keepalive: true
        }).catch(err => {
          if (this.config.debugMode) {
            console.error('Error sending dtect report:', err);
          }
        });
      } catch (err) {
        if (this.config.debugMode) {
          console.error('Error sending dtect report:', err);
        }
      }
    },
    
    /**
     * Handle copy or cut events
     * @private
     * @param {ClipboardEvent} event - The clipboard event
     */
    _handleCopy: function(event) {
      if (!this._state.initialized || !this._state.tracking) return;
      
      const selection = window.getSelection().toString().trim();
      if (!selection) return;
      
      // Record copy event
      const copyEvent = {
        type: event.type,
        timestamp: Date.now(),
        text: selection,
        target: event.target.tagName.toLowerCase(),
        targetId: event.target.id || '',
        targetClassList: Array.from(event.target.classList || [])
      };
      
      this._state.copyPaste.events.push(copyEvent);
      this._state.copyPaste.textCopied.push(copyEvent);
      this._state.interactionCount++;
      
      if (this.config.debugMode) {
        console.log('dtect: Text copied:', selection.substring(0, 50) + (selection.length > 50 ? '...' : ''));
      }
      
      this._calculateCopyPasteMetrics();
      this._updateBotScore();
    },
    
    /**
     * Handle paste events
     * @private
     * @param {ClipboardEvent} event - The clipboard event
     */
    _handlePaste: function(event) {
      if (!this._state.initialized || !this._state.tracking) return;
      
      // Get the clipboard data
      let pastedText = '';
      
      // Try to get clipboard data
      if (event.clipboardData && event.clipboardData.getData) {
        pastedText = event.clipboardData.getData('text/plain').trim();
      }
      
      if (!pastedText) return;
      
      // Record paste event
      const pasteEvent = {
        type: 'paste',
        timestamp: Date.now(),
        text: pastedText,
        target: event.target.tagName.toLowerCase(),
        targetId: event.target.id || '',
        targetClassList: Array.from(event.target.classList || []),
        isExternalContent: true // Will be updated in calculation
      };
      
      this._state.copyPaste.events.push(pasteEvent);
      this._state.copyPaste.textPasted.push(pasteEvent);
      this._state.interactionCount++;
      
      if (this.config.debugMode) {
        console.log('dtect: Text pasted:', pastedText.substring(0, 50) + (pastedText.length > 50 ? '...' : ''));
      }
      
      this._calculateCopyPasteMetrics();
      this._updateBotScore();
    },
    
    /**
     * Calculate copy/paste metrics
     * @private
     */
    _calculateCopyPasteMetrics: function() {
      const copyEvents = this._state.copyPaste.textCopied;
      const pasteEvents = this._state.copyPaste.textPasted;
      
      if (copyEvents.length === 0 && pasteEvents.length === 0) return;
      
      // Update basic counts
      this._state.copyPaste.copyPasteCount = copyEvents.length + pasteEvents.length;
      
      // Calculate how many pastes appear to be from external sources
      let externalPasteCount = 0;
      let copyPasteIntervals = [];
      
      for (const pasteEvent of pasteEvents) {
        // Check if this paste matches any previous copy
        let matchesPreviousCopy = false;
        let matchedCopyTimestamp = 0;
        
        for (const copyEvent of copyEvents) {
          // Only consider copies that happened before this paste
          if (copyEvent.timestamp < pasteEvent.timestamp) {
            // Look for exact or near-exact matches (account for minor edits)
            if (this._textSimilarity(copyEvent.text, pasteEvent.text) > 0.8) {
              matchesPreviousCopy = true;
              matchedCopyTimestamp = copyEvent.timestamp;
              break;
            }
          }
        }
        
        // Update external paste flag
        pasteEvent.isExternalContent = !matchesPreviousCopy;
        
        if (pasteEvent.isExternalContent) {
          externalPasteCount++;
        } else if (matchedCopyTimestamp > 0) {
          // Calculate time between copy and paste
          copyPasteIntervals.push(pasteEvent.timestamp - matchedCopyTimestamp);
        }
      }
      
      this._state.copyPaste.externalPasteCount = externalPasteCount;
      
      // Calculate average time between copy and paste
      if (copyPasteIntervals.length > 0) {
        this._state.copyPaste.averageTimeBetweenCopyPaste = 
          copyPasteIntervals.reduce((sum, val) => sum + val, 0) / copyPasteIntervals.length;
      }
      
      // Calculate suspicious score based on several factors
      let suspiciousScore = 0;
      
      // Factor 1: Percentage of external pastes (pastes with no matching copy)
      if (pasteEvents.length > 0) {
        const externalPasteRatio = externalPasteCount / pasteEvents.length;
        suspiciousScore += externalPasteRatio * 0.6; // Weight: 60%
      }
      
      // Factor 2: Short time between copying question text and pasting answer
      // Very fast copy-paste cycles can indicate using an external tool/AI
      if (copyPasteIntervals.length > 0) {
        const avgInterval = this._state.copyPaste.averageTimeBetweenCopyPaste;
        
        // Under 30 seconds is very suspicious (using GPT, search, etc.)
        // Over 2 minutes is less suspicious (could be legit research)
        if (avgInterval < 30000) {
          suspiciousScore += 0.3;
        } else if (avgInterval < 60000) {
          suspiciousScore += 0.2;
        } else if (avgInterval < 120000) {
          suspiciousScore += 0.1;
        }
      }
      
      // Factor 3: Suspicious if high proportion of interactions are copy/paste vs other interactions
      const copyPasteProportion = this._state.copyPaste.copyPasteCount / this._state.interactionCount;
      if (copyPasteProportion > 0.5 && this._state.interactionCount > 10) {
        suspiciousScore += 0.2;
      }
      
      this._state.copyPaste.suspiciousScore = Math.min(1, suspiciousScore);
    },
    
    /**
     * Calculate similarity between two strings (Jaccard similarity on words)
     * @private
     * @param {string} str1 - First string to compare
     * @param {string} str2 - Second string to compare
     * @returns {number} - Similarity score 0-1
     */
    _textSimilarity: function(str1, str2) {
      if (!str1 || !str2) return 0;
      if (str1 === str2) return 1;
      
      // Tokenize into words
      const words1 = str1.toLowerCase().split(/\W+/).filter(w => w.length > 0);
      const words2 = str2.toLowerCase().split(/\W+/).filter(w => w.length > 0);
      
      // Calculate Jaccard similarity coefficient
      const set1 = new Set(words1);
      const set2 = new Set(words2);
      
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);
      
      return intersection.size / union.size;
    },
    
    /**
     * Check if element is an input field
     * @private
     * @param {HTMLElement} element - The element to check
     * @returns {boolean} - True if element is an input field
     */
    _isInputField: function(element) {
      if (!element || !element.tagName) return false;
      
      const tagName = element.tagName.toLowerCase();
      
      // Input elements (excluding buttons, checkboxes, radio, etc.)
      if (tagName === 'input') {
        const inputType = (element.type || '').toLowerCase();
        return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image'].includes(inputType);
      }
      
      // Other editable elements
      return tagName === 'textarea' || 
             element.isContentEditable || 
             tagName === 'select';
    }
  };
  
  // Expose the dtect object to the window
  window.dtect = dtect;
  
  return dtect;
})(window);
