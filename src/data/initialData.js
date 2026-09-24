// Default Seed / Sample Data matching the Stitch UI design
// Pre-populated on first load so users immediately see realistic data.
// Users and Caregivers can EDIT, ADD, or DELETE any of this data anytime.

export const DEMO_PATIENT_PROFILE = {
  fullName: 'Margaret Miller',
  preferredName: 'Margaret',
  age: 82,
  roomNumber: 'Room 104 - North Wing',
  roomStatus: 'Stable & Resting comfortably',
  ambientAcoustic: 'Ambient acoustic pattern is normal',
  preferredLanguage: 'en-US',
  avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  dateOfBirth: '1944-07-12',
  emergencyNotes: 'Lisinopril taken at 4:30 PM. Keep seated 5 minutes after. Melatonin 30 mins before sleep.',
  importantInstructions: 'Enjoys garden strolls. Afternoon chamomile tea with honey. Converses softly about old rose garden.',
  wakeUpTime: '07:00 AM',
  sleepTime: '08:30 PM',
};

export const DEMO_CAREGIVERS = [
  {
    id: 'rel-1',
    name: 'Sarah Jenkins, RN',
    relation: 'Visiting Nurse - Care Link',
    schedule: 'Mon / Thu 10 AM',
    lastVisited: 'Today at 10:00 AM',
    phone: '(555) 876-5432',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    primaryContact: true,
    receiveEmergencyAlerts: true,
    alertsOn: true,
  },
  {
    id: 'rel-2',
    name: 'David Miller',
    relation: 'Primary Caregiver - Son',
    schedule: 'Daily Check-in',
    lastVisited: 'Today at 1:15 PM',
    memoryNote: 'Calls every evening at 6:00 PM.',
    phone: '(555) 234-8901',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    primaryContact: true,
    receiveEmergencyAlerts: true,
    alertsOn: true,
  },
  {
    id: 'rel-3',
    name: 'Priya Sharma',
    relation: 'Daughter',
    schedule: 'Sundays 2:00 PM',
    lastVisited: 'Yesterday at 2:00 PM',
    memoryNote: 'Visits every Sunday with homemade chamomile tea.',
    phone: '(555) 345-6789',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    primaryContact: false,
    receiveEmergencyAlerts: false,
    alertsOn: false,
  },
];

export const DEMO_MEDICATIONS = [
  {
    id: 'med-1',
    name: 'Metformin',
    dosage: '500 mg',
    scheduledTime: '08:00 AM',
    mealSlot: 'Morning',
    instructions: 'After breakfast with warm water',
    startDate: '2026-01-01',
    status: 'Verified',
    verifiedAt: '8:15 AM',
    verificationHistory: [{ timestamp: '8:15 AM', status: 'Verified' }],
    keywords: ['metformin', '500mg'],
  },
  {
    id: 'med-2',
    name: 'Vitamin D3 & Calcium',
    dosage: '1000 IU',
    scheduledTime: '12:30 PM',
    mealSlot: 'Lunchtime',
    instructions: 'Taken with noon meal',
    startDate: '2026-01-01',
    status: 'Verified',
    verifiedAt: '12:45 PM',
    verificationHistory: [{ timestamp: '12:45 PM', status: 'Verified' }],
    keywords: ['vitamin d', 'calcium', '1000iu'],
  },
  {
    id: 'med-3',
    name: 'Blood Pressure Support (Lisinopril)',
    dosage: '10 mg',
    scheduledTime: '04:30 PM',
    mealSlot: 'Afternoon',
    instructions: 'Keep seated for 5 minutes after',
    startDate: '2026-01-01',
    status: 'Pending',
    verifiedAt: null,
    verificationHistory: [],
    keywords: ['lisinopril', 'blood pressure', '10mg'],
  },
  {
    id: 'med-4',
    name: 'Sleep & Calm Rest (Melatonin)',
    dosage: '3 mg',
    scheduledTime: '08:30 PM',
    mealSlot: 'Bedtime',
    instructions: '30 mins before sleep',
    startDate: '2026-01-01',
    status: 'Scheduled',
    verifiedAt: null,
    verificationHistory: [],
    keywords: ['melatonin', 'sleep', '3mg'],
  },
];

export const DEMO_MEMORIES = [
  {
    id: 'mem-1',
    title: 'Summer at Cape May, 1982',
    dateLabel: 'July 1982',
    story: 'You, Tom, and the children built a sandcastle shaped like a sleepy sea turtle. The tide came in slowly while you all shared chilled peaches.',
    audioDuration: '2 min',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    tag: 'Moments I Remember',
  },
  {
    id: 'mem-2',
    title: 'Sunday Sourdough Bread',
    dateLabel: 'Family Tradition',
    story: "Your mother's secret recipe with freshly picked rosemary from the garden wall. The entire house filled with the warm scent of crisp crust and olive oil.",
    recordedWith: 'Priya',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    tag: 'Family Tradition',
  },
];

export const DEMO_OBSERVATIONS = {
  mood: 'Gentle & cheerful',
  sleep: '7h 45m · Restful',
  dailyRoutine: 'Meds verified',
  outdoor: 'Garden stroll',
};

export const DEMO_TELEMETRY_LOGS = [
  {
    id: 'log-1',
    timestamp: '08:15 AM',
    type: 'MEDICATION_VERIFIED',
    level: 'SUCCESS',
    message: 'Confirmed Metformin 500mg taken with glass of water. Checked off by EchoCare Voice.',
  },
  {
    id: 'log-2',
    timestamp: '10:30 AM',
    type: 'HYDRATION_PROMPT',
    level: 'INFO',
    message: 'Gentle reminder chime: warm chamomile tea offered and enjoyed.',
  },
  {
    id: 'log-3',
    timestamp: '12:45 PM',
    type: 'MEDICATION_VERIFIED',
    level: 'SUCCESS',
    message: 'Vegetable broth meal finished. Afternoon vitamins visually recognized.',
  },
  {
    id: 'log-4',
    timestamp: '03:15 PM',
    type: 'VOICE_CHAT',
    level: 'INFO',
    message: 'Conversed softly about her old rose garden & childhood spring planting.',
  },
];

