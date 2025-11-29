import { App, Modal, Setting } from "obsidian"
import { FlashcardsSettings, FlashcardPreset } from "./settings"
import FlashcardsLLMPlugin from "./main"
import { availableClaudeModels, allAvailableModels } from "./models"
import { FlashcardType } from "./flashcards"


// TODO:
// - sticky settings

export interface GenerationConfig extends FlashcardsSettings {
  usePreset: boolean;
  selectedPreset?: FlashcardPreset;
}

export class InputModal extends Modal {
  plugin: FlashcardsLLMPlugin
  configuration: GenerationConfig;

  keypressed: boolean;
  onSubmit: (configuration: GenerationConfig) => void;

  constructor(app: App, plugin: FlashcardsLLMPlugin, onSubmit: (configuration: GenerationConfig) => void) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
    this.configuration = { 
      ...this.plugin.settings,
      usePreset: false,
      selectedPreset: undefined
    };
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

    // Preset toggle and selector
    const presetContainer = contentEl.createDiv();
    
    let presetSettingDiv: HTMLElement;
    let presetPreviewSetting: HTMLElement;
    let regularSettingsDiv: HTMLElement;

    const renderPresetUI = () => {
      // Clear previous renders
      if (presetSettingDiv) presetSettingDiv.remove();
      if (presetPreviewSetting) presetPreviewSetting.remove();
      if (regularSettingsDiv) regularSettingsDiv.remove();

      if (this.configuration.usePreset && this.plugin.settings.presets.length > 0) {
        // Show preset selector
        presetSettingDiv = presetContainer.createDiv();
        new Setting(presetSettingDiv)
          .setName("Select Preset")
          .addDropdown((dropdown) => {
            const presetOptions: Record<string, string> = {};
            this.plugin.settings.presets.forEach(preset => {
              presetOptions[preset.id] = preset.name;
            });
            
            dropdown
              .addOptions(presetOptions)
              .setValue(this.configuration.selectedPreset?.id || this.plugin.settings.presets[0]?.id || "")
              .onChange((value) => {
                const preset = this.plugin.settings.presets.find(p => p.id === value);
                if (preset) {
                  this.configuration.selectedPreset = preset;
                  renderPresetUI(); // Re-render to update preview
                }
              });
            
            // Set initial preset if not already set
            if (!this.configuration.selectedPreset && this.plugin.settings.presets.length > 0) {
              this.configuration.selectedPreset = this.plugin.settings.presets[0];
            }
            
            return dropdown;
          });

        // Show preset preview using Setting component
        if (this.configuration.selectedPreset) {
          presetPreviewSetting = presetContainer.createDiv();
          const previewText = this.configuration.selectedPreset.items
            .map(item => `${item.count} × ${item.flashcardType}`)
            .join(", ");
          
          new Setting(presetPreviewSetting)
            .setName("Will generate")
            .setDesc(previewText);
        }
      } else if (this.configuration.usePreset && this.plugin.settings.presets.length === 0) {
        // Show message if no presets available
        presetSettingDiv = presetContainer.createDiv();
        new Setting(presetSettingDiv)
          .setName("No presets available")
          .setDesc("Please create presets in the plugin settings first.");
      } else {
        // Show regular settings
        regularSettingsDiv = presetContainer.createDiv();

        new Setting(regularSettingsDiv)
          .setName("Flashcard Type")
          .addDropdown((dropdown) =>
            dropdown
              .addOptions({
                [FlashcardType.Basic]: "Basic",
                [FlashcardType.BasicReversed]: "Basic (and reversed card)",
                [FlashcardType.Cloze]: "Cloze",
                [FlashcardType.BasicCantonese]: "Basic (Cantonese)",
                [FlashcardType.ClozeCantonese]: "Cloze (Cantonese)",
                [FlashcardType.SentenceCantonese]: "Sentence (Cantonese)"
              })
              .setValue(this.configuration.flashcardType)
              .onChange(async (value) => {
                this.configuration.flashcardType = value as FlashcardType;
              })
          );

        new Setting(regularSettingsDiv)
          .setName("Number of flashcards to generate")
          .addText((text) =>
            text
              .setValue(this.configuration.flashcardsCount.toString())
              .onChange((value) => {
                this.configuration.flashcardsCount = Number(value)
                // TODO: check input
              })
          );
      }
    };

    new Setting(contentEl)
      .setName("Use Preset")
      .setDesc("Generate multiple card types from a saved preset")
      .addToggle((toggle) =>
        toggle
          .setValue(this.configuration.usePreset)
          .onChange((value) => {
            this.configuration.usePreset = value;
            renderPresetUI();
          })
      );

    renderPresetUI();

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
