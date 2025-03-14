# dtect Bot Detection SDK

A lightweight JavaScript SDK for distinguishing between human and bot interactions on web pages by analyzing user behavior patterns. Developed for dtect, a data quality platform that integrates into surveys.

## Overview

The dtect Bot Detection SDK monitors and analyzes user interactions such as typing patterns, mouse/touch movements, and clicking behavior to determine if the user is likely a human or a bot. It's particularly useful for:

- Surveys and market research platforms
- Form submissions
- User verification processes
- Data quality assurance

## Features

- **Typing Analysis**: Measures WPM (words per minute) and typing consistency
- **Click Pattern Analysis**: Analyzes click speed and patterns to detect automation
- **Movement Tracking**: Evaluates mouse/touch movement naturalness and path straightness
- **Tab Switching Detection**: Monitors tab switching behavior
- **Copy/Paste Detection**: Identifies suspicious copy/paste behavior that may indicate external tool usage
- **Real-time Evaluation**: Continuously updates bot likelihood score as more data is gathered
- **Configurable Sensitivity**: Adjust detection thresholds to your specific needs
- **Non-blocking**: Runs in the background without affecting user experience
- **Customizable Responses**: Define what happens when bot-like behavior is detected

## Installation

### Direct Script Include

```html
<script src="dtect-bot-detection.js"></script>
```

### NPM (Coming Soon)

```bash
npm install dtect-bot-detection
```

## Basic Usage

```javascript
// Initialize with default settings
dtect.init().startTracking();

// Check if current user is likely a bot
if (dtect.isBot()) {
  console.log('Bot-like behavior detected!');
}

// Generate a report on user behavior
const report = dtect.generateReport();
console.log(report);
```

## Configuration Options

The SDK can be customized with various configuration options:

```javascript
dtect.init({
  // Minimum interactions before making a determination
  minSamples: 10,
  
  // WPM threshold above which is suspicious
  typingSpeedThreshold: 200,
  
  // Milliseconds between clicks threshold below which is suspicious
  clickSpeedThreshold: 100,
  
  // Threshold for straight line movement (0-1)
  movementStraightnessThreshold: 0.85,
  
  // Milliseconds between automated reports
  reportInterval: 5000,
  
  // Enable/disable debug logging
  debugMode: false,
  
  // Overall sensitivity (0-1)
  sensitivity: 0.7,
  
  // Track typing behavior in input fields
  trackFields: true,
  
  // Track mouse/touch clicks
  trackClicks: true,
  
  // Track mouse/touch movement
  trackMovement: true,
  
  // Automatically send reports
  sendReports: true,
  
  // Custom endpoint for sending reports
  reportEndpoint: 'https://your-api.example.com/report',
  
  // Callback when bot is detected
  onBotDetected: function(report) {
    console.log('Bot detected!', report);
    return true; // Return true to block form submissions
  },
  
  // Callback when a report is generated
  onReport: function(report) {
    console.log('New report generated:', report);
  }
});
```

## Integration with Survey Platforms

### Basic Integration

1. Include the dtect SDK in your survey platform:

```html
<script src="path/to/dtect-bot-detection.js"></script>
```

2. Initialize the SDK when the survey loads:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  dtect.init({
    reportEndpoint: 'https://your-survey-platform.com/api/quality-check',
    onBotDetected: function(report) {
      // Optional: Flag the response or take other actions
      console.log('Suspicious respondent detected');
    }
  }).startTracking();
});
```

3. When the survey is submitted, include the bot detection data:

```javascript
surveyForm.addEventListener('submit', function(e) {
  // Generate final report
  const botReport = dtect.generateReport();
  
  // Add to form data
  const formData = new FormData(surveyForm);
  formData.append('botDetectionData', JSON.stringify(botReport));
  
  // Optional: Prevent submission for highly suspicious activity
  if (dtect.isBot(0.9) && botReport.confidence > 0.8) {
    e.preventDefault();
    alert('This submission has been flagged for suspicious activity.');
    return false;
  }
  
  // Continue with submission...
});
```

### For Survey Platform Providers

If you're integrating the SDK into a survey platform for all your clients:

1. Add the SDK to your survey rendering engine
2. Configure a central reporting endpoint to collect bot detection data
3. Associate the bot detection data with survey responses in your database
4. Create filtering options in your analytics dashboard to exclude suspicious responses
5. Consider adding automated quality scores based on the bot detection metrics

## How Detection Works

The SDK uses multiple factors to identify bot-like behavior:

### Typing Analysis

- **Words Per Minute (WPM)**: Extremely high typing speeds (above 150-200 WPM) are suspicious
- **Typing Consistency**: Humans have natural variations in typing rhythm; bots often have unnaturally consistent timing

### Click Analysis

- **Click Speed**: Unusually fast clicks or perfectly timed click intervals are suspicious
- **Click Positions**: Detecting grid-like patterns or perfect alignment in click positions

### Movement Analysis

- **Path Straightness**: Bots often move in perfectly straight lines between points
- **Movement Naturalness**: Human movements have natural acceleration/deceleration patterns
- **Speed Consistency**: Humans show variable speeds; bots often maintain constant velocity

### Tab Switching

- **Switching Frequency**: Both extremely high and extremely low tab switching can be suspicious

### Copy/Paste Behavior

- **External Content Detection**: Identifies pastes from external sources that weren't copied from the current page
- **Copy-Paste Timing**: Measures time between copying text (like a question) and pasting text (like an answer)
- **Pattern Analysis**: Detects suspicious patterns like copying questions, switching to external tools, and pasting answers
- **External Research Detection**: Particularly useful for surveys and assessments to detect when participants copy questions to research answers externally

### Combined Score

All factors are weighted and combined into an overall "bot score" between 0 and 1, with a corresponding confidence level. The copy/paste behavior is especially relevant for survey applications and is weighted heavily in the score calculation.

## API Reference

### Methods

#### `init(config)`
Initializes the SDK with the provided configuration.
- **Parameters**: `config` (Object, optional) - Configuration options
- **Returns**: The dtect instance for chaining

#### `startTracking()`
Starts monitoring user behavior.
- **Returns**: The dtect instance for chaining

#### `stopTracking()`
Stops monitoring user behavior.
- **Returns**: The dtect instance for chaining

#### `isBot(threshold)`
Checks if the current user is likely a bot.
- **Parameters**: `threshold` (Number, optional) - Bot score threshold (0-1), default is 0.7
- **Returns**: Boolean - true if user is likely a bot

#### `generateReport(sendReport)`
Generates a detailed report of user behavior metrics.
- **Parameters**: `sendReport` (Boolean, optional) - Whether to send the report to the endpoint, default is true
- **Returns**: Object - The report data

### Report Structure

```javascript
{
  timestamp: 1583438523971,
  sessionDuration: 143000,
  botScore: 0.23,
  confidence: 0.85,
  interactionCount: 47,
  metrics: {
    typing: {
      wpm: 65.2,
      consistency: 0.43,
      samples: 127
    },
    clicks: {
      speed: 847.3,
      patternScore: 0.12,
      samples: 14
    },
    movement: {
      speed: 0.42,
      straightness: 0.31,
      naturalness: 0.78,
      samples: 412
    },
    tabSwitching: {
      frequency: 1.2,
      samples: 3
    },
    copyPaste: {
      copyPasteCount: 5,
      externalPasteCount: 2,
      averageTimeBetweenCopyPaste: 42560,
      suspiciousScore: 0.68,
      samples: 5
    }
  }
}
```

## Best Practices

### Sensitivity Tuning

- Start with default settings and adjust based on your specific needs
- Analyze reports from known humans and bots to establish baseline thresholds
- Consider your audience when setting thresholds (e.g., different demographics may have different typing speeds)

### Implementation Recommendations

- **Don't Block Too Aggressively**: Use the bot detection primarily for flagging and analysis rather than outright blocking
- **Combine with Other Methods**: Use alongside CAPTCHA, IP reputation, and other techniques for better accuracy
- **Transparent Communication**: If you're using this for survey quality, consider informing participants that their interaction patterns are being monitored

### Privacy Considerations

- The SDK doesn't track what users type, only the patterns of interaction
- Consider adding disclosure in your privacy policy about behavior monitoring
- Ensure compliance with relevant privacy regulations like GDPR and CCPA

## Demo

A sample implementation is included in `demo.html` which demonstrates how to integrate the SDK and visualize the metrics in real-time.

## License

MIT

## Support

For issues, feature requests, or questions, please contact [support@dtect.com](mailto:support@dtect.com)
