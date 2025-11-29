import { App, MarkdownView, PluginSettingTab, Setting, Modal } from 'obsidian';
import { availableClaudeModels, allAvailableModels } from "./models";
import FlashcardsLLMPlugin from "./main"
import { FlashcardType } from "./flashcards";

// TODO:
// - make additional prompt a resizable textarea

export interface FlashcardPresetItem {
  flashcardType: FlashcardType;
  count: number;
}

export interface FlashcardPreset {
  id: string;
  name: string;
  items: FlashcardPresetItem[];
}

export interface FlashcardsSettings {
  provider: 'openai' | 'claude';
  openaiApiKey: string;
  openaiModel: string;
  claudeApiKey: string;
  claudeModel: string;

  flashcardType: FlashcardType;
  multilineSeparator: string;
  flashcardsCount: number;
  additionalPrompt: string;
  maxTokens: number;
  streaming: boolean;
  hideInPreview: boolean;
  tag: string;
  presets: FlashcardPreset[];
}


export class FlashcardsSettingsTab extends PluginSettingTab {
  plugin: FlashcardsLLMPlugin;

  constructor(app: App, plugin: FlashcardsLLMPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    // Save scroll position before rebuilding
    const scrollTop = containerEl.scrollTop;

    containerEl.empty();

    containerEl.createEl("h3", { text: "Model settings" })

    // Provider Selection
    new Setting(containerEl)
      .setName("Provider")
      .setDesc("Select which LLM provider to use")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ 'openai': 'OpenAI', 'claude': 'Claude' })
          .setValue(this.plugin.settings.provider)
          .onChange(async (value: 'openai' | 'claude') => {
            this.plugin.settings.provider = value;
            await this.plugin.saveSettings();
            this.display(); // Refresh the display to show/hide provider-specific settings
          })
      );

    // OpenAI API Key (only visible when OpenAI is selected)
    if (this.plugin.settings.provider === 'openai') {
      new Setting(containerEl)
        .setName("OpenAI API key")
        .setDesc("Enter your OpenAI API key")
        .addText((text) =>
          text
            .setPlaceholder("sk-...")
            .setValue(this.plugin.settings.openaiApiKey)
            .onChange(async (value) => {
              this.plugin.settings.openaiApiKey = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("OpenAI Model")
        .setDesc("Which OpenAI language model to use")
        .addDropdown((dropdown) =>
          dropdown
            .addOptions(Object.fromEntries(allAvailableModels().map(k => [k, k])))
            .setValue(this.plugin.settings.openaiModel)
            .onChange(async (value) => {
              this.plugin.settings.openaiModel = value;
              await this.plugin.saveSettings();
            })
        );
    }

    // Claude API Key (only visible when Claude is selected)
    if (this.plugin.settings.provider === 'claude') {
      new Setting(containerEl)
        .setName("Claude API key")
        .setDesc("Enter your Claude API key (from console.anthropic.com)")
        .addText((text) =>
          text
            .setPlaceholder("sk-ant-...")
            .setValue(this.plugin.settings.claudeApiKey)
            .onChange(async (value) => {
              this.plugin.settings.claudeApiKey = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Claude Model")
        .setDesc("Which Claude model to use")
        .addDropdown((dropdown) =>
          dropdown
            .addOptions(Object.fromEntries(availableClaudeModels().map(k => [k, k])))
            .setValue(this.plugin.settings.claudeModel)
            .onChange(async (value) => {
              this.plugin.settings.claudeModel = value;
              await this.plugin.saveSettings();
            })
        );
    }

    containerEl.createEl("h3", { text: "Preferences" })

    new Setting(containerEl)
      .setName("Flashcard Type")
      .setDesc("Select the type of flashcards to generate")
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
          .setValue(this.plugin.settings.flashcardType)
          .onChange(async (value) => {
            this.plugin.settings.flashcardType = value as FlashcardType;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Separator for multi-line flashcards")
      .setDesc("Note that after changing this you have to manually edit any flashcards you already have")
      .addText((text) =>
        text
          .setPlaceholder("?")
          .setValue(this.plugin.settings.multilineSeparator)
          .onChange(async (value) => {
            this.plugin.settings.multilineSeparator = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Flashcards tag")
      .setDesc("Set which tag to append upon flashcards generation. " +
        "See the Spaced Repetition plugin for details")
      .addText((text) =>
        text
          .setPlaceholder("#flashcards")
          .setValue(this.plugin.settings.tag)
          .onChange(async (value) => {
            this.plugin.settings.tag = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Number of flashcards to generate")
      .setDesc("Set this to the total number of flashcards the model should " +
        "generate each time a new `Generate Flashcards` command is issued")
      .addText((text) =>
        text
          .setPlaceholder("3")
          .setValue(this.plugin.settings.flashcardsCount.toString())
          .onChange(async (value) => {
            this.plugin.settings.flashcardsCount = Number(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Additional prompt")
      .setDesc("Provide additional instructions to the language model")
      .addText((text) =>
        text
          .setPlaceholder("Additional instructions")
          .setValue(this.plugin.settings.additionalPrompt)
          .onChange(async (value) => {
            this.plugin.settings.additionalPrompt = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Maximum output tokens")
      .setDesc("Set this to the total number of tokens the model can generate")
      .addText((text) =>
        text
          .setPlaceholder("300")
          .setValue(this.plugin.settings.maxTokens.toString())
          .onChange(async (value) => {
            this.plugin.settings.maxTokens = Number(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Streaming")
      .setDesc("Enable/Disable streaming text completion")
      .addToggle((on) =>
        on
          .setValue(this.plugin.settings.streaming)
          .onChange(async (on) => {
            this.plugin.settings.streaming = on;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Hide flashcards in preview mode")
      .setDesc("If enabled, you won't see flashcards when in preview mode, "
        + "but you will still be able to edit them")
      .addToggle((on) =>
        on
          .setValue(this.plugin.settings.hideInPreview)
          .onChange(async (on) => {
            this.plugin.settings.hideInPreview = on;

            await this.plugin.saveSettings();

            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
              view.previewMode.rerender(true);
            }
          })
      );

    containerEl.createEl("h3", { text: "Flashcard Presets" });

    // Render existing presets
    if (this.plugin.settings.presets.length === 0) {
      new Setting(containerEl)
        .setName("No presets configured")
        .setDesc("Click 'Add Preset' below to create your first preset");
    } else {
      this.plugin.settings.presets.forEach((preset) => {
        // Build description with all card types
        const itemsDesc = preset.items
          .map(item => `${item.count} × ${item.flashcardType}`)
          .join(", ");
        
        new Setting(containerEl)
          .setName(preset.name)
          .setDesc(itemsDesc)
          .addButton((btn) =>
            btn
              .setButtonText("Edit")
              .onClick(() => {
                new PresetEditorModal(this.app, this.plugin, preset, async (updatedPreset) => {
                  const index = this.plugin.settings.presets.findIndex(p => p.id === preset.id);
                  if (index !== -1) {
                    this.plugin.settings.presets[index] = updatedPreset;
                    await this.plugin.saveSettings();
                    this.display();
                  }
                }).open();
              })
          )
          .addButton((btn) =>
            btn
              .setButtonText("Delete")
              .setWarning()
              .onClick(async () => {
                this.plugin.settings.presets = this.plugin.settings.presets.filter(p => p.id !== preset.id);
                await this.plugin.saveSettings();
                this.display();
              })
          );
      });
    }

    // Add preset button
    new Setting(containerEl)
      .addButton((btn) =>
        btn
          .setButtonText("Add Preset")
          .setCta()
          .onClick(() => {
            new PresetEditorModal(this.app, this.plugin, null, async (newPreset) => {
              this.plugin.settings.presets.push(newPreset);
              await this.plugin.saveSettings();
              this.display();
            }).open();
          })
      );

    // Restore scroll position after rebuilding
    containerEl.scrollTop = scrollTop;

  }
}

export class PresetEditorModal extends Modal {
  plugin: FlashcardsLLMPlugin;
  preset: FlashcardPreset | null;
  onSubmit: (preset: FlashcardPreset) => void;
  
  presetName: string;
  items: FlashcardPresetItem[];

  constructor(
    app: App, 
    plugin: FlashcardsLLMPlugin, 
    preset: FlashcardPreset | null,
    onSubmit: (preset: FlashcardPreset) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.preset = preset;
    this.onSubmit = onSubmit;
    
    // Initialize with existing preset or defaults
    this.presetName = preset?.name || "";
    this.items = preset?.items ? [...preset.items] : [];
  }

  onOpen() {
    const { contentEl } = this;
    
    contentEl.createEl("h2", { text: this.preset ? "Edit Preset" : "Create New Preset" });

    // Preset name input
    new Setting(contentEl)
      .setName("Preset Name")
      .setDesc("Give your preset a descriptive name")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Chinese Study Mix")
          .setValue(this.presetName)
          .onChange((value) => {
            this.presetName = value;
          })
      );

    // Items container
    const itemsContainer = contentEl.createDiv({ cls: 'preset-items-container' });
    const itemsHeader = itemsContainer.createEl("h3", { text: "Card Types" });
    
    const renderItems = () => {
      // Clear existing items (except header)
      while (itemsContainer.children.length > 1) {
        itemsContainer.removeChild(itemsContainer.lastChild!);
      }

      if (this.items.length === 0) {
        new Setting(itemsContainer)
          .setDesc("No card types added yet. Click 'Add Card Type' below.");
      } else {
        this.items.forEach((item, index) => {
          new Setting(itemsContainer)
            .setName(`Card Type ${index + 1}`)
            .addDropdown((dropdown) => {
              dropdown
                .addOptions({
                  [FlashcardType.Basic]: "Basic",
                  [FlashcardType.BasicReversed]: "Basic (and reversed card)",
                  [FlashcardType.Cloze]: "Cloze",
                  [FlashcardType.BasicCantonese]: "Basic (Cantonese)",
                  [FlashcardType.ClozeCantonese]: "Cloze (Cantonese)",
                  [FlashcardType.SentenceCantonese]: "Sentence (Cantonese)"
                })
                .setValue(item.flashcardType)
                .onChange((value) => {
                  this.items[index].flashcardType = value as FlashcardType;
                });
              return dropdown;
            })
            .addText((text) => {
              text
                .setPlaceholder("Count")
                .setValue(item.count.toString())
                .onChange((value) => {
                  const num = Number(value);
                  if (!isNaN(num) && num > 0) {
                    this.items[index].count = num;
                  }
                });
              text.inputEl.style.width = "80px";
              return text;
            })
            .addButton((btn) =>
              btn
                .setButtonText("Remove")
                .setWarning()
                .onClick(() => {
                  this.items.splice(index, 1);
                  renderItems();
                })
            );
        });
      }

      // Add card type button
      new Setting(itemsContainer)
        .addButton((btn) =>
          btn
            .setButtonText("Add Card Type")
            .onClick(() => {
              this.items.push({
                flashcardType: FlashcardType.Basic,
                count: 5
              });
              renderItems();
            })
        );
    };

    renderItems();

    // Submit and cancel buttons
    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Cancel")
          .onClick(() => {
            this.close();
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText("Save")
          .setCta()
          .onClick(() => {
            if (!this.presetName.trim()) {
              alert("Please enter a preset name");
              return;
            }
            if (this.items.length === 0) {
              alert("Please add at least one card type");
              return;
            }
            
            const preset: FlashcardPreset = {
              id: this.preset?.id || Date.now().toString(),
              name: this.presetName,
              items: this.items
            };
            
            this.close();
            this.onSubmit(preset);
          })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
