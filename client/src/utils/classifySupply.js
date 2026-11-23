
const SUPPLY_RULES = [
  {
    pattern: /\bflashlights?\b/i,
    category: 'power',
    resourceType: 'flashlight',
  },
  {
    pattern: /\bbatter(?:y|ies)\b/i,
    category: 'power',
    resourceType: 'other',
  },
  {
    pattern: /\bfirst[\s-]+aid[\s-]+kits?\b/i,
    category: 'medical',
    resourceType: 'first_aid_kit',
  },
  {
    pattern: /\btoilet[\s-]+paper\b/i,
    category: 'hygiene',
    resourceType: 'sanitation',
  },
  {
    pattern: /\bradios?\b/i,
    category: 'tools',
    resourceType: 'radio',
  },
  {
    pattern: /\b(tents?|tarps?)\b/i,
    category: 'shelter',
    resourceType: 'shelter',
  },
]

export function classifySupply(name) {
  const rule = SUPPLY_RULES.find(({ pattern }) => pattern.test(name))

  if (!rule) return null

  return {
    category: rule.category,
    resourceType: rule.resourceType,
    unit: 'pieces',
  }
}
