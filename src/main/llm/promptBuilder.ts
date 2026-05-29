import type { AnswerFormat, AnswerLength, AnswerTone, GenerationOptions } from './types'

const LENGTH_GUIDES: Record<AnswerLength, string> = {
  short: '80-120 words',
  medium: '140-200 words',
  long: '220-300 words'
}

const TONE_GUIDES: Record<AnswerTone, string> = {
  professional: 'professional and confident',
  friendly: 'friendly and conversational',
  technical: 'technical and precise'
}

const FORMAT_GUIDES: Record<AnswerFormat, string> = {
  direct: 'Write a concise paragraph.',
  star: 'Use STAR format with labeled sections: Situation, Task, Action, Result.',
  bullets: 'Use 4-6 bullet points.'
}

export function buildPrompt(transcript: string, options: GenerationOptions): string {
  const formatGuide = FORMAT_GUIDES[options.format] || FORMAT_GUIDES.direct
  const toneGuide = TONE_GUIDES[options.tone] || TONE_GUIDES.professional
  const lengthGuide = LENGTH_GUIDES[options.length] || LENGTH_GUIDES.medium

  const modeGuide = options.mode === 'coding'
    ? 'Act as a senior staff engineer. Provide algorithmic hints, time/space complexity, and clean code.'
    : options.mode === 'behavioral'
      ? 'Use the STAR method and reference candidate context when relevant.'
      : ''

  const contextBlocks: string[] = []
  const resume = options.profile?.resume?.trim()
  const jobDescription = options.profile?.jobDescription?.trim()
  const companyNotes = options.profile?.companyNotes?.trim()

  if (resume) contextBlocks.push(`Resume:\n${resume}`)
  if (jobDescription) contextBlocks.push(`Job description:\n${jobDescription}`)
  if (companyNotes) contextBlocks.push(`Company notes:\n${companyNotes}`)

  const contextSection = contextBlocks.length
    ? `Candidate context (use only if relevant; do not invent details):\n${contextBlocks.join('\n\n')}`
    : ''

  const followUps = options.followUps
    ? 'After the answer, add 2 follow-up questions under the heading "Follow-up questions:" with bullet points.'
    : ''

  return [
    `You are an interview assistant. Provide a ${toneGuide} answer to the interview question.`,
    modeGuide,
    `Length: ${lengthGuide}.`,
    `Format: ${formatGuide}`,
    'If the question is behavioral, include a concrete example.',
    'Avoid meta-commentary and do not mention that you are an AI.',
    followUps,
    contextSection,
    `Interview question: "${transcript}"`,
    'Answer:'
  ].filter(Boolean).join('\n\n')
}

export function buildCodingPrompt(input: string, hasImage = false): string {
  const visionNote = hasImage
    ? 'An image of the screen is attached. Use it alongside the text if relevant.'
    : ''
  const emptyTextGuide = 'If the screen text is empty, infer the task from the image. If still unclear, respond with: "Waiting for readable content from screen."'
  return [
    'You are a senior coding interview coach. Use the captured screen text to help solve the problem.',
    visionNote,
    emptyTextGuide,
    'Provide the following, each on its own line:',
    '- One-sentence problem summary.',
    '- Bullet list of the best approach and key data structures.',
    '- Time and space complexity (Big-O).',
    '- Common pitfalls or edge cases.',
    '- If code is present, debugging hints or fixes.',
    'Keep it concise and practical. Do not include meta-commentary.',
    `Screen text:\n${input}`
  ].join('\n')
}

export function buildSessionSummaryPrompt(history: Array<{ question: string; answer: string }>, profile?: GenerationOptions['profile']): string {
  const entries = history
    .filter((item) => item.question?.trim() || item.answer?.trim())
    .map((item, index) => `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`)
    .join('\n\n')

  const contextBlocks: string[] = []
  const resume = profile?.resume?.trim()
  const jobDescription = profile?.jobDescription?.trim()
  const companyNotes = profile?.companyNotes?.trim()

  if (resume) contextBlocks.push(`Resume:\n${resume}`)
  if (jobDescription) contextBlocks.push(`Job description:\n${jobDescription}`)
  if (companyNotes) contextBlocks.push(`Company notes:\n${companyNotes}`)

  const contextSection = contextBlocks.length
    ? `Candidate context (use only if relevant; do not invent details):\n${contextBlocks.join('\n\n')}`
    : ''

  return [
    'You are an interview coach. Produce a post-interview summary in Markdown.',
    'Include the following sections:',
    '- Overview (2-3 sentences)',
    '- Strengths (bulleted)',
    '- Risks or gaps (bulleted)',
    '- Suggested improvements (bulleted)',
    '- Next steps (bulleted)',
    'Keep the tone professional and concise.',
    contextSection,
    `Session transcript:\n${entries || 'No transcript provided.'}`
  ].filter(Boolean).join('\n\n')
}
