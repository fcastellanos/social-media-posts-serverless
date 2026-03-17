import './App.css'
import PostsList from './components/PostsList'
import PostDetail from './components/PostDetail'
import { HashRouter, Routes, Route, useParams } from 'react-router-dom'

function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Posts</h1>
        <p className="app-sub">A simple feed of scheduled posts</p>
      </header>

      <main>
        <HashRouter>
          <Routes>
            <Route path="/" element={<PostsList />} />
            <Route path="/posts/:id" element={<PostDetailRoute />} />
          </Routes>
        </HashRouter>
      </main>
    </div>
  )
}

function PostDetailRoute() {
  const params = useParams()
  const id = params?.id
  return id ? <PostDetail id={id} /> : <PostsList />
}

export default App
