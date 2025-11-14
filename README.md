# Image Recognition Web App

A simple, privacy-friendly image recognition app built with TensorFlow.js and the MobileNet model. It runs completely in the browser, and includes an optional Q&A assistant through a small Node/Express backend.

## Screenshots

### Desktop view

![Image Recognition Web App - Main screen](images/Screenshot%20(185).png)

### Prediction & Q&A panel

![Image Recognition Web App - Predictions and Q&A](images/Screenshot%20(186).png)

## Features

- Image upload with instant preview  
- On-device classification using MobileNet (nothing is uploaded to a server)  
- Top-5 predictions with confidence scores  
- Info panel for the top prediction using Wikipedia data, with a link to the full article when available  
- Optional in-app Q&A:
  - Sends the detected label and short summary to a local backend
  - Uses a Groq OpenAI-compatible API with basic guardrails to keep responses focused  
- Responsive UI with loading states and error handling  
- Optimized loading for better performance (resource hints, deferred assets, delayed model load)

## Technology Stack

- HTML5, CSS3, JavaScript (ES6+)  
- TensorFlow.js + MobileNet  
- Node.js, Express, node-fetch, cors, dotenv (for the optional backend)

## How to Use

### Image classification (no backend needed)

1. Open `index.html` in a modern browser.  
2. Click **Select Image** and choose an image.  
3. Click **Analyze Image** to run the model.  
4. View the predictions and the information panel.

### Enabling the Q&A assistant (optional)

1. Run `npm install` in the project root.  
2. Create `server/.env` from the example file and set `GROQ_API_KEY`.  
3. Start the backend with `npm run start:server` (default: `http://127.0.0.1:8787`).  
4. In `index.html`, set `window.TEXT_MODEL_ENDPOINT` to `http://127.0.0.1:8787/qa` or your deployment URL.

## Privacy

Image recognition works fully in your browser. If you enable the Q&A feature, only your text question and a small context snippet are sent to the backend—images are never uploaded.

## Browser Compatibility

Works best on modern browsers with WebGL enabled (Chrome, Firefox, Edge).

## License

MIT
