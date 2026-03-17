import React from 'react'
import './posts.css'
import heroImg from '../assets/hero.png'
import type { Post } from '../lib/api'

export default function PostCard({ post }: { post: Post }) {
  const rawImg: any = post.photos && post.photos.length ? post.photos[0] : ''
  const IS_DEV = import.meta.env.DEV
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || ''

  // Resolve the actual image URL from possible shapes:
  // - string URL
  // - object { url, src, key, path }
  // - relative key like 'photos/abc.jpg'
  let img = ''
  if (!rawImg) {
    img = heroImg
  } else if (typeof rawImg === 'string') {
    if (/^https?:\/\//i.test(rawImg) || rawImg.startsWith('data:')) {
      img = rawImg
    } else if (IS_DEV) {
      img = rawImg.startsWith('/') ? rawImg : `/${rawImg}`
    } else {
      img = rawImg.startsWith('/') ? `${API_BASE}${rawImg}` : `${API_BASE}/${rawImg}`
    }
  } else if (typeof rawImg === 'object') {
    const candidate = rawImg.url || rawImg.src || rawImg.path || rawImg.key || rawImg.Key
    if (candidate && typeof candidate === 'string') {
      if (/^https?:\/\//i.test(candidate) || candidate.startsWith('data:')) {
        img = candidate
      } else if (IS_DEV) {
        img = candidate.startsWith('/') ? candidate : `/${candidate}`
      } else {
        img = candidate.startsWith('/') ? `${API_BASE}${candidate}` : `${API_BASE}/${candidate}`
      }
    } else {
      img = heroImg
    }
  } else {
    img = heroImg
  }
  const date = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''

  return (
    <article className="post-card">
      <div className="post-image">
        <img
          src={img}
          alt={post.title || 'Post image'}
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement
            // set fallback hero image once
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
