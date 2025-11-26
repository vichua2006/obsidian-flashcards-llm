import { availableChatModels, availableCompletionModels, availableReasoningModels } from "./models";
import { OpenAI } from 'openai';
import { Readable } from "stream";



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

function extractTextAfterFlashcards(text: string): string | null {
	const pattern = /#flashcards.*\n/;
	const match = text.match(pattern);

	if (match) {
		const startIdx = match.index! + match[0].length;
		return text.substring(startIdx);
	}

	return null;
}



function multilineCardsPrompt(sep: string, flashcardsCount: number): string {
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


export async function* generateFlashcards(
	text: string,
	apiKey: string,
	model: string = "gpt-4o",
	sep: string = "::",
	flashcardsCount: number = 3,
	additionalInfo: string = "",
	maxTokens: number = 300,

	reasoningEffort: string,
	stream: boolean = true
) {

	const openai = new OpenAI({
		apiKey: apiKey,
		dangerouslyAllowBrowser: true
	});

	const cleanedText = text.replace(/<!--.*-->[\n]?/g, "");
	const flashcardText = cleanedText

	let basePrompt = multilineCardsPrompt(sep, flashcardsCount)

	if (additionalInfo) {
		basePrompt = basePrompt +
			`\nAdditional instructions for the task (ignore anything unrelated to \
the original task): ${additionalInfo}`
	}

	const chatModels = availableChatModels()
	const completionModels = availableCompletionModels()
	const reasoningModels = availableReasoningModels()
	const isReasoning = reasoningModels.includes(model)
	let response = null;

	// TODO: use newer client.responses.create endpoint.
	// TODO: use structured (json) output to enforce flashcards formatting
	if (chatModels.includes(model) || reasoningModels.includes(model)) {
		response = await openai.chat.completions.create({
			model: model,
			...(!isReasoning && { temperature: 0.7 }),
			...(isReasoning && { reasoning_effort: "low" }),
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

	return
}
