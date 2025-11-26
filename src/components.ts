import { App, Modal, Setting } from "obsidian"
import { FlashcardsSettings } from "./settings"
import FlashcardsLLMPlugin from "./main"
import { availableClaudeModels, allAvailableModels } from "./models"


// TODO:
// - sticky settings

export class InputModal extends Modal {
  plugin: FlashcardsLLMPlugin
  configuration: FlashcardsSettings;

  keypressed: boolean;
  onSubmit: (configuration: FlashcardsSettings) => void;

  constructor(app: App, plugin: FlashcardsLLMPlugin, onSubmit: (configuration: FlashcardsSettings) => void) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
    this.configuration = { ...this.plugin.settings };
    this.keypressed = false;
  }

  onOpen() {
    let { contentEl, containerEl, modalEl } = this;
    contentEl.createEl("h1", { text: "Prompt configuration" });

    const getAvailableModels = () => {
      if (this.configuration.provider === 'openai') {
        return allAvailableModels();
      } else {
        return availableClaudeModels();
      }
    };

    const getCurrentModel = () => {
      if (this.configuration.provider === 'openai') {
        return this.configuration.openaiModel;
      } else {
        return this.configuration.claudeModel;
      }
    };

    new Setting(contentEl)
      .setName("Model")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(Object.fromEntries(getAvailableModels().map(k => [k, k])))
          .setValue(getCurrentModel())
          .onChange(async (value) => {
            if (this.configuration.provider === 'openai') {
              this.configuration.openaiModel = value;
            } else {
              this.configuration.claudeModel = value;
            }
          })
      );


    new Setting(contentEl)
      .setName("Number of flashcards to generate")
      .addText((text) =>
        text
          .setValue(this.configuration.flashcardsCount.toString())
          .onChange((value) => {
            this.configuration.flashcardsCount = Number(value)
            // TODO: check input
          })
      );

    new Setting(contentEl)
      .setName("Flashcards tag")
      .addText((text) =>
        text
          .setPlaceholder("#flashcards")
          .setValue(this.plugin.settings.tag)
          .onChange(async (value) => {
            this.configuration.tag = value
          })
      );

    new Setting(contentEl)
      .setName("Additional prompt")
      .addText((text) =>
        text
          .setValue(this.configuration.additionalPrompt)
          .onChange((value) => {
            this.configuration.additionalPrompt = value
          })
      );



    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Submit")
          .setCta()
          .onClick(() => {
            this.submit();
          })
      );

    contentEl.addEventListener("keyup", ({ key }) => {
      if (key === "Enter") {
        // Hack to make the keypress work reliably:
        // without this (for example) it registers the KEYUP event from
        // when the user issued the command from the command palette
        if (this.keypressed) {
          this.submit();
        }
        else {
          this.keypressed = true;
        }
      }
    });

  }

  submit() {
    this.close();
    this.onSubmit(this.configuration);
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
