import { useEffect, useState } from 'react'
import type { Article } from '../../shared/types'
import { api, errorMessage } from '../lib/api'
import { Link } from '../router'
import { Shell } from '../components/Shell'

type Summary = Pick<Article, 'slug' | 'title' | 'summary' | 'readMinutes'>

export function Learn() {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [article, setArticle] = useState<Article | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api<{ articles: Summary[] }>('/api/articles')
      .then((result) => {
        if (active) setSummaries(result.articles)
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, 'We could not load the library.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const open = async (slug: string) => {
    setError(null)
    try {
      const result = await api<{ article: Article }>(`/api/articles/${slug}`)
      setArticle(result.article)
      window.scrollTo(0, 0)
    } catch (caught) {
      setError(errorMessage(caught, 'We could not open that article.'))
    }
  }

  return (
    <Shell>
      <main className="dash">
        {article ? (
          <article className="article-detail">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArticle(null)}>
              ← Back to the library
            </button>
            <p className="eyebrow" style={{ marginTop: 26 }}>
              {article.readMinutes} min read
            </p>
            <h1>{article.title}</h1>
            <p className="dash-lede">{article.summary}</p>
            <div className="article-body">
              {article.sections.map((section) => (
                <section key={section.heading}>
                  <h2>{section.heading}</h2>
                  <p>{section.body}</p>
                </section>
              ))}
            </div>
            <div className="article-cta">
              <p>Still have a question?</p>
              <Link to="/app/guide" className="btn btn-primary btn-sm">
                Ask the guide
              </Link>
            </div>
          </article>
        ) : (
          <>
            <div className="dash-head">
              <div>
                <p className="eyebrow">Learn</p>
                <h1>Short, honest reads.</h1>
                <p className="dash-lede">
                  Periods are a normal, healthy part of life. These short reads explain what is happening in your body, what
                  genuinely helps, and when a symptom deserves real medical help.
                </p>
              </div>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <p className="learn-banner">
              <strong>Nothing about this is shameful.</strong> Every body that menstruates does it differently: different
              lengths, different pain, different moods. What matters is knowing your own pattern.
            </p>

            {loading ? (
              <p className="card-sub">Loading the library…</p>
            ) : (
              <div className="article-grid">
                {summaries.map((summary) => (
                  <button key={summary.slug} type="button" className="article-card" onClick={() => void open(summary.slug)}>
                    <h3>{summary.title}</h3>
                    <p>{summary.summary}</p>
                    <p className="article-meta">{summary.readMinutes} min read</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </Shell>
  )
}
