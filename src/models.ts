export function availableChatModels(): Array<string> {
  return ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4o-mini"]
}

export function availableCompletionModels(): Array<string> {
  return []
}

export function availableClaudeModels(): Array<string> {
  return [
    "claude-sonnet-4-5-20250929",      // Claude Sonnet 4.5 (Sept 2025) - recommended
    "claude-sonnet-4-20250514",        // Claude Sonnet 4 (May 2025)
    "claude-haiku-4-5-20251001",       // Claude Haiku 4.5 (Oct 2025) - fastest/cheapest
    "claude-opus-4-5-20251101"         // Claude Opus 4.5 (Nov 2025) - most capable
  ]
}

export function allAvailableModels(): Array<string> {
  return availableChatModels().concat(availableCompletionModels(), availableChatModels())
}
