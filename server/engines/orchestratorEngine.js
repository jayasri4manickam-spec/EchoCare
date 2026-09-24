import { db } from '../db/database.js';

let turnContext = {
  lastTopic: null,
  lastIntent: null,
  personReferenced: null,
  medicationReferenced: null,
};

let queryHistoryMap = new Map(); // normalized query -> count

function normalizeQuery(text) {
  return (text || '').toLowerCase().trim().replace(/[^\w\s]/gi, '');
}

export function processEchoMessage({ patientId = 'pat-1', text = '', language = 'en-IN' }) {
  const norm = normalizeQuery(text);
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Language auto-detection directly from input text script
  if (/[\u0B80-\u0BFF]/.test(text)) language = 'ta-IN';
  else if (/[\u0900-\u097F]/.test(text)) language = 'hi-IN';
  else if (/[\u0C00-\u0C7F]/.test(text)) language = 'te-IN';
  else if (/[\u0D00-\u0D7F]/.test(text)) language = 'ml-IN';
  else if (/[\u0C80-\u0CFF]/.test(text)) language = 'kn-IN';
  else if (/[a-zA-Z]/.test(text) && !/[\u0900-\u0D7F]/.test(text)) {
    // If text contains English characters and no Indian language scripts, set language to 'en-IN'
    if (!language || language === 'ta-IN') language = 'en-IN';
  }

  // 1. Fetch Patient & Database Context
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) || {
    full_name: 'Margaret Miller',
    preferred_name: 'Margaret',
    stage_profile: 'early',
  };

  const patientName = patient.preferred_name || patient.full_name || 'Margaret';
  const memories = db.prepare('SELECT * FROM memories WHERE patient_id = ?').all(patientId);
  const familyMembers = db.prepare('SELECT * FROM family_members WHERE patient_id = ?').all(patientId);
  const caregivers = db.prepare('SELECT * FROM caregivers WHERE patient_id = ?').all(patientId);
  const medications = db.prepare('SELECT * FROM medications WHERE patient_id = ? AND active_status = 1').all(patientId);
  const preferences = db.prepare('SELECT * FROM patient_preferences WHERE patient_id = ?').get(patientId);
  const voiceMemories = db.prepare('SELECT * FROM voice_memories WHERE patient_id = ?').all(patientId);

  // 2. Track Repetition
  const repeatCount = (queryHistoryMap.get(norm) || 0) + 1;
  queryHistoryMap.set(norm, repeatCount);

  let responseText = '';
  let recognizedIntent = 'UNKNOWN';
  let agentSource = 'DETERMINISTIC_RULES';
  let suggestedAction = null;
  let voiceMemoryPayload = null;

  // ==========================================
  // INTENT ROUTER & CONVERSATION ENGINE
  // ==========================================

  // INTENT: DISTRESS / EMERGENCY_REQUEST / SAFETY_POLICY
  if (norm.includes('scared') || norm.includes('not feel safe') || norm.includes('help me') || norm.includes('frightened') || norm.includes('afraid') || norm.includes('intruder') || norm.includes('stranger') || norm.includes('பயம்') || norm.includes('डर') || norm.includes('భయం') || norm.includes('പേടി') || norm.includes('ಹದರಿಕೆ')) {
    recognizedIntent = 'DISTRESS';
    agentSource = 'SAFETY_DEESCALATION_AGENT';

    // Record Distress Event
    db.prepare(`
      INSERT INTO distress_events (id, patient_id, distress_level, trigger_signal, support_mode_applied, alert_sent, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('dist-' + Date.now(), patientId, 'ELEVATED DISTRESS', text, 'De-escalation & Grounding Music Offer', 1, timeStr);

    // Record Timeline Event
    db.prepare(`
      INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tl-dist-' + Date.now(), patientId, timeStr, dateStr, 'Mood', 'Elevated Distress Signal', `Patient expressed distress: "${text}"`, 'Echo Safety Agent', 'ShieldAlert');

    const primaryCaregiver = caregivers.find(c => c.role === 'primary') || caregivers[0];
    responseText = `You are completely safe here with me, ${patientName}. Everything is secure. Would you like me to contact ${primaryCaregiver ? primaryCaregiver.name : 'your family'} or play some soft music?`;
    if (language === 'ta-IN') responseText = `${patientName}, நீங்கள் முற்றிலும் பாதுகாப்பாக இருக்கிறீர்கள். அனைத்தும் பாதுகாப்பாக உள்ளது.`;
    else if (language === 'hi-IN') responseText = `${patientName}, आप यहाँ बिल्कुल सुरक्षित हैं। सब कुछ सुरक्षित है।`;
    else if (language === 'te-IN') responseText = `${patientName}, మీరు ఇక్కడ సురక్షితంగా ఉన్నారు.`;
    else if (language === 'ml-IN') responseText = `${patientName}, നിങ്ങൾ ഇവിടെ പൂർണ്ണമായും സുരക്ഷിതനാണ്.`;
    else if (language === 'kn-IN') responseText = `${patientName}, ನೀವು ಇಲ್ಲ ಸಂಪೂರ್ಣ ಸುರಕ್ಷಿತವಾಗಿದ್ದೀರಿ.`;

    suggestedAction = { type: 'CALL_CAREGIVER', caregiver: primaryCaregiver };
  }

  // INTENT: GREETING
  else if (norm.includes('hello') || norm.includes('hi echo') || norm.includes('good morning') || norm.includes('good evening') || norm === 'echo' || norm.includes('வணக்கம்') || norm.includes('नमस्ते') || norm.includes('నమస్కారం') || norm.includes('നമസ്കാരം') || norm.includes('ನಮಸ್ಕಾರ')) {
    recognizedIntent = 'GREETING';
    responseText = `Good morning, ${patientName}. How are you feeling today?`;
    if (language === 'ta-IN') responseText = `காலை வணக்கம் ${patientName}. இன்று எப்படி உணர்கிறீர்கள்?`;
    else if (language === 'hi-IN') responseText = `सुप्रभात ${patientName}। आज आप कैसा महसूस कर रहे हैं?`;
    else if (language === 'te-IN') responseText = `శుభోదయం ${patientName}. ఈరోజు మీరు ఎలా అనుభవిస్తున్నారు?`;
    else if (language === 'ml-IN') responseText = `സുപ്രഭാതം ${patientName}. ഇന്ന് സുഖമാണോ?`;
    else if (language === 'kn-IN') responseText = `শুভೋದಯ ${patientName}. ಇಂದು ಹೇಗೆ ಅನಿಸುತ್ತಿದೆ?`;
  }

  // INTENT: EMOTIONAL_SUPPORT / LONELINESS
  else if (norm.includes('lonely') || norm.includes('alone') || norm.includes('sad') || norm.includes('தனியாக') || norm.includes('அகல') || norm.includes('अकेला') || norm.includes('ఒంటరిగా') || norm.includes('ഒറ്റയ്ക്ക്') || norm.includes('ಒಂಟಿ')) {
    recognizedIntent = 'EMOTIONAL_SUPPORT';
    responseText = `I'm right here with you, ${patientName}. Would you like to talk for a while or listen to a story?`;
    if (language === 'ta-IN') responseText = `நான் உங்களுடனே இருக்கிறேன், ${patientName}. சிறிது நேரம் பேசலாமா அல்லது கதை கேட்கலாமா?`;
    else if (language === 'hi-IN') responseText = `मैं आपके साथ हूँ, ${patientName}। क्या आप थोड़ी देर बात करना चाहेंगे?`;
    else if (language === 'te-IN') responseText = `నేను మీతోనే ఉన్నాను, ${patientName}. కొద్దిసేపు మాట్లాడుకుందామా?`;
    else if (language === 'ml-IN') responseText = `ഞാൻ നിങ്ങളുടെ ഒപ്പമുണ്ട്, ${patientName}. കുറച്ച് നേരം സംസാരിക്കാം?`;
    else if (language === 'kn-IN') responseText = `ನಾನು ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ, ${patientName}. ಸ್ವಲ್ಪ ಸಮಯ ಮಾತನಾಡೋಣವೇ?`;
  }

  // INTENT: GRATITUDE
  else if (norm.includes('thank you') || norm.includes('thanks') || norm.includes('நன்றி') || norm.includes('धन्यवाद') || norm.includes('ధన్యవాదాలు') || norm.includes('നന്ദി') || norm.includes('ಧನ್ಯವಾದ')) {
    recognizedIntent = 'GRATITUDE';
    responseText = `You're welcome, ${patientName}. I'm always here whenever you need me.`;
    if (language === 'ta-IN') responseText = `மிக்க நன்றி ${patientName}. உங்களுக்கு உதவி தேவைப்படும்போது நான் எப்போதும் இருக்கிறேன்.`;
    else if (language === 'hi-IN') responseText = `आपका स्वागत है ${patientName}। जब भी आपको मेरी ज़रूरत होगी, मैं हमेशा यहाँ हूँ।`;
    else if (language === 'te-IN') responseText = `స్వాగతం ${patientName}. మీకు అవసరమైనప్పుడు నేను ఎల్లప్పుడూ ఇక్కడ ఉంటాను.`;
    else if (language === 'ml-IN') responseText = `തീർച്ചയായും ${patientName}. എപ്പോൾ ആവശ്യമുണ്ടെങ്കിലും ഞാൻ ഉണ്ടാകും.`;
    else if (language === 'kn-IN') responseText = `ಸ್ವಾಗತ ${patientName}. ನಿಮಗ ಅಗತ್ಯವಿದ್ದಾಗ ನಾನು ಸದಾ ಇಲ್ಲಿದ್ದೇನೆ.`;
  }

  // INTENT: MEDICATION_CONFIRMATION ("I took it", "Yes, took it", "Already taken")
  else if (norm.includes('took it') || norm.includes('taken') || norm.includes('already took') || norm.includes('finished medicine') || norm.includes('எடுத்துக்கொண்டேன்') || norm.includes('दवा ले ली') || norm.includes('తీసుకున్నాను') || norm.includes('മരുന്ന് കഴിച്ചു') || norm.includes('ತೆಗೆದುಕೊಂಡಿದ್ದೇನೆ')) {
    recognizedIntent = 'MEDICATION_CONFIRMATION';
    const pendingMeds = medications.filter(m => m.status === 'Pending' || m.status === 'Scheduled');
    
    if (pendingMeds.length > 0) {
      const targetMed = pendingMeds[0];
      db.prepare("UPDATE medications SET status = 'Verified', verified_at = ? WHERE id = ?").run(timeStr, targetMed.id);

      db.prepare(`
        INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('tl-med-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6), patientId, timeStr, dateStr, 'Medication', 'Medication Confirmed via Voice', `${targetMed.name} (${targetMed.dosage}) confirmed by patient.`, 'Voice Orchestrator', 'CheckCircle');

      responseText = `Wonderful job, ${patientName}. I have marked your ${targetMed.name} (${targetMed.dosage}) as taken.`;
      if (language === 'ta-IN') responseText = `சரி ${patientName}. உங்கள் ${targetMed.name} மருந்து எடுத்துக்கொண்டதாகப் பதிவு செய்துள்ளேன். மிக நன்று.`;
      else if (language === 'hi-IN') responseText = `ठीक है ${patientName}। मैंने आपकी ${targetMed.name} दवा को लिया हुआ दर्ज कर लिया है। शाबाश।`;
      else if (language === 'te-IN') responseText = `సరే ${patientName}. మీ ${targetMed.name} మందు తీసుకున్నట్లు నమోదు చేశాను. చాలా మంచిది.`;
      else if (language === 'ml-IN') responseText = `ശരി ${patientName}. നിങ്ങളുടെ ${targetMed.name} മരുന്ന് കഴിച്ചതായി അടയാളപ്പെടുത്തി. വളരെ നല്ലത്.`;
      else if (language === 'kn-IN') responseText = `ಸರಿ ${patientName}. ನಿಮ್ಮ ${targetMed.name} ಔಷಧಿಯನ್ನು ತೆಗೆದುಕೊಂಡಂತೆ ದಾಖಲಿಸಿದ್ದೇನೆ. ತುಂಬಾ ಒಳ್ಳೆಯದು.`;
    } else {
      responseText = `All of your scheduled medications for today are already marked as taken, ${patientName}.`;
      if (language === 'ta-IN') responseText = `இன்று உங்களுக்கான அனைத்து மருந்துகளும் ஏற்கனவே எடுத்துக்கொள்ளப்பட்டன, ${patientName}.`;
      else if (language === 'hi-IN') responseText = `आपकी आज की सभी दवाइयाँ पहले ही ली जा चुकी हैं, ${patientName}।`;
      else if (language === 'te-IN') responseText = `ఈరోజు మీ మందులన్నీ ఇప్పటికే తీసుకోబడ్డాయి, ${patientName}.`;
      else if (language === 'ml-IN') responseText = `ഇന്നത്തെ എല്ലാ മരുന്നുകളും ഇതിനകം കഴിച്ചു കഴിഞ്ഞു, ${patientName}.`;
      else if (language === 'kn-IN') responseText = `ಇಂದಿನ ನಿಮ್ಮ ಎಲ್ಲಾ ಔಷಧಿಗಳನ್ನು ಈಗಾಗಲೇ ತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ, ${patientName}.`;
    }
  }

  // INTENT: MEDICATION_DECLINE
  else if (norm.includes('dont want') || norm.includes('refuse') || norm.includes('decline')) {
    recognizedIntent = 'MEDICATION_DECLINE';
    responseText = `I understand, ${patientName}. I will let your caregiver know so they can check in with you gently.`;
  }

  // INTENT: MEDICATION_SNOOZE
  else if (norm.includes('remind me later') || norm.includes('snooze') || norm.includes('later')) {
    recognizedIntent = 'MEDICATION_SNOOZE';
    responseText = `No problem, ${patientName}. I will remind you again in 10 minutes.`;
  }

  // INTENT: MEDICATION_QUERY ("What medicine should I take?", "When is my medicine?", "What medicine do I have?")
  else if (norm.includes('medicine') || norm.includes('medication') || norm.includes('pill') || norm.includes('dawai') || norm.includes('மருந்து') || norm.includes('दवा') || norm.includes('మందులు') || norm.includes('മരുന്ന്') || norm.includes('ಔಷಧ')) {
    recognizedIntent = 'MEDICATION_QUERY';
    const pending = medications.filter(m => m.status === 'Pending' || m.status === 'Scheduled');
    if (pending.length > 0) {
      const nextMed = pending[0];
      turnContext.medicationReferenced = nextMed;
      responseText = `It is time for your ${nextMed.name}, ${nextMed.dosage} ${nextMed.unit || 'mg'}. ${nextMed.instructions || 'Please take it after your meal.'}`;
      if (language === 'ta-IN') responseText = `${patientName}, இது உங்கள் ${nextMed.name} (${nextMed.dosage}) மருந்து எடுத்துக்கொள்ளும் நேரம். ${nextMed.instructions || 'தயவுசெய்து இப்போது உணவுக்குப் பின் சாப்பிடுங்கள்.'}`;
      else if (language === 'hi-IN') responseText = `${patientName}, यह आपकी ${nextMed.name} (${nextMed.dosage}) दवा का समय है। ${nextMed.instructions || 'कृपया इसे भोजन के बाद लें।'}`;
      else if (language === 'te-IN') responseText = `${patientName}, ఇది మీ ${nextMed.name} (${nextMed.dosage}) మందులు తీసుకునే సమయం. ${nextMed.instructions || 'దయచేసి భోజనం తర్వాత తీసుకోండి.'}`;
      else if (language === 'ml-IN') responseText = `${patientName}, നിങ്ങളുടെ ${nextMed.name} (${nextMed.dosage}) മരുന്ന് കഴിക്കേണ്ട സമയമാണിത്. ${nextMed.instructions || 'ഭക്ഷണത്തിന് ശേഷം കഴിക്കുക.'}`;
      else if (language === 'kn-IN') responseText = `${patientName}, ಇದು ನಿಮ್ಮ ${nextMed.name} (${nextMed.dosage}) ಔಷಧಿಯನ್ನು ತೆಗೆದುಕೊಳ್ಳುವ ಸಮಯ. ${nextMed.instructions || 'ಊಟದ ನಂತರ ತೆಗೆದುಕೊಳ್ಳಿ.'}`;
    } else {
      responseText = `All of your scheduled medications for today have been taken, ${patientName}.`;
      if (language === 'ta-IN') responseText = `இன்று உங்களுக்கான அனைத்து மருந்துகளும் எடுத்துக்கொள்ளப்பட்டன, ${patientName}.`;
      else if (language === 'hi-IN') responseText = `आपकी आज की सभी दवाइयाँ ली जा चुकी हैं, ${patientName}।`;
      else if (language === 'te-IN') responseText = `ఈరోజు మీ మందులన్నీ తీసుకోబడ్డాయి, ${patientName}.`;
      else if (language === 'ml-IN') responseText = `ഇന്നത്തെ എല്ലാ മരുന്നുകളും കഴിച്ചു കഴിഞ്ഞു, ${patientName}.`;
      else if (language === 'kn-IN') responseText = `ಇಂದಿನ ನಿಮ್ಮ ಎಲ್ಲಾ ಔಷಧಿಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ, ${patientName}.`;
    }
  }

  // INTENT: FAMILY_QUERY & FAMILY_CONTACT ("Tell me about my daughter", "Who is Priya?", "Who is David?")
  else if (norm.includes('daughter') || norm.includes('son') || norm.includes('family') || norm.includes('priya') || norm.includes('david') || norm.includes('who is') || norm.includes('பிரியா')) {
    recognizedIntent = 'FAMILY_QUERY';

    let matchedMember = null;
    if (norm.includes('daughter') || norm.includes('priya') || norm.includes('பிரியா')) {
      matchedMember = familyMembers.find(f => f.relationship.toLowerCase().includes('daughter') || f.name.toLowerCase().includes('priya')) || { name: 'Priya', relationship: 'Daughter', memory_note: 'Brings fresh chamomile tea on Sundays.' };
    } else if (norm.includes('son') || norm.includes('david')) {
      matchedMember = familyMembers.find(f => f.relationship.toLowerCase().includes('son') || f.name.toLowerCase().includes('david')) || { name: 'David', relationship: 'Son', memory_note: 'Calls every evening at 6:00 PM.' };
    }

    if (matchedMember) {
      turnContext.personReferenced = matchedMember;
      
      const matchingVoice = voiceMemories.find(v => v.speaker.toLowerCase().includes(matchedMember.name.toLowerCase()));
      if (matchingVoice) {
        voiceMemoryPayload = matchingVoice;
      }

      if (repeatCount > 1) {
        responseText = `Priya is still expected this evening, ${patientName}. Would you like me to play the voice message she saved for you?`;
      } else {
        responseText = `${matchedMember.name} is your ${matchedMember.relationship}. ${matchedMember.memory_note || 'She visits every Sunday.'}`;
      }
    } else {
      responseText = `I don't have that family member saved in your memory profile yet, ${patientName}.`;
    }
  }

  // INTENT: MEMORY_QUERY ("Who used to bring me flowers?", "Tell me a memory", "Cape May", "Garden")
  else if (norm.includes('flower') || norm.includes('garden') || norm.includes('cape may') || norm.includes('beach') || norm.includes('memory') || norm.includes('story') || norm.includes('தோட்டம்')) {
    recognizedIntent = 'MEMORY_QUERY';
    agentSource = 'PERSONAL_MEMORY_GRAPH_ENGINE';

    if (norm.includes('cape may') || norm.includes('beach')) {
      const mem = memories.find(m => m.title.toLowerCase().includes('cape may'));
      responseText = mem ? mem.story : 'You spent summer 1982 building sandcastles at Cape May Beach with your family.';
    } else if (norm.includes('flower') || norm.includes('garden') || norm.includes('தோட்டம்')) {
      responseText = `You always loved growing heirloom roses in your backyard garden. Priya brings fresh chamomile tea on Sundays for garden strolls.`;
      if (language === 'ta-IN') responseText = `உங்கள் பின்புறத் தோட்டத்தில் ரோஜா மலர்களை வளர்க்க உங்களுக்கு எப்போதும் பிடிக்கும்.`;
    } else if (memories.length > 0) {
      responseText = `${memories[0].title}: ${memories[0].story}`;
    } else {
      responseText = `I don't have that personal memory saved yet, ${patientName}.`;
    }
  }

  // INTENT: ROUTINE_QUERY / ACTIVITY_RECOMMENDATION ("What should I do today?", "What is my routine today?")
  else if (norm.includes('what should i do') || norm.includes('routine') || norm.includes('schedule today') || norm.includes('what next')) {
    recognizedIntent = 'ROUTINE_QUERY';
    const favHobby = preferences ? preferences.hobbies : 'tending to your rose garden';
    responseText = `You can enjoy ${favHobby} or listen to soft music. Your afternoon tea and routine check-in are set for later.`;
    if (language === 'ta-IN') responseText = `உங்கள் ரோஜா தோட்டத்தில் சிறிது நேரம் செலவிடலாம் அல்லது மென்மையான இசை கேட்கலாம்.`;
  }

  // INTENT: TIME_QUERY / DATE_QUERY
  else if (norm.includes('time') || norm.includes('clock') || norm.includes('what time') || norm.includes('நேரம்') || norm.includes('மணி') || norm.includes('समय') || norm.includes('సమయం') || norm.includes('സമയം') || norm.includes('ಸಮಯ')) {
    recognizedIntent = 'TIME_QUERY';
    responseText = `It is currently ${timeStr}, ${patientName}.`;
    if (language === 'ta-IN') responseText = `இப்போது மணி ${timeStr}, ${patientName}.`;
    else if (language === 'hi-IN') responseText = `अभी ${timeStr} हो रहा है, ${patientName}।`;
    else if (language === 'te-IN') responseText = `ఇప్పుడు సమయం ${timeStr}, ${patientName}.`;
    else if (language === 'ml-IN') responseText = `ഇപ്പോൾ സമയം ${timeStr}, ${patientName}.`;
    else if (language === 'kn-IN') responseText = `ಈಗ ಸಮಯ ${timeStr}, ${patientName}.`;
  }

  // INTENT: ROUTINE_QUERY ("What is my routine today?")
  else if (norm.includes('routine') || norm.includes('schedule today') || norm.includes('what next')) {
    recognizedIntent = 'ROUTINE_QUERY';
    responseText = `Your morning routine includes breakfast at 8:00 AM, lunch at 12:30 PM, a garden stroll at 4:00 PM, and dinner at 6:30 PM.`;
  }

  // INTENT: TODAY_SUMMARY ("What happened today?")
  else if (norm.includes('what happened today') || norm.includes('today summary') || norm.includes('what changed')) {
    recognizedIntent = 'TODAY_SUMMARY';
    const todayEvents = db.prepare('SELECT * FROM timeline_events WHERE patient_id = ? AND date_str = ? ORDER BY created_at DESC LIMIT 5').all(patientId, dateStr);
    if (todayEvents.length > 0) {
      const summaries = todayEvents.map(e => `${e.timestamp}: ${e.title}`).join('. ');
      responseText = `Today's care record for ${patientName}: ${summaries}.`;
    } else {
      responseText = `Today's schedule has been calm and on track, ${patientName}.`;
    }
  }

  // INTENT: GOODBYE
  else if (norm.includes('goodbye') || norm.includes('bye') || norm.includes('see you')) {
    recognizedIntent = 'GOODBYE';
    responseText = `Goodbye for now, ${patientName}. I'm right here whenever you call "Echo".`;
  }

  // FALLBACK - Dynamic, contextual conversation handling per language
  else {
    recognizedIntent = 'GENERAL_CONVERSATION';
    const favHobby = preferences ? preferences.hobbies : 'growing rose bushes';
    const pendingMeds = medications.filter(m => m.status === 'Pending' || m.status === 'Scheduled');
    const medNotice = pendingMeds.length > 0 
      ? ` Next medicine: ${pendingMeds[0].name} (${pendingMeds[0].dosage}) scheduled for ${pendingMeds[0].scheduled_time || 'today'}.` 
      : ' All your medications for today have been taken!';

    if (norm.includes('who are you') || norm.includes('your name')) {
      responseText = `I am Echo, your personal voice companion, ${patientName}. I'm right here with you to help with your medications, stories, and daily schedule.`;
      if (language === 'ta-IN') responseText = `நான் உங்கள் எக்கோ, ${patientName}. மருந்து, நினைவுகள் மற்றும் அன்றாட உதவிகளுக்காக நான் எப்போதும் உங்களுடன் இருக்கிறேன்.`;
      else if (language === 'hi-IN') responseText = `मैं आपका साथी इको हूँ, ${patientName}। दवाइयों, यादों और दैनिक दिनचर्या में सहायता के लिए मैं हमेशा आपके पास हूँ।`;
      else if (language === 'te-IN') responseText = `నేను మీ ఎకో, ${patientName}. మందులు మరియు రోజువారీ సహాయం కోసం నేను ఇక్కడే ఉన్నాను.`;
      else if (language === 'ml-IN') responseText = `ഞാൻ നിങ്ങളുടെ എക്കോ ആണ്, ${patientName}. സഹായിക്കാനായി ഞാൻ ഒപ്പമുണ്ട്.`;
      else if (language === 'kn-IN') responseText = `ನಾನು ನಿಮ್ಮ ಎಕೋ, ${patientName}. ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ.`;
    } else if (norm.includes('how are you') || norm.includes('how do you feel')) {
      responseText = `I am doing wonderfully and glad to be here with you, ${patientName}. How are you feeling right now?`;
      if (language === 'ta-IN') responseText = `நான் சிறப்பாக இருக்கிறேன் ${patientName}. நீங்கள் இப்போது எப்படி உணர்கிறீர்கள்?`;
      else if (language === 'hi-IN') responseText = `मैं बिल्कुल ठीक हूँ, ${patientName}। अभी आप कैसा महसूस कर रहे हैं?`;
      else if (language === 'te-IN') responseText = `నేను చాలా బాగున్నాను, ${patientName}. మీరు ఇప్పుడు ఎలా ఉన్నారు?`;
      else if (language === 'ml-IN') responseText = `ഞാൻ സുഖമായിരിക്കുന്നു, ${patientName}. ഇപ്പോൾ എങ്ങനെ തോന്നുന്നു?`;
      else if (language === 'kn-IN') responseText = `ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ, ${patientName}. ನೀವು ಈಗ ಹೇಗಿದ್ದೀರಿ?`;
    } else if (norm.includes('where am i')) {
      responseText = `You are comfortably at home in Room 104, ${patientName}. Everything around you is peaceful and secure.`;
      if (language === 'ta-IN') responseText = `நீங்கள் உங்கள் வீட்டில் பாதுகாப்பாக இருக்கிறீர்கள், ${patientName}. அனைத்தும் அமைதியாக உள்ளது.`;
      else if (language === 'hi-IN') responseText = `आप अपने घर में सुरक्षित हैं, ${patientName}। सब कुछ शांत और सुरक्षित है।`;
      else if (language === 'te-IN') responseText = `మీరు మీ ఇంట్లో సురక్షితంగా ఉన్నారు, ${patientName}. అంతా ప్రశాంతంగా ఉంది.`;
      else if (language === 'ml-IN') responseText = `നിങ്ങൾ വീട്ടിൽ സുരക്ഷിതനാണ്, ${patientName}. എല്ലാം സമാധാനപരമാണ്.`;
      else if (language === 'kn-IN') responseText = `ನೀವು ನಿಮ್ಮ ಮನೆಯಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿದ್ದೀರಿ, ${patientName}. ಎಲ್ಲವೂ ಶಾಂತವಾಗಿದೆ.`;
    } else {
      const words = text.trim().split(/\s+/).filter(w => w.length > 3);
      const topicSnippet = words.length > 0 ? words.slice(-2).join(' ') : 'that';

      responseText = `I hear you talking about ${topicSnippet}, ${patientName}. I am right here with you and listening carefully.${medNotice}`;
      if (language === 'ta-IN') responseText = `நான் உங்கள் குரலைக் கேட்கிறேன் ${patientName}. நான் உங்களுடனே இருக்கிறேன்.${pendingMeds.length > 0 ? ` உங்கள் மருந்து நேரம்: ${pendingMeds[0].name}.` : ''}`;
      else if (language === 'hi-IN') responseText = `मैं आपकी बात सुन रहा हूँ, ${patientName}। मैं आपके पास ही हूँ।${pendingMeds.length > 0 ? ` आपकी दवा का समय: ${pendingMeds[0].name}।` : ''}`;
      else if (language === 'te-IN') responseText = `నేను మీ మాటలు వింటున్నాను, ${patientName}. నేను మీతోనే ఉన్నాను.${pendingMeds.length > 0 ? ` మీ మందుల సమయం: ${pendingMeds[0].name}.` : ''}`;
      else if (language === 'ml-IN') responseText = `ഞാൻ കേൾക്കുന്നുണ്ട്, ${patientName}. ഞാൻ ഒപ്പമുണ്ട്.${pendingMeds.length > 0 ? ` മരുന്ന് കഴിക്കേണ്ട സമയം: ${pendingMeds[0].name}.` : ''}`;
      else if (language === 'kn-IN') responseText = `ನಾನು ನಿಮ್ಮ ಮಾತನ್ನು ಕೇಳುತ್ತಿದ್ದೇನೆ, ${patientName}. ನಾನು ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ.${pendingMeds.length > 0 ? ` ನಿಮ್ಮ ಔಷಧಿ ಸಮಯ: ${pendingMeds[0].name}.` : ''}`;
    }
  }

  // Update Turn Context
  turnContext.lastTopic = recognizedIntent;
  turnContext.lastIntent = recognizedIntent;

  // Ensure active conversation session exists in database
  db.prepare(`
    INSERT OR IGNORE INTO conversations (id, patient_id)
    VALUES (?, ?)
  `).run('conv-session-1', patientId);

  // Log Message to Database
  db.prepare(`
    INSERT INTO conversation_messages (id, conversation_id, patient_id, sender, text, intent, agent_source, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('msg-u-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6), 'conv-session-1', patientId, 'PATIENT', text, recognizedIntent, agentSource, timeStr);

  db.prepare(`
    INSERT INTO conversation_messages (id, conversation_id, patient_id, sender, text, intent, agent_source, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('msg-e-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6), 'conv-session-1', patientId, 'ECHO', responseText, recognizedIntent, agentSource, timeStr);

  return {
    patientName,
    recognizedIntent,
    agentSource,
    responseText,
    repeatCount,
    suggestedAction,
    voiceMemoryPayload,
    language,
    turnContext,
  };
}
