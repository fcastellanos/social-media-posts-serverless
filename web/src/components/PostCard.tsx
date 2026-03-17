import './posts.css'
import heroImg from '../assets/hero.png'
import type { Post } from '../lib/api'

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
    <article className="post-card">
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
        {post.propertyId && <span className="badge">Property</span>}
      </div>
    </article>
  )
}
