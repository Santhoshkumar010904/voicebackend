const { processIntent } = require('../services/aiService');
const { google } = require('googleapis');

exports.processCommand = async (req, res) => {
  try {
    const { text, gmailToken } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    let latestEmailText = null;
    
    // Quick heuristic to decide if we need to fetch the latest email BEFORE calling the LLM
    const cmd = text.toLowerCase();
    if ((cmd.includes('read') || cmd.includes('summarize') || cmd.includes('what') || cmd.includes('latest') || cmd.includes('unread')) && cmd.includes('email')) {
      if (gmailToken) {
        try {
          const oauth2Client = new google.auth.OAuth2();
          oauth2Client.setCredentials({ access_token: gmailToken });
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          
          // Only fetch UNREAD emails from the inbox
          const response = await gmail.users.messages.list({ 
            userId: 'me', 
            maxResults: 1,
            q: 'is:unread in:inbox' 
          });
          
          if (response.data.messages && response.data.messages.length > 0) {
            const msgId = response.data.messages[0].id;
            const msg = await gmail.users.messages.get({ userId: 'me', id: msgId });
            
            const headers = msg.data.payload.headers;
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
            const snippet = msg.data.snippet;
            
            latestEmailText = `From: ${from}. Subject: ${subject}. Content Snippet: ${snippet}`;
            
            // Mark the email as READ by removing the UNREAD label
            await gmail.users.messages.modify({
              userId: 'me',
              id: msgId,
              requestBody: {
                removeLabelIds: ['UNREAD']
              }
            });
          } else {
            latestEmailText = "You have no unread emails in your inbox!";
          }
        } catch (e) {
          console.error("Failed to fetch latest email for voice command:", e.message);
        }
      }
    }

    // Pass everything to the AI Service! It will translate languages and summarize!
    const response = await processIntent(text, latestEmailText);
    res.json(response);

  } catch (error) {
    console.error("Voice processing error:", error);
    res.status(500).json({ error: "Failed to process voice command" });
  }
};

exports.formatEmail = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });
    
    // Use aiService to format and translate the raw text
    const { formatEmailContent } = require('../services/aiService');
    const formatted = await formatEmailContent(text);
    
    res.json({ formattedText: formatted });
  } catch (error) {
    if (error.message === "INVALID_API_KEY") {
      return res.status(401).json({ error: "Translation Failed: You have not provided a valid Gemini API Key in your backend .env file.", formattedText: req.body.text });
    }
    console.error("Email formatting error:", error);
    res.status(500).json({ error: "Failed to format email", formattedText: req.body.text });
  }
};
