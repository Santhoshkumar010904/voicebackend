const { GoogleGenerativeAI } = require("@google/generative-ai");

// Fallback logic if no API key is provided or if Gemini fails
const fallbackProcess = (text, latestEmailText = null) => {
    const cmd = text.toLowerCase().trim();
    let response = { intent: "UNKNOWN", action: "NONE", target: null, confidence: 0.1, language: "en-US", replyText: null };

    if (cmd.includes('compose') || cmd.includes('create') || cmd.includes('write email') || cmd.includes('new email')) {
      response = { intent: "OPEN_COMPOSE", action: "NAVIGATE", target: "/compose", confidence: 0.95 };
    } else if (cmd.includes('inbox') || cmd.includes('check email')) {
      // Avoid matching 'read email' here if they are asking for the latest one
      if (!cmd.includes('latest')) {
        response = { intent: "OPEN_INBOX", action: "NAVIGATE", target: "/inbox", confidence: 0.95 };
      }
    } else if (cmd.includes('home') || cmd.includes('dashboard')) {
      response = { intent: "OPEN_HOME", action: "NAVIGATE", target: "/dashboard", confidence: 0.95 };
    } else if (cmd.includes('sent')) {
      response = { intent: "OPEN_SENT", action: "NAVIGATE", target: "/sent", confidence: 0.95 };
    } else if (cmd.includes('drafts')) {
      response = { intent: "OPEN_DRAFTS", action: "NAVIGATE", target: "/drafts", confidence: 0.95 };
    } else if (cmd.includes('cancel') || cmd.includes('stop') || cmd.includes('nevermind')) {
      response = { intent: "STOP", action: "SYSTEM", target: null, confidence: 0.99 };
    } 
    
    if (cmd.includes('latest') || (cmd.includes('read') && cmd.includes('email')) || cmd.includes('unread')) {
      let speechResponse = "I couldn't fetch your emails from Gmail.";
      
      if (latestEmailText === "You have no unread emails in your inbox!") {
        speechResponse = latestEmailText;
      } else if (latestEmailText) {
        speechResponse = `Here is your latest unread email. ${latestEmailText}`;
      }
      
      response = { 
        intent: "READ_LATEST_EMAIL", 
        action: "API_CALL", 
        target: null, 
        confidence: 0.95,
        replyText: speechResponse
      };
    }
    
    return response;
};

exports.processIntent = async (text, latestEmailText = null) => {
    if (!process.env.GEMINI_API_KEY) {
        console.log("No GEMINI_API_KEY found. Falling back to regex matcher.");
        return fallbackProcess(text, latestEmailText);
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use gemini-1.5-flash as it's fast and perfect for quick intent routing
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
You are the AI brain of VoiceBridge, a smart email client.
The user just gave a voice command. They might have spoken in English, Tamil, Hindi, or any other language.
Your job is to understand what they want and return a JSON object with the exact action to take.

Possible Intents:
- OPEN_INBOX: user wants to view their inbox
- OPEN_COMPOSE: user wants to create/write a new email
- OPEN_HOME: user wants to go to dashboard
- OPEN_SENT: user wants to view sent emails
- OPEN_DRAFTS: user wants to view drafts
- READ_LATEST_EMAIL: user wants you to read or summarize their newest/latest email
- STOP: user wants to cancel or stop listening
- UNKNOWN: command not understood

JSON Structure required:
{
  "intent": "<INTENT_NAME>",
  "action": "<NAVIGATE | SYSTEM | API_CALL | SPEAK>",
  "target": "<react router path if NAVIGATE, else null>",
  "confidence": <0.0 to 1.0>,
  "language": "<BCP 47 language code of the user's speech, e.g., 'en-US', 'ta-IN', 'hi-IN'>",
  "replyText": "<If the intent is READ_LATEST_EMAIL, you must summarize the provided email context in the SAME language the user spoke. Keep it short and natural for text-to-speech.>"
}

User's spoken command: "${text}"

${latestEmailText ? `Here is the latest email in their inbox for you to summarize if requested: ${latestEmailText}` : ''}

Respond ONLY with valid JSON. Do not include markdown formatting like \`\`\`json.
`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        
        // Clean up markdown if model still adds it
        if (responseText.startsWith('```json')) {
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const json = JSON.parse(responseText);
        return json;
    } catch (error) {
        console.error("AI Service Error:", error);
        return fallbackProcess(text, latestEmailText); // Fallback if API fails
    }
};

exports.formatEmailContent = async (text) => {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('ya29')) {
        throw new Error("INVALID_API_KEY");
    }
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
You are an advanced email drafting assistant. The user dictated the body of an email via voice.
The dictation might contain speech-to-text errors, be spoken in Tanglish (Tamil written in English letters), Hinglish, or be in another language (Tamil, Hindi, French, etc.).

Your job is to format the dictation into a professional, well-written email body.

LANGUAGE RULES:
1. If the user explicitly asks to write the email in a specific language (e.g., "Write this in Tamil...", "Translate to French..."), output the email in that requested language.
2. If the user dictates in Tanglish/Hinglish (e.g., "nalaiku leave venum") without specifying a language, translate and format it into professional English.
3. If the user dictates fluently in a specific language (e.g., actual Tamil or Hindi script), format it professionally in that same language unless they ask otherwise.

Do NOT include any conversational filler like "Here is the email" or "Subject:". Output ONLY the raw email body content.

User's dictation:
"${text}"
`;
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("Format Email Error:", error);
        throw new Error("INVALID_API_KEY");
    }
};
