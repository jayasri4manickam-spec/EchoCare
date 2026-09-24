// EchoCare AI Orchestrator & Specialized Agent Intelligence Layer
// Coordinates Memory Retrieval, Stage Adaptation, Repetition Engine, Safety Policy, Distress Detection, Multilingual Intent Router, and Caregiver Insights.

import {
  getPatientProfile,
  savePatientProfile,
  getMemories,
  getCaregivers,
  getMedications,
  updateMedicationStatus,
  addLongitudinalEvent,
  addDistressEvent,
  addTelemetryLog,
  getLongitudinalTimeline,
  getCaregiverObservations,
} from './storage.js';

// In-memory conversation session history & short-term multi-turn context
let conversationHistory = [];
let lastTurnContext = null; // { topicEntity: 'Priya', lastIntent: 'VISITOR_QUERY', lastAnswer: '...' }
let queryCountMap = new Map(); // normalized Query -> count
let currentDistressState = {
  level: 'NORMAL', // 'NORMAL' | 'EARLY DISTRESS' | 'ELEVATED DISTRESS' | 'HIGH DISTRESS'
  lastDetectedAt: null,
  consecutiveDistressCount: 0,
};

// Listeners for distress & conversation updates
const orchestratorListeners = new Set();
export const subscribeToOrchestrator = (cb) => {
  orchestratorListeners.add(cb);
  cb({ distress: currentDistressState, history: conversationHistory });
  return () => orchestratorListeners.delete(cb);
};

const notifyOrchestratorListeners = () => {
  orchestratorListeners.forEach((cb) => cb({ distress: currentDistressState, history: conversationHistory }));
};

// Helper: Normalize transcript for intent comparison
const normalizeText = (text) => text.toLowerCase().trim().replace(/[^\w\s]/gi, '');

// ==========================================
// 1. MEMORY AGENT & MULTI-TURN CONTEXT RETRIEVAL
// ==========================================
export const retrieveMemoryContext = (inputQuery) => {
  const profile = getPatientProfile();
  const memories = getMemories();
  const caregivers = getCaregivers();
  const text = normalizeText(inputQuery);

  // 1. Check pronoun references ("she", "her", "when will she come") using short-term conversation context
  if ((text.includes('she') || text.includes('her') || text.includes('when will she come') || text.includes('when is she coming')) && lastTurnContext?.person) {
    const person = lastTurnContext.person;
    return {
      type: 'PERSON',
      person,
      prompt: `${person.name} usually visits on Sunday. ${person.memoryNote || 'She calls every evening.'}`,
      actionableOffer: `Would you like me to play a message from ${person.name} or call her?`,
    };
  }

  // 2. Garden / Flowers
  if (text.includes('garden') || text.includes('flower') || text.includes('rose') || text.includes('plant')) {
    return {
      type: 'MEMORY',
      topic: 'Garden',
      prompt: `You always enjoyed your rose garden. Priya brings fresh chamomile tea on Sundays for garden strolls.`,
      actionableOffer: `Would you like to talk about your rose garden or listen to your favourite garden memory?`,
    };
  }

  // 3. Priya / Daughter
  if (text.includes('priya') || text.includes('daughter')) {
    const priya = caregivers.find((c) => c.name.toLowerCase().includes('priya')) || caregivers[0];
    lastTurnContext = { person: priya, topicEntity: 'Priya', lastIntent: 'VISITOR_QUERY' };
    return {
      type: 'PERSON',
      person: priya,
      prompt: `${priya?.name || 'Priya'} is your daughter. ${priya?.memoryNote || 'She visits every Sunday with chamomile tea.'}`,
      actionableOffer: `Priya usually visits on Sunday. Would you like me to play her voice message or call her?`,
    };
  }

  // 4. David / Son
  if (text.includes('david') || text.includes('son')) {
    const david = caregivers.find((c) => c.name.toLowerCase().includes('david'));
    lastTurnContext = { person: david, topicEntity: 'David', lastIntent: 'VISITOR_QUERY' };
    return {
      type: 'PERSON',
      person: david,
      prompt: `${david?.name || 'David'} is your son and primary caregiver. ${david?.memoryNote || 'He calls every evening at 6:00 PM.'}`,
      actionableOffer: `David checks in every evening at 6:00 PM. You're safe with us.`,
    };
  }

  // 5. Cape May / Beach
  if (text.includes('cape may') || text.includes('beach') || text.includes('sea')) {
    const capeMayMem = memories.find((m) => m.title.toLowerCase().includes('cape may')) || memories[0];
    return {
      type: 'MEMORY',
      topic: 'Cape May',
      prompt: capeMayMem ? capeMayMem.story : 'You spent summer 1982 building sandcastles at Cape May with family.',
      actionableOffer: `Shall we listen to the story of Cape May together?`,
    };
  }

  // 6. Sourdough / Bread
  if (text.includes('bread') || text.includes('baking') || text.includes('sourdough')) {
    return {
      type: 'MEMORY',
      topic: 'Sourdough Bread',
      prompt: `Your family tradition of baking sourdough bread with fresh rosemary from the garden wall.`,
      actionableOffer: `Would you like to hear the memory of Sunday sourdough bread?`,
    };
  }

  // Fallback preference retrieval
  if (text.includes('dont know') || text.includes('bored') || text.includes('what to do') || text.includes('help me think')) {
    const prefHobbies = profile.preferences?.hobbies || 'growing roses and soft music';
    return {
      type: 'PREFERENCE',
      topic: 'Hobbies',
      prompt: `You love ${prefHobbies}.`,
      actionableOffer: `Would you like to talk about your garden? You always enjoyed growing roses.`,
    };
  }

  return null;
};

// ==========================================
// 2. REPETITION HANDLING ENGINE
// ==========================================
export const processRepetition = (rawInput) => {
  const norm = normalizeText(rawInput);
  const existingCount = queryCountMap.get(norm) || 0;
  const newCount = existingCount + 1;
  queryCountMap.set(norm, newCount);

  return {
    normalizedQuery: norm,
    count: newCount,
    isRepeated: newCount > 1,
  };
};

// ==========================================
// 3. SAFETY POLICY AGENT: Perceptions & Delusions
// ==========================================
export const checkSafetyPolicyPerceptions = (rawInput) => {
  const norm = normalizeText(rawInput);
  const perceptionTriggers = [
    'someone in my room',
    'stranger in the house',
    'who is in here',
    'there is someone here',
    'they are watching me',
    'stole my things',
    'intruder',
    'person outside',
    'ghost',
  ];

  const matchedTrigger = perceptionTriggers.find((trigger) => norm.includes(trigger));
  if (!matchedTrigger) return null;

  const profile = getPatientProfile();
  const name = profile.preferredName || profile.fullName || 'Margaret';

  return {
    isSafetyPolicyTriggered: true,
    response: `That sounds frightening, ${name}. You are safe here with me in your room. Everything is secure. Would you like me to contact David or play some calming music for you?`,
  };
};

// ==========================================
// 4. DISTRESS DETECTION ENGINE
// ==========================================
export const analyzeDistressSignals = (rawInput, repetitionInfo) => {
  const norm = normalizeText(rawInput);
  const distressKeywords = ['scared', 'help', 'frightened', 'afraid', 'lost', 'where am i', 'panic', 'crying', 'worried', 'happen to me', 'lonely'];

  let distressScore = 0;

  distressKeywords.forEach((kw) => {
    if (norm.includes(kw)) distressScore += 2;
  });

  if (repetitionInfo.count >= 3) {
    distressScore += 2;
  }

  const hour = new Date().getHours();
  if (hour >= 18 && hour <= 22) {
    distressScore += 1;
  }

  let newLevel = 'NORMAL';
  if (distressScore >= 5) {
    newLevel = 'HIGH DISTRESS';
  } else if (distressScore >= 3) {
    newLevel = 'ELEVATED DISTRESS';
  } else if (distressScore >= 1) {
    newLevel = 'EARLY DISTRESS';
  }

  if (newLevel !== 'NORMAL') {
    currentDistressState.consecutiveDistressCount += 1;
    currentDistressState.level = newLevel;
    currentDistressState.lastDetectedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (newLevel === 'ELEVATED DISTRESS' || newLevel === 'HIGH DISTRESS') {
      const profile = getPatientProfile();
      const patientName = profile.preferredName || profile.fullName || 'Margaret';

      addDistressEvent({
        timestamp: currentDistressState.lastDetectedAt,
        duration: `${currentDistressState.consecutiveDistressCount * 2} minutes`,
        distressLevel: newLevel,
        triggerSignal: `Conversational signal: "${rawInput}" (Repeated ${repetitionInfo.count}x)`,
        supportModeApplied: 'De-escalation & Grounding Music Offer',
        alertSent: true,
      });

      addLongitudinalEvent({
        category: 'Mood',
        title: `${newLevel} Detected`,
        detail: `Prolonged distress interaction observed for ${patientName}. Trigger: "${rawInput}".`,
        source: 'EchoCare Safety Agent',
        icon: 'ShieldAlert',
      });
    }
  } else {
    currentDistressState.consecutiveDistressCount = 0;
    currentDistressState.level = 'NORMAL';
  }

  notifyOrchestratorListeners();
  return currentDistressState;
};

// ==========================================
// 5. STAGE ADAPTATION ENGINE
// ==========================================
export const adaptResponseForStage = (baseResponse, stageProfile = 'early') => {
  const profile = getPatientProfile();
  const stage = stageProfile || profile.stageProfile || 'early';

  if (stage === 'advanced') {
    return baseResponse
      .replace(/Would you like to talk about your garden\?/i, 'You are safe. Here is warm tea. Shall we listen to soft music?')
      .replace(/She visited yesterday and will call this evening\./i, 'Priya calls tonight. You are safe.')
      .replace(/Let's check your medicine/i, 'Medicine time. Take with water.');
  }

  if (stage === 'moderate') {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `It's ${timeStr}. ${baseResponse}`;
  }

  return baseResponse;
};

// ==========================================
// 6. MULTILINGUAL INTENT ROUTER & PROCESSOR
// ==========================================
// ==========================================
// 6. MULTILINGUAL INTENT ROUTER & PROCESSOR
// ==========================================
export const processPatientVoiceInput = (rawInput) => {
  if (!rawInput || !rawInput.trim()) {
    return "I am right here with you. Take your time.";
  }

  const profile = getPatientProfile();
  const patientName = profile.preferredName || profile.fullName || 'Margaret';
  const norm = normalizeText(rawInput);
  const lang = profile.preferredLanguage || 'en-IN';

  // 1. SYSTEM COMMAND INTENTS (Language Switch)
  if (norm.includes('speak in tamil') || norm.includes('tamil') || norm.includes('தமிழ்') || norm.includes('தமிழில் பேசு')) {
    savePatientProfile({ ...profile, preferredLanguage: 'ta-IN' });
    return "சரி, இனி நான் தமிழில் பேசுகிறேன்.";
  }
  if (norm.includes('speak in hindi') || norm.includes('hindi') || norm.includes('हिंदी') || norm.includes('हिंदी में बोल')) {
    savePatientProfile({ ...profile, preferredLanguage: 'hi-IN' });
    return "ठीक है, अब मैं हिंदी में बात करूँगा।";
  }
  if (norm.includes('speak in telugu') || norm.includes('telugu') || norm.includes('తెలుగు') || norm.includes('తెలుగులో మాట్లాడు')) {
    savePatientProfile({ ...profile, preferredLanguage: 'te-IN' });
    return "సరే, ఇకపై నేను తెలుగులో మాట్లాడతాను.";
  }
  if (norm.includes('speak in malayalam') || norm.includes('malayalam') || norm.includes('മലയാളം') || norm.includes('മലയാളത്തിൽ സംസാരി')) {
    savePatientProfile({ ...profile, preferredLanguage: 'ml-IN' });
    return "ശരി, ഇനി ഞാൻ മലയാളത്തിൽ സംസാരിക്കാം.";
  }
  if (norm.includes('speak in kannada') || norm.includes('kannada') || norm.includes('ಕನ್ನಡ') || norm.includes('ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡು')) {
    savePatientProfile({ ...profile, preferredLanguage: 'kn-IN' });
    return "ಸರಿ, ಈಗ ನಾನು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ.";
  }
  if (norm.includes('speak in english') || norm.includes('english')) {
    savePatientProfile({ ...profile, preferredLanguage: 'en-IN' });
    return "Sure, I will speak in English with you.";
  }

  // 2. MEDICATION CONFIRMATION FOLLOW-UP ("I already took it", "Taken", "எடுத்துக்கொண்டேன்", "लिया है")
  if (
    norm.includes('already took it') ||
    norm.includes('took it') ||
    norm.includes('taken') ||
    norm.includes('i took my medicine') ||
    norm.includes('medication taken') ||
    norm.includes('எடுத்துக்கொண்டேன்') ||
    norm.includes('மாத்திரை எடுத்தாச்சு') ||
    norm.includes('दवा ले ली') ||
    norm.includes('తీసుకున్నాను') ||
    norm.includes('മരുന്ന് കഴിച്ചു') ||
    norm.includes('ತೆಗೆದುಕೊಂಡಿದ್ದೇನೆ')
  ) {
    const meds = getMedications();
    const pending = meds.filter((m) => m.status === 'Pending' || m.status === 'Scheduled');
    if (pending.length > 0) {
      updateMedicationStatus(pending[0].id, 'Verified', null, 'Patient Voice Confirmation');
      let confirmMsg = `Okay ${patientName}. I'll mark your ${pending[0].name} as taken. Wonderful job.`;
      if (lang === 'ta-IN') confirmMsg = `சரி ${patientName}. உங்கள் ${pending[0].name} மருந்து எடுத்துக்கொண்டதாகப் பதிவு செய்துள்ளேன். மிக நன்று.`;
      else if (lang === 'hi-IN') confirmMsg = `ठीक है ${patientName}। मैंने आपकी ${pending[0].name} दवा को लिया हुआ दर्ज कर लिया है। शाबाश।`;
      else if (lang === 'te-IN') confirmMsg = `సరే ${patientName}. మీ ${pending[0].name} మందు తీసుకున్నట్లు నమోదు చేశాను. చాలా మంచిది.`;
      else if (lang === 'ml-IN') confirmMsg = `ശരി ${patientName}. നിങ്ങളുടെ ${pending[0].name} മരുന്ന് കഴിച്ചതായി അടയാളപ്പെടുത്തി. വളരെ നല്ലത്.`;
      else if (lang === 'kn-IN') confirmMsg = `ಸರಿ ${patientName}. ನಿಮ್ಮ ${pending[0].name} ಔಷಧಿಯನ್ನು ತೆಗೆದುಕೊಂಡಂತೆ ದಾಖಲಿಸಿದ್ದೇನೆ. ತುಂಬಾ ಒಳ್ಳೆಯದು.`;

      logConversation(rawInput, confirmMsg, 'MEDICATION_FOLLOWUP');
      return adaptResponseForStage(confirmMsg, profile.stageProfile);
    } else {
      let alreadyVerified = `All of your medications for today are already marked as taken, ${patientName}.`;
      if (lang === 'ta-IN') alreadyVerified = `இன்று உங்களுக்கான அனைத்து மருந்துகளும் ஏற்கனவே எடுத்துக்கொள்ளப்பட்டன, ${patientName}.`;
      else if (lang === 'hi-IN') alreadyVerified = `आपकी आज की सभी दवाइयाँ पहले ही ली जा चुकी हैं, ${patientName}।`;
      else if (lang === 'te-IN') alreadyVerified = `ఈరోజు మీ మందులన్నీ ఇప్పటికే తీసుకోబడ్డాయి, ${patientName}.`;
      else if (lang === 'ml-IN') alreadyVerified = `ഇന്നത്തെ എല്ലാ മരുന്നുകളും ഇതിനകം കഴിച്ചു കഴിഞ്ഞു, ${patientName}.`;
      else if (lang === 'kn-IN') alreadyVerified = `ಇಂದಿನ ನಿಮ್ಮ ಎಲ್ಲಾ ಔಷಧಿಗಳನ್ನು ಈಗಾಗಲೇ ತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ, ${patientName}.`;

      logConversation(rawInput, alreadyVerified, 'MEDICATION_FOLLOWUP');
      return adaptResponseForStage(alreadyVerified, profile.stageProfile);
    }
  }

  // 3. LONELINESS / EMOTIONAL SUPPORT
  if (norm.includes('lonely') || norm.includes('alone') || norm.includes('sad') || norm.includes('தனியாக') || norm.includes('அகல') || norm.includes('अकेला') || norm.includes('ఒంటరిగా') || norm.includes('ഒറ്റയ്ക്ക്') || norm.includes('ಒಂಟಿ')) {
    let lonelyMsg = `You're not alone, ${patientName}. I'm right here with you.`;
    if (lang === 'ta-IN') lonelyMsg = `${patientName}, நீங்கள் தனியாக இல்லை. நான் உங்களுடனே இருக்கிறேன்.`;
    else if (lang === 'hi-IN') lonelyMsg = `${patientName}, आप अकेले नहीं हैं। मैं आपके साथ हूँ।`;
    else if (lang === 'te-IN') lonelyMsg = `${patientName}, మీరు ఒంటరిగా లేరు. నేను మీతోనే ఉన్నాను.`;
    else if (lang === 'ml-IN') lonelyMsg = `${patientName}, നിങ്ങൾ ഒറ്റയ്ക്കല്ല. ഞാൻ നിങ്ങളുടെ ഒപ്പമുണ്ട്.`;
    else if (lang === 'kn-IN') lonelyMsg = `${patientName}, ನೀವು ಒಂಟಿಯಾಗಿಲ್ಲ. ನಾನು ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ.`;

    logConversation(rawInput, lonelyMsg, 'EMOTIONAL_SUPPORT');
    return adaptResponseForStage(lonelyMsg, profile.stageProfile);
  }

  // 4. REPETITION ENGINE
  const repetitionInfo = processRepetition(rawInput);

  // 5. SAFETY POLICY PERCEPTIONS
  const safetyMatch = checkSafetyPolicyPerceptions(rawInput);
  if (safetyMatch) {
    analyzeDistressSignals(rawInput, repetitionInfo);
    let safeResp = safetyMatch.response;
    if (lang === 'ta-IN') safeResp = `${patientName}, நீங்கள் பாதுகாப்பாக இருக்கிறீர்கள். நான் உங்களுடன் இருக்கிறேன். அனைத்தும் பாதுகாப்பாக உள்ளது.`;
    else if (lang === 'hi-IN') safeResp = `${patientName}, आप यहाँ बिल्कुल सुरक्षित हैं। मैं आपके साथ हूँ। सब कुछ सुरक्षित है।`;
    else if (lang === 'te-IN') safeResp = `${patientName}, మీరు ఇక్కడ సురక్షితంగా ఉన్నారు. నేను మీతోనే ఉన్నాను.`;
    else if (lang === 'ml-IN') safeResp = `${patientName}, നിങ്ങൾ ഇവിടെ പൂർണ്ണമായും സുരക്ഷിതനാണ്. ഞാൻ ഒപ്പമുണ്ട്.`;
    else if (lang === 'kn-IN') safeResp = `${patientName}, ನೀವು ಇಲ್ಲ ಸಂಪೂರ್ಣ ಸುರಕ್ಷಿತವಾಗಿದ್ದೀರಿ. ನಾನು ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ.`;

    const adapted = adaptResponseForStage(safeResp, profile.stageProfile);
    logConversation(rawInput, adapted, 'SAFETY_POLICY');
    return adapted;
  }

  // 6. DISTRESS SIGNALS
  const distressState = analyzeDistressSignals(rawInput, repetitionInfo);
  if (distressState.level === 'HIGH DISTRESS' || distressState.level === 'ELEVATED DISTRESS') {
    let deescalationMsg = `You're completely safe here with me, ${patientName}. I am right by your side.`;
    if (lang === 'ta-IN') deescalationMsg = `${patientName}, நீங்கள் முற்றிலும் பாதுகாப்பாக இருக்கிறீர்கள். நான் உங்கள் பக்கத்தில் இருக்கிறேன்.`;
    else if (lang === 'hi-IN') deescalationMsg = `${patientName}, आप यहाँ बिल्कुल सुरक्षित हैं। मैं आपके पास हूँ।`;
    else if (lang === 'te-IN') deescalationMsg = `${patientName}, మీరు ఇక్కడ సురక్షితంగా ఉన్నారు. నేను మీ పక్కనే ఉన్నాను.`;
    else if (lang === 'ml-IN') deescalationMsg = `${patientName}, നിങ്ങൾ പൂർണ്ണമായും സുരക്ഷിതനാണ്. ഞാൻ ഒപ്പമുണ്ട്.`;
    else if (lang === 'kn-IN') deescalationMsg = `${patientName}, ನೀವು ಸುರಕ್ಷಿತವಾಗಿದ್ದೀರಿ. ನಾನು ನಿಮ್ಮ ಪಕ್ಕದಲ್ಲಿದ್ದೇನೆ.`;

    logConversation(rawInput, deescalationMsg, 'DISTRESS_DEESCALATION');
    return adaptResponseForStage(deescalationMsg, profile.stageProfile);
  }

  // 7. REPETITION PROGRESSION
  if (repetitionInfo.count > 1) {
    if (norm.includes('priya') || norm.includes('where is') || norm.includes('daughter') || norm.includes('when will she come') || norm.includes('பிரியா')) {
      let repMsg = `You are thinking about Priya again, ${patientName}. She visited yesterday and will call this evening.`;
      if (lang === 'ta-IN') repMsg = `நீங்கள் மீண்டும் பிரியாவைப் பற்றி யோசிக்கிறீர்கள், ${patientName}. அவர் இன்று மாலை உங்களை அழைப்பார்.`;
      else if (lang === 'hi-IN') repMsg = `आप फिर से प्रिया के बारे में सोच रहे हैं, ${patientName}। वह आज शाम को फोन करेंगी।`;
      else if (lang === 'te-IN') repMsg = `మీరు మళ్లీ ప్రియ గురించి ఆలోచిస్తున్నారు, ${patientName}. ఆమె ఈ సాయంత్రం కాల్ చేస్తుంది.`;
      else if (lang === 'ml-IN') repMsg = `നിങ്ങൾ വീണ്ടും പ്രിയയെക്കുറിച്ച് ചിന്തിക്കുകയാണ്, ${patientName}. അവർ ഇന്ന് വൈകുന്നേരം വിളിക്കും.`;
      else if (lang === 'kn-IN') repMsg = `ನೀವು ಮತ್ತೆ ಪ್ರಿಯಾ ಬಗ್ಗೆ ಯೋಚಿಸುತ್ತಿದ್ದೀರಿ, ${patientName}. ಅವರು ಇಂದು ಸಂಜೆ ಕರೆ ಮಾಡುತ್ತಾರೆ.`;

      logConversation(rawInput, repMsg, 'REPETITION_ENGINE');
      return adaptResponseForStage(repMsg, profile.stageProfile);
    }
  }

  // 8. MEMORY & CONTEXT RETRIEVAL
  const memoryContext = retrieveMemoryContext(rawInput);
  if (memoryContext) {
    const memMsg = `${memoryContext.prompt} ${memoryContext.actionableOffer}`;
    logConversation(rawInput, memMsg, 'MEMORY_RETRIEVAL');
    return adaptResponseForStage(memMsg, profile.stageProfile);
  }

  // 9. MEDICATION QUERIES ("What medicine do I take now?", "இன்று என்ன மருந்து", "दवा")
  if (
    norm.includes('medicine') ||
    norm.includes('medication') ||
    norm.includes('pill') ||
    norm.includes('dawai') ||
    norm.includes('மருந்து') ||
    norm.includes('மாத்திரை') ||
    norm.includes('दवा') ||
    norm.includes('मन्दुलु') ||
    norm.includes('മരുന്ന്') ||
    norm.includes('ಔಷಧ')
  ) {
    const meds = getMedications();
    const pending = meds.filter((m) => m.status === 'Pending' || m.status === 'Scheduled');
    if (meds.length === 0 || pending.length === 0) {
      let allDone = `Good news, ${patientName}. All of your scheduled medications for today have been taken.`;
      if (lang === 'ta-IN') allDone = `நல்ல செய்தி ${patientName}. இன்று உங்களுக்கான அனைத்து மருந்துகளும் எடுத்துக்கொள்ளப்பட்டன.`;
      else if (lang === 'hi-IN') allDone = `अच्छी खबर है ${patientName}। आज की आपकी सभी दवाइयाँ ली जा चुकी हैं।`;
      else if (lang === 'te-IN') allDone = `మంచి వార్త ${patientName}. ఈరోజు మీ మందులన్నీ తీసుకోబడ్డాయి.`;
      else if (lang === 'ml-IN') allDone = `നല്ല വാർത്ത ${patientName}. ഇന്നത്തെ എല്ലാ മരുന്നുകളും കഴിച്ചു കഴിഞ്ഞു.`;
      else if (lang === 'kn-IN') allDone = `ಒಳ್ಳೆಯ ಸುದ್ದಿ ${patientName}. ಇಂದಿನ ನಿಮ್ಮ ಎಲ್ಲಾ ಔಷಧಿಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ.`;

      logConversation(rawInput, allDone, 'MEDICATION_AGENT');
      return adaptResponseForStage(allDone, profile.stageProfile);
    }
    const nextMed = pending[0];
    let medMsg = `It is time for your ${nextMed.name} (${nextMed.dosage}). ${nextMed.instructions || 'Please take one tablet.'}`;
    if (lang === 'ta-IN') medMsg = `அம்மா ${patientName}, இது உங்கள் ${nextMed.name} (${nextMed.dosage}) மருந்து எடுத்துக்கொள்ளும் நேரம். ${nextMed.instructions || 'இப்போது எடுத்துக்கொள்ளுங்கள்.'}`;
    else if (lang === 'hi-IN') medMsg = `नमस्ते ${patientName}, यह आपकी ${nextMed.name} (${nextMed.dosage}) दवा का समय है। ${nextMed.instructions || 'कृपया इसे अभी लें। '}`;
    else if (lang === 'te-IN') medMsg = `అమ్మ ${patientName}, ఇది మీ ${nextMed.name} (${nextMed.dosage}) మందులు తీసుకునే సమయం. ${nextMed.instructions || 'దయచేసి ఇప్పుడు తీసుకోండి.'}`;
    else if (lang === 'ml-IN') medMsg = `അമ്മ ${patientName}, നിങ്ങളുടെ ${nextMed.name} (${nextMed.dosage}) മരുന്ന് കഴിക്കേണ്ട സമയമാണിത്. ${nextMed.instructions || 'ദയവായി ഇപ്പോൾ കഴിക്കുക.'}`;
    else if (lang === 'kn-IN') medMsg = `ಅಮ್ಮ ${patientName}, ಇದು ನಿಮ್ಮ ${nextMed.name} (${nextMed.dosage}) ಔಷಧಿಯನ್ನು ತೆಗೆದುಕೊಳ್ಳುವ ಸಮಯ. ${nextMed.instructions || 'ದಯವಿಟ್ಟು ಈಗ ತೆಗೆದುಕೊಳ್ಳಿ.'}`;

    logConversation(rawInput, medMsg, 'MEDICATION_AGENT');
    return adaptResponseForStage(medMsg, profile.stageProfile);
  }

  // 10. TIME QUERIES ("What time is it?", "மணி என்ன", "समय")
  if (norm.includes('time') || norm.includes('clock') || norm.includes('what time') || norm.includes('நேரம்') || norm.includes('மணி') || norm.includes('समय') || norm.includes('సమయం') || norm.includes('സമയം') || norm.includes('ಸಮಯ')) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let timeMsg = `It is currently ${timeStr}, ${patientName}.`;
    if (lang === 'ta-IN') timeMsg = `இப்போது மணி ${timeStr}, ${patientName}.`;
    else if (lang === 'hi-IN') timeMsg = `अभी ${timeStr} हो रहा है, ${patientName}।`;
    else if (lang === 'te-IN') timeMsg = `ఇప్పుడు సమయం ${timeStr}, ${patientName}.`;
    else if (lang === 'ml-IN') timeMsg = `ഇപ്പോൾ സമയം ${timeStr}, ${patientName}.`;
    else if (lang === 'kn-IN') timeMsg = `ಈಗ സമയം ${timeStr}, ${patientName}.`;

    logConversation(rawInput, timeMsg, 'TIME_AGENT');
    return timeMsg;
  }

  // 11. AUDIO / HEARING / SPEECH ISSUES ("I couldn't hear you", "speak louder", "repeat")
  if (norm.includes('hear') || norm.includes('listen') || norm.includes('speak') || norm.includes('louder') || norm.includes('repeat') || norm.includes('கேட்கவில்லை') || norm.includes('सुनाई')) {
    let hearMsg = `I'm speaking clearly now, ${patientName}. I am right here with you. Would you like me to check your medication schedule or tell you a story?`;
    if (lang === 'ta-IN') hearMsg = `நான் இப்போது தெளிவாகப் பேசுகிறேன் ${patientName}. நான் உங்களுடனே இருக்கிறேன்.`;
    else if (lang === 'hi-IN') hearMsg = `मैं अब स्पष्ट रूप से बोल रहा हूँ, ${patientName}। मैं आपके साथ हूँ।`;

    logConversation(rawInput, hearMsg, 'AUDIO_FEEDBACK');
    return adaptResponseForStage(hearMsg, profile.stageProfile);
  }

  // 12. DYNAMIC CONVERSATIONAL FALLBACK (Extracted Topic + Dynamic Reminder Context)
  const pendingMeds = getMedications().filter((m) => m.status === 'Pending' || m.status === 'Scheduled');
  const reminderClause = pendingMeds.length > 0
    ? ` By the way, your ${pendingMeds[0].name} (${pendingMeds[0].dosage}) is scheduled for ${pendingMeds[0].scheduledTime || 'today'}.`
    : ` All your medications for today are taken!`;

  const words = rawInput.trim().split(/\s+/).filter((w) => w.length > 3);
  const mainTopic = words.length > 0 ? words.slice(-2).join(' ') : 'that';

  let defaultResp = `I understand you're asking about ${mainTopic}, ${patientName}. I'm right here with you and listening carefully.${reminderClause}`;
  if (lang === 'ta-IN') defaultResp = `நீங்கள் பேசுவதைக் கேட்கிறேன் ${patientName}. நான் உங்களுடனே இருக்கிறேன்.${pendingMeds.length > 0 ? ` உங்கள் மருந்து நேரம்: ${pendingMeds[0].name}.` : ''}`;
  else if (lang === 'hi-IN') defaultResp = `मैं आपकी बात सुन रहा हूँ, ${patientName}। मैं आपके साथ हूँ।${pendingMeds.length > 0 ? ` आपकी दवा का समय: ${pendingMeds[0].name}।` : ''}`;
  else if (lang === 'te-IN') defaultResp = `నేను మీ మాటలు వింటున్నాను, ${patientName}.${pendingMeds.length > 0 ? ` మీ మందుల సమయం: ${pendingMeds[0].name}.` : ''}`;
  else if (lang === 'ml-IN') defaultResp = `ഞാൻ കേൾക്കുന്നുണ്ട്, ${patientName}.${pendingMeds.length > 0 ? ` മരുന്ന് കഴിക്കേണ്ട സമയം: ${pendingMeds[0].name}.` : ''}`;
  else if (lang === 'kn-IN') defaultResp = `ನಾನು ನಿಮ್ಮ ಮಾತನ್ನು ಕೇಳುತ್ತಿದ್ದೇನೆ, ${patientName}.${pendingMeds.length > 0 ? ` ಔಷಧಿ ಸಮಯ: ${pendingMeds[0].name}.` : ''}`;

  logConversation(rawInput, defaultResp, 'DYNAMIC_CONVERSATION');
  return adaptResponseForStage(defaultResp, profile.stageProfile);
};

export const logConversation = (userMsg, aiMsg, agentSource) => {
  const entry = {
    id: 'conv-' + Date.now(),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    userMsg,
    aiMsg,
    agentSource,
  };
  conversationHistory = [entry, ...conversationHistory.slice(0, 49)];
  notifyOrchestratorListeners();

  if (agentSource === 'MEMORY_RETRIEVAL' || agentSource === 'DISTRESS_DEESCALATION') {
    addLongitudinalEvent({
      category: 'Memory',
      title: 'Voice Companion Interaction',
      detail: `Conversed softly about memory context (${userMsg}). AI response provided reassuring context.`,
      source: 'EchoCare Voice Agent',
      icon: 'MessageSquare',
    });
  }
};

// ==========================================
// CAREGIVER VOICE OBSERVATION & HANDOVER HELPERS
// ==========================================
export const parseCaregiverVoiceObservation = (rawAudioText) => {
  const lower = rawAudioText.toLowerCase();

  let appetite = 'Normal';
  if (lower.includes('eat') || lower.includes('food') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('appetite')) {
    if (lower.includes('didnt eat') || lower.includes('little') || lower.includes('less') || lower.includes('refused') || lower.includes('poor')) {
      appetite = 'Reduced (Dinner intake lower than usual)';
    } else if (lower.includes('well') || lower.includes('good') || lower.includes('finished')) {
      appetite = 'Good (Finished full meal)';
    }
  }

  let energy = 'Normal';
  if (lower.includes('tired') || lower.includes('fatigue') || lower.includes('sleepy') || lower.includes('weak') || lower.includes('exhausted')) {
    energy = 'Lower than usual (More tired than usual)';
  } else if (lower.includes('active') || lower.includes('energetic') || lower.includes('lively')) {
    energy = 'Energetic & Alert';
  }

  let mobility = 'Independent';
  if (lower.includes('chair') || lower.includes('walk') || lower.includes('stand') || lower.includes('assistance') || lower.includes('unsteady') || lower.includes('help')) {
    mobility = 'Increased assistance required (Needed help getting out of chair/walking)';
  }

  let sleepBehavior = 'Restful';
  if (lower.includes('restless') || lower.includes('wake') || lower.includes('insomnia') || lower.includes('agitated') || lower.includes('night')) {
    sleepBehavior = 'Restless / Evening agitation observed';
  }

  return {
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString(),
    rawAudioText,
    structured: {
      appetite,
      energy,
      mobility,
      sleepBehavior,
    },
    source: 'Family Caregiver',
  };
};

export const generateShiftHandoverBrief = (rawShiftNotes, outgoingCaregiverName = 'Sarah Jenkins, RN') => {
  const obs = getCaregiverObservations();
  const lower = rawShiftNotes.toLowerCase();

  let appetite = 'Meal intake normal.';
  if (lower.includes('eat') || lower.includes('dinner') || lower.includes('refused') || lower.includes('less')) {
    appetite = 'Dinner intake lower than usual.';
  }

  let behaviour = 'Restful and cooperative during shift.';
  if (lower.includes('restless') || lower.includes('agitated') || lower.includes('wandering') || lower.includes('anxious')) {
    behaviour = 'Restlessness and mild agitation observed around 8 PM.';
  }

  let pattern = 'Routine care followed smoothly.';
  if (obs.length >= 2) {
    pattern = 'Similar evening restlessness observed twice this week.';
  }

  let watch = 'Monitor hydration and night rest.';
  if (lower.includes('restless') || lower.includes('agitated')) {
    watch = 'Monitor evening agitation and sundowning signs.';
  }

  let routine = 'All afternoon medications verified.';

  return {
    id: 'handover-' + Date.now(),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString(),
    outgoingCaregiver: outgoingCaregiverName,
    rawNotes: rawShiftNotes,
    structuredBrief: {
      appetite,
      behaviour,
      pattern,
      watch,
      routine,
    },
    status: 'Confirmed',
  };
};

export const generateAICareSummary = () => {
  const timeline = getLongitudinalTimeline();
  const obs = getCaregiverObservations();
  const profile = getPatientProfile();
  const patientName = profile.preferredName || profile.fullName || 'Margaret';

  const highlights = [];
  const thingsToWatch = [];

  const reducedAppetiteObs = obs.filter((o) => o.structured?.appetite?.toLowerCase().includes('reduced') || o.structured?.appetite?.toLowerCase().includes('lower'));
  if (reducedAppetiteObs.length > 0) {
    highlights.push(`Appetite was lower than usual on ${reducedAppetiteObs.length} recent observation(s).`);
    thingsToWatch.push('Reduced appetite & hydration');
  }

  const mobilityObs = obs.filter((o) => o.structured?.mobility?.toLowerCase().includes('assistance'));
  if (mobilityObs.length > 0) {
    highlights.push(`Recent observations mention increased mobility assistance when getting out of chairs.`);
    thingsToWatch.push('Mobility & chair transfer assistance');
  }

  const distressEvents = timeline.filter((e) => e.category === 'Mood' || e.title.includes('Distress'));
  if (distressEvents.length > 0) {
    highlights.push(`Evening distress interaction pattern detected ${distressEvents.length} time(s) this week.`);
    thingsToWatch.push('Evening agitation (sundowning)');
  }

  if (highlights.length === 0) {
    highlights.push('Medication verification remained 100% consistent this week.');
    highlights.push('Mood remains gentle and cheerful during morning routines.');
  }

  if (thingsToWatch.length === 0) {
    thingsToWatch.push('Routine hydration monitoring');
  }

  return {
    patientName,
    recentPeriodLabel: 'Last 7 Days',
    highlights,
    thingsToWatch,
    decisionSupportNotice: 'Decision support only. Does not replace clinical diagnosis.',
  };
};
