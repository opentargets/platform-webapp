/**
 * Anthropic Claude API client
 */

import { DEFAULT_CONFIG } from '../types';

/**
 * Call Anthropic Claude API
 */
export async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model = DEFAULT_CONFIG.model,
  maxTokens = DEFAULT_CONFIG.maxTokens
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as { content: Array<{ text: string }> };
  return data.content[0].text;
}

/**
 * Extract code block from LLM response
 */
export function extractCodeBlock(response: string, language = 'typescript'): string {
  const regex = new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\`\`\``);
  const match = response.match(regex);
  return match ? match[1].trim() : response.trim();
}

/**
 * Extract JSON from LLM response
 */
export function extractJson<T>(response: string): T | null {
  const jsonMatch = response.match(/```json\n([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      return null;
    }
  }
  return null;
}
