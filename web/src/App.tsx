import React from 'react'
import './App.css'
import PostsList from './components/PostsList'

function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Posts</h1>
        <p className="app-sub">A simple feed of scheduled posts</p>
      </header>

      <main>
        <PostsList />
      </main>
    </div>
  )
}

export default App
