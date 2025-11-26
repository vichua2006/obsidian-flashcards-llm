import { App, Editor, EditorPosition, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { generateFlashcards } from "./flashcards";
import { InputModal } from "./components"
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

  multilineSeparator: "?",
  flashcardsCount: 3,
  additionalPrompt: "",
  maxTokens: 300,
  streaming: true,
  hideInPreview: true,
  tag: "#flashcards"
};

export default class FlashcardsLLMPlugin extends Plugin {
  settings: FlashcardsSettings;

  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "generate-flashcards",
      name: "Generate Flashcards",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.onGenerateFlashcards(editor, view, this.settings);
      },
    });

    this.addCommand({
      id: "generate-flashcards-interactive",
      name: "Generate flashcards with new settings",
      editorCallback: (editor: Editor, view: MarkdownView) => {

        new InputModal(this.app, this, (configuration: FlashcardsSettings) => {
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

  async onGenerateFlashcards(editor: Editor, view: MarkdownView, configuration: FlashcardsSettings) {
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

    let flashcardsCount = Math.trunc(configuration.flashcardsCount)
    if (!Number.isFinite(flashcardsCount) || flashcardsCount <= 0) {
      new Notice("Please provide a correct number of flashcards to generate. Defaulting to 3")
      flashcardsCount = 3
    }

    let additionalPrompt = configuration.additionalPrompt

    let maxTokens = Math.trunc(configuration.maxTokens)
    if (!Number.isFinite(maxTokens) || maxTokens <= 0) {
      new Notice("Please provide a correct number of maximum tokens to generate. Defaulting to 300")
      maxTokens = 300
    }

    const tag = configuration.tag;

    const wholeText = editor.getValue()
    const currentText = (editor.somethingSelected() ? editor.getSelection() : wholeText)
    // Check if the header is already present
    const headerRegex = /\n\n### Generated Flashcards\n/;
    const hasHeader = headerRegex.test(wholeText);

    // Check if the #flashcards tag is already present
    // const tagRegex = /\n#flashcards.*\n/;
    // const hasTag = tagRegex.test(wholeText);


    const streaming = configuration.streaming
    new Notice("Generating flashcards...");

    await flashcardsCount

    try {
      const generatedFlashcards = await generateFlashcards(
        currentText,
        provider,
        apiKey,
        model,
        sep,
        flashcardsCount,
        additionalPrompt,
        maxTokens,
        streaming
      )

      let updatedText = "";

      // Generate and add the header if not already present
      // if (!hasHeader) {
      //   updatedText += "\n\n### Generated Flashcards\n";
      // }

      // Generate and add the #flashcards tag if not already present
      // if (!hasTag) {
      //   updatedText += "> #flashcards\n> \n> ";
      // }
      updatedText += `\n\n> ${tag}\n> \n> `;

      editor.setCursor(editor.lastLine())
      editor.replaceRange(updatedText, editor.getCursor())

      editor.setCursor(editor.lastLine())
      for await (let text of generatedFlashcards) {
        text = text.replace(/\n/g, "\n> ")
        editor.replaceRange(text, editor.getCursor())
        const offset: number = editor.posToOffset(editor.getCursor())
        const newPosition: EditorPosition = editor.offsetToPos(offset + text.length)
        editor.setCursor(newPosition)
      }
      new Notice("Flashcards succesfully generated!");

    } catch (error) {
      console.error("Error generating flashcards:", error);
      new Notice("Error generating flashcards. Please check the plugin console for details.");
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

