# Image Recognition Web App

A privacy-friendly, browser-based image recognition application powered by TensorFlow.js and the MobileNet model. An optional Q&A assistant can provide concise answers about the detected object via a lightweight Node/Express backend.

## Features

- Image upload and instant preview
- On-device classification with MobileNet (no images leave the browser)
- Top-5 predictions with confidence scores
- Information panel for the top prediction sourced from Wikipedia, including a "Read more" link when available
- In-app Q&A about the current image (optional):
  - Sends the detected label, Wikipedia summary, and recent context to a local backend
  - Uses a Groq OpenAI-compatible API with guardrails to keep answers on-topic
- Responsive UI with loading indicators and graceful error handling
- Performance-conscious loading (resource hints, deferred CSS/fonts, deferred model load)

## Technology Stack

- HTML5, CSS3, JavaScript (ES6+)
- TensorFlow.js with the MobileNet pre-trained model
- Node.js, Express, node-fetch, cors, dotenv (for the optional Q&A backend)

## How to Use

### Image classification (no backend required)
1. Open `index.html` in a modern browser (Chrome, Firefox, Edge).
2. Click "Select Image" and choose an image file.
3. Click "Analyze Image" to run recognition.
4. Review the predictions and the information panel.

### Enable the Q&A assistant (optional)
1. Install dependencies in the project root: `npm install`.
2. Create `server/.env` from `server/.env.example` and set `GROQ_API_KEY`.
3. Start the backend: `npm run start:server` (defaults to `http://127.0.0.1:8787`).
4. In `index.html`, set `window.TEXT_MODEL_ENDPOINT` to `http://127.0.0.1:8787/qa` (or your deployed endpoint).

## Privacy

All image recognition runs entirely in your browser. When the Q&A assistant is enabled, only your text questions and minimal context are sent to the backend; images are not uploaded.

## Browser Compatibility

Works best in modern browsers with WebGL enabled (Chrome, Firefox, Edge).

## License

MIT
