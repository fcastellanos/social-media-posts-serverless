import React, { useEffect, useState } from 'react'
import type { Post } from '../lib/api'
import { fetchPosts } from '../lib/api'
import PostCard from './PostCard'

export default function PostsList() {
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchPosts()
      .then((data) => {
        if (!mounted) return
        console.debug('fetched posts', data)
        setPosts(data)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || 'Failed to load')
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <div className="posts-status">Loading posts…</div>
  if (error) return <div className="posts-status error">{error}</div>
  if (!posts || posts.length === 0) return <div className="posts-status">No posts found</div>

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 12 }}>
        <button onClick={() => setShowDebug((s) => !s)} style={{ fontSize: 12 }}>
          {showDebug ? 'Hide debug' : 'Show debug'}
        </button>
      </div>

      <div className="posts-grid">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>

      {showDebug && (
        <pre style={{ color: '#eee', background: '#111', padding: 12, margin: 12, borderRadius: 6 }}>
          {JSON.stringify(posts, null, 2)}
        </pre>
      )}
    </>
  )
}
