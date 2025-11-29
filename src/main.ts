import { App, Editor, EditorPosition, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { generateFlashcards, FlashcardType } from "./flashcards";
import { InputModal, GenerationConfig } from "./components"
import { FlashcardsSettings, FlashcardsSettingsTab } from "./settings"

// TODO:
// - Status bar
// - Enforce newline separation (stream post processing)
// - Disable user input while generating
// - Insert an optional header before flashcards

const DEFAULT_SETTINGS: FlashcardsSettings = {
  provider: 'claude',
  openaiApiKey: "",
  openaiModel: "gpt-4o",
  claudeApiKey: "",
  claudeModel: "claude-sonnet-4-5-20250929",
  flashcardType: FlashcardType.Basic,

  multilineSeparator: "?",
  flashcardsCount: 3,
  additionalPrompt: "",
  maxTokens: 300,
  streaming: true,
  hideInPreview: true,
  tag: "#flashcards",
  presets: []
};

export default class FlashcardsLLMPlugin extends Plugin {
  settings: FlashcardsSettings;

  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "generate-flashcards",
      name: "Generate Flashcards",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.onGenerateFlashcards(editor, view, {
          ...this.settings,
          usePreset: false,
          selectedPreset: undefined
        });
      },
    });

    this.addCommand({
      id: "generate-flashcards-interactive",
      name: "Generate flashcards with new settings",
      editorCallback: (editor: Editor, view: MarkdownView) => {

        new InputModal(this.app, this, (configuration: GenerationConfig) => {
          this.onGenerateFlashcards(editor, view, configuration);
        }).open();

      },
    });

    this.registerMarkdownPostProcessor((element, context) => {

      if (!this.settings.hideInPreview) {
        return;
      }

      const blocks = element.findAll("blockquote");
      const tag = this.settings.tag;

      for (let block of blocks) {
        const anchors = Array.from(block.querySelectorAll("a"));
        if (anchors.some((a) => a.getAttribute("href")?.startsWith(`${tag}`))) {
          block.style.display = 'none'
        }
      }
    });


    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new FlashcardsSettingsTab(this.app, this));
  }

  async insertGeneratedFlashcards(editor: Editor, generatedFlashcards: AsyncGenerator<string, void, unknown>) {
    editor.setCursor(editor.lastLine())
    for await (let text of generatedFlashcards) {
      editor.replaceRange(text, editor.getCursor())
      const offset: number = editor.posToOffset(editor.getCursor())
      const newPosition: EditorPosition = editor.offsetToPos(offset + text.length)
      editor.setCursor(newPosition)
    }
  }

  async onGenerateFlashcards(editor: Editor, view: MarkdownView, configuration: GenerationConfig) {
    const provider = configuration.provider;
    const apiKey = provider === 'openai' ? configuration.openaiApiKey : configuration.claudeApiKey;
    const model = provider === 'openai' ? configuration.openaiModel : configuration.claudeModel;

    if (!apiKey) {
      new Notice(`${provider} API key is not set in plugin settings`);
      return;
    }
    if (!model) {
      new Notice("Please select a model to use in the plugin settings");
      return;
    }

    const sep = configuration.multilineSeparator

    let additionalPrompt = configuration.additionalPrompt

    let maxTokens = Math.trunc(configuration.maxTokens)
    if (!Number.isFinite(maxTokens) || maxTokens <= 0) {
      new Notice("Please provide a correct number of maximum tokens to generate. Defaulting to 300")
      maxTokens = 300
    }

    const tag = configuration.tag;
    const streaming = configuration.streaming

    const wholeText = editor.getValue()
    const currentText = (editor.somethingSelected() ? editor.getSelection() : wholeText)

    // Determine if using preset or single generation
    if (configuration.usePreset && configuration.selectedPreset) {
      // Preset-based generation
      const preset = configuration.selectedPreset;
      new Notice(`Generating flashcards from preset: ${preset.name}`);

      try {
        // Add tag once at the beginning
        let updatedText = `\n\n${tag}\n\n`;
        editor.setCursor(editor.lastLine())
        editor.replaceRange(updatedText, editor.getCursor())

        // Generate for each item in the preset
        for (let i = 0; i < preset.items.length; i++) {
          const item = preset.items[i];
          const itemNum = i + 1;
          const totalItems = preset.items.length;

          new Notice(`Generating ${item.count} × ${item.flashcardType} (${itemNum}/${totalItems})...`);

          const generatedFlashcards = await generateFlashcards(
            currentText,
            provider,
            apiKey,
            model,
            item.flashcardType,
            item.count,
            additionalPrompt,
            maxTokens,
            streaming
          );

          await this.insertGeneratedFlashcards(editor, generatedFlashcards);
          editor.setCursor(editor.lastLine())
          editor.replaceRange("\n\n", editor.getCursor())
        }

        new Notice("All flashcards successfully generated!");

      } catch (error) {
        console.error("Error generating flashcards:", error);
        new Notice("Error generating flashcards. Please check the plugin console for details.");
      }

    } else {
      // Single type generation (original behavior)
      // Check if the #flashcards tag is already present
      // const tagRegex = /\n#flashcards.*\n/;
      // const hasTag = tagRegex.test(wholeText);
      let flashcardsCount = Math.trunc(configuration.flashcardsCount)
      if (!Number.isFinite(flashcardsCount) || flashcardsCount <= 0) {
        new Notice("Please provide a correct number of flashcards to generate. Defaulting to 3")
        flashcardsCount = 3
      }

      new Notice("Generating flashcards...");

      try {
        const generatedFlashcards = await generateFlashcards(
          currentText,
          provider,
          apiKey,
          model,
          configuration.flashcardType,
          flashcardsCount,
          additionalPrompt,
          maxTokens,
          streaming
        )

        let updatedText = `\n\n${tag}\n\n`;

        editor.setCursor(editor.lastLine())
        editor.replaceRange(updatedText, editor.getCursor())

        await this.insertGeneratedFlashcards(editor, generatedFlashcards);
        new Notice("Flashcards succesfully generated!");

      } catch (error) {
        console.error("Error generating flashcards:", error);
        new Notice("Error generating flashcards. Please check the plugin console for details.");
      }
    }
  }

  onunload() {

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

