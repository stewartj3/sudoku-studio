import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Check,
  ChevronDown,
  CircleHelp,
  Eraser,
  Lightbulb,
  Moon,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Settings,
  Sun,
  Undo2,
} from 'lucide-react'
import './styles.css'

const puzzle = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
]

const solution = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

const cloneNotes = (notes) => Object.fromEntries(Object.entries(notes).map(([key, value]) => [key, [...value]]))
const cellKey = (row, col) => `${row}-${col}`

function App() {
  const [board, setBoard] = useState(() => puzzle.map((row) => [...row]))
  const [selected, setSelected] = useState({ row: 4, col: 4 })
  const [notes, setNotes] = useState({})
  const [noteMode, setNoteMode] = useState(false)
  const [history, setHistory] = useState([])
  const [seconds, setSeconds] = useState(247)
  const [paused, setPaused] = useState(false)
  const [dark, setDark] = useState(false)
  const [message, setMessage] = useState('')
  const [difficulty, setDifficulty] = useState('Medium')

  useEffect(() => {
    if (paused) return undefined
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [paused])

  const valueCounts = useMemo(() => {
    const counts = Array(10).fill(0)
    board.flat().forEach((value) => { if (value) counts[value] += 1 })
    return counts
  }, [board])

  const saveHistory = () => setHistory((items) => [...items.slice(-24), { board: board.map((row) => [...row]), notes: cloneNotes(notes) }])

  const enterNumber = (number) => {
    if (paused || puzzle[selected.row][selected.col]) return
    saveHistory()
    const key = cellKey(selected.row, selected.col)
    setMessage('')
    if (noteMode) {
      setNotes((current) => {
        const values = current[key] || []
        const next = values.includes(number) ? values.filter((n) => n !== number) : [...values, number].sort()
        return { ...current, [key]: next }
      })
      return
    }
    setBoard((current) => current.map((row, r) => row.map((value, c) => r === selected.row && c === selected.col ? number : value)))
    setNotes((current) => ({ ...current, [key]: [] }))
  }

  const erase = () => {
    if (puzzle[selected.row][selected.col] || paused) return
    saveHistory()
    setBoard((current) => current.map((row, r) => row.map((value, c) => r === selected.row && c === selected.col ? 0 : value)))
    setNotes((current) => ({ ...current, [cellKey(selected.row, selected.col)]: [] }))
  }

  const undo = () => {
    const previous = history.at(-1)
    if (!previous) return
    setBoard(previous.board)
    setNotes(previous.notes)
    setHistory((items) => items.slice(0, -1))
  }

  const reset = () => {
    setHistory([])
    setBoard(puzzle.map((row) => [...row]))
    setNotes({})
    setSeconds(0)
    setMessage('Fresh board, fresh start.')
  }

  const hint = () => {
    if (puzzle[selected.row][selected.col] || paused) return
    saveHistory()
    const key = cellKey(selected.row, selected.col)
    setBoard((current) => current.map((row, r) => row.map((value, c) => r === selected.row && c === selected.col ? solution[r][c] : value)))
    setNotes((current) => ({ ...current, [key]: [] }))
    setMessage('One square revealed.')
  }

  const checkBoard = () => {
    const wrong = board.some((row, r) => row.some((value, c) => value && value !== solution[r][c]))
    const complete = board.every((row) => row.every(Boolean))
    setMessage(wrong ? 'A few cells need another look.' : complete ? 'Beautiful work — puzzle complete!' : 'Looking good so far!')
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key >= '1' && event.key <= '9') enterNumber(Number(event.key))
      if (event.key === 'Backspace' || event.key === 'Delete') erase()
      if (event.key.toLowerCase() === 'n') setNoteMode((value) => !value)
      const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
      if (directions[event.key]) {
        event.preventDefault()
        const [dr, dc] = directions[event.key]
        setSelected(({ row, col }) => ({ row: Math.max(0, Math.min(8, row + dr)), col: Math.max(0, Math.min(8, col + dc)) }))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const isRelated = (row, col) => row === selected.row || col === selected.col || (Math.floor(row / 3) === Math.floor(selected.row / 3) && Math.floor(col / 3) === Math.floor(selected.col / 3))
  const selectedValue = board[selected.row][selected.col]
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <header>
        <a className="brand" href="#" aria-label="Sudoku Studio home">
          <span className="brand-mark"><i /><i /><i /><i /></span>
          <span>Sudoku <em>Studio</em></span>
        </a>
        <nav>
          <button className="nav-link active">Play</button>
          <button className="nav-link">How to play</button>
          <button className="icon-btn" onClick={() => setDark((value) => !value)} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</button>
          <button className="icon-btn" aria-label="Settings"><Settings /></button>
        </nav>
      </header>

      <main>
        <section className="intro">
          <div>
            <span className="eyebrow">DAILY PUZZLE · AUGUST 14</span>
            <h1>Take a breath.<br /><span>Find the pattern.</span></h1>
          </div>
          <div className="game-meta">
            <label>DIFFICULTY</label>
            <button className="select" onClick={() => setDifficulty((value) => value === 'Medium' ? 'Hard' : value === 'Hard' ? 'Easy' : 'Medium')}>
              <span className={`dot ${difficulty.toLowerCase()}`} /> {difficulty} <ChevronDown />
            </button>
            <div className="timer">
              <span>{time}</span>
              <button onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Resume' : 'Pause'}>{paused ? <Play /> : <Pause />}</button>
            </div>
          </div>
        </section>

        <section className="game-area">
          <div className="board-shell">
            <div className="board" aria-label="Sudoku board">
              {board.map((row, r) => row.map((value, c) => {
                const isSelected = selected.row === r && selected.col === c
                const sameNumber = Boolean(selectedValue && value === selectedValue)
                const isWrong = value && value !== solution[r][c]
                return (
                  <button
                    key={`${r}-${c}`}
                    className={`cell ${isRelated(r, c) ? 'related' : ''} ${sameNumber ? 'same' : ''} ${isSelected ? 'selected' : ''} ${puzzle[r][c] ? 'given' : 'editable'} ${isWrong ? 'wrong' : ''}`}
                    onClick={() => setSelected({ row: r, col: c })}
                    aria-label={`Row ${r + 1}, column ${c + 1}${value ? `, ${value}` : ''}`}
                  >
                    {value || (
                      <span className="notes">
                        {Array.from({ length: 9 }, (_, index) => <i key={index}>{notes[cellKey(r, c)]?.includes(index + 1) ? index + 1 : ''}</i>)}
                      </span>
                    )}
                  </button>
                )
              }))}
              {paused && <div className="paused"><div><Pause /><strong>Paused</strong><span>Your puzzle is waiting.</span><button onClick={() => setPaused(false)}>Resume game</button></div></div>}
            </div>
            <p className="shortcut"><span>N</span> Notes &nbsp; <span>↑ ↓ ← →</span> Move &nbsp; <span>1–9</span> Fill cell</p>
          </div>

          <aside className="controls">
            <div className="number-pad">
              {Array.from({ length: 9 }, (_, index) => index + 1).map((number) => (
                <button key={number} onClick={() => enterNumber(number)} disabled={valueCounts[number] >= 9}>
                  <strong>{number}</strong><small>{Math.max(0, 9 - valueCounts[number])}</small>
                </button>
              ))}
            </div>
            <div className="tools">
              <button onClick={undo} disabled={!history.length}><Undo2 /><span>Undo</span></button>
              <button onClick={erase}><Eraser /><span>Erase</span></button>
              <button className={noteMode ? 'tool-active' : ''} onClick={() => setNoteMode((value) => !value)}><Pencil /><span>Notes</span><small>{noteMode ? 'ON' : 'OFF'}</small></button>
              <button onClick={hint}><Lightbulb /><span>Hint</span></button>
            </div>
            <button className="check" onClick={checkBoard}><Check /> Check progress</button>
            {message && <p className="message">{message}</p>}
            <button className="new-game" onClick={reset}><RotateCcw /> New puzzle</button>
          </aside>
        </section>
      </main>

      <footer>
        <span>© 2026 Sudoku Studio</span>
        <span className="footer-center">Clear your mind, one square at a time.</span>
        <button><CircleHelp /> Need a hint?</button>
      </footer>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
