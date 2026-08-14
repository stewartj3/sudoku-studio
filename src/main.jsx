import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Check,
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

const baseSolution = [
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

const hashSeed = (seed) => {
  let hash = 2166136261
  for (const character of seed) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const seededRandom = (seed) => {
  let value = hashSeed(seed)
  return () => {
    value += 0x6D2B79F5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

const shuffle = (values, random) => {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

const candidatesFor = (board, row, column) => {
  const used = new Set(board[row])
  for (let index = 0; index < 9; index += 1) used.add(board[index][column])
  const boxRow = Math.floor(row / 3) * 3
  const boxColumn = Math.floor(column / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxColumn; c < boxColumn + 3; c += 1) used.add(board[r][c])
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((number) => !used.has(number))
}

const classifyPuzzle = (puzzle) => {
  const board = puzzle.map((row) => [...row])
  const candidateGrid = board.map((row, r) => row.map((value, c) => value ? null : new Set(candidatesFor(board, r, c))))
  const units = [
    ...Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (__, column) => [row, column])),
    ...Array.from({ length: 9 }, (_, column) => Array.from({ length: 9 }, (__, row) => [row, column])),
    ...Array.from({ length: 9 }, (_, box) => {
      const startRow = Math.floor(box / 3) * 3
      const startColumn = (box % 3) * 3
      return Array.from({ length: 9 }, (__, index) => [startRow + Math.floor(index / 3), startColumn + (index % 3)])
    }),
  ]
  let usedMediumTechnique = false

  const removeCandidate = (row, column, number) => {
    const candidates = candidateGrid[row][column]
    if (!candidates?.has(number)) return false
    candidates.delete(number)
    return true
  }

  const placeNumber = (row, column, number) => {
    board[row][column] = number
    candidateGrid[row][column] = null
    for (let index = 0; index < 9; index += 1) {
      removeCandidate(row, index, number)
      removeCandidate(index, column, number)
    }
    const startRow = Math.floor(row / 3) * 3
    const startColumn = Math.floor(column / 3) * 3
    for (let r = startRow; r < startRow + 3; r += 1) {
      for (let c = startColumn; c < startColumn + 3; c += 1) removeCandidate(r, c, number)
    }
  }

  const applyLockedCandidates = () => {
    let changed = false

    // Pointing: candidates confined to one row or column inside a box.
    for (let box = 0; box < 9; box += 1) {
      const startRow = Math.floor(box / 3) * 3
      const startColumn = (box % 3) * 3
      const cells = units[18 + box]
      for (let number = 1; number <= 9; number += 1) {
        const possible = cells.filter(([r, c]) => candidateGrid[r][c]?.has(number))
        if (possible.length < 2) continue
        if (possible.every(([r]) => r === possible[0][0])) {
          const row = possible[0][0]
          for (let c = 0; c < 9; c += 1) if (c < startColumn || c >= startColumn + 3) changed = removeCandidate(row, c, number) || changed
        }
        if (possible.every(([, c]) => c === possible[0][1])) {
          const column = possible[0][1]
          for (let r = 0; r < 9; r += 1) if (r < startRow || r >= startRow + 3) changed = removeCandidate(r, column, number) || changed
        }
      }
    }

    // Claiming: candidates in a row or column confined to one box.
    for (let index = 0; index < 9; index += 1) {
      for (let number = 1; number <= 9; number += 1) {
        const rowCells = units[index].filter(([r, c]) => candidateGrid[r][c]?.has(number))
        if (rowCells.length >= 2 && rowCells.every(([, c]) => Math.floor(c / 3) === Math.floor(rowCells[0][1] / 3))) {
          const boxColumn = Math.floor(rowCells[0][1] / 3) * 3
          const boxRow = Math.floor(index / 3) * 3
          for (let r = boxRow; r < boxRow + 3; r += 1) {
            if (r === index) continue
            for (let c = boxColumn; c < boxColumn + 3; c += 1) changed = removeCandidate(r, c, number) || changed
          }
        }

        const columnCells = units[9 + index].filter(([r, c]) => candidateGrid[r][c]?.has(number))
        if (columnCells.length >= 2 && columnCells.every(([r]) => Math.floor(r / 3) === Math.floor(columnCells[0][0] / 3))) {
          const boxRow = Math.floor(columnCells[0][0] / 3) * 3
          const boxColumn = Math.floor(index / 3) * 3
          for (let r = boxRow; r < boxRow + 3; r += 1) {
            for (let c = boxColumn; c < boxColumn + 3; c += 1) if (c !== index) changed = removeCandidate(r, c, number) || changed
          }
        }
      }
    }
    return changed
  }

  const applySubsets = () => {
    let changed = false
    for (const unit of units) {
      const openCells = unit.filter(([row, column]) => candidateGrid[row][column])

      // Naked pairs: two cells containing the same two candidates.
      const pairs = new Map()
      for (const [row, column] of openCells) {
        const candidates = candidateGrid[row][column]
        if (candidates.size !== 2) continue
        const key = [...candidates].sort().join('-')
        pairs.set(key, [...(pairs.get(key) || []), [row, column]])
      }
      for (const [key, pairCells] of pairs) {
        if (pairCells.length !== 2) continue
        const numbers = key.split('-').map(Number)
        for (const [row, column] of openCells) {
          if (pairCells.some(([r, c]) => r === row && c === column)) continue
          for (const number of numbers) changed = removeCandidate(row, column, number) || changed
        }
      }

      // Hidden pairs: two numbers that occur in exactly the same two cells.
      const locations = Array.from({ length: 10 }, () => [])
      for (let number = 1; number <= 9; number += 1) {
        locations[number] = openCells.filter(([row, column]) => candidateGrid[row][column]?.has(number))
      }
      for (let first = 1; first <= 8; first += 1) {
        for (let second = first + 1; second <= 9; second += 1) {
          if (locations[first].length !== 2 || locations[second].length !== 2) continue
          const firstKeys = locations[first].map(([r, c]) => `${r}-${c}`).sort().join('|')
          const secondKeys = locations[second].map(([r, c]) => `${r}-${c}`).sort().join('|')
          if (firstKeys !== secondKeys) continue
          for (const [row, column] of locations[first]) {
            for (const number of [...candidateGrid[row][column]]) {
              if (number !== first && number !== second) changed = removeCandidate(row, column, number) || changed
            }
          }
        }
      }

      // Naked triples: three cells whose combined candidates contain three numbers.
      const tripleCells = openCells.filter(([row, column]) => {
        const size = candidateGrid[row][column]?.size || 0
        return size >= 2 && size <= 3
      })
      for (let first = 0; first < tripleCells.length - 2; first += 1) {
        for (let second = first + 1; second < tripleCells.length - 1; second += 1) {
          for (let third = second + 1; third < tripleCells.length; third += 1) {
            const selectedCells = [tripleCells[first], tripleCells[second], tripleCells[third]]
            const numbers = new Set(selectedCells.flatMap(([row, column]) => [...candidateGrid[row][column]]))
            if (numbers.size !== 3) continue
            for (const [row, column] of openCells) {
              if (selectedCells.some(([r, c]) => r === row && c === column)) continue
              for (const number of numbers) changed = removeCandidate(row, column, number) || changed
            }
          }
        }
      }

      // Hidden triples: three numbers confined to the same three cells.
      const tripleLocations = Array.from({ length: 10 }, () => [])
      for (let number = 1; number <= 9; number += 1) {
        tripleLocations[number] = openCells.filter(([row, column]) => candidateGrid[row][column]?.has(number))
      }
      for (let first = 1; first <= 7; first += 1) {
        for (let second = first + 1; second <= 8; second += 1) {
          for (let third = second + 1; third <= 9; third += 1) {
            const locationsForNumbers = [tripleLocations[first], tripleLocations[second], tripleLocations[third]]
            if (locationsForNumbers.some((locationsForNumber) => locationsForNumber.length < 2 || locationsForNumber.length > 3)) continue
            const cellMap = new Map(locationsForNumbers.flat().map(([row, column]) => [`${row}-${column}`, [row, column]]))
            if (cellMap.size !== 3) continue
            for (const [row, column] of cellMap.values()) {
              for (const number of [...candidateGrid[row][column]]) {
                if (number !== first && number !== second && number !== third) changed = removeCandidate(row, column, number) || changed
              }
            }
          }
        }
      }
    }
    return changed
  }

  while (board.some((row) => row.includes(0))) {
    let placement = null

    for (let row = 0; row < 9 && !placement; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        const candidates = candidateGrid[row][column]
        if (candidates?.size === 1) {
          placement = { row, column, number: [...candidates][0] }
          break
        }
      }
    }

    if (!placement) {
      for (const unit of units) {
        for (let number = 1; number <= 9; number += 1) {
          const possible = unit.filter(([row, column]) => candidateGrid[row][column]?.has(number))
          if (possible.length === 1) {
            const [row, column] = possible[0]
            placement = { row, column, number }
            break
          }
        }
        if (placement) break
      }
    }

    if (placement) {
      placeNumber(placement.row, placement.column, placement.number)
      continue
    }

    const usedLockedCandidates = applyLockedCandidates()
    const usedSubsets = applySubsets()
    if (!usedLockedCandidates && !usedSubsets) return 'Hard'
    usedMediumTechnique = true
  }

  return usedMediumTechnique ? 'Medium' : 'Easy'
}

const countSolutions = (puzzle, limit = 2) => {
  const board = puzzle.map((row) => [...row])

  const search = () => {
    let bestCell = null
    let bestCandidates = null
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        if (board[row][column]) continue
        const candidates = candidatesFor(board, row, column)
        if (!candidates.length) return 0
        if (!bestCandidates || candidates.length < bestCandidates.length) {
          bestCell = [row, column]
          bestCandidates = candidates
        }
      }
    }
    if (!bestCell) return 1

    const [row, column] = bestCell
    let solutions = 0
    for (const number of bestCandidates) {
      board[row][column] = number
      solutions += search()
      board[row][column] = 0
      if (solutions >= limit) return solutions
    }
    return solutions
  }

  return search()
}

const generateClueLayout = (solution, random, targetRating) => {
  let fallback = solution.map((row) => [...row])

  // Retry deterministic removal orders until the requested rating is reached.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const puzzle = solution.map((row) => [...row])
    const positions = shuffle(Array.from({ length: 81 }, (_, index) => index), random)
    let clueCount = 81

    for (const position of positions) {
      if (clueCount <= 24) break
      const row = Math.floor(position / 9)
      const column = position % 9
      const value = puzzle[row][column]
      puzzle[row][column] = 0

      if (countSolutions(puzzle) !== 1) {
        puzzle[row][column] = value
        continue
      }

      clueCount -= 1
      fallback = puzzle.map((puzzleRow) => [...puzzleRow])
      if (targetRating === 'Easy' && clueCount <= 38 && classifyPuzzle(puzzle) === 'Easy') return puzzle
      if (targetRating === 'Medium' && clueCount <= 36 && classifyPuzzle(puzzle) === 'Medium') return puzzle
      if (targetRating === 'Hard' && clueCount <= 34 && classifyPuzzle(puzzle) === 'Hard') return puzzle
    }
  }

  return fallback
}

const createPuzzle = (seed) => {
  const random = seededRandom(seed.toUpperCase())
  const rowOrder = shuffle([0, 1, 2], random).flatMap((band) => shuffle([0, 1, 2], random).map((row) => band * 3 + row))
  const columnOrder = shuffle([0, 1, 2], random).flatMap((stack) => shuffle([0, 1, 2], random).map((column) => stack * 3 + column))
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random)
  const solution = rowOrder.map((row) => columnOrder.map((column) => digits[baseSolution[row][column] - 1]))
  const ratingTargets = ['Easy', 'Medium', 'Hard']
  const targetRating = ratingTargets[Math.floor(random() * ratingTargets.length)]
  const puzzle = generateClueLayout(solution, random, targetRating)
  return { puzzle, solution, difficulty: classifyPuzzle(puzzle) }
}

const INITIAL_SEED = 'CALM-START'
const initialGame = createPuzzle(INITIAL_SEED)
const randomSeed = () => `${Date.now().toString(36).slice(-4)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase()

function App() {
  const [game, setGame] = useState(initialGame)
  const [board, setBoard] = useState(() => initialGame.puzzle.map((row) => [...row]))
  const [selected, setSelected] = useState({ row: 4, col: 4 })
  const [notes, setNotes] = useState({})
  const [noteMode, setNoteMode] = useState(false)
  const [history, setHistory] = useState([])
  const [seconds, setSeconds] = useState(247)
  const [paused, setPaused] = useState(false)
  const [dark, setDark] = useState(false)
  const [message, setMessage] = useState('')
  const [seedInput, setSeedInput] = useState(INITIAL_SEED)
  const [activeSeed, setActiveSeed] = useState(INITIAL_SEED)

  const { puzzle, solution, difficulty } = game

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

  const startPuzzle = (requestedSeed) => {
    const seed = requestedSeed.trim().toUpperCase() || randomSeed()
    const nextGame = createPuzzle(seed)
    setGame(nextGame)
    setHistory([])
    setBoard(nextGame.puzzle.map((row) => [...row]))
    setNotes({})
    setSeconds(0)
    setSelected({ row: 4, col: 4 })
    setPaused(false)
    setSeedInput(seed)
    setActiveSeed(seed)
    setMessage(`${nextGame.difficulty} puzzle ${seed} loaded.`)
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
      if (event.target instanceof HTMLInputElement) return
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
            <label>RATING</label>
            <div key={activeSeed} className="rating-badge" aria-label={`Puzzle difficulty: ${difficulty}`}>
              <span className={`dot ${difficulty.toLowerCase()}`} /> {difficulty}
            </div>
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
            <button className="new-game" onClick={() => startPuzzle(randomSeed())}><RotateCcw /> New random puzzle</button>
            <div className="seed-control">
              <label htmlFor="puzzle-seed">PUZZLE SEED</label>
              <div>
                <input
                  id="puzzle-seed"
                  value={seedInput}
                  onChange={(event) => setSeedInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') startPuzzle(seedInput) }}
                  spellCheck="false"
                  maxLength="32"
                  aria-describedby="active-seed"
                />
                <button onClick={() => startPuzzle(seedInput)}>Load</button>
              </div>
              <small id="active-seed">Share this seed to replay the same puzzle: <strong>{activeSeed}</strong></small>
            </div>
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
