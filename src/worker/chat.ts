type ChatContext = {
  name: string
  cycleDay: number | null
  phase: string | null
}

type Answer = {
  content: string
  suggestions: string[]
  urgent: boolean
}

type Topic = {
  id: string
  match: RegExp
  answer: (context: ChatContext) => Answer
}

const BASE_SUGGESTIONS = ['My first period is here', 'How do I stop cramps?', 'My period is late', 'What should I keep in my bag?']

const topics: Topic[] = [
  {
    id: 'greeting',
    match: /^(hi|hey|hello|good (morning|evening|afternoon)|yo|hola)\b/i,
    answer: ({ name }) => ({
      content: `Hi ${name}. I'm the Sakhicycle guide. I can explain what is happening in your cycle, help you plan for school or sport, and talk through anything that feels worrying.\n\nI'm an education tool, not a doctor, so for medical decisions please also talk to a trusted adult or a clinician.`,
      suggestions: BASE_SUGGESTIONS,
      urgent: false,
    }),
  },
  {
    id: 'first-period',
    match: /(first period|just got my period|started my period|got my period|beginning of my period|new to periods?)/i,
    answer: () => ({
      content:
        'Welcome. A first period usually arrives between ages 9 and 16, and it is often light and brownish rather than a heavy red flow. Early periods can be unpredictable for the first year or two while your hormones settle.\n\nWhat helps in the first days:\n• Use a pad first if you are unsure how tampons feel. Change it every 3 to 6 hours.\n• Keep a spare pad, clean underwear and a small bag in your school bag.\n• Note the date in your tracker so predictions get better over time.\n• Tell someone you trust, a parent, carer, school nurse or older sibling. You do not have to manage it alone.\n\nIf bleeding lasts longer than 7 days, soaks through a pad in an hour for several hours, or comes with severe pain, ask a doctor.',
      suggestions: ['What should I keep in my bag?', 'How much bleeding is normal?', 'Can I swim on my period?'],
      urgent: false,
    }),
  },
  {
    id: 'cramps',
    match: /(cramp|pain|hurt|ache|sore|back pain)/i,
    answer: ({ cycleDay }) => ({
      content: `Cramps are your uterus contracting, and they are very common${cycleDay ? `, especially around day ${cycleDay} of your cycle` : ''}. They usually start a day or two before bleeding and ease after the first two days.\n\nThings that genuinely help:\n• Heat: a hot water bottle or warm shower for 15 to 20 minutes.\n• Gentle movement: walking, stretching or light yoga.\n• Rest and water, and regular meals so your blood sugar stays steady.\n• Over-the-counter pain relief such as ibuprofen can help. Ask a parent, carer or pharmacist first, and follow the label.\n\nPain that stops you going to school, does not respond to pain relief, or is getting worse cycle after cycle deserves a doctor's appointment. Conditions like endometriosis are real and treatable, and you are allowed to ask for help.`,
      suggestions: ['Is my pain normal?', 'Does heat really help?', 'What is endometriosis?'],
      urgent: false,
    }),
  },
  {
    id: 'heavy-bleeding',
    match: /(heavy|soak|soaking|flood|bleeding a lot|clots?|haemorrhag|hemorrhag|dizzy|faint)/i,
    answer: () => ({
      content:
        'Let me be direct with you, because this one matters.\n\nBleeding through a pad or tampon every hour for more than two hours, passing clots larger than a 50 cent coin, or feeling dizzy, faint or very tired is not something to wait out. Tell a parent, carer or teacher now and contact a doctor or your local urgent care service the same day.\n\nHeavy bleeding can be caused by hormone changes, iron deficiency or other treatable conditions. It is not your fault and it is not embarrassing. Please do not manage it alone.',
      suggestions: ['How much bleeding is normal?', 'I feel dizzy, what now?', 'When should I see a doctor?'],
      urgent: true,
    }),
  },
  {
    id: 'late-period',
    match: /(late|missed|delayed|no period|skipped|irregular|why.*period.*(not|haven.t))/i,
    answer: ({ cycleDay }) => ({
      content: `A late period is common in the first few years after your first one, because ovulation is still finding its rhythm. Stress, illness, travel, big changes in weight or training, and poor sleep can all shift a cycle by a week or more.\n\nWhat to do:\n• Give it a few days. Cycles between 21 and 45 days are usually normal for teenagers.\n• Note anything unusual in your log: exams, a cold, a new sport, a change in sleep.\n• If you have had sex and your period is more than a week late, take a pregnancy test and speak to a trusted adult or clinic.\n• If you have gone three months or more without a period, book a doctor's appointment. Conditions such as PCOS and thyroid problems are worth ruling out.\n\n${cycleDay ? `You are on cycle day ${cycleDay} right now.` : ''}`,
      suggestions: ["What's a normal cycle length?", 'Could stress delay my period?', 'When should I see a doctor?'],
      urgent: false,
    }),
  },
  {
    id: 'cycle-basics',
    match: /(cycle|phase|ovulat|fertile|hormone|progesterone|oestrogen|estrogen|luteal|follicular)/i,
    answer: () => ({
      content:
        'Your cycle has four rough phases:\n\n1. Menstrual (day 1 to about 5): the lining of your uterus sheds. This is your period.\n2. Follicular (after bleeding until ovulation): oestrogen rises and an egg starts maturing.\n3. Ovulation (around the middle): an egg is released. Some people feel a twinge on one side.\n4. Luteal (after ovulation until the next period): progesterone rises, then falls, which is why mood, skin and energy can shift.\n\nA typical adult cycle is 21 to 35 days, and 21 to 45 days is common in teenagers. The first day of bleeding is day 1. Tracking a few cycles makes your own pattern much clearer than any average.',
      suggestions: ['What is a fertile window?', 'Why is my cycle irregular?', 'Why do I feel low before my period?'],
      urgent: false,
    }),
  },
  {
    id: 'mood',
    match: /(mood|sad|cry|anxious|anxiety|irritable|angry|pms|pmdd|emotional|depress|overwhelm)/i,
    answer: () => ({
      content:
        'Mood shifts before a period are real. In the week before bleeding, progesterone falls and serotonin can dip, which is why you may feel tearful, snappy or flat.\n\nWhat helps: protect sleep, eat regularly, move your body, and lower your expectations of yourself for a few days. Writing down how you feel helps you spot the pattern.\n\nIf your mood drops so low that you cannot function, if it happens every cycle, or if you ever have thoughts of hurting yourself, that is bigger than PMS. Tell a trusted adult and ask a doctor about PMDD or anxiety. In an emergency, contact your local emergency number right away.',
      suggestions: ['Why do I feel low before my period?', 'How can I sleep better?', 'When should I see a doctor?'],
      urgent: false,
    }),
  },
  {
    id: 'products',
    match: /(pad|tampon|cup|period underwear|products?|which.*use|how.*insert|leak|dispose|bin)/i,
    answer: () => ({
      content:
        'There is no single right product. Here is the practical difference:\n\n• Pads: stick to your underwear, easiest to start with. Change every 3 to 6 hours.\n• Tampons: worn inside, change every 4 to 8 hours, never longer. Use the lowest absorbency you need. Toxic shock syndrome is rare but serious, so never leave one in overnight for more than 8 hours and never use two at once.\n• Menstrual cups: reusable, can stay in up to 12 hours, needs washing between uses.\n• Period underwear: comfortable backup, wash cold and follow the care label.\n\nFor leaks: dark trousers or a skirt, a spare pair of underwear in your bag, and a light jacket tied around your waist have rescued a lot of school days. Wrap used products in paper and put them in a bin, never down the toilet.',
      suggestions: ['What is toxic shock syndrome?', 'Can I swim on my period?', 'What should I keep in my bag?'],
      urgent: false,
    }),
  },
  {
    id: 'tss',
    match: /(toxic shock|tss)/i,
    answer: () => ({
      content:
        'Toxic shock syndrome is a rare but serious reaction linked to leaving a tampon in too long. Symptoms include a sudden high fever, a rash that looks like sunburn, vomiting, dizziness or feeling very unwell, usually with a tampon in place.\n\nIf this happens, remove the tampon immediately and get medical help the same day. Using the lowest absorbency you need, changing every 4 to 8 hours, and not wearing a tampon overnight for more than 8 hours lowers the risk a lot.',
      suggestions: ['Which period product should I use?', 'Can I sleep with a tampon in?', 'When should I see a doctor?'],
      urgent: true,
    }),
  },
  {
    id: 'school-sport',
    match: /(school|sport|swim|gym|pe|exercise|dance|leak at school|uniform)/i,
    answer: () => ({
      content:
        'You can absolutely swim, run and play sport on your period. A tampon or cup makes swimming easy; pads and period underwear work for everything else.\n\nA small kit makes school days much calmer: two pads or tampons, a spare pair of underwear, wet wipes and a small pouch that fits in your bag. Ask a teacher or the school nurse where the toilet bins are, and remember you are allowed to take a bathroom break.\n\nIf sport makes cramps worse, try a warm shower first and keep hydrated. If exercise has stopped your period for three months or more, tell a doctor, because that can affect bone health.',
      suggestions: ['Can I swim on my period?', 'What should I keep in my bag?', 'Why is my period late?'],
      urgent: false,
    }),
  },
  {
    id: 'discharge',
    match: /(discharge|white stuff|wet|smell|odour|odor|itch|yeast|infection)/i,
    answer: () => ({
      content:
        'Discharge is normal and healthy. It changes through the month: clear and stretchy around ovulation, thicker and white afterwards, and sometimes light brown at the end of a period.\n\nSee a doctor or nurse if discharge is green or grey, smells strongly, comes with itching, burning when you pee, or pain in your lower belly. Those signs usually mean an infection that is easy to treat, and nothing to be embarrassed about.\n\nWash the outside with plain water, avoid scented washes and douches, and wear breathable cotton underwear.',
      suggestions: ['Is discharge normal?', 'It itches, what should I do?', 'When should I see a doctor?'],
      urgent: false,
    }),
  },
  {
    id: 'doctor',
    match: /(doctor|gp\b|clinic|hospital|see someone|check.?up|abnormal|not normal)/i,
    answer: () => ({
      content:
        'Trust your instincts: if something feels wrong, you are allowed to ask for help, even if you are not sure it is "bad enough".\n\nBook an appointment if you have:\n• Bleeding through a pad or tampon every hour for more than two hours\n• Periods lasting longer than 7 days, or a cycle shorter than 21 or longer than 45 days that keeps happening\n• Pain that stops you going to school or does not respond to pain relief\n• No period for three months or more (and you are not pregnant)\n• Bleeding between periods, after sex, or after you have stopped having periods\n• Fever, fainting, or feeling very unwell during your period\n\nYou can ask to see a female doctor, bring a friend or trusted adult, and write your questions down beforehand.',
      suggestions: ['How much bleeding is normal?', 'Is my pain normal?', 'My period is late'],
      urgent: false,
    }),
  },
  {
    id: 'tracking',
    match: /(track|log|calendar|predict|app|reminder|when.*next)/i,
    answer: ({ cycleDay }) => ({
      content: `Tracking works best when it takes ten seconds. Mark the days you bleed, and note flow, cramps and mood when you have a moment. After two cycles Sakhicycle averages your own pattern instead of a textbook one.\n\n${cycleDay ? `You are on cycle day ${cycleDay}, and your dashboard already shows your current phase.` : 'Add your last period start date on the dashboard to get your first prediction.'}\n\nPredictions are estimates, not guarantees, and they get more accurate the longer you track.`,
      suggestions: ['What is a fertile window?', 'How do I log my period?', "What's a normal cycle length?"],
      urgent: false,
    }),
  },
  {
    id: 'pregnancy',
    match: /(pregnan|contracept|birth control|pill|condom|sex)/i,
    answer: () => ({
      content:
        'I can explain the basics, but decisions about sex, contraception and pregnancy are best made with a doctor or nurse and a trusted adult.\n\n• A missed period after unprotected sex is the main sign to check with a pregnancy test, which you can buy at a pharmacy or get free at many clinics.\n• Only condoms protect against sexually transmitted infections. Hormonal contraception does not.\n• Emergency contraception works best the sooner it is taken, so do not wait if you need it.\n• Clinics are confidential, and staff are used to these conversations.\n\nIf you are worried, talking to a trusted adult or a clinic is the fastest way to get real answers.',
      suggestions: ['My period is late', 'When should I see a doctor?', 'What is a normal cycle?'],
      urgent: false,
    }),
  },
  {
    id: 'emergency',
    match: /(suicid|kill myself|self.?harm|hurt myself|end my life|abuse|assault)/i,
    answer: () => ({
      content:
        'I am really glad you told me, and I am sorry you are carrying this. You deserve support right now.\n\nPlease tell a trusted adult today: a parent, carer, teacher, school counsellor or doctor. If you are in immediate danger, contact your local emergency number or go to the nearest emergency department.\n\nIf someone has hurt you, that was not your fault, and you can contact a local support service or the police. I am an education tool and cannot provide crisis care, but the people around you can.',
      suggestions: ['I need to talk to someone', 'I feel overwhelmed', 'When should I see a doctor?'],
      urgent: true,
    }),
  },
  {
    id: 'sleep',
    match: /(sleep|tired|exhaust|energy|fatigue|iron)/i,
    answer: () => ({
      content:
        'Period fatigue is real, especially on heavy days. Losing blood lowers iron, and low iron makes you feel flat and breathless.\n\nWhat helps: 8 to 10 hours of sleep for teenagers, iron-rich food (beans, lentils, leafy greens, red meat, fortified cereal) with vitamin C, and gentle movement rather than intense training on your heaviest days.\n\nIf you are exhausted for weeks, look pale, or get breathless walking upstairs, ask a doctor for a blood test. Iron deficiency is common and easy to treat.',
      suggestions: ['How can I sleep better?', 'I feel dizzy, what now?', 'When should I see a doctor?'],
      urgent: false,
    }),
  },
]

const fallbackSuggestions = ['What is a normal cycle?', 'How do I stop cramps?', 'When should I see a doctor?']

export function replyTo(message: string, context: ChatContext): Answer {
  const text = message.trim()
  if (!text) {
    return {
      content: 'Ask me anything about periods, puberty or your cycle. No question is too small or too awkward.',
      suggestions: BASE_SUGGESTIONS,
      urgent: false,
    }
  }

  const ranked = topics
    .map((topic) => ({ topic, match: text.match(topic.match) }))
    .filter((entry) => entry.match)

  if (ranked.length > 0) {
    ranked.sort((a, b) => (b.match?.[0].length ?? 0) - (a.match?.[0].length ?? 0))
    return ranked[0].topic.answer(context)
  }

  return {
    content: `I want to give you a useful answer, and I am not sure I caught what you need. I can help with cramps, cycle timing, products, school and sport, mood, irregular periods, and when to see a doctor.\n\nCould you tell me a little more about what is going on? If something feels urgent, like very heavy bleeding or severe pain, please talk to a trusted adult or a doctor today.`,
    suggestions: fallbackSuggestions,
    urgent: /(bleed|pain|faint|dizzy|fever)/i.test(text),
  }
}
