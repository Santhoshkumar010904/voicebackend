const { google } = require('googleapis');

// Helper to parse headers safely
const getHeader = (headers, name) => {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
};

const parseName = (from) => {
  if (!from) return 'Unknown';
  const match = from.match(/^([^<]+)/);
  return match ? match[1].replace(/"/g, '').trim() : from;
};

const parseEmailStr = (from) => {
  if (!from) return 'unknown@example.com';
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
};

const getColors = (emailStr) => {
  const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-emerald-500', 'bg-blue-500', 'bg-teal-500', 'bg-orange-500'];
  let sum = 0;
  for (let i = 0; i < emailStr.length; i++) {
    sum += emailStr.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

const formatTime = (internalDate) => {
  if (!internalDate) return '';
  const date = new Date(parseInt(internalDate));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// @desc    Get inbox emails
// @route   GET /api/emails
// @access  Private
exports.getInbox = async (req, res) => {
  try {
    const gmailToken = req.headers['x-gmail-token'];
    
    console.log("RECEIVED GMAIL TOKEN LENGTH:", gmailToken ? gmailToken.length : 'none');
    console.log("RECEIVED GMAIL TOKEN PREFIX:", gmailToken ? gmailToken.substring(0, 10) : 'none');

    if (!gmailToken || gmailToken === 'undefined' || gmailToken === 'null') {
      return res.status(400).json({ message: 'Gmail token is missing. Please connect Gmail first.' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: gmailToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch message list
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox',
      maxResults: 15
    });

    const messages = response.data.messages || [];
    
    // Fetch details for each message
    const emails = await Promise.all(messages.map(async (msg) => {
      try {
        const msgDetails = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        });
        
        const headers = msgDetails.data.payload.headers;
        const subject = getHeader(headers, 'Subject') || '(No Subject)';
        const fromHeader = getHeader(headers, 'From');
        
        const senderName = parseName(fromHeader);
        const senderEmail = parseEmailStr(fromHeader);
        
        return {
          id: msg.id,
          sender: { 
            name: senderName, 
            email: senderEmail, 
            avatarColor: getColors(senderEmail) 
          },
          subject: subject,
          snippet: msgDetails.data.snippet,
          time: formatTime(msgDetails.data.internalDate),
          isRead: !msgDetails.data.labelIds.includes('UNREAD'),
          isStarred: msgDetails.data.labelIds.includes('STARRED'),
          labels: msgDetails.data.labelIds.filter(l => l !== 'UNREAD' && l !== 'INBOX' && l !== 'STARRED' && l !== 'CATEGORY_PERSONAL'),
          hasAttachment: !!msgDetails.data.payload.mimeType.includes('multipart')
        };
      } catch (err) {
        return null;
      }
    }));

    // filter out any failed fetches
    const validEmails = emails.filter(e => e !== null);

    res.json({
      total: response.data.resultSizeEstimate || 0,
      unread: validEmails.filter(e => !e.isRead).length,
      emails: validEmails
    });
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ message: error.message || 'Server error while fetching inbox' });
  }
};

const getBody = (payload) => {
  let body = '';
  
  if (payload.parts) {
    // Look for text/html
    let htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    let textPart = payload.parts.find(p => p.mimeType === 'text/plain');
    
    // Check inside nested parts (multipart/alternative inside multipart/mixed)
    if (!htmlPart && payload.parts[0].parts) {
      htmlPart = payload.parts[0].parts.find(p => p.mimeType === 'text/html');
      textPart = payload.parts[0].parts.find(p => p.mimeType === 'text/plain');
    }

    const part = htmlPart || textPart;
    if (part && part.body && part.body.data) {
      body = Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
  } else if (payload.body && payload.body.data) {
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  
  return body || '<p>(No content)</p>';
};

// @desc    Get single email details
// @route   GET /api/emails/:id
// @access  Private
exports.getEmailDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const gmailToken = req.headers['x-gmail-token'];
    
    if (!gmailToken || gmailToken === 'undefined' || gmailToken === 'null') {
      return res.status(400).json({ message: 'Gmail token is missing.' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: gmailToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const msgDetails = await gmail.users.messages.get({
      userId: 'me',
      id: id,
      format: 'full'
    });

    const headers = msgDetails.data.payload.headers;
    const subject = getHeader(headers, 'Subject') || '(No Subject)';
    const fromHeader = getHeader(headers, 'From');
    const toHeader = getHeader(headers, 'To');
    
    const senderName = parseName(fromHeader);
    const senderEmail = parseEmailStr(fromHeader);
    const htmlBody = getBody(msgDetails.data.payload);

    res.json({
      id: msgDetails.data.id,
      sender: { name: senderName, email: senderEmail, avatarColor: getColors(senderEmail) },
      to: toHeader,
      subject: subject,
      time: formatTime(msgDetails.data.internalDate),
      isStarred: msgDetails.data.labelIds.includes('STARRED'),
      labels: msgDetails.data.labelIds.filter(l => l !== 'UNREAD' && l !== 'INBOX' && l !== 'STARRED' && l !== 'CATEGORY_PERSONAL'),
      body: htmlBody,
      attachments: [] // attachments logic omitted for simplicity in phase 1
    });

  } catch (error) {
    console.error('Error fetching email details:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Send an email
// @route   POST /api/emails/send
// @access  Private
exports.sendEmail = async (req, res) => {
  try {
    const { to, subject, body, gmailToken } = req.body;
    
    if (!gmailToken || gmailToken === 'undefined' || gmailToken === 'null') {
      return res.status(400).json({ message: 'Gmail token is missing. Please connect Gmail first.' });
    }

    console.log(`Sending real email to ${to} with subject "${subject}"...`);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: gmailToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Construct raw email
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body
    ];
    const message = messageParts.join('\n');

    // The body needs to be base64url encoded
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    res.json({
      success: true,
      message: 'Email sent successfully via Gmail API!',
      messageId: result.data.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: error.message || 'Server error while sending email' });
  }
};
