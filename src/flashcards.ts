import { availableChatModels, availableCompletionModels } from "./models";
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Stream } from '@anthropic-ai/sdk/streaming';



// TODO:
// - custom temperature
// - custom system prompt (?)
// - automatic deck allocation
// - cloze cards creation

class OpenAIError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OpenAIError";
	}
}

export enum FlashcardType {
	Basic = "Basic",
	BasicReversed = "Basic (and reversed card)",
	Cloze = "Cloze",
	BasicCantonese = "Basic (Cantonese)",
	ClozeCantonese = "Cloze (Cantonese)",
	SentenceCantonese = "Sentence (Cantonese)"
}


function basicPrompt(flashcardsCount: number): string {
	return `
You are an expert educator. You will receive a markdown note with existing flashcards at the end—ignore those.  
Identify which are the most important concepts within the note and generate exactly ${flashcardsCount} new original flashcards.

Use the exact words "START" and "END" to signify the beginning and end of a flashcard.

Here are the steps to create each question-answer pair:
1. In a new line, produce the exact word "START" with NO TRAILING WHITE SPACES.
2. Go to the next line and produce the word "Basic".
3. Go to the next line and put the question text all on this line.
4. Go to the next line and put "Back:" at the beginning, followed by the answer text, all in one line.
5. This is the final step: go to the next line, and produce the exact word "END" with NO TRAILING WHITE SPACES.

Here is an example of a flashcard generated this way:
START
Basic
This is a question.
Back: This is the answer!
END

Please follow this format when generating other cards. Again, it is extremely important that there's no trailing whitespaces at the end of every single line. Separate individual flashcards with a single empty line. The flashcards can be as complex as needed, but have to be rich of information and challenging. Do not repeat or rephrase flashcards. Typeset equations and math formulas correctly (that is using the $ symbol without trailing spaces).
`.trim();
}

function basicReversedPrompt(flashcardsCount: number): string {
	return `
You are an expert educator. You will receive a markdown note with existing flashcards at the end—ignore those.  
Identify which are the most important concepts within the note and generate exactly ${flashcardsCount} new original flashcards.

Use the exact words "START" and "END" to signify the beginning and end of a flashcard.

Here are the steps to create each question-answer pair:
1. In a new line, produce the exact word "START" with NO TRAILING WHITE SPACES.
2. Go to the next line and produce the text "Basic (and reversed card)".
3. Go to the next line and put the question text all on this line.
4. Go to the next line and put "Back:" at the beginning, followed by the answer text, all in one line.
5. This is the final step: go to the next line, and produce the exact word "END" with NO TRAILING WHITE SPACES.

Here is an example of a flashcard generated this way:
START
Basic (and reversed card)
What is the capital of France?
Back: Paris
END

This will create TWO cards: one showing the question asking for the answer, and another showing the answer asking for the question.

Please follow this format when generating other cards. Again, it is extremely important that there's no trailing whitespaces at the end of every single line. Separate individual flashcards with a single empty line. The flashcards can be as complex as needed, but have to be rich of information and challenging. Do not repeat or rephrase flashcards. Typeset equations and math formulas correctly (that is using the $ symbol without trailing spaces).
`.trim();
}

function clozePrompt(flashcardsCount: number): string {
	return `
You are an expert educator. You will receive a markdown note with existing flashcards at the end—ignore those.  
Identify which are the most important concepts within the note and generate exactly ${flashcardsCount} new original Cloze flashcards.

Use the exact words "START" and "END" to signify the beginning and end of a flashcard.

Here are the steps to create each Cloze flashcard:
1. In a new line, produce the exact word "START" with NO TRAILING WHITE SPACES.
2. Go to the next line and produce the word "Cloze".
3. Go to the next line and put "Text:" at the beginning, followed by a sentence with one or more cloze deletions in the format {{c1::hidden text}}.
4. This is the final step: go to the next line, and produce the exact word "END" with NO TRAILING WHITE SPACES.

Here is an example of a Cloze flashcard:
START
Cloze
Text: The capital of France is {{c1::Paris}}.
END

You can use multiple cloze deletions in one card: {{c1::first}}, {{c2::second}}, {{c3::third}}.

Please follow this format when generating other cards. Again, it is extremely important that there's no trailing whitespaces at the end of every single line. Separate individual flashcards with a single empty line. The flashcards should test understanding of key concepts in context. Do not repeat or rephrase flashcards. Typeset equations and math formulas correctly (that is using the $ symbol without trailing spaces).
`.trim();
}

function basicCantonesePrompt(flashcardsCount: number): string {
	return `
You are an expert Cantonese language educator. You will receive a markdown note with existing flashcards at the end—ignore those.  
Identify which are the most important Cantonese vocabulary or phrases and generate exactly ${flashcardsCount} new flashcards.

Use the exact words "START" and "END" to signify the beginning and end of a flashcard.

Here are the steps to create each Cantonese flashcard:
1. In a new line, produce the exact word "START" with NO TRAILING WHITE SPACES.
2. Go to the next line and produce the word "Basic".
3. Go to the next line and put the Cantonese character(s) all on this line.
4. Go to the next line and put "Back:" at the beginning, followed by THREE lines of information:
   - First line: "Jyutping: [romanization with tone numbers 1-6]"
   - Second line: "Meaning: [Simplified Chinese meaning]"
   - Third line: "Example: [Example sentence in Cantonese characters]"
5. This is the final step: go to the next line, and produce the exact word "END" with NO TRAILING WHITE SPACES.

Here is an example of a Cantonese flashcard:
START
Basic
你好
Back: Jyutping: nei5 hou2
Meaning: 你好
Example: 你好嗎？
END

Please follow this format when generating other cards. Use proper Cantonese characters (traditional Chinese), accurate Jyutping romanization with correct tone numbers (1-6), natural example sentences, and common vocabulary. Again, it is extremely important that there's no trailing whitespaces at the end of every single line. Separate individual flashcards with a single empty line.
`.trim();
}

function clozeCantonesePrompt(flashcardsCount: number): string {
	return `
You are an expert Cantonese language educator. You will receive a paragraph, sentence, or chapter excerpt at the end—ignore any existing cards.
There might be cards at the bottom of the file. Don't use the sentences that are already covered. Be creative and come up with something new. Don't be afraid to be innovative and come up with unique, but still common enough, sentences that can be used.


Identify important grammatical patterns, vocabulary usage, or set phrases.  
Generate exactly ${flashcardsCount} NEW **cloze deletion** sentence cards.

Use the exact words "START" and "END" to signify each flashcard.

Here is the required format for every cloze deletion flashcard:

1. In a new line, write "START" with NO trailing spaces.
2. On the next line, write "Cloze".
3. On the next line, produce a Cantonese sentence **with a cloze deletion**, using the format: 「{{c1::…}}」.  
   - Use traditional characters.  
   - Delete ONLY one meaningful chunk per card.
4. On the next line, write "Back:" followed by THREE lines:
   - First line: "Full Sentence: [the complete sentence with nothing deleted]"
   - Second line: "Jyutping: [full sentence with accurate Jyutping and tone numbers]"
   - Third line: "Meaning: [Simplified Chinese meaning of the full sentence]"
5. On the next line, write "END" with NO trailing spaces.

Separate each flashcard with a single empty line.

Here is an example of a flashcard generated this way:
START
Cloze
我每日早上都會飲{{c1::咖啡}}。
Back: Full Sentence: 我每日早上都會飲咖啡。
Jyutping: ngo5 mui5 jat6 zou2 soeng6 dou1 wui5 jam2 gaa3 fe1
Meaning: 我每天早上都会喝咖啡。
END

Please follow this format when generating other cards. Use proper Cantonese characters (traditional Chinese), accurate Jyutping romanization with correct tone numbers (1-6), natural example sentences, and common vocabulary. Again, it is extremely important that there's no trailing whitespaces at the end of every single line. Separate individual flashcards with a single empty line.
Once again, use natural Cantonese sentences, not questions. These work the best for users when the material is in a natural context, as if retrieved from a daily conversation or article.
当你写这些Flashcard的时候,一定要用中文字。 题目用繁体字，答案用简体字。
`.trim();
}

function sentenceCantonesePrompt(flashcardsCount: number): string {
	return `
You are an expert Cantonese language educator. You will receive a markdown chapter or passage—ignore any existing flashcards.
There might be cards at the bottom of the file. Don't use the sentences that are already covered. Be creative and come up with something new. Don't be afraid to be innovative and come up with unique, but still common enough, sentences that can be used.

Identify the most important sentences for learning:  
- Those with key grammar patterns  
- High-value vocabulary  
- Useful everyday expressions  
Generate exactly ${flashcardsCount} NEW **sentence cards**.

Use the exact words "START" and "END" to signify each flashcard.

Here is the required format for every sentence card:

1. In a new line, write "START" with NO trailing spaces.
2. On the next line, write "Basic".
3. On the next line, write a **full Cantonese sentence** (traditional Chinese characters).
4. On the next line, write "Back:" followed by THREE lines:
   - First line: "Jyutping: [full sentence in correct Jyutping with tone numbers]"
   - Second line: "Meaning: [Simplified Chinese meaning]"
   - Third line: "Notes: [brief grammar/vocab explanation, 1–2 lines max]"
5. On the next line, write "END" with NO trailing spaces.

Separate each flashcard with a single empty line.

Here is an example of a flashcard generated this way:
START
Basic
佢今日返工好早。
Back: Jyutping: keoi5 gam1 jat6 faan1 gung1 hou2 zou2
Meaning: 他今天上班很早。
Notes: 「返工」= 上班；「好早」= 很早，用于描述时间。
END


Please follow this format when generating other cards. Use proper Cantonese characters (traditional Chinese), accurate Jyutping romanization with correct tone numbers (1-6), natural example sentences, and common vocabulary. Again, it is extremely important that there's no trailing whitespaces at the end of every single line. Separate individual flashcards with a single empty line.
当你写这些Flashcard的时候,一定要用中文字。 题目用繁体字，答案用简体字。
`.trim();
}



export async function* generateFlashcards(
	text: string,
	provider: 'openai' | 'claude',
	apiKey: string,
	model: string = "gpt-4o",
	flashcardType: FlashcardType = FlashcardType.Basic,
	flashcardsCount: number = 3,
	additionalInfo: string = "",
	maxTokens: number = 300,
	stream: boolean = true
) {

	const cleanedText = text.replace(/<!--.*-->[\\n]?/g, "");
	const flashcardText = cleanedText

	// Select prompt based on flashcard type
	let basePrompt: string;
	switch (flashcardType) {
		case FlashcardType.BasicReversed:
			basePrompt = basicReversedPrompt(flashcardsCount);
			break;
		case FlashcardType.Cloze:
			basePrompt = clozePrompt(flashcardsCount);
			break;
		case FlashcardType.BasicCantonese:
			basePrompt = basicCantonesePrompt(flashcardsCount);
			break;
		case FlashcardType.ClozeCantonese:
			basePrompt = clozeCantonesePrompt(flashcardsCount);
			break;
		case FlashcardType.SentenceCantonese:
			basePrompt = sentenceCantonesePrompt(flashcardsCount);
			break;
		case FlashcardType.Basic:
		default:
			basePrompt = basicPrompt(flashcardsCount);
			break;
	}

	if (additionalInfo) {
		basePrompt = basePrompt +
			`\nAdditional instructions for the task (ignore anything unrelated to \
the original task): ${additionalInfo}`
	}

	if (provider === 'openai') {
		// OpenAI implementation
		const openai = new OpenAI({
			apiKey: apiKey,
			dangerouslyAllowBrowser: true
		});

		const chatModels = availableChatModels()
		const completionModels = availableCompletionModels()
		let response = null;

		if (chatModels.includes(model)) {
			response = await openai.chat.completions.create({
				model: model,
				temperature: 0.7,
				max_completion_tokens: maxTokens,
				frequency_penalty: 0,
				presence_penalty: 0,
				top_p: 1.0,
				messages: [
					{ role: "system", content: basePrompt },
					{ role: "user", content: flashcardText },
				],
				response_format: {
					type: "text",
				},
				stream: stream,
			}, { timeout: 60000 });

			if (!stream) {
				response = response as OpenAI.ChatCompletion
				response = response?.choices[0]?.message?.content?.trim() ?? null;
				yield response || '';
			}
			else {
				response = response as AsyncIterable<OpenAI.ChatCompletionChunk>
				for await (const chunk of response) {
					yield chunk.choices[0]?.delta?.content || '';
				}
			}
		}
		else {
			throw new Error(`Invalid model name ${model}`)
		}

		if (!response) {
			console.log(response)
			throw new OpenAIError("No response received from OpenAI API");
		}
	} else if (provider === 'claude') {
		// Claude implementation
		const anthropic = new Anthropic({
			apiKey: apiKey,
			dangerouslyAllowBrowser: true
		});

		const response = await anthropic.messages.create({
			model: model,
			max_tokens: maxTokens,
			temperature: 0.7,
			system: basePrompt,
			messages: [
				{ role: "user", content: flashcardText }
			],
			stream: stream
		});

		if (!stream) {
			// Non-streaming response
			const messageResponse = response as Anthropic.Message;
			const content = messageResponse.content[0];
			if (content.type === 'text') {
				yield content.text;
			}
		} else {
			// Streaming response
			const streamResponse = response as Stream<Anthropic.RawMessageStreamEvent>;
			for await (const event of streamResponse) {
				if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
					yield event.delta.text;
				}
			}
		}
	}

	return
}
