const checks = [
  {
    id: 'boundary.identity-claim',
    severity: 'block',
    pattern: /\b(?:i am|i'm)\s+thomas\b|\bthomas would say\b/i,
    message: 'A voice-aligned draft cannot claim Thomas’s identity.'
  },
  {
    id: 'boundary.authorization-claim',
    severity: 'block',
    pattern: /\b(?:i|thomas)\s+(?:approved|authorized|signed|committed)\b/i,
    message: 'Voice resemblance does not confer authority.'
  },
  {
    id: 'voice.ai-cadence',
    severity: 'error',
    pattern: /here(?:’|')s what you need to know|not just .{0,80}(?:,|;)\s*(?:it(?:’|')s|it is)|—|at its core|the real question|game[- ]changer/i,
    message: 'Remove staged rhetoric and say the concrete thing.'
  },
  {
    id: 'voice.chatbot-artifact',
    severity: 'error',
    pattern: /great question|i hope this helps|let me know if you(?:’|')d like|certainly!/i,
    message: 'Remove assistant-shaped filler.'
  }
];

export function lintDraft(text, context = {}) {
  const failures = [];
  for (const check of checks) {
    if (check.pattern.test(text)) failures.push({ id: check.id, severity: check.severity, message: check.message });
  }
  for (const fact of context.requiredFacts || []) {
    if (!text.includes(fact)) failures.push({ id: 'fidelity.required-fact', severity: 'block', message: `Required fact missing: ${fact}` });
  }
  return { passed: failures.length === 0, failures };
}
