# Obsidian Flashcards LLM (Enhanced Fork)

Enhanced fork of [crybot's obsidian-flashcards-llm](https://github.com/crybot/obsidian-flashcards-llm) with multi-provider support and specialized language learning modes. All credit for the original concept and implementation goes to the original author.

## What's New in This Fork

### Formatting Changes
- changed to be compatable with [Obsidian_to_Anki](https://github.com/ObsidianToAnki/Obsidian_to_Anki)

### Multi-Provider Support
- **Claude/Anthropic Integration**: Use Claude models (Sonnet, Haiku, Opus) as an alternative to OpenAI
- Switch between providers in settings

### Cloze and Reverse Card types Support
- **Cloze**: Fill-in-the-blank style cards with `{{c1::deletion}}` syntax
- **Basic (and reversed card)**: Creates two cards - question→answer and answer→question

### 🇭🇰 Cantonese Language Learning Modes
Three specialized flashcard types for Cantonese learners:
- **Basic (Cantonese)**: Vocabulary cards with Jyutping, meanings, and examples
- **Cloze (Cantonese)**: Sentence cloze deletions with Jyutping and translations
- **Sentence (Cantonese)**: Full sentence cards with grammar notes

## Setup

### API Keys
**OpenAI**: Get your key from [platform.openai.com](https://platform.openai.com/docs/quickstart)

**Claude**: Get your key from [console.anthropic.com](https://console.anthropic.com)

Enter your API key in plugin settings and select your preferred provider.

## Usage

Same as the original plugin - see [original README](https://github.com/crybot/obsidian-flashcards-llm) for detailed usage instructions.

**Commands:**
- `Generate Flashcards` - Use default settings
- `Generate flashcards with new settings` - Customize on-the-fly

## Credits

Original plugin by [crybot](https://github.com/crybot). This fork adds Claude support and Cantonese learning modes.

## License

MIT
