const imageUpload = document.getElementById('image-upload');
const analyzeBtn = document.getElementById('analyze-btn');
const previewImage = document.getElementById('preview-image');
const resultsDiv = document.getElementById('results');
const loader = document.getElementById('loader');
const infoCard = document.getElementById('info-card');

// Q&A elements
const qaBox = document.getElementById('qa-box');
const qaInput = document.getElementById('qa-input');
const qaSend = document.getElementById('qa-send');
const qaOutput = document.getElementById('qa-output');

let model;
let topLabel = '';
let topSummary = '';
let qaHistory = []; // {role: 'user'|'assistant', content: string}

// Load MobileNet model
async function loadModel() {
    try {
        resultsDiv.innerHTML = '<p>Loading model, please wait...</p>';
        model = await mobilenet.load();
        console.log('✅ MobileNet model loaded successfully');
        resultsDiv.innerHTML = '<p class="placeholder">Model loaded. Now select an image.</p>';
    } catch (error) {
        console.error('Error loading model:', error);
        resultsDiv.innerHTML = '<p style="color:red;">Failed to load model. Try reloading.</p>';
    }
}

// Handle image upload
imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        previewImage.src = e.target.result;
        previewImage.style.display = 'block';
        analyzeBtn.disabled = false;
        resultsDiv.innerHTML = '<p class="placeholder">Click "Analyze" to identify objects</p>';
    };
    reader.readAsDataURL(file);
});

// Analyze image
analyzeBtn.addEventListener('click', async () => {
    if (!model) {
        resultsDiv.innerHTML = '<p style="color:red;">Model not loaded yet.</p>';
        return;
    }

    resultsDiv.innerHTML = '';
    loader.style.display = 'flex';
    analyzeBtn.disabled = true;

    try {
        const predictions = await model.classify(previewImage);
        loader.style.display = 'none';
        displayResults(predictions);
        if (predictions && predictions.length > 0) {
            showInfoForTopPrediction(predictions[0]);
        }
    } catch (error) {
        console.error('Error analyzing image:', error);
        loader.style.display = 'none';
        resultsDiv.innerHTML = '<p style="color:red;">Error analyzing image.</p>';
    }

    analyzeBtn.disabled = false;
});

// Display top predictions
function displayResults(predictions) {
    resultsDiv.innerHTML = '<h3>Results:</h3>';
    predictions.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <strong>${index + 1}. ${p.className}</strong>
            <span style="float:right">${(p.probability * 100).toFixed(2)}%</span>
        `;
        resultsDiv.appendChild(div);
    });
}

function normalizeLabel(label) {
    if (!label) return '';
    return label.split(',')[0].trim();
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
}

async function fetchWikiSummary(query) {
    const q = query.replace(/\s+/g, ' ').trim();
    let res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`);
    if (res.ok) {
        const data = await res.json();
        if (data && data.extract) {
            return {
                title: data.title,
                extract: data.extract,
                url: (data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page) ? data.content_urls.desktop.page : undefined
            };
        }
    }
    const sRes = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&origin=*&search=${encodeURIComponent(q)}`);
    if (sRes.ok) {
        const arr = await sRes.json();
        const title = arr && arr[1] && arr[1][0];
        if (title) {
            res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.extract) {
                    return {
                        title: data.title,
                        extract: data.extract,
                        url: (data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page) ? data.content_urls.desktop.page : undefined
                    };
                }
            }
        }
    }
    return null;
}

async function showInfoForTopPrediction(topPrediction) {
    if (!infoCard) return;
    const label = normalizeLabel(topPrediction.className || topPrediction);

    infoCard.style.display = 'block';
    infoCard.innerHTML = `
        <div class="info-header">
            <i class="fas fa-info-circle"></i>
            <h3>About: ${escapeHtml(label)}</h3>
        </div>
        <div class="info-content"><p>Fetching details...</p></div>
    `;

    try {
        const info = await fetchWikiSummary(label);
        if (info && info.extract) {
            topLabel = label;
            topSummary = info.extract;
            const moreLink = info.url ? `<a class="info-link" href="${info.url}" target="_blank" rel="noopener">Read more</a>` : '';
            infoCard.querySelector('.info-content').innerHTML = `<p>${escapeHtml(info.extract)}</p>${moreLink}`;
        } else {
            infoCard.querySelector('.info-content').innerHTML = `<p class="placeholder">No additional information found.</p>`;
        }
    } catch (e) {
        console.error('Error fetching info:', e);
        infoCard.querySelector('.info-content').innerHTML = `<p class="placeholder">Unable to fetch details right now.</p>`;
    }
    // Show Q&A box once info card flow has run (even if summary failed)
    if (qaBox) qaBox.style.display = 'block';
}

// Optional off-topic guard is now handled by the model prompt; we accept questions by default once an image is analyzed.
async function getAnswerForQuestion(question) {
    // Optional robust LLM: If you set window.TEXT_MODEL_ENDPOINT, call it with rich context and guardrails.
    if (window.TEXT_MODEL_ENDPOINT) {
        try {
            // Keep last few turns for context
            const recent = qaHistory.slice(-6);
            const messages = [
                { role: 'system', content: 'You are an assistant answering questions strictly about the current image. If the question is off-topic, reply exactly: "Please ask in the context of the current image." Keep answers concise (2–4 sentences). Prefer factual, specific answers. Use the provided label, summary and predictions as context.' },
                { role: 'user', content: `Label: ${topLabel}\nSummary: ${topSummary || 'N/A'}\nPredictions: ${(() => { try { return Array.from(document.querySelectorAll('#results .result-item')).slice(0,5).map(el => el.textContent.trim()).join(' | ');} catch(_) {return '';} })()}\n---\nUser question: ${question}` }
            ];
            messages.splice(1, 0, ...recent); // insert history after system
            const payload = {
                messages,
                model: window.TEXT_MODEL_NAME || undefined,
                temperature: 0.3,
                max_tokens: 350,
            };
            const res = await fetch(window.TEXT_MODEL_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.answer) return data.answer;
            }
        } catch (e) {
            console.warn('Text model endpoint failed, falling back:', e);
        }
    }
    // Fallback augmentation: try DuckDuckGo Instant Answer
    try {
        const ddg = await ddgInstantAnswer(topLabel, question);
        if (ddg) return ddg;
    } catch (_) {}
    // Fallback simple answer using the summary
    if (topSummary) {
        const firstSentences = topSummary.split(/(?<=\.)\s+/).slice(0, 2).join(' ');
        return `From the image context (${topLabel}): ${firstSentences}`;
    }
    return `The image appears to show: ${topLabel}.`;
}

async function ddgInstantAnswer(label, question) {
    const q = `${label} ${question}`.trim();
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const abstract = (data.AbstractText || data.Abstract || '').trim();
    if (abstract) return abstract;
    // Try to mine possible infobox-like content
    const raw = JSON.stringify(data).toLowerCase();
    const m = raw.match(/(life\s*span[^:]*[:=]\s*\"?([0-9\.\-\s]+\s*(years?|yrs?|year|y)))/);
    if (m && m[2]) return `${label} lifespan: ${m[2]}`;
    return null;
}

function appendQA(text) {
    if (!qaOutput) return;
    const p = document.createElement('p');
    p.textContent = text;
    qaOutput.appendChild(p);
    qaOutput.scrollTop = qaOutput.scrollHeight;
}

function autoResizeQA() {
    if (!qaInput) return;
    qaInput.style.height = 'auto';
    qaInput.style.height = Math.min(qaInput.scrollHeight, 140) + 'px';
}

function setCollapsed(collapsed) {
    if (!qaBox) return;
    qaBox.classList.toggle('collapsed', !!collapsed);
    const t = document.getElementById('qa-toggle');
    if (t) {
        t.setAttribute('aria-expanded', String(!collapsed));
        const icon = t.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-chevron-down', 'fa-chevron-up');
            icon.classList.add(collapsed ? 'fa-chevron-up' : 'fa-chevron-down');
        }
    }
}

function toggleCollapse() {
    if (!qaBox) return;
    setCollapsed(!qaBox.classList.contains('collapsed'));
}

function wireQA() {
    if (!qaInput || !qaSend) return;
    autoResizeQA();

    // Collapse/expand handlers
    const qaHeader = document.querySelector('.qa-header');
    const qaToggle = document.getElementById('qa-toggle');
    if (qaHeader) {
        qaHeader.addEventListener('click', (e) => {
            if (e.target && e.target.closest && e.target.closest('#qa-toggle')) return;
            toggleCollapse();
        });
        qaHeader.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.shiftKey) {
                e.preventDefault();
                toggleCollapse();
            }
        });
    }
    if (qaToggle) {
        qaToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCollapse();
        });
    }

    // Default to expanded when shown
    setCollapsed(false);

    const submit = async () => {
        const q = qaInput.value.trim();
        if (!q) return;
        if (!topLabel) {
            appendQA('Please analyze an image first.');
            return;
        }
        qaSend.disabled = true;
        appendQA(`You: ${q}`);
        qaHistory.push({ role: 'user', content: q });
        try {
            const ans = await getAnswerForQuestion(q);
            appendQA(`AI: ${ans}`);
            qaHistory.push({ role: 'assistant', content: ans });
        } finally {
            qaSend.disabled = false;
            qaInput.value = '';
            qaInput.focus();
            autoResizeQA();
        }
    };
    qaSend.addEventListener('click', submit);
    qaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    });
    qaInput.addEventListener('input', autoResizeQA);
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    loadModel();
    wireQA();
});
