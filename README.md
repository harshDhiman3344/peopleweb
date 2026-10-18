# Human Web 🌐✨

**Human Web** is an interactive, constellation-inspired web application that visualizes how people are connected through mutual acquaintances, inspired by the **Six Degrees of Separation** theory.

Every person is a glowing celestial node, and every relationship is an explicit connecting edge. Explore social circles, college campuses, friend networks, and discover the shortest chains connecting any two individuals.

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Graph Engine**: [react-force-graph-2d](https://github.com/vasturiano/react-force-graph) (Canvas-rendered spring physics simulation)
- **Local Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [idb](https://github.com/jakearchibald/idb)
- **Icons & Polish**: [lucide-react](https://lucide.dev/), [canvas-confetti](https://www.npmjs.com/package/canvas-confetti)

---

## ✨ Key Features

### 1. Interactive Constellation Canvas
- Dark deep-space theme (`#080c16`) with subtle glowing auroras.
- Dynamic spring physics simulation with smooth movement, drag interactions, zoom, pan, and reheat controls.
- Node coordinates persist in **IndexedDB** on drag end, ensuring customized graph layouts survive page reloads and restarts.
- Neighborhood isolation: hovering or selecting a person dims unrelated nodes and illuminates direct connections.

### 2. People & Multi-Relationship Management
- **Add Person**: Full name, nickname, circles/tags, bio/notes, and custom celestial aura palette color.
- **Direct Multi-Connect & Circle Auto-Connect**: When adding a new person, optionally connect them directly to multiple individuals or connect to an entire circle / tag group with a single click (e.g. `[#Robotics]`, `[#Cinema]`).
- **Connect Later On with Tag Auto-Connect**: Connect existing people via the top toolbar or person details. Supports selecting multiple people at once, one-click circle/tag selection, automatic duplicate edge detection, and custom relationship attributes:
  - *Friends*, *Close Friends*, *Classmates*, *Colleagues*, *Society / Club Members*, *Roommates*, *Family*, *Mentors*, *Acquaintances*, or *Custom Types* (e.g., "Gym Partner", "Bandmate").
  - Configurable closeness level (1–5), since-when, and context notes.
  - Actual relationships are stored explicitly (mutual acquaintances do not automatically infer a relationship).

### 3. Six Degrees of Separation Discovery (Shortest Path)
- Breadth-First Search (BFS) graph algorithm determines the minimum degrees of separation between any two individuals.
- Step-by-step connection breakdown:
  ```text
  Maya Patel —(Classmate)→ Alex Chen —(Roommate)→ Jordan Rivera —(Film Society)→ Samira Khan
  ```
- Graph visualization lights up the path with electric amber beacons, sequence indicators (`#1`, `#2`, `#3`), and animated directional pulse particles.
- Celebratory confetti burst upon path discovery!
- Explanatory message when no connection exists between distinct social orbits.

### 4. Search, Navigation & Filtering
- Search bar with instant keyboard shortcuts (`/` or `Ctrl+K`) and live dropdown search suggestions.
- Instant zoom-and-center camera focus upon clicking search results.
- Dynamic circle/tag filter chips (e.g., `#Computer Science`, `#Music`, `#Cinema`, `#Climbing`).
- Floating control pad: Zoom In, Zoom Out, Fit to View, Reheat bouncy physics simulation, Unlock pinned nodes, and Fullscreen toggle.

### 5. Local-Only Persistence & Privacy
- **100% Local**: Zero personal data uploaded anywhere. Operates fully in your browser via IndexedDB.
- **JSON Backup & Restore**: One-click export to download a portable `.json` backup file.
- **JSON Import**: Drag-and-drop or select a file to replace or merge network data.
- **Pre-seeded Collegiate Network**: Includes a rich 14-person sample network across CS, robotics, radio, film, debate, orchestra, and climbing societies, demonstrating multiple degrees of separation out-of-the-box.
