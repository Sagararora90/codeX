import fetch from "node-fetch";
import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ""
});

// Provider Configurations
const MODELS = {
  // Groq Models (Primary Architecture & Execution)
  'groq': { provider: 'groq', id: 'llama-3.3-70b-versatile' },
  'groq-8b': { provider: 'groq', id: 'llama-3.1-8b-instant' },
  
  // Gemini Models (Direct Fetch - Stable v1)
  'gemini-pro': { provider: 'gemini', id: 'gemini-1.5-pro' },
  'gemini-flash': { provider: 'gemini', id: 'gemini-1.5-flash' },
  
  // Hugging Face Models (Fallback Only - Text Generation Path)
  'mistral': { provider: 'hf', id: 'mistralai/Mistral-7B-Instruct-v0.3' },
  'qwen-2.5': { provider: 'hf', id: 'Qwen/Qwen2.5-7B-Instruct' }
};

/* ================= THE ANTIGRAVITY INTENT ROUTER ================= */

const INTENT_ROUTER_PROMPT = `
You are an intent classifier for a coding IDE assistant.

Possible intents:
1. CHAT        (greeting, casual message, question)
2. PLAN        (create/build/make something new)
3. PROCEED     (proceed, continue, next step)
4. MODIFY_PLAN (change assumptions, tasks, stack)
5. FIX         (error, bug, not working)
6. UI_CHANGE   (fix UI, improve UX)
7. UNKNOWN

RULES:
- Do NOT write code. Output ONLY one word from the intent list.
- If casual/unclear, choose CHAT.
`;

const CHAT_MODE_PROMPT = `
You are a conversational assistant inside a coding IDE.
RULES: No tasks, no files, no code. Respond naturally and briefly.
`;

const PLANNING_PROMPT = `
You are an AI architect. 

MODE: PLANNING

STRICT RULES:
- Do NOT create application files.
- Do NOT write code.
- Do NOT assume language unless user specified.
- Output MUST be a valid JSON object. All newlines inside the "contents" string MUST be properly escaped as \\n.
- If the user asks for a React component or React app, you MUST plan a full Vite/React project architecture (including package.json, index.html, index.jsx, and App.jsx) rather than a standalone component, so they can run it natively.

TASKS.md FORMAT:
# Goal
<single sentence>

# Stack
Language: <locked or unknown>
Framework: <if any>

# Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

# Confirmation
Ask the user to review and confirm.

OUTPUT FORMAT (Must be valid JSON, perfectly escaped):
{ "type": "fileTree", "files": { "TASKS.md": { "file": { "contents": "# Goal\\nBuild it\\n\\n# Tasks\\n- [ ] Task 1" } } } }
`;

const EXECUTION_PROMPT = `
You are an AI execution agent inside a coding IDE.

MODE: EXECUTION

CURRENT TASK:
{{CURRENT_TASK}}

RULES (STRICT):
- You are NOT allowed to return examples, schemas, or sample JSON.
- You MUST fully implement the CURRENT TASK in the relevant files.
- You MUST include the updated code for all modified files in the output.
- You MUST update TASKS.md in the fileTree, marking the current task as [x].
- Output MUST be a single, valid JSON fileTree containing TASKS.md AND the fully implemented source code files.
- All newlines inside the "contents" string MUST be properly escaped as \\n. 
- Do NOT output \`\`\`json markdown blocks, just the raw JSON object.
- Do NOT explain. Do NOT invent APIs. Do NOT replan.

If this task requires new files that don't exist yet, respond ONLY with:
FILES_REQUIRED: [file1, file2]

Otherwise, output the full implementation strictly in this JSON format:
{ "type": "fileTree", "files": { "TASKS.md": { "file": { "contents": "... updated tasks list ..." } }, "App.jsx": { "file": { "contents": "... FULL new file content ..." } } } }
`;

const BOOTSTRAP_PROMPT = `
You are an AI file bootstrapper. 

MODE: BOOTSTRAP

RULES:
- Create the approved file(s) named in the prompt.
- File must be FULLY IMPLEMENTED based on the project context. Do not use placeholders or 'minimal' content.
- All newlines inside the "contents" string MUST be properly escaped as \\n.
- Do NOT explain.
- Output MUST be a valid JSON fileTree.

OUTPUT FORMAT:
{ "type": "fileTree", "files": { "filename.js": { "file": { "contents": "... FULL code ..." } } } }
`;

/* ================= PROVIDER LOGIC ================= */

async function callAI(provider, modelId, prompt, forceSystem = null) {
    console.log(`📡 Calling ${provider} for model ${modelId}...`);
    
    if (provider === 'groq') {
        const messages = forceSystem ? [{ role: "system", content: forceSystem }, { role: "user", content: prompt }] : [{ role: "user", content: prompt }];
        const chatCompletion = await groq.chat.completions.create({ messages, model: modelId });
        return chatCompletion.choices[0].message.content;
    } else if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const finalPrompt = forceSystem ? `SYSTEM_INSTRUCTION:\n${forceSystem}\n\nUSER_PROMPT:\n${prompt}` : prompt;
        
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: finalPrompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
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
            headers: { "Authorization": `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                inputs: finalPrompt,
                parameters: { max_new_tokens: 2048, temperature: 0.1 }
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
    if (trimmed.includes('{') && trimmed.includes('}')) {
        try {
            const cleaned = cleanJSON(content);
            const parsed = JSON.parse(cleaned);
            return JSON.stringify(parsed);
        } catch (e) {
            const startBrace = trimmed.indexOf('{');
            const endBrace = trimmed.lastIndexOf('}');
            if (startBrace !== -1 && endBrace !== -1) {
                let candidate = trimmed.slice(startBrace, endBrace + 1);
                while (candidate.length > 2) {
                    try { return JSON.stringify(JSON.parse(candidate)); } 
                    catch {
                        const nextBrace = candidate.lastIndexOf('}', candidate.length - 2);
                        if (nextBrace === -1) break;
                        candidate = candidate.slice(0, nextBrace + 1);
                    }
                }
            }
            return JSON.stringify({ type: "chat", message: trimmed });
        }
    }
    return JSON.stringify({ type: "chat", message: trimmed });
}

function cleanJSON(content) {
    let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    return cleaned.trim();
}

/* ================= TASK PARSER ================= */

function getNextTask(tasksContent) {
    if (!tasksContent) return null;
    const lines = tasksContent.split('\n');
    const uncheckedRegex = /^\s*[-\*]\s*\[\s*\]/;
    const unchecked = lines.find(line => uncheckedRegex.test(line));
    return unchecked ? unchecked.replace(uncheckedRegex, '').trim() : null;
}

/* ================= THE BRAIN (MAIN ENTRY) ================= */

export const generateResult = async (userInput, modelType, currentFileTree = {}) => {
    // Extract the raw user message for the intent router (prevents confusing the classifier with massive context)
    let extractedIntent = userInput;
    const intentMatch = userInput.match(/USER_INTENT:\s*([\s\S]*)/);
    if (intentMatch) {
        extractedIntent = intentMatch[1].trim();
    }

    // 1. CLASSIFY INTENT
    let intent = "CHAT";
    try {
        const intentResult = await callAI('groq', 'llama-3.1-8b-instant', extractedIntent, INTENT_ROUTER_PROMPT);
        intent = intentResult.trim().toUpperCase().split('\n')[0].replace(/[^A-Z_]/g, '');
    } catch (e) {
        console.warn("Intent classification failed, defaulting to CHAT.");
    }
    console.log(`🎯 Intent Detected: ${intent}`);

    // If frontend explicitly sets BOOTSTRAP, override intent
    if (userInput.includes('MODE: BOOTSTRAP')) {
        intent = "BOOTSTRAP";
    }

    // 2. CONTEXT PREPARATION
    let contextString = "";
    Object.entries(currentFileTree).forEach(([path, data]) => {
        if (data.file && data.file.contents && !path.includes('node_modules')) {
            contextString += `--- FILE: ${path} ---\n${data.file.contents}\n`;
        }
    });

    // 3. SELECT OPTIMAL MODE
    let systemPrompt = "";
    let finalPrompt = userInput;
    let preferredModel = 'groq';

    if (intent === "CHAT") {
        systemPrompt = CHAT_MODE_PROMPT;
        preferredModel = 'groq-8b';
    } else if (intent === "PLAN") {
        systemPrompt = PLANNING_PROMPT;
        finalPrompt = `USER_REQUEST: ${extractedIntent}\n\nEXISTING_FILES:\n${contextString}`;
        preferredModel = 'gemini-pro';
    } else if (intent === "BOOTSTRAP") {
        systemPrompt = BOOTSTRAP_PROMPT;
        finalPrompt = userInput;
        preferredModel = 'groq';
    } else if (intent === "PROCEED" || intent === "FIX" || intent === "UI_CHANGE") {
        const tasksMd = currentFileTree['TASKS.md']?.file?.contents;
        let currentTask = getNextTask(tasksMd);
        
        // If they just said "proceed" but there is no task, warn them.
        if (intent === "PROCEED" && !currentTask) {
            return JSON.stringify({ type: "chat", message: "No active plan or all tasks complete. Tell me what you'd like to build next, or use 'make [feature]' to create a new plan!" });
        }
        
        // If they want a fix/UI change without a task list, we just act directly on their request.
        if (!currentTask) {
            currentTask = extractedIntent; // Treat their request as the "current task"
        }
        
        systemPrompt = EXECUTION_PROMPT.replace('{{CURRENT_TASK}}', currentTask);
        finalPrompt = `USER_INTENT: ${extractedIntent}\n\nPROJECT_FILES:\n${contextString}`;
        preferredModel = 'groq';
    } else {
        systemPrompt = CHAT_MODE_PROMPT;
        preferredModel = 'groq-8b';
    }

    // 4. EXECUTE WITH FALLBACKS
    const fallbackChain = [preferredModel, 'groq', 'gemini-flash', 'mistral'];
    const uniqueChain = [...new Set(fallbackChain.filter(m => MODELS[m]))];

    for (const modelId of uniqueChain) {
        const config = MODELS[modelId];
        try {
            const result = await callAI(config.provider, config.id, finalPrompt, systemPrompt);
            return processAIResponse(result);
        } catch (error) {
            console.error(`❌ ${modelId} failed:`, error.message);
        }
    }

    return JSON.stringify({ type: 'chat', message: "⚠️ My brain is a bit overloaded. Can you try that again?" });
};