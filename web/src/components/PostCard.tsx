import './posts.css'
import heroImg from '../assets/hero.svg'
import type { Post } from '../lib/api'
import { Link } from 'react-router-dom'

export default function PostCard({ post }: { post: Post }) {
  // Image handling simplified: API returns full URLs for images.
  const first: any = post.photos && post.photos.length ? post.photos[0] : undefined
  const candidate =
    typeof first === 'string'
      ? first
      : first && typeof first === 'object'
      ? first.url : undefined
  const img = candidate && (/^https?:\/\//i.test(candidate) || candidate.startsWith('data:')) ? candidate : heroImg
  const date = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''

  return (
    <Link className="post-link" to={`/posts/${encodeURIComponent(post.id)}`}>
      <article className="post-card">
      {post.property && <span className="property-overlay badge">Property</span>}
      <div className="post-image">
        <img
          src={img}
          alt={post.title || 'Post image'}
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement
            if (!el.dataset.fallback) {
              el.dataset.fallback = '1'
              el.src = heroImg
            }
          }}
        />
      </div>
      <div className="post-body">
        <div className="post-meta">{date}</div>
        <h3 className="post-title">{post.title || 'Untitled post'}</h3>
        <p className="post-excerpt">{post.excerpt || post.body || 'No description provided.'}</p>
      </div>
      </article>
    </Link>
  )
}
