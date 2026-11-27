
export function parseBulkInventory(text) {
  // Remove common introductions like "I have" or "We have".
  const cleaned = text.trim().replace(/^(?:i|we)\s+(?:have|got)\s+/i, '')

  // Split items at commas, semicolons, newlines, or "and 3..."
  const parts = cleaned.split(/[,;\n]|\s+and\s+(?=\d+\b)/i)

  return parts
    .map((part) => part.trim().replace(/^and\s+/i, '').trim())
    .filter(Boolean)
    .map((part) => {
      // Extract a quantity at the beginning, if provided.
      const match = part.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)

      return {
        name: match ? match[2].trim() : part,
        quantity: match ? Number(match[1]) : 1,
        originalText: part,
      }
    })
}
