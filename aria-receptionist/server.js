// =============================================================
//  MissedCall — SaaS Server (Production Ready)
//  Vapi + Claude + ElevenLabs + Supabase + Twilio
// =============================================================

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — allow browser to call the API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve index.html from same directory
app.use(express.static(__dirname));

// Guard — crash early with a clear message if keys are missing
if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL is required.');
if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY is required.');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// =============================================================
//  SIGNUP
//  POST /signup
//  Called when a business submits the signup form
// =============================================================
app.post('/signup', async (req, res) => {
  const { firstName, lastName, businessName, mobileNumber, email, industry, plan } = req.body;

  // Validate required fields
  if (!firstName || !email || !businessName || !mobileNumber) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  // Basic email validation
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    console.log(`\n🆕 New signup: ${businessName} (${plan || 'growth'})`);

    // 1. Save business to Supabase
    const { data: business, error: bizErr } = await supabase
      .from('businesses')
      .insert({
        name: `${firstName} ${lastName}`,
        email,
        business_name: businessName,
        mobile_number: mobileNumber,
        industry: industry || 'General business',
        plan: plan || 'growth',
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'trial'
      })
      .select()
      .single();

    if (bizErr) {
      // Handle duplicate email
      if (bizErr.message.includes('unique')) {
        return res.status(400).json({ error: 'This email is already registered. Please contact support.' });
      }
      throw new Error('Database error: ' + bizErr.message);
    }

    // 2. Create Vapi assistant for this business
    let assistantId = null;
    let phoneNumber = process.env.DEFAULT_MISSEDCALL_NUMBER || null;

    if (process.env.VAPI_API_KEY) {
      try {
        assistantId = await createVapiAssistant(business);
        phoneNumber = await assignPhoneNumber(assistantId, business);
      } catch (vapiErr) {
        console.warn('Vapi setup failed — continuing without it:', vapiErr.message);
      }
    }

    // 3. Update business record with Vapi details
    if (assistantId || phoneNumber) {
      const { error: updateErr } = await supabase.from('businesses').update({
        vapi_assistant_id: assistantId,
        missedcall_number: phoneNumber,
      }).eq('id', business.id);
      if (updateErr) console.error('Business update error:', updateErr.message);
    }

    // 4. Send welcome email
    await sendWelcomeEmail({ ...business, name: `${firstName} ${lastName}` }, phoneNumber);

    console.log(`✅ ${businessName} is live${phoneNumber ? ' on ' + phoneNumber : ''}`);

    res.json({
      success: true,
      missedcallNumber: phoneNumber,
      message: phoneNumber
        ? `You're live! Forward your calls to ${phoneNumber}`
        : `You're signed up! Check your email for next steps.`
    });

  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again or contact support.' });
  }
});

// =============================================================
//  CREATE VAPI ASSISTANT
// =============================================================
async function createVapiAssistant(business) {
  const config = buildAssistantConfig(business);

  const res = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });

  const data = await res.json();
  if (!res.ok) throw new Error('Vapi error: ' + JSON.stringify(data));

  console.log(`Vapi assistant created: ${data.id}`);
  return data.id;
}

// =============================================================
//  BUILD ASSISTANT CONFIG
// =============================================================
function buildAssistantConfig(business) {
  const { business_name, industry, id } = business;

  return {
    name: `MissedCall — ${business_name}`,

    model: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: buildSystemPrompt(business),
      temperature: 0.7,
      maxTokens: 150,
    },

    voice: {
      provider: 'elevenlabs',
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      model: 'eleven_flash_v2_5',
      stability: 0.40,
      similarityBoost: 0.80,
      style: 0.30,
      useSpeakerBoost: true,
      optimizeStreamingLatency: 4,
    },

    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en',
      smartFormat: true,
    },

    silenceTimeoutSeconds: 1.5,
    maxDurationSeconds: 300,
    firstMessage: `Hi there, thanks for calling ${business_name}! How can I help you today?`,
    endCallMessage: "Thanks so much for calling. We'll be in touch very soon. Take care!",
    endCallPhrases: ['goodbye', 'bye', 'thanks bye'],
    serverUrl: `${process.env.SERVER_URL}/vapi/webhook/${id}`,

    tools: [{
      type: 'function',
      function: {
        name: 'save_lead',
        description: "Save the caller's details once you have their name, issue, and phone number.",
        parameters: {
          type: 'object',
          required: ['name', 'issue', 'phone'],
          properties: {
            name:  { type: 'string', description: "Caller's full name" },
            issue: { type: 'string', description: 'What they need help with' },
            phone: { type: 'string', description: "Caller's callback number" }
          }
        }
      }
    }]
  };
}

// =============================================================
//  SYSTEM PROMPT
// =============================================================
function buildSystemPrompt(business) {
  const { business_name, industry } = business;

  return `You are a warm, professional AI receptionist for ${business_name}, a ${industry} business.

YOUR GOAL: Have a natural, helpful conversation. Answer any question the caller has. Collect their name, issue, and callback number. Once you have all three, confirm and save them.

FLOW:
1. Warmly greet the caller and ask for their name.
2. Ask what you can help with today.
3. Show empathy and engage naturally with their issue.
4. Ask for their callback number.
5. Confirm: "Perfect [name], I've got you noted. Someone from ${business_name} will call you back on [number] shortly."
6. Call save_lead with all three details.

STYLE:
- Sound human, warm, and natural. Never robotic.
- Use contractions: I'll, we'll, that's, don't, you're.
- Keep replies to 1-2 short sentences maximum.
- Natural filler: "Of course.", "Got it.", "Sure!", "No worries."
- If asked anything you don't know: "Great question — I'll make sure whoever calls you back can answer that."
- If asked if you're an AI: "I'm an AI assistant, but a real person from the team will call you right back."
- NEVER say: cannot help, don't have access, as an AI language model.`;
}

// =============================================================
//  ASSIGN PHONE NUMBER
// =============================================================
async function assignPhoneNumber(assistantId, business) {
  try {
    const res = await fetch('https://api.vapi.ai/phone-number', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'twilio',
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
        assistantId,
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data.number;

  } catch (err) {
    console.warn('Phone number auto-buy failed:', err.message);
    return process.env.DEFAULT_MISSEDCALL_NUMBER || null;
  }
}

// =============================================================
//  VAPI WEBHOOK
// =============================================================
app.post('/vapi/webhook/:businessId', async (req, res) => {
  const { message } = req.body;
  const { businessId } = req.params;
  if (!message) return res.json({ result: 'ok' });

  const { type, call } = message;
  const callId = call?.id;

  try {
    if (type === 'tool-calls') {
      const results = [];
      for (const toolCall of message.toolCallList || []) {
        let result;
        try {
          if (toolCall.function.name === 'save_lead') {
            result = await saveLead(businessId, callId, call, toolCall.function.parameters);
          }
        } catch (err) {
          console.error('save_lead error:', err.message);
          result = { success: false };
        }
        results.push({ toolCallId: toolCall.id, result: JSON.stringify(result) });
      }
      return res.json({ results });
    }

    if (type === 'call-started') {
      const { error: callInsertErr } = await supabase.from('calls').insert({
        id: callId,
        business_id: businessId,
        caller_number: call?.customer?.number || null,
        started_at: new Date().toISOString(),
        status: 'in_progress'
      });
      if (callInsertErr) console.error('Call insert error:', callInsertErr.message);
    }

    if (type === 'call-ended') {
      const { error: callUpdateErr } = await supabase.from('calls').update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: call?.duration || null,
      }).eq('id', callId);
      if (callUpdateErr) console.error('Call update error:', callUpdateErr.message);
    }

  } catch (err) {
    console.error('Webhook error:', err.message);
  }

  return res.json({ result: 'ok' });
});

// =============================================================
//  SAVE LEAD
// =============================================================
async function saveLead(businessId, callId, call, { name, issue, phone }) {
  const { data: business, error: bizLookupErr } = await supabase
    .from('businesses')
    .select('business_name, mobile_number')
    .eq('id', businessId)
    .single();
  if (bizLookupErr) console.error('Business lookup error:', bizLookupErr.message);

  const lead = {
    business_id: businessId,
    call_id: callId,
    name,
    issue,
    phone,
    caller_number: call?.customer?.number || null,
    received_at: new Date().toISOString()
  };

  const { error } = await supabase.from('leads').insert(lead);
  if (error) console.error('Lead insert error:', error.message);

  await sendSMSToOwner(business, lead);
  console.log(`💾 Lead: ${name} | ${phone} | "${issue}"`);
  return { success: true };
}

// =============================================================
//  SMS TO OWNER
// =============================================================
async function sendSMSToOwner(business, lead) {
  if (!process.env.TWILIO_ACCOUNT_SID || !business?.mobile_number) return;

  const time = new Date(lead.received_at).toLocaleString('en-US', {
    dateStyle: 'short', timeStyle: 'short'
  });

  const sms =
    `📞 New call — ${business.business_name}\n` +
    `Name: ${lead.name}\n` +
    `Phone: ${lead.phone}\n` +
    `Issue: ${lead.issue}\n` +
    `Time: ${time}`;

  try {
    const creds = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString('base64');

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: business.mobile_number,
          From: process.env.TWILIO_FROM_NUMBER,
          Body: sms
        })
      }
    );
    if (res.ok) console.log(`📱 SMS sent to owner`);
    else console.error('SMS error:', await res.text());
  } catch (err) {
    console.error('SMS failed:', err.message);
  }
}

// =============================================================
//  WELCOME EMAIL via Resend (free tier — 100 emails/day)
//  Sign up at resend.com and add RESEND_API_KEY to Railway vars
// =============================================================
async function sendWelcomeEmail(business, phoneNumber) {
  if (!process.env.RESEND_API_KEY) {
    // Log to console if no email provider set up yet
    console.log(`📧 Welcome email would send to ${business.email}`);
    console.log(`   Number: ${phoneNumber || 'pending'}`);
    return;
  }

  const forwardingInstructions = phoneNumber
    ? `Your MissedCall number is: <strong>${phoneNumber}</strong><br/><br/>
       To activate, go to your phone settings and turn on call forwarding to <strong>${phoneNumber}</strong>.<br/>
       That's it — Aria will answer every call from now on.`
    : `Our team will be in touch within 24 hours to complete your setup.`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `MissedCall <hello@${process.env.EMAIL_DOMAIN || 'missedcall.io'}>`,
        to: business.email,
        subject: `You're live on MissedCall.io! 🎉`,
        html: `
          <h2>Welcome to MissedCall, ${business.name}!</h2>
          <p>MissedCall is set up for <strong>${business.business_name}</strong>.</p>
          <br/>
          ${forwardingInstructions}
          <br/><br/>
          <p>You'll get an SMS on <strong>${business.mobile_number}</strong> every time Aria captures a lead.</p>
          <br/>
          <p>Your 7-day free trial starts now. No credit card needed until it ends.</p>
          <br/>
          <p>— The MissedCall Team</p>
        `
      })
    });
    console.log(`📧 Welcome email sent to ${business.email}`);
  } catch (err) {
    console.error('Email failed:', err.message);
  }
}

// =============================================================
//  ADMIN ENDPOINTS
// =============================================================
app.get('/admin/businesses', async (req, res) => {
  const { data, error } = await supabase
    .from('businesses').select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: data.length, businesses: data });
});

app.get('/admin/leads/:businessId', async (req, res) => {
  const { data, error } = await supabase
    .from('leads').select('*')
    .eq('business_id', req.params.businessId)
    .order('received_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: data.length, leads: data });
});

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  supabase: !!process.env.SUPABASE_URL,
  vapi: !!process.env.VAPI_API_KEY,
  twilio: !!process.env.TWILIO_ACCOUNT_SID,
  uptime: Math.round(process.uptime())
}));

// =============================================================
//  START
// =============================================================
process.on('SIGTERM', () => process.exit(0));
process.on('uncaughtException', (err) => console.error('Uncaught:', err.message));
process.on('unhandledRejection', (err) => console.error('Unhandled:', err.message));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🎙️  MissedCall running on port ${PORT}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL        ? '✅' : '❌ MISSING'}`);
  console.log(`   Vapi:     ${process.env.VAPI_API_KEY        ? '✅' : '⚠️  not set'}`);
  console.log(`   Twilio:   ${process.env.TWILIO_ACCOUNT_SID  ? '✅' : '⚠️  not set'}`);
  console.log(`   Email:    ${process.env.RESEND_API_KEY      ? '✅' : '⚠️  not set (console only)'}\n`);
});
