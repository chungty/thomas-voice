export const identityPattern = /\b(?:i\s*(?:am|'m|’m)|this\s+is|speaking\s+as|my\s+name\s+is)\s+thomas(?:\s+chung)?\b|\bthomas(?:\s+chung)?\s+here\b|\bthomas would say\b/i;
export const authorizationPattern = /\b(?:i|we|thomas)\s+(?:(?:have|has)\s+)?(?:approve(?:d|s)?|authoriz(?:e|ed|es)|sign(?:ed|s)?|commit(?:ted|s)?|consent(?:ed|s)?)\b|\byou have my approval\b|\bgo ahead on my behalf\b/i;
const aiCadencePattern = /here(?:’|')s what you need to know|not just .{0,80}(?:,|;)\s*(?:it(?:’|')s|it is)|—|at its core|the real question|game[- ]changer/i;
const chatbotPattern = /great question|i hope this helps|let me know if you(?:’|')d like|certainly!/i;

const normalize = (value) => value.normalize('NFKC').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

export function lintDraft(text, context = {}) {
  if (typeof text !== 'string') return { passed: false, failures: [{ id: 'contract.invalid-draft', severity: 'block', message: 'Draft must be text.' }] };
  const normalized = normalize(text);
  const failures = [];
  if (identityPattern.test(normalized)) failures.push({ id: 'boundary.identity-claim', severity: 'block', message: 'A voice-aligned draft cannot claim Thomas’s identity.' });
  if (authorizationPattern.test(normalized)) failures.push({ id: 'boundary.authorization-claim', severity: 'block', message: 'Voice resemblance does not confer authority.' });
  if (aiCadencePattern.test(normalized)) failures.push({ id: 'voice.ai-cadence', severity: 'error', message: 'Remove staged rhetoric and say the concrete thing.' });
  if (chatbotPattern.test(normalized)) failures.push({ id: 'voice.chatbot-artifact', severity: 'error', message: 'Remove assistant-shaped filler.' });
  for (const rawFact of context.requiredFacts || []) {
    if (typeof rawFact !== 'string' || !rawFact.trim()) {
      failures.push({ id: 'fidelity.invalid-fact', severity: 'block', message: 'Required facts must be non-empty text.' });
      continue;
    }
    const fact = normalize(rawFact);
    const index = normalized.toLocaleLowerCase().indexOf(fact.toLocaleLowerCase());
    if (index < 0) failures.push({ id: 'fidelity.required-fact', severity: 'block', message: `Required fact missing: ${fact}` });
    else {
      const tail = normalized.slice(index + fact.length, index + fact.length + 60);
      if (/^\s*(?:not really|false|but (?:that|this) (?:is|was) not true)/i.test(tail)) failures.push({ id: 'fidelity.fact-negated', severity: 'block', message: `Required fact is immediately contradicted: ${fact}` });
    }
  }
  for (const claim of context.prohibitedClaims || []) {
    if (typeof claim === 'string' && claim.trim() && normalized.toLocaleLowerCase().includes(normalize(claim).toLocaleLowerCase())) failures.push({ id: 'fidelity.prohibited-claim', severity: 'block', message: 'Draft contains a prohibited claim.' });
  }
  return { passed: failures.length === 0, failures };
}

