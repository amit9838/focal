# focal – Extensible Browser‑Based Photo Editor

**focal** is a modular, high‑performance canvas editor built with React + TypeScript.  
It follows a **plugin‑ready architecture** that separates the core engine from tools.  
Currently it supports shape creation (rectangle/ellipse), multi‑selection, marquee selection, group transform (move/resize), and color/opacity editing.  

The architecture is designed to easily add new tools (draw, paint, text, image, filters, layers) without touching existing code.

---

## 🧠 Architecture Overview


### Core Components

| Component | Responsibility |
|-----------|----------------|
| **CanvasController** | Entry point for the React UI. Creates the engine, registers all tools, manages render loop, forwards events. |
| **ToolManager** | Registers and activates tools. Routes canvas events (mouse/touch) to the active tool. |
| **ITool** | Interface that every tool must implement (lifecycle, event handlers, drawing). |
| **ShapeTool** | Built‑in tool for creating rectangles/ellipses, selecting, moving, resizing, group transform. |
| **ShapeManager** | Stores all vector shapes, manages selection (single/multi). |
| **CanvasRenderer** | Draws background, shapes, temporary shape, group box, and calls tool overlays. |
| **CanvasAdapter** | Low‑level canvas utilities (coordinate conversion, drawing primitives). |
| **Zustand Store** | Global reactive state for UI (active tool, colors, brush size). Shared between React and plain TS tools. |

### Data Flow

1. **User interaction** → canvas events → `CanvasController` → `ToolManager` → active tool’s event handler.  
2. **Tool modifies state** (e.g., creates a shape) → `ShapeManager` triggers callback → `CanvasController` re‑renders.  
3. **UI changes** (color picker) → Zustand store → React components update, and controller calls tool API (e.g., `setSelectedFillColor`).  
4. **Active tool’s `onDraw`** is called every frame to draw overlays (marquee, selection preview).

### Tool Extension Pattern

- New tools implement `ITool` and are registered once in `CanvasController` constructor.  
- Each tool receives an `IToolContext` with all necessary adapters.  
- Tools can read/write to `StateStore`, emit `EventBus` events, and use `CanvasAdapter` for drawing.  
- Adding a tool never changes existing tools or core engine.

---

## 📦 Tech Stack

- **React 18** + **TypeScript** – UI & type safety  
- **Tailwind CSS** – minimal styling  
- **Zustand** – global state (outside React)  
- **Canvas API** – 2D rendering  
- **Vite** – build tool (recommended)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/your-username/focal.git
cd focal
npm install
```

### Development

```bash
npm run dev
```

Open `http://localhost:5173`

### Build

```bash
npm run build
```

---

## Current Features

- Draw **rectangles** and **ellipses** (click “Draw”, then click & drag on canvas)  
- **Select** shapes by clicking (Ctrl+Click for multi‑select)  
- **Marquee selection** – drag empty area to select intersecting shapes  
- **Move** selected shapes by dragging inside them (single shape only)  
- **Resize** single shape by dragging its edges or corners  
- **Group transform** when 2+ shapes selected – a blue bounding box with knobs appears → drag inside to move all, drag edges/corners to resize proportionally  
- **Delete** selected shapes  
- **Change fill/stroke color & opacity** – affects all selected shapes  
- Shape list panel shows all shapes with preview

---

## Adding a New Tool

1. Create a new class in `src/core/tools/` that implements `ITool`.  
   Example skeleton:

   ```ts
   import { ITool, IToolContext } from "./ITool";

   export class DrawTool implements ITool {
     public readonly name = "draw";

     onActivate(context: IToolContext) { /* ... */ }
     onDeactivate(context: IToolContext) { /* ... */ }
     onMouseDown(e, context) { /* ... */ }
     onMouseMove(e, context) { /* ... */ }
     onMouseUp(e, context) { /* ... */ }
     onDraw(ctx, context) { /* optional */ }
   }
   ```

2. Register the tool in `CanvasController` constructor:

   ```ts
   const drawTool = new DrawTool();
   this.toolManager.register(drawTool);
   ```

3. Add a UI button that calls `canvasController.setActiveTool('draw')` (you’ll need to expose `setActiveTool` method in `CanvasController`).

4. Update Zustand store to hold `activeTool` and let UI read it.

The rest (event routing, rendering) works automatically.

---

## 📁 Project Structure

```
src/
├── core/                      # Engine – no React dependencies
│   ├── adapters/             # CanvasAdapter, EventBus, store (Zustand)
│   ├── controllers/          # CanvasController
│   ├── managers/             # ShapeManager
│   ├── models/               # Shape, Rectangle, Ellipse, GroupTransform
│   ├── renderers/            # CanvasBackground, CanvasRenderer
│   ├── tools/                # ITool, ToolManager, ShapeTool
│   ├── types/                # shared TS interfaces
│   └── utils/                # helpers
├── components/               # React UI (App.tsx, etc.)
├── index.css                 # Tailwind directives
└── main.tsx                  # React entry point
```

---

## Roadmap

- [ ] **DrawTool** – freehand pencil / brush with pressure support  
- [ ] **PaintBucketTool** – flood fill  
- [ ] **TextTool** – editable text shapes  
- [ ] **ImageTool** – import and place images  
- [ ] **Layers** – multi‑layer editing with opacity and blending  
- [ ] **History** – undo/redo (Command pattern)  
- [ ] **Filters** – brightness, contrast, blur  
- [ ] **Export** – PNG, JPEG, SVG  

---

## Contributing

Pull requests are welcome. Please follow the existing code style and ensure tools remain decoupled.

---

## License

MIT © Focal

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UI LAYER (React)                               │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────────────┐   │
│  │ Toolbar  │  │ Properties   │  │ Status Bar │  │ Shape List           │   │
│  └────┬─────┘  └──────┬───────┘  └─────┬──────┘  └──────────────────────┘   │
│       │               │                │                                    │
│       ▼               ▼                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         CORE SERVICES                               │    │
│  │ ┌─────────────┐   ┌──────────┐   ┌────────────┐   ┌──────────────┐  │    │
│  │ │ StateStore  │   │ EventBus │   │ ToolManager│   │ CanvasAdapter│  │    │
│  │ │ (Zustand)   │   │(pub/sub) │   │(registers, │   │(draw         │  │    │
│  │ │             │   │          │   │ activates, │   │ primitives)  │  │    │
│  │ └─────┬───────┘   └────┬─────┘   │ routes)    │   └──────┬───────┘  │    │
│  └───────┼───────────────┼────────────────┼─────────────────┼─────────-┘    │
│          │               │                │                 │               │
│          ▼               ▼                ▼                 ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                              TOOLS                                  │    │
│  │  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐ │    │
│  │  │ShapeTool  │  │DrawTool  │  │PaintTool │  │TextTool │  │Image...│ │    │
│  │  │(built-in) │  │(future)  │  │(future)  │  │(future) │  │(future)│ │    │
│  │  └─────┬─────┘  └──────────┘  └──────────┘  └─────────┘  └────────┘ │    │
│  └────────┼────────────────────────────────────────────────────────────┘    │
│           │                                                                 │ 
│           ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        MANAGERS & RENDERERS                          │   │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐      │   │
│  │  │ ShapeManager │   │CanvasRenderer│   │ CanvasBackground     │      │   │
│  │  │ (stores      │   │ (draws       │   │ (static checker &    │      │   │
│  │  │  shapes)     │   │  everything) │   │  "focal" text)       │      │   │
│  │  └──────────────┘   └──────────────┘   └──────────────────────┘      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

**Happy editing!**