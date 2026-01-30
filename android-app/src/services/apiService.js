/**
 * API Service for communicating with the ABalancedTeacher backend
 */

// Default to localhost - user should configure this to their server IP
const DEFAULT_BASE_URL = 'http://10.0.2.2:7860'; // Android emulator localhost

let baseUrl = DEFAULT_BASE_URL;

export const setBaseUrl = (url) => {
    baseUrl = url;
};

export const getBaseUrl = () => baseUrl;

/**
 * Simple generate request to Ollama
 */
export const generateSimple = async (prompt, model, system = '', temperature = 0.3) => {
    const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt,
            system,
            temperature,
            stream: false,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
};

/**
 * Router system prompt for query classification
 */
const ROUTER_SYSTEM_PROMPT = `You are a query classifier. Analyze the user's question and decide:

1. DIFFICULTY (which teacher model to use):
   - "fast": Simple questions, greetings, quick facts, definitions, yes/no questions
   - "normal": General explanations, comparisons, "how does X work", basic coding
   - "strong": Complex reasoning, detailed analysis, debugging, multi-step problems, proofs, advanced topics

2. CREATIVITY (temperature 0.0 to 1.0):
   - 0.2-0.4: Factual questions, math, code, precise answers needed
   - 0.5-0.7: General explanations, balanced response
   - 0.8-1.0: Creative writing, brainstorming, open-ended exploration

Respond with ONLY a JSON object, no other text:
{"difficulty": "fast|normal|strong", "temperature": 0.0-1.0, "reason": "brief explanation"}`;

/**
 * Apply Gaussian distribution to temperature, centered at 0.7
 */
const applyGaussianTemperature = (baseTemp) => {
    const TEMP_MEAN = 0.7;
    const TEMP_SIGMA = 0.15;

    const distanceFromMean = Math.abs(baseTemp - TEMP_MEAN);
    const gaussianWeight = Math.exp(-(distanceFromMean ** 2) / (2 * TEMP_SIGMA ** 2));
    const adjustedTemp = baseTemp * gaussianWeight + TEMP_MEAN * (1 - gaussianWeight);

    return Math.max(0.0, Math.min(1.0, adjustedTemp));
};

/**
 * Classify user query using the router model
 */
export const classifyQuery = async (userPrompt, routerModel = 'qwen2.5:1.5b') => {
    try {
        const result = await generateSimple(
            `Classify this query:\n\n${userPrompt}`,
            routerModel,
            ROUTER_SYSTEM_PROMPT,
            0.2,
        );

        // Parse JSON from response
        const jsonMatch = result.match(/\{[^}]+\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            let difficulty = (parsed.difficulty || 'normal').toLowerCase();
            if (!['fast', 'normal', 'strong'].includes(difficulty)) {
                difficulty = 'normal';
            }

            let baseTemperature = parseFloat(parsed.temperature || 0.7);
            baseTemperature = Math.max(0.0, Math.min(1.0, baseTemperature));
            const temperature = applyGaussianTemperature(baseTemperature);

            const reason = parsed.reason || 'AI classification';

            return { difficulty, temperature, reason };
        }
    } catch (error) {
        console.error('Classification error:', error);
    }

    return { difficulty: 'normal', temperature: 0.7, reason: 'Fallback classification' };
};

/**
 * Chat with streaming response
 */
export const chatStream = async (messages, model, temperature, onChunk, onComplete, onError) => {
    try {
        const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                stream: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    const content = data.message?.content || '';
                    if (content) {
                        fullResponse += content;
                        onChunk(content, fullResponse);
                    }
                    if (data.done) {
                        onComplete(fullResponse);
                        return fullResponse;
                    }
                } catch (e) {
                    // Skip invalid JSON lines
                }
            }
        }

        onComplete(fullResponse);
        return fullResponse;
    } catch (error) {
        onError(error);
        throw error;
    }
};

/**
 * Non-streaming chat
 */
export const chat = async (messages, model, temperature = 0.7) => {
    const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            stream: false,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || '';
};

/**
 * List available models
 */
export const listModels = async () => {
    try {
        const response = await fetch(`${baseUrl}/api/tags`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return data.models?.map(m => m.name) || [];
    } catch (error) {
        console.error('Error listing models:', error);
        return [];
    }
};

/**
 * Check if the server is reachable
 */
export const checkConnection = async () => {
    try {
        const response = await fetch(`${baseUrl}/api/tags`, {
            method: 'GET',
            timeout: 5000,
        });
        return response.ok;
    } catch (error) {
        return false;
    }
};

/**
 * Get tier info based on difficulty
 */
export const getTierInfo = (difficulty, settings = {}) => {
    const fastModel = settings.fastModel || 'quick-tutor';
    const normalModel = settings.normalModel || 'balanced-tutor';
    const strongModel = settings.strongModel || 'deep-tutor';

    const tiers = {
        fast: { emoji: '🚀', label: 'fast', model: fastModel, color: '#22c55e' },
        normal: { emoji: '⚡', label: 'good', model: normalModel, color: '#eab308' },
        strong: { emoji: '🧠', label: 'strong', model: strongModel, color: '#8b5cf6' },
    };

    return tiers[difficulty] || tiers.normal;
};
