import fetch from "node-fetch";
import Groq from "groq-sdk";

/* ================= THE ANTIGRAVITY INTENT ROUTER ================= */

const INTENT_ROUTER_PROMPT = `
You are an intent classifier for a coding IDE assistant.

Possible intents:
1. CHAT        (greeting, casual message, question)
2. BUILD       (create/build/make something new, generate code)
3. FIX         (error, bug, not working)
4. UI_CHANGE   (fix UI, improve UX)
5. UNKNOWN

RULES:
- Do NOT write code. Output ONLY one word from the intent list.
- If casual/unclear, choose CHAT.
- If user says "proceed", "continue", "next", "go ahead" => BUILD
- If user says "make", "create", "build", "generate", "write" => BUILD
`;

const CHAT_MODE_PROMPT = `
You are a conversational assistant inside a coding IDE called CodeX.
RULES: No tasks, no files, no code. Respond naturally and briefly. Be helpful and friendly.
`;

const AGENTIC_BUILD_PROMPT = `
You are an autonomous AI coding agent inside a professional IDE called CodeX.

MODE: AUTONOMOUS BUILD

You receive a user request and the current project files. You MUST generate ALL the necessary code files in a single response.

STRICT RULES:
- You MUST output a SINGLE valid JSON object with ALL implementation files.
- Generate COMPLETE, PRODUCTION-READY code. No placeholders, no TODOs, no "add your code here".
- Every file must be fully implemented and functional.
- Include ALL necessary files (HTML, CSS, JS, config files, etc.)
- All newlines inside "contents" strings MUST be escaped as \\n
- All quotes inside "contents" strings MUST be escaped as \\"
- Do NOT wrap output in \`\`\`json markdown blocks.
- Do NOT explain anything before or after the JSON.
- Do NOT output a TASKS.md - just output the actual code files.
- Keep the response as compact as possible to avoid truncation.

OUTPUT FORMAT (strict JSON, nothing else):
{"type":"fileTree","files":{"index.html":{"file":{"contents":"<!DOCTYPE html>..."}},"style.css":{"file":{"contents":"body{...}"}},"script.js":{"file":{"contents":"console.log('hello');"}}}}

CRITICAL: Output ONLY the JSON object. No text before or after it. Keep file contents concise but complete.
`;

const FIX_PROMPT = `
You are an AI debugging agent inside a coding IDE called CodeX.

MODE: FIX/MODIFY

You receive the user's fix request and the current project files. You must output the corrected files.

STRICT RULES:
- Output a valid JSON object containing ONLY the files that need changes.
- Each file must contain the COMPLETE updated content (not just the diff).
- All newlines inside "contents" strings MUST be escaped as \\n
- All quotes inside "contents" strings MUST be escaped as \\"
- Do NOT wrap in markdown. Do NOT explain.
- Output ONLY the JSON.

OUTPUT FORMAT:
{"type":"fileTree","files":{"filename.js":{"file":{"contents":"...full corrected file..."}}}}
`;

/* ================= PROVIDER LOGIC ================= */

async function callAI(provider, modelId, prompt, forceSystem = null, apiKey = null) {
    if (!apiKey) throw new Error('API Key is missing. Please configure your API key in the editor settings.');
    console.log(`📡 Calling ${provider} for model ${modelId}...`);
    
    if (provider === 'groq') {
        const messages = forceSystem 
            ? [{ role: "system", content: forceSystem }, { role: "user", content: prompt }] 
            : [{ role: "user", content: prompt }];
        const groq = new Groq({ apiKey, dangerouslyAllowBrowser: false });
        const chatCompletion = await groq.chat.completions.create({ 
            messages, 
            model: modelId,
            max_tokens: 8192,
            temperature: 0.1
        });
        return chatCompletion.choices[0].message.content;
    } else if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;
        const finalPrompt = forceSystem ? `SYSTEM_INSTRUCTION:\n${forceSystem}\n\nUSER_PROMPT:\n${prompt}` : prompt;
        
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: finalPrompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
            })
        });
        
        const data = await response.json();
        if (data.error || !data.candidates) {
            throw new Error(data.error?.message || "Gemini API Error");
        }
        return data.candidates[0]?.content?.parts?.[0]?.text || "";
    } else if (provider === 'hf') {
        const url = `https://api-inference.huggingface.co/models/${modelId}`;
        const finalPrompt = forceSystem ? `${forceSystem}\n\nUSER: ${prompt}` : prompt;
        
        const response = await fetch(url, {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                inputs: finalPrompt,
                parameters: { max_new_tokens: 4096, temperature: 0.1 }
            })
        });
        const data = await response.json();
        if (data.error || response.status !== 200) throw new Error(data.error?.message || response.statusText);
        return Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
    }
}

/* ================= RESPONSE PROCESSING ================= */

function processAIResponse(content) {
    if (!content) return "";
    const trimmed = content.trim();
    
    // If it doesn't look like JSON at all, wrap it as chat
    if (!trimmed.includes('{')) {
        return JSON.stringify({ type: "chat", message: trimmed });
    }
    
    // Try direct parse first
    try {
        const cleaned = cleanJSON(content);
        const parsed = JSON.parse(cleaned);
        return JSON.stringify(parsed);
    } catch (e) {
        // JSON is probably truncated. Try to repair it.
        let candidate = cleanJSON(content);
        
        // Strategy 1: Try closing open strings and brackets
        // Remove trailing incomplete string value (cut off mid-string)
        const lastQuoteIdx = candidate.lastIndexOf('"');
        if (lastQuoteIdx > 0) {
            const afterLastQuote = candidate.substring(lastQuoteIdx + 1).trim();
            // If the content after the last quote doesn't look like valid JSON continuation
            // it was probably cut off mid-string
            if (afterLastQuote && !afterLastQuote.match(/^[,}\]:]/) ) {
                // Truncated mid-string-value. Cut at last complete key-value
                candidate = candidate.substring(0, lastQuoteIdx + 1);
            }
        }
        
        // Strategy 2: Try appending closing brackets
        for (let closers of ['}}}}', '}}}', '}}', '}', '"}}}}', '"}}}"}}', '"}}}', '"}}', '"}']) {
            try {
                const attempt = candidate + closers;
                const parsed = JSON.parse(attempt);
                if (parsed.type === 'fileTree' && parsed.files) {
                    // Validate that at least one file has contents
                    const files = Object.keys(parsed.files);
                    if (files.length > 0) {
                        // Remove any files with incomplete/empty contents
                        for (const f of files) {
                            if (!parsed.files[f]?.file?.contents) {
                                delete parsed.files[f];
                            }
                        }
                        if (Object.keys(parsed.files).length > 0) {
                            console.log(`🔧 Repaired truncated JSON (${Object.keys(parsed.files).length} files recovered)`);
                            return JSON.stringify(parsed);
                        }
                    }
                }
                return JSON.stringify(parsed);
            } catch (e2) {}
        }
        
        // Strategy 3: try stripping from end to find valid JSON
        const startBrace = trimmed.indexOf('{');
        const endBrace = trimmed.lastIndexOf('}');
        if (startBrace !== -1 && endBrace !== -1 && endBrace > startBrace) {
            let cand = trimmed.slice(startBrace, endBrace + 1);
            for (let attempts = 0; attempts < 10 && cand.length > 2; attempts++) {
                try { 
                    return JSON.stringify(JSON.parse(cand)); 
                } catch {
                    const nextBrace = cand.lastIndexOf('}', cand.length - 2);
                    if (nextBrace === -1) break;
                    cand = cand.slice(0, nextBrace + 1);
                }
            }
        }
        
        // All repair attempts failed - return as chat message
        console.warn('⚠️ JSON repair failed, returning as chat message');
        return JSON.stringify({ type: "chat", message: trimmed });
    }
}

function cleanJSON(content) {
    let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    // Remove any text before the first {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    } else if (firstBrace !== -1) {
        // No closing brace found (truncated) - take everything from first brace
        cleaned = cleaned.slice(firstBrace);
    }
    return cleaned.trim();
}

/* ================= THE BRAIN (MAIN ENTRY) ================= */

export const generateResult = async (userInput, modelType, currentFileTree = {}, apiKey = null, provider = 'groq') => {
    // Extract the raw user message for the intent router
    let extractedIntent = userInput;
    const intentMatch = userInput.match(/USER_INTENT:\s*([\s\S]*)/);
    if (intentMatch) {
        extractedIntent = intentMatch[1].trim();
    }

    // 1. CLASSIFY INTENT
    let intent = "CHAT";
    try {
        const intentResult = await callAI(provider, modelType, extractedIntent, INTENT_ROUTER_PROMPT, apiKey);
        intent = intentResult.trim().toUpperCase().split('\n')[0].replace(/[^A-Z_]/g, '');
    } catch (e) {
        console.warn("Intent classification failed, defaulting to CHAT.");
    }
    console.log(`🎯 Intent Detected: ${intent}`);

    // Normalize legacy intents
    if (intent === 'PLAN' || intent === 'PROCEED' || intent === 'BOOTSTRAP') {
        intent = 'BUILD';
    }

    // 2. CONTEXT PREPARATION
    let contextString = "";
    const fileEntries = Object.entries(currentFileTree);
    fileEntries.forEach(([path, data]) => {
        if (data.file && data.file.contents && !path.includes('node_modules') && path !== 'TASKS.md') {
            contextString += `--- FILE: ${path} ---\n${data.file.contents}\n`;
        }
    });

    // 3. SELECT MODE & EXECUTE
    let systemPrompt = "";
    let finalPrompt = userInput;

    if (intent === "CHAT") {
        systemPrompt = CHAT_MODE_PROMPT;
    } else if (intent === "BUILD") {
        systemPrompt = AGENTIC_BUILD_PROMPT;
        finalPrompt = `USER REQUEST: ${extractedIntent}`;
        if (contextString) {
            finalPrompt += `\n\nEXISTING PROJECT FILES:\n${contextString}`;
        }
    } else if (intent === "FIX" || intent === "UI_CHANGE" || intent === "MODIFY_PLAN") {
        systemPrompt = FIX_PROMPT;
        finalPrompt = `USER REQUEST: ${extractedIntent}\n\nCURRENT PROJECT FILES:\n${contextString}`;
    } else {
        systemPrompt = CHAT_MODE_PROMPT;
    }

    // 4. EXECUTE
    try {
        const result = await callAI(provider, modelType, finalPrompt, systemPrompt, apiKey);
        return processAIResponse(result);
    } catch (error) {
        console.error(`❌ ${provider}:${modelType} failed:`, error.message);
        return JSON.stringify({ type: 'chat', message: `⚠️ AI Error: ${error.message}` });
    }
};
