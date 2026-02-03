import fetch from "node-fetch";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ""
});

// Initialize Gemini client (Model initialized later to use SYSTEM_INSTRUCTION)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
let model;

/* ================= ENHANCED SYSTEM INSTRUCTION ================= */

const SYSTEM_INSTRUCTION = `
You are a helpful coding buddy integrated into a code editor. You understand what users want and generate exactly what they need.

YOUR JOB:
1. Read what the user wants carefully
2. If they want to chat/ask questions → respond with "chat"
3. If they want code (any hint of programming) → respond with "fileTree"

RESPONSE FORMATS:

For conversations/questions:
{
  "type": "chat",
  "message": "your friendly response here"
}

For ANY code request (problems, apps, scripts, servers):
{
  "type": "fileTree",
  "files": {
    "filename.ext": {
      "file": {
        "contents": "complete working code with \\n for newlines"
      }
    }
  }
}

CRITICAL - READ THIS:
- NEVER give placeholder code like "Hello World" or "Add your code here" or "pass"
- If user gives a problem (palindrome, calculator, sorting), SOLVE IT FULLY
- If they mention Express/React/Flask, USE that framework
- If they give examples (Input: 121, Output: true), your code MUST work for those
- Test your solution mentally before sending
- Use proper filenames: solution.py, server.js, Main.java, etc.
- Escape: \\n (newlines), \\" (quotes), \\\\ (backslashes)
- NO explanations outside JSON - code should be self-explanatory with comments

Think like a friend who actually solves the problem, not someone who gives templates!

OUTPUT ONLY VALID JSON - NO MARKDOWN, NO EXTRA TEXT.
`;

// Initialize Gemini model with system instruction
model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp", systemInstruction: SYSTEM_INSTRUCTION });

/* ================= ENHANCED LANGUAGE DETECTION ================= */

const LANGUAGE_PATTERNS = {
  python: {
    keywords: ['python', 'phyton', 'pyhton', 'py', 'django', 'flask', 'pandas', 'numpy'],
    extension: '.py',
    priority: 1
  },
  javascript: {
    keywords: ['javascript', 'js', 'node', 'nodejs', 'react', 'vue', 'express', 'npm'],
    extension: '.js',
    priority: 1
  },
  java: {
    keywords: ['java', 'spring', 'maven', 'gradle'],
    extension: '.java',
    priority: 2
  },
  cpp: {
    keywords: ['c++', 'cpp', 'c plus plus', 'cplus'],
    extension: '.cpp',
    priority: 2
  },
  c: {
    keywords: ['c programming', ' c ', 'clang'],
    extension: '.c',
    priority: 3
  },
  html: {
    keywords: ['html', 'webpage', 'web page'],
    extension: '.html',
    priority: 1
  },
  css: {
    keywords: ['css', 'style', 'stylesheet'],
    extension: '.css',
    priority: 2
  },
  typescript: {
    keywords: ['typescript', 'ts'],
    extension: '.ts',
    priority: 2
  },
  go: {
    keywords: ['golang', 'go lang', ' go '],
    extension: '.go',
    priority: 2
  },
  rust: {
    keywords: ['rust', 'cargo'],
    extension: '.rs',
    priority: 2
  },
  ruby: {
    keywords: ['ruby', 'rails'],
    extension: '.rb',
    priority: 2
  },
  php: {
    keywords: ['php', 'laravel'],
    extension: '.php',
    priority: 2
  }
};

const CODE_INTENT_KEYWORDS = [
  'code', 'program', 'script', 'function', 'class', 'write a', 'create a',
  'build', 'make a', 'make an', 'develop', 'implement', 'generate code', 'algorithm',
  'app', 'application', 'project', 'file', 'demo',
  'calculator', 'game', 'tool', 'system', 'loop', 'array', 'sort',
  'search', 'fetch', 'api', 'database', 'crud', 'hello world program',
  'solve', 'solution', 'return', 'input:', 'output:', 'example',
  'given', 'need to', 'your turn', 'now write',
  // Framework/library keywords (strong code indicators)
  'express', 'react', 'flask', 'django', 'spring', 'fastapi', 'next.js',
  'server', 'api endpoint', 'rest api', 'graphql', 'websocket',
  'component', 'hook', 'middleware', 'route', 'controller',
  'banao', 'likho code', 'dikhao code', 'karo code' // Hindi keywords
];

const CHAT_INTENT_KEYWORDS = [
  'hello', 'hi', 'hey', 'what', 'why', 'how', 'when', 'where', 'who',
  'explain', 'tell me', 'describe', 'difference', 'compare',
  'kya hai', 'kaise', 'kyu', 'kab', 'batao', 'samjhao'
];

/* ================= SMART LANGUAGE DETECTOR ================= */

function detectLanguage(prompt) {
  const p = prompt.toLowerCase();
  
  let bestMatch = null;
  let highestScore = 0;

  for (const [lang, config] of Object.entries(LANGUAGE_PATTERNS)) {
    let score = 0;
    
    for (const keyword of config.keywords) {
      if (p.includes(keyword)) {
        score += (5 - config.priority); // Higher priority = higher score
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = lang;
    }
  }

  // Only return language if we have a strong match (score > 0)
  // Don't default to Python here - let analyzePrompt decide
  return highestScore > 0 ? bestMatch : null;
}

/* ================= ENHANCED PROMPT ANALYZER ================= */

function analyzePrompt(userPrompt) {
  const p = userPrompt.toLowerCase().trim();

  // Check if prompt ends with a language specification (strong code indicator)
  const endsWithLanguage = /\b(in|using|with)\s+(python|java|c\+\+|cpp|javascript|js|c|go|rust|php|ruby)\s*$/i.test(p);

  // Check for problem-solving patterns (Input:, Output:, Example, etc.)
  const isProblemStatement = /input:|output:|example|given|you need to|return/i.test(userPrompt);

  // First, check for explicit chat intents (highest priority)
  const hasChatIntent = CHAT_INTENT_KEYWORDS.some(keyword => 
    p.startsWith(keyword) || p.includes(' ' + keyword + ' ') || p.endsWith(keyword)
  );

  // Check if it's a question
  const isQuestion = p.includes('?');

  // Check for code generation intent
  const hasCodeIntent = CODE_INTENT_KEYWORDS.some(keyword => p.includes(keyword));
  
  // Detect language mentions
  const languageDetected = detectLanguage(userPrompt);

  // Decision logic with priority:
  
  // 1. If ends with language specification → CODE (highest priority for code)
  if (endsWithLanguage || isProblemStatement) {
    const language = languageDetected || 'python';
    return { type: 'code', language };
  }

  // 2. If starts with greeting/chat keyword and no code intent → CHAT
  if (hasChatIntent && !hasCodeIntent && !languageDetected) {
    return { type: 'chat', language: null };
  }

  // 3. If it's a question without code keywords → CHAT
  if (isQuestion && !hasCodeIntent && !languageDetected) {
    return { type: 'chat', language: null };
  }

  // 4. If has code intent OR specific language mentioned → CODE
  if (hasCodeIntent || languageDetected) {
    const language = languageDetected || 'python';
    return { type: 'code', language };
  }

  // 5. Very short prompts (< 4 words) without code keywords → CHAT
  const wordCount = p.split(/\s+/).length;
  if (wordCount < 4 && !languageDetected) {
    return { type: 'chat', language: null };
  }

  // 6. Default to chat for ambiguous cases
  return { type: 'chat', language: null };
}

/* ================= SMART PROMPT BUILDER ================= */

function buildPrompt(userPrompt, analysis) {
  if (analysis.type === 'chat') {
    return `
The user is asking you a question or wants to chat. Just answer them normally like a helpful friend!

Their question:
${userPrompt}

YOUR TASK:
- Give a clear, helpful answer
- Be friendly and conversational
- NO code - just explanation
- If they're confused, help them understand

Return ONLY this JSON:
{
  "type": "chat",
  "message": "your friendly response here"
}
`;
  }

  // Code generation
  return `
Bro, the user needs ${analysis.language.toUpperCase()} code. Help them out properly!

What they want:
${userPrompt}

YOUR TASK:
- If they mentioned Express/React/Flask/Django → USE IT, don't ignore
- If it's a problem with examples → SOLVE IT COMPLETELY, test it mentally
- NO "Hello World" or "TODO" or placeholder nonsense
- Write REAL working code that actually does what they asked
- Make sure it handles all the test cases they gave

Technical stuff:
- Return type "fileTree" 
- Filename: something.${LANGUAGE_PATTERNS[analysis.language].extension}
- Escape: \\n for newlines, \\" for quotes
- Add comments so they understand the logic
- Include all imports they'll need

The code should work perfectly when they run it. Think like you're helping a friend, not giving them homework to complete!

Return ONLY this JSON format:
{
  "type": "fileTree",
  "files": {
    "filename${LANGUAGE_PATTERNS[analysis.language].extension}": {
      "file": {
        "contents": "actual working solution here with \\\\n for newlines"
      }
    }
  }
}
`;
}

/* ================= ENHANCED FALLBACK TEMPLATES ================= */

const FALLBACK_TEMPLATES = {
  python: (prompt) => {
    const p = prompt.toLowerCase();
    
    // Palindrome problem
    if (p.includes('palindrome')) {
      return {
        type: "fileTree",
        files: {
          "solution.py": {
            file: {
              contents: `# ${extractTaskFromPrompt(prompt)}\n# Check if integer is palindrome\n\ndef isPalindrome(x):\n    # Negative numbers are not palindromes\n    if x < 0:\n        return False\n    \n    # Convert to string and check if it reads same forwards and backwards\n    str_x = str(x)\n    return str_x == str_x[::-1]\n\n# Test cases\nif __name__ == "__main__":\n    # Example 1\n    print(isPalindrome(121))  # True\n    \n    # Example 2\n    print(isPalindrome(-121)) # False\n    \n    # Example 3\n    print(isPalindrome(10))   # False`
            }
          }
        }
      };
    }
    
    // Calculator
    if (p.includes('calculator')) {
      return {
        type: "fileTree",
        files: {
          "calculator.py": {
            file: {
              contents: `# ${extractTaskFromPrompt(prompt)}\n# Simple Calculator\n\ndef calculator():\n    print("Simple Calculator")\n    print("Operations: +, -, *, /")\n    \n    num1 = float(input("Enter first number: "))\n    operation = input("Enter operation: ")\n    num2 = float(input("Enter second number: "))\n    \n    if operation == '+':\n        result = num1 + num2\n    elif operation == '-':\n        result = num1 - num2\n    elif operation == '*':\n        result = num1 * num2\n    elif operation == '/':\n        result = num1 / num2 if num2 != 0 else "Error: Division by zero"\n    else:\n        result = "Invalid operation"\n    \n    print(f"Result: {result}")\n\nif __name__ == "__main__":\n    calculator()`
            }
          }
        }
      };
    }
    
    // Sorting
    if (p.includes('sort')) {
      return {
        type: "fileTree",
        files: {
          "sort.py": {
            file: {
              contents: `# ${extractTaskFromPrompt(prompt)}\n# Bubble Sort Algorithm\n\ndef bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr\n\nif __name__ == "__main__":\n    numbers = [64, 34, 25, 12, 22, 11, 90]\n    print("Original array:", numbers)\n    sorted_array = bubble_sort(numbers.copy())\n    print("Sorted array:", sorted_array)`
            }
          }
        }
      };
    }
    
    // Default Python template
    return {
      type: "fileTree",
      files: {
        "main.py": {
          file: {
            contents: `# ${extractTaskFromPrompt(prompt)}\n\ndef main():\n    print("Hello World")\n    # Add your code here\n\nif __name__ == "__main__":\n    main()`
          }
        }
      }
    };
  },

  javascript: (prompt) => {
    const p = prompt.toLowerCase();
    
    // Express server
    if (p.includes('express') || p.includes('server') || p.includes('api')) {
      return {
        type: "fileTree",
        files: {
          "server.js": {
            file: {
              contents: `// ${extractTaskFromPrompt(prompt)}\n// Express Server\n\nconst express = require('express');\nconst app = express();\nconst PORT = 3000;\n\n// Middleware\napp.use(express.json());\n\n// Routes\napp.get('/', (req, res) => {\n    res.json({ message: 'Hello from Express Server!' });\n});\n\napp.get('/api/data', (req, res) => {\n    res.json({ data: 'Sample data from API' });\n});\n\napp.post('/api/data', (req, res) => {\n    const { name } = req.body;\n    res.json({ message: \`Received: \${name}\` });\n});\n\n// Start server\napp.listen(PORT, () => {\n    console.log(\`Server running on http://localhost:\${PORT}\`);\n});`
            }
          }
        }
      };
    }
    
    // Palindrome
    if (p.includes('palindrome')) {
      return {
        type: "fileTree",
        files: {
          "solution.js": {
            file: {
              contents: `// ${extractTaskFromPrompt(prompt)}\n// Check if integer is palindrome\n\nfunction isPalindrome(x) {\n    // Negative numbers are not palindromes\n    if (x < 0) return false;\n    \n    // Convert to string and check\n    const str = x.toString();\n    return str === str.split('').reverse().join('');\n}\n\n// Test cases\nconsole.log(isPalindrome(121));  // true\nconsole.log(isPalindrome(-121)); // false\nconsole.log(isPalindrome(10));   // false`
            }
          }
        }
      };
    }
    
    // Default JavaScript
    return {
      type: "fileTree",
      files: {
        "main.js": {
          file: {
            contents: `// ${extractTaskFromPrompt(prompt)}\n\nfunction main() {\n    console.log("Hello World");\n    // Add your code here\n}\n\nmain();`
          }
        }
      }
    };
  },

  java: (prompt) => {
    const p = prompt.toLowerCase();
    
    // Palindrome
    if (p.includes('palindrome')) {
      return {
        type: "fileTree",
        files: {
          "Solution.java": {
            file: {
              contents: `// ${extractTaskFromPrompt(prompt)}\n// Check if integer is palindrome\n\npublic class Solution {\n    public static boolean isPalindrome(int x) {\n        // Negative numbers are not palindromes\n        if (x < 0) return false;\n        \n        // Reverse the number\n        int original = x;\n        int reversed = 0;\n        \n        while (x != 0) {\n            int digit = x % 10;\n            reversed = reversed * 10 + digit;\n            x /= 10;\n        }\n        \n        return original == reversed;\n    }\n    \n    public static void main(String[] args) {\n        System.out.println(isPalindrome(121));  // true\n        System.out.println(isPalindrome(-121)); // false\n        System.out.println(isPalindrome(10));   // false\n    }\n}`
            }
          }
        }
      };
    }
    
    // Default Java
    return {
      type: "fileTree",
      files: {
        "Main.java": {
          file: {
            contents: `// ${extractTaskFromPrompt(prompt)}\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n        // Add your code here\n    }\n}`
          }
        }
      }
    };
  },

  cpp: (prompt) => {
    const p = prompt.toLowerCase();
    
    // Coin Change Problem
    if (p.includes('coin') && (p.includes('change') || p.includes('dp') || p.includes('dynamic'))) {
      return {
        type: "fileTree",
        files: {
          "coin_change.cpp": {
            file: {
              contents: `// ${extractTaskFromPrompt(prompt)}
// Coin Change Problem - Dynamic Programming

#include <iostream>
#include <vector>
#include <climits>
using namespace std;

// Returns minimum coins needed to make amount
// Returns -1 if not possible
int coinChange(vector<int>& coins, int amount) {
    // dp[i] = minimum coins needed for amount i
    vector<int> dp(amount + 1, INT_MAX);
    dp[0] = 0;  // 0 coins needed for amount 0
    
    for (int i = 1; i <= amount; i++) {
        for (int coin : coins) {
            if (coin <= i && dp[i - coin] != INT_MAX) {
                dp[i] = min(dp[i], dp[i - coin] + 1);
            }
        }
    }
    
    return dp[amount] == INT_MAX ? -1 : dp[amount];
}

int main() {
    vector<int> coins = {1, 2, 5};
    int amount = 11;
    
    int result = coinChange(coins, amount);
    
    if (result == -1) {
        cout << "Cannot make amount " << amount << endl;
    } else {
        cout << "Minimum coins needed for " << amount << ": " << result << endl;
    }
    
    // Test cases
    cout << "\\nMore test cases:" << endl;
    cout << "Amount 3: " << coinChange(coins, 3) << " coins" << endl;   // 2 (1+2)
    cout << "Amount 6: " << coinChange(coins, 6) << " coins" << endl;   // 2 (1+5)
    cout << "Amount 10: " << coinChange(coins, 10) << " coins" << endl; // 2 (5+5)
    
    return 0;
}`
            }
          }
        }
      };
    }
    
    // Palindrome
    if (p.includes('palindrome')) {
      return {
        type: "fileTree",
        files: {
          "palindrome.cpp": {
            file: {
              contents: `// ${extractTaskFromPrompt(prompt)}
// Check if integer is palindrome

#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

bool isPalindrome(int x) {
    if (x < 0) return false;
    
    string str = to_string(x);
    string rev = str;
    reverse(rev.begin(), rev.end());
    
    return str == rev;
}

int main() {
    cout << boolalpha;
    cout << isPalindrome(121) << endl;  // true
    cout << isPalindrome(-121) << endl; // false
    cout << isPalindrome(10) << endl;   // false
    return 0;
}`
            }
          }
        }
      };
    }
    
    // Fibonacci
    if (p.includes('fibonacci') || p.includes('fib')) {
      return {
        type: "fileTree",
        files: {
          "fibonacci.cpp": {
            file: {
              contents: `// ${extractTaskFromPrompt(prompt)}
// Fibonacci Sequence

#include <iostream>
#include <vector>
using namespace std;

// Iterative approach - O(n) time, O(1) space
long long fibonacci(int n) {
    if (n <= 1) return n;
    
    long long prev = 0, curr = 1;
    for (int i = 2; i <= n; i++) {
        long long next = prev + curr;
        prev = curr;
        curr = next;
    }
    return curr;
}

// DP approach with memoization
long long fibonacciDP(int n, vector<long long>& memo) {
    if (n <= 1) return n;
    if (memo[n] != -1) return memo[n];
    
    memo[n] = fibonacciDP(n-1, memo) + fibonacciDP(n-2, memo);
    return memo[n];
}

int main() {
    cout << "Fibonacci sequence:" << endl;
    for (int i = 0; i <= 10; i++) {
        cout << "F(" << i << ") = " << fibonacci(i) << endl;
    }
    return 0;
}`
            }
          }
        }
      };
    }
    
    // Sorting
    if (p.includes('sort') || p.includes('bubble') || p.includes('quick') || p.includes('merge')) {
      return {
        type: "fileTree",
        files: {
          "sorting.cpp": {
            file: {
              contents: `// ${extractTaskFromPrompt(prompt)}
// Sorting Algorithms

#include <iostream>
#include <vector>
using namespace std;

void printArray(vector<int>& arr) {
    for (int x : arr) cout << x << " ";
    cout << endl;
}

// Bubble Sort - O(n^2)
void bubbleSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n-1; i++) {
        for (int j = 0; j < n-i-1; j++) {
            if (arr[j] > arr[j+1]) {
                swap(arr[j], arr[j+1]);
            }
        }
    }
}

// Quick Sort - O(n log n) average
int partition(vector<int>& arr, int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i+1], arr[high]);
    return i + 1;
}

void quickSort(vector<int>& arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

int main() {
    vector<int> arr = {64, 34, 25, 12, 22, 11, 90};
    
    cout << "Original: "; printArray(arr);
    
    quickSort(arr, 0, arr.size() - 1);
    
    cout << "Sorted: "; printArray(arr);
    
    return 0;
}`
            }
          }
        }
      };
    }
    
    // Factorial
    if (p.includes('factorial')) {
      return {
        type: "fileTree",
        files: {
          "factorial.cpp": {
            file: {
              contents: `// ${extractTaskFromPrompt(prompt)}
// Factorial Calculation

#include <iostream>
using namespace std;

long long factorialIterative(int n) {
    long long result = 1;
    for (int i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

long long factorialRecursive(int n) {
    if (n <= 1) return 1;
    return n * factorialRecursive(n - 1);
}

int main() {
    for (int i = 0; i <= 10; i++) {
        cout << i << "! = " << factorialIterative(i) << endl;
    }
    return 0;
}`
            }
          }
        }
      };
    }
    
    // Prime numbers
    if (p.includes('prime')) {
      return {
        type: "fileTree",
        files: {
          "prime.cpp": {
            file: {
              contents: `// ${extractTaskFromPrompt(prompt)}
// Prime Number Check

#include <iostream>
#include <cmath>
using namespace std;

bool isPrime(int n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 == 0 || n % 3 == 0) return false;
    
    for (int i = 5; i <= sqrt(n); i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) {
            return false;
        }
    }
    return true;
}

int main() {
    cout << boolalpha;
    cout << "Is 2 prime? " << isPrime(2) << endl;   // true
    cout << "Is 17 prime? " << isPrime(17) << endl; // true
    cout << "Is 4 prime? " << isPrime(4) << endl;   // false
    cout << "Is 97 prime? " << isPrime(97) << endl; // true
    return 0;
}`
            }
          }
        }
      };
    }
    
    // Default C++ - generic algorithm template (not Hello World!)
    return {
      type: "fileTree",
      files: {
        "solution.cpp": {
          file: {
            contents: `// ${extractTaskFromPrompt(prompt)}

#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

// TODO: Implement the requested functionality
// Based on: ${prompt.substring(0, 100)}

int main() {
    // Your algorithm implementation goes here
    // This is a template - the AI should provide actual code
    
    cout << "Implement: ${extractTaskFromPrompt(prompt).replace(/"/g, '\\"')}" << endl;
    
    return 0;
}`
          }
        }
      }
    };
  },

  c: (prompt) => ({
    type: "fileTree",
    files: {
      "main.c": {
        file: {
          contents: `// ${extractTaskFromPrompt(prompt)}\n\n#include <stdio.h>\n\nint main() {\n    printf("Hello World\\\\n");\n    // Add your code here\n    return 0;\n}`
        }
      }
    }
  }),

  html: (prompt) => ({
    type: "fileTree",
    files: {
      "index.html": {
        file: {
          contents: `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${extractTaskFromPrompt(prompt)}</title>\n</head>\n<body>\n    <h1>Hello World</h1>\n    <!-- Add your content here -->\n</body>\n</html>`
        }
      }
    }
  }),

  go: (prompt) => ({
    type: "fileTree",
    files: {
      "main.go": {
        file: {
          contents: `// ${extractTaskFromPrompt(prompt)}\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World")\n    // Add your code here\n}`
        }
      }
    }
  }),

  rust: (prompt) => ({
    type: "fileTree",
    files: {
      "main.rs": {
        file: {
          contents: `// ${extractTaskFromPrompt(prompt)}\n\nfn main() {\n    println!("Hello World");\n    // Add your code here\n}`
        }
      }
    }
  })
};

function extractTaskFromPrompt(prompt) {
  return prompt.slice(0, 50).replace(/\n/g, ' ');
}

function generateFallback(prompt) {
  const analysis = analyzePrompt(prompt);
  
  if (analysis.type === 'chat') {
    return {
      type: "chat",
      message: "I'm here to help! Could you please provide more details about what you'd like to know or create?"
    };
  }

  // Generate code fallback
  const template = FALLBACK_TEMPLATES[analysis.language];
  if (template) {
    return template(prompt);
  }

  // Ultimate fallback - Python
  return FALLBACK_TEMPLATES.python(prompt);
}

/* ================= JSON CLEANER ================= */

function cleanJSON(content) {
  // Remove markdown code blocks
  let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Remove any text before first { or [
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  let startIndex = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }
  
  if (startIndex > 0) {
    cleaned = cleaned.slice(startIndex);
  }
  
  // Remove any text after last } or ]
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const endIndex = Math.max(lastBrace, lastBracket);
  
  if (endIndex !== -1 && endIndex < cleaned.length - 1) {
    cleaned = cleaned.slice(0, endIndex + 1);
  }
  
  return cleaned.trim();
}

/* ================= RESPONSE VALIDATOR ================= */

function validateResponse(parsed) {
  if (!parsed.type) {
    throw new Error("Missing type field");
  }

  if (parsed.type === "chat") {
    if (typeof parsed.message !== "string" || !parsed.message.trim()) {
      throw new Error("Invalid or empty chat message");
    }
    return true;
  }

  if (parsed.type === "fileTree") {
    if (!parsed.files || typeof parsed.files !== "object" || Object.keys(parsed.files).length === 0) {
      throw new Error("Invalid or empty fileTree");
    }
    
    // Validate each file
    for (const [filename, fileData] of Object.entries(parsed.files)) {
      if (!fileData.file || typeof fileData.file.contents !== "string") {
        throw new Error(`Invalid file structure for ${filename}`);
      }
    }
    return true;
  }

  throw new Error("Invalid type: must be 'chat' or 'fileTree'");
}

/* ================= GROQ GENERATION FUNCTION ================= */

async function generateResultWithGroq(userPrompt) {
  try {
    // Analyze the prompt
    const analysis = analyzePrompt(userPrompt);
    const enhancedPrompt = buildPrompt(userPrompt, analysis);

    console.log(`\n🤖 [Groq] Hey! I got your request...`);
    console.log(`📋 You want: ${analysis.type === 'chat' ? 'an answer' : `code in ${analysis.language}`}`);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: enhancedPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 8000,
    });

    const content = chatCompletion.choices[0]?.message?.content?.trim();

    if (!content) {
      console.warn("⚠️ Groq gave empty response, using my backup solution...");
      return JSON.stringify(generateFallback(userPrompt));
    }

    try {
      // Clean and parse JSON
      const cleaned = cleanJSON(content);
      const parsed = JSON.parse(cleaned);

      // Validate the response
      validateResponse(parsed);

      console.log("✅ Perfect! Generated your " + (parsed.type === 'chat' ? 'answer' : 'code'));
      return JSON.stringify(parsed);

    } catch (parseError) {
      console.warn("⚠️ Groq messed up the format, using my backup solution...");
      return JSON.stringify(generateFallback(userPrompt));
    }

  } catch (error) {
    console.error("❌ Groq error:", error.message);
    console.log("🔄 Don't worry, using backup solution...");
    return JSON.stringify(generateFallback(userPrompt));
  }
}

/* ================= MAIN FUNCTION ================= */

async function generateGeminiResult(userPrompt) {
  try {
    const analysis = analyzePrompt(userPrompt);
    const enhancedPrompt = buildPrompt(userPrompt, analysis);

    console.log(`\n🤖 [Gemini] Hey! I got your request...`);
    
    // For Gemini, we pass the system instruction during initialization
    // So we just send the user prompt here
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
        throw new Error("Empty response from Gemini");
    }

    try {
        const cleaned = cleanJSON(text);
        const parsed = JSON.parse(cleaned);
        validateResponse(parsed);
        console.log("✅ Perfect! Gemini generated your response");
        return JSON.stringify(parsed);
    } catch (parseError) {
        console.warn("⚠️ Gemini response parsing failed, falling back...");
        return JSON.stringify(generateFallback(userPrompt));
    }

  } catch (error) {
    console.error("❌ Gemini error:", error.message);
    return JSON.stringify(generateFallback(userPrompt));
  }
}

export async function generateResult(userPrompt, modelType = 'groq') {
  // Route to appropriate model
  if (modelType === 'gemini') {
    return generateGeminiResult(userPrompt);
  }

  // Default to Groq (removed Ollama/Llama)
  return generateResultWithGroq(userPrompt);
}

/* ================= USAGE EXAMPLE ================= */

// Test the function
if (import.meta.url === `file://${process.argv[1]}`) {
  const testPrompts = [
    // Chat requests
    "hello",
    "hi there",
    "what is recursion",
    "explain machine learning",
    
    // Express/Framework requests
    "create an express server",
    "make a rest api with express",
    "build express server with routes",
    
    // Code requests with language at end
    "count digits in c++",
    "solve this problem in python",
    "factorial using java",
    
    // Problem statements
    "You are given an integer n. Return the number of digits in c++",
    
    // Regular code requests
    "python me calculator banao",
    "create a sorting algorithm in java"
  ];

  console.log("\n" + "=".repeat(60));
  console.log("TESTING OPTIMIZED AI GENERATOR");
  console.log("=".repeat(60));

  for (const prompt of testPrompts) {
    console.log(`\n📝 Prompt: "${prompt}"`);
    
    generateResult(prompt).then(result => {
      const parsed = JSON.parse(result);
      const analysis = analyzePrompt(prompt);
      console.log(`✅ Type: ${parsed.type}${parsed.type === 'code' ? ' (' + analysis.language + ')' : ''}`);
      if (parsed.type === 'chat') {
        console.log(`💬 Message: ${parsed.message.slice(0, 50)}...`);
      } else {
        console.log(`📁 Files: ${Object.keys(parsed.files).join(', ')}`);
      }
    }).catch(err => {
      console.error(`❌ Error: ${err.message}`);
    });
  }
}