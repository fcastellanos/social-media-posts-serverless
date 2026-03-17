import { useEffect, useState } from 'react'
import type { Post } from '../lib/api'
import { fetchPost } from '../lib/api'
import './posts.css'
import { Link } from 'react-router-dom'

export default function PostDetail({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchPost(id)
      .then((p) => {
        if (!mounted) return
        setPost(p)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || 'Failed to load post')
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [id])

  if (loading) return <div className="posts-status">Loading post…</div>
  if (error) return <div className="posts-status error">{error}</div>
  if (!post) return <div className="posts-status">Post not found</div>

  return (
    <article className="post-detail">
      <Link to="/" className="back-link">← Back</Link>
      <h2>{post.title}</h2>
      {post.property && (
        <div className="property-card">
          <div className="property-info">
            <div className="property-title">{post.property.title || 'Property'}</div>
            {post.property.address && <div className="property-address">{post.property.address}</div>}
          </div>
          <div className="property-actions">
            <a className="property-action-link" href="#">View on map</a>
          </div>
        </div>
      )}
      {post.photos && post.photos.length > 0 && (
        <div className="post-detail-image">
          <img src={typeof post.photos[0] === 'string' ? post.photos[0] : post.photos[0].url} alt={post.title} />
        </div>
      )}
      <p>{post.body}</p>
    </article>
  )
}
