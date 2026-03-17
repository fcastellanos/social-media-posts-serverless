export type Post = {
  id: string
  title: string
  body?: string
  excerpt?: string
  property?: { id: string; address?: string; title?: string }
  photos?: Array<string | { id?: string; url?: string }>
  createdAt?: string
}

const IS_DEV = import.meta.env.DEV
const RAW_API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || ''

function checkPlaceholder(url: string) {
  if (!IS_DEV && !url) {
    throw new Error('VITE_API_BASE is not set. Add it to web/.env or set the environment variable before starting the build.')
  }
  if (url.includes('<') || url.includes('>')) {
    throw new Error('VITE_API_BASE contains placeholder characters (< or >). Replace with a real API base URL.')
  }
}

function baseForRequest() {
  // In dev use relative paths so Vite dev-server proxy can forward requests and avoid CORS.
  return IS_DEV ? '' : RAW_API_BASE
}

export async function fetchPosts(): Promise<Post[]> {
  const base = baseForRequest()
  checkPlaceholder(base)

  try {
    const res = await fetch(`${base}/posts`)
    if (!res.ok) throw new Error(`Failed fetching posts: ${res.status}`)
    return res.json()
  } catch (err: any) {
    if (err instanceof TypeError && /pattern/i.test(err.message)) {
      throw new Error('Invalid VITE_API_BASE URL. Remove angle brackets or set a valid URL.')
    }
    throw err
  }
}

export async function fetchPost(id: string): Promise<Post | null> {
  const base = baseForRequest()
  checkPlaceholder(base)

  try {
    const res = await fetch(`${base}/posts/${encodeURIComponent(id)}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Failed fetching post: ${res.status}`)
    return res.json()
  } catch (err: any) {
    if (err instanceof TypeError && /pattern/i.test(err.message)) {
      throw new Error('Invalid VITE_API_BASE URL. Remove angle brackets or set a valid URL.')
    }
    throw err
  }
}
