export const CATEGORIES = [
  { id: 'unspoken', name: 'Unspoken Words', tint: '#C98B6B' },
  { id: 'regret', name: 'Letting Go of Regret', tint: '#8C9BB0' },
  { id: 'anger', name: 'Hidden Anger', tint: '#C2553A' },
  { id: 'forgive', name: 'Self-Forgiveness', tint: '#8FAE95' },
  { id: 'identity', name: 'Reclaiming Identity', tint: '#B79A5B' },
];

const P = (cat, list) => list.map((text, i) => ({ id: `${cat}-${i + 1}`, cat, text }));

const byCat = {
  unspoken: P('unspoken', [
    'Choose someone you have rehearsed a conversation with in your head. Say it now, all of it, without softening a single sentence.',
    'What did you swallow today to keep the peace? Write the full version of what you actually wanted to say.',
    'Write to someone who is gone, distant, or unreachable. What would you say if no reply were required?',
    'Write the thank-you you never gave, or never received. Then write what it cost to keep it unsaid.',
    'Finish this sentence as many times as you can: “What I never told you is…”',
    'Write the apology you are still waiting for, in the exact words you wish they had used. Then write how you would answer.',
  ]),
  regret: P('regret', [
    'Describe the moment you replay most often, from beginning to end. Then add what you knew then, and what you could not have known.',
    'Which road not taken still tugs at you? Give the version of you who took it one full page to speak.',
    'List the “should haves” circling today. After each, write “and I did what I could with what I had.” Notice which lines resist.',
    'What are you still paying interest on: a decision, a delay, a silence? Write what carrying it has taken from you.',
    'Write about time you feel you wasted. What was that time quietly protecting, teaching, or giving you?',
    'Name a door that has closed. Write the goodbye you did not get to say.',
  ]),
  anger: P('anger', [
    'What are you angry about that you have told yourself you are not allowed to be angry about? Let it be loud on paper.',
    'Where does anger sit in your body today? Describe it like weather, then let it speak in the first person.',
    'Who crossed a line you never named? Draw that line now, in words, as clearly as you can.',
    'Write the petty, ungenerous, unfair version of what you feel. No one will read it. Be gloriously unreasonable.',
    'What is your anger protecting? Underneath it there is usually hurt, fear, or an unmet need. Dig until you find the soft thing.',
    'Write about a time you were told to calm down before you were finished being upset. Finish now.',
  ]),
  forgive: P('forgive', [
    'Write a charge sheet against yourself with every accusation. Then, as a fair judge, rewrite the verdict.',
    'What would you say to a friend who had done exactly what you did? Write that, then address it to yourself.',
    'Find the youngest version of you connected to this guilt. What did they need, and not get?',
    'What mistake do you keep as evidence that you are “not enough”? Write what it does and does not prove.',
    'List the ways you have repaired, changed, or grown since the thing you cannot forgive. Count them honestly.',
    'Write “I forgive myself for…” ten times. Mark the ones that feel false and write what is standing in the way.',
  ]),
  identity: P('identity', [
    'Which roles have you worn so long you forgot they were costumes? Write what is underneath each one.',
    'What parts of yourself did you shrink to be easier to love? Invite one back and describe how it would walk into a room.',
    'Write the story other people tell about you that does not fit. Then write the story you would tell.',
    'What did you love before anyone had an opinion about it? Write about it as though you are meeting it again.',
    'Whose expectations are you still living inside? Write their name, and the permission slip you are giving yourself to leave.',
    'Describe a day lived entirely by your values rather than your obligations. What is different at 7am, noon, and midnight?',
  ]),
};

// Interleave categories so the daily prompt rotates through themes.
export const PROMPTS = (() => {
  const out = [];
  const max = Math.max(...Object.values(byCat).map((l) => l.length));
  for (let i = 0; i < max; i++) for (const c of CATEGORIES) if (byCat[c.id][i]) out.push(byCat[c.id][i]);
  return out;
})();

export const catById = (id) => CATEGORIES.find((c) => c.id === id);
export const promptById = (id) => PROMPTS.find((p) => p.id === id);

export const HEAL_PROMPTS = [
  { id: 'h1', cats: ['any'], text: 'Rewrite one limiting belief you noticed on the page. “I always…” becomes “I am learning to…”' },
  { id: 'h2', cats: ['any'], text: 'Write three lines of kindness to yourself, in the voice of someone who loves you.' },
  { id: 'h3', cats: ['any'], text: 'Name one thing you can see, one you can hear, and one you can touch right now. Then one thing your body is thankful for.' },
  { id: 'h4', cats: ['any'], text: 'What is one small, doable act of care you will offer yourself in the next 24 hours?' },
  { id: 'h5', cats: ['unspoken', 'anger'], text: 'Complete the sentence: “Now that this is out of me, there is room for…”' },
  { id: 'h6', cats: ['regret', 'forgive'], text: 'What would the version of you one year from now want you to know today?' },
  { id: 'h7', cats: ['forgive', 'regret'], text: 'Write the gentlest true sentence you can about what you have just been through.' },
  { id: 'h8', cats: ['any'], text: 'What strength did it take to write that page? Name it the way a good friend would.' },
  { id: 'h9', cats: ['identity'], text: 'Write one sentence beginning “I am allowed to…” that you want to keep.' },
  { id: 'h10', cats: ['anger', 'unspoken'], text: 'What boundary, large or small, is this anger asking you to set? Write it as a calm, kind sentence.' },
  { id: 'h11', cats: ['identity', 'regret'], text: 'Choose one thing you will do this week that only the real you would choose.' },
  { id: 'h12', cats: ['any'], text: 'Place a hand on your chest. Take three slow breaths. Then write down the first soft word that arrives.' },
];

export const AFFIRMATIONS = [
  'I can feel everything and still be safe.',
  'What I release makes room for what I need.',
  'I am allowed to outgrow old stories.',
  'My feelings are information, not instructions.',
  'I meet myself with patience today.',
  'I am not behind. I am becoming.',
  'Healing is allowed to be quiet and slow.',
  'I carry what I choose, and set down the rest.',
  'I deserve the same gentleness I give others.',
  'Today I am enough, exactly as I am.',
  'I trust myself to take the next small step.',
  'The past taught me. It does not define me.',
  'I can begin again, as many times as I need.',
  'There is light in me that no page can burn.',
];

export const MOODS = [
  { id: 'heavy', label: 'Heavy' },
  { id: 'stirred', label: 'Stirred up' },
  { id: 'steady', label: 'Steady' },
  { id: 'lighter', label: 'Lighter' },
  { id: 'open', label: 'Open' },
];

export const LOCKS = [
  { id: '30d', label: '30 days', short: '30d' },
  { id: '90d', label: '90 days', short: '90d' },
  { id: '6m', label: '6 months', short: '6mo' },
  { id: '1y', label: '1 year', short: '1yr' },
];

export function computeUnlock(from, lockId) {
  const d = new Date(from);
  if (lockId === '30d') d.setDate(d.getDate() + 30);
  else if (lockId === '90d') d.setDate(d.getDate() + 90);
  else if (lockId === '6m') d.setMonth(d.getMonth() + 6);
  else d.setFullYear(d.getFullYear() + 1);
  return d.getTime();
}
