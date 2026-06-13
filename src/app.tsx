import { useState } from 'react'

const SYSTEM_PROMPT = `You are a brutally honest hiring manager with 15 years of experience. 
You review CVs and give direct, specific feedback without sugarcoating.
You hate generic advice. You give feedback like a real person would — pointing out exactly 
what's wrong and why it would make you skip a candidate.

Analyse the CV and return ONLY a JSON object in this exact format, nothing else, no markdown, no backticks:
{
  "score": <number 1-10>,
  "verdict": "<2 sentence overall impression a hiring manager would have>",
  "issues": [
    {
      "type": "<AI Generated | No Impact | Vague | Missing Numbers | Red Flag | Weak Opening | Gap>",
      "quote": "<exact text from the CV that has the problem, max 10 words>",
      "problem": "<what is wrong with it in plain language>",
      "fix": "<exactly how to fix it>"
    }
  ],
  "positives": ["<thing that actually works>"],
  "hiring_chance": "<Strong Yes | Possible | Unlikely | No>"
}`

interface Issue {
  type: string
  quote: string
  problem: string
  fix: string
}

interface Feedback {
  score: number
  verdict: string
  issues: Issue[]
  positives: string[]
  hiring_chance: string
}

const typeColors: Record<string, string> = {
  'AI Generated': 'bg-purple-900 text-purple-300 border-purple-700',
  'No Impact': 'bg-yellow-900 text-yellow-300 border-yellow-700',
  'Vague': 'bg-orange-900 text-orange-300 border-orange-700',
  'Missing Numbers': 'bg-blue-900 text-blue-300 border-blue-700',
  'Red Flag': 'bg-red-900 text-red-300 border-red-700',
  'Weak Opening': 'bg-pink-900 text-pink-300 border-pink-700',
  'Gap': 'bg-gray-800 text-gray-300 border-gray-600',
}

const chanceColors: Record<string, string> = {
  'Strong Yes': 'text-green-400',
  'Possible': 'text-yellow-400',
  'Unlikely': 'text-orange-400',
  'No': 'text-red-400',
}

async function selectGroqModel(apiKey: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
    },
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => null)
    throw new Error(errData?.error?.message || 'Unable to fetch Groq models. Check your key.')
  }

  const data = await response.json()
  const modelItems = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : []

  const models = modelItems
    .map((item: any) => item?.id || item?.model || item)
    .filter(Boolean)

  const preferred = [
    'llama3-8b-8192',
    'llama3-8b',
    'groq-1.5-8k',
    'groq-1.5-8b',
    'groq-8',
    'groq-70',
  ]

  const selected = preferred.find(model => models.includes(model)) || models[0]
  if (!selected) {
    throw new Error('No available Groq models were found for this key.')
  }

  return selected
}

export default function App() {
  const [cvText, setCvText] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  async function handleRoast() {
    if (!cvText.trim()) {
      setError('Paste your CV text first.')
      return
    }
    if (!apiKey.trim()) {
      setError('Enter your Groq API key.')
      return
    }

    setLoading(true)
    setError('')
    setFeedback(null)

    try {
      const model = await selectGroqModel(apiKey)
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1500,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: 'Here is my CV:\n\n' + cvText }
          ]
        })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error?.message || 'API error — check your key')
      }

      const data = await response.json()
      const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text
      if (!text) {
        throw new Error('No response text returned from the API.')
      }
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean) as Feedback
      setFeedback(parsed)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Something went wrong. Check your API key and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Resume Roaster 🔥</h1>
        <p className="text-gray-400">
          Paste your CV and get honest feedback. No fluff — just what a real hiring manager actually thinks.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Groq API Key{' '}
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline"
            >
              (get one free at console.groq.com)
            </a>
          </label>
          <input
            type="password"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="gsk_..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Paste your CV text
          </label>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Paste the full text of your CV here..."
            rows={12}
            value={cvText}
            onChange={e => setCvText(e.target.value)}
          />
        </div>

        <button
          onClick={handleRoast}
          disabled={loading}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 py-3 rounded-lg font-semibold text-lg transition-colors"
        >
          {loading ? 'Roasting...' : 'Roast My CV 🔥'}
        </button>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
      </div>

      {feedback && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-5xl font-bold text-white">{feedback.score}</span>
                <span className="text-gray-500 text-xl">/10</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Hiring chance</p>
                <p className={'text-xl font-bold ' + (chanceColors[feedback.hiring_chance] || 'text-white')}>
                  {feedback.hiring_chance}
                </p>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed">{feedback.verdict}</p>
          </div>

          {feedback.positives && feedback.positives.length > 0 && (
            <div className="bg-green-950 border border-green-800 rounded-xl p-5">
              <h2 className="text-green-400 font-semibold mb-3">✓ What is working</h2>
              <ul className="space-y-2">
                {feedback.positives.map((p, i) => (
                  <li key={i} className="text-green-300 text-sm flex gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.issues && feedback.issues.length > 0 && (
            <div>
              <h2 className="text-white font-semibold mb-3">
                Issues found ({feedback.issues.length})
              </h2>
              <div className="space-y-4">
                {feedback.issues.map((issue, i) => (
                  <div
                    key={i}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={'text-xs font-medium px-2 py-1 rounded border ' + (typeColors[issue.type] || 'bg-gray-800 text-gray-300 border-gray-600')}>
                        {issue.type}
                      </span>
                    </div>
                    {issue.quote && (
                      <p className="text-gray-500 text-sm italic mb-3 border-l-2 border-gray-700 pl-3">
                        "{issue.quote}"
                      </p>
                    )}
                    <p className="text-red-400 text-sm mb-2">
                      <strong>Problem:</strong> {issue.problem}
                    </p>
                    <p className="text-green-400 text-sm">
                      <strong>Fix:</strong> {issue.fix}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
