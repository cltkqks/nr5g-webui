# Architecture Overview: NR5G Web UI

## Executive Summary

NR5G Web UI is a high-performance spectrum analyzer application built with Next.js 15, React 19, and a C++ native addon for computationally intensive operations. The architecture emphasizes:

- **Performance**: 5-10x faster spectrum processing via C++ native code
- **Reliability**: Graceful fallback to JavaScript if native addon unavailable
- **Scalability**: Web Worker offloading prevents UI blocking
- **Flexibility**: Supports both mock data and live WebSocket bridge connections

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Application                         │
│                  (Browser + Node.js Server)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   React UI   │     │  Web Worker  │     │ Server-Side  │
│  Components  │     │   (Browser)  │     │  (Node.js)   │
└──────────────┘     └──────────────┘     └──────────────┘
                              │                     │
                              │                     │
                              ▼                     ▼
                     ┌──────────────────────────────────┐
                     │   Native Addon Wrapper           │
                     │     (spectrum-native.ts)         │
                     │  • Auto-detects availability     │
                     │  • Graceful fallback             │
                     │  • Identical API both ways       │
                     └──────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
         ┌──────────────────┐  ┌──────────────────┐
         │  C++ Native      │  │   JavaScript     │
         │  Addon (.node)   │  │   Fallback       │
         │  • 5-10x faster  │  │  • Full compat   │
         │  • N-API bound   │  │  • Always works  │
         └──────────────────┘  └──────────────────┘
                    │
                    ▼
         ┌──────────────────────────────────────┐
         │     C++ Core Implementation          │
         ├──────────────────────────────────────┤
         │  spectrum.cpp / spectrum.h           │
         │  • computeBounds()                   │
         │  • computeNoiseFloor()               │
         │  • buildCoords()                     │
         │  • generateSpectrumTrace()           │
         │  • findPeaks()                       │
         │  • nearestPoint()                    │
         │  • processSpectrum()                 │
         └──────────────────────────────────────┘
```

## Data Flow

### Spectrum Processing Pipeline

```
Input: Array of {frequency, amplitude} points
                    │
                    ▼
         ┌──────────────────┐
         │  JavaScript      │
         │  (TypeScript)    │
         └──────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  Type Conversion │
         │  JS Array → C++  │
         │  std::vector     │
         └──────────────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │  C++ Processing              │
         │  • SIMD optimizations        │
         │  • Cache-friendly memory     │
         │  • -O3 -march=native         │
         └──────────────────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  Type Conversion │
         │  C++ → JS        │
         │  Float32Array    │
         └──────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  ArrayBuffer     │
         │  Transfer        │
         │  (zero-copy)     │
         └──────────────────┘
                    │
                    ▼
Output: { bounds, noiseFloor, coords }
```

## Build Process

```
┌─────────────────────────────────────────────────────────────┐
│  1. npm install                                             │
│     │                                                        │
│     ▼                                                        │
│  2. postinstall hook                                        │
│     │                                                        │
│     ▼                                                        │
│  3. node-gyp configure                                      │
│     • Reads binding.gyp                                     │
│     • Detects C++ compiler                                  │
│     • Generates build files                                 │
│     │                                                        │
│     ▼                                                        │
│  4. node-gyp build                                          │
│     • Compiles C++ → object files                           │
│     • Links with Node.js N-API                              │
│     • Applies -O3 -march=native -ffast-math                 │
│     │                                                        │
│     ▼                                                        │
│  5. Output: build/Release/nr5g_native.node                  │
│     • Platform-specific binary                              │
│     • ~100-500KB size                                       │
│     │                                                        │
│     ▼                                                        │
│  6. Runtime loading                                         │
│     • Attempt: require('nr5g_native.node')                  │
│     • Success: Use C++ (fast path)                          │
│     • Failure: Use JavaScript (fallback)                    │
└─────────────────────────────────────────────────────────────┘
```

## Memory Management

```
JavaScript Heap              C++ Native Heap
┌──────────────┐            ┌──────────────┐
│  JS Object   │   copy     │ std::vector  │
│  {f, a}[]    │ ────────▶  │ <Point>      │
└──────────────┘            └──────────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │  Processing  │
                            │  (in-place)  │
                            └──────────────┘
                                    │
                                    ▼
┌──────────────┐            ┌──────────────┐
│ Float32Array │ ◀───────── │  std::vector │
│ (transferred)│  transfer  │  <float>     │
└──────────────┘            └──────────────┘

Zero-copy transfer via ArrayBuffer.transfer()
Reduces memory pressure and improves performance
```

## Thread Safety Model

The C++ native addon is designed for single-threaded Node.js execution. All operations are synchronous and thread-safe within the Node.js event loop context.

## Performance Characteristics

```
Operation Complexity:

computeBounds:       O(n)     [single pass]
computeNoiseFloor:   O(n log n) [sorting]
buildCoords:         O(n)     [vectorized]
findPeaks:           O(n log n) [sorting]
nearestPoint:        O(n)     [linear search]
processSpectrum:     O(n log n) [combined]

Memory Usage:

Input:   n points × 16 bytes (2 × double)
Temp:    n amplitudes × 8 bytes (sorting)
Output:  n coords × 8 bytes (2 × float)

Total:   ~32n bytes peak usage
```

## Compiler Optimizations

```
GCC/Clang Flags:
├─ -O3                  # Maximum optimization
├─ -march=native        # CPU-specific instructions (SIMD)
├─ -ffast-math         # Aggressive float optimizations
├─ -std=c++17          # Modern C++ features
└─ -fno-exceptions     # Smaller binary size

Result:
• Auto-vectorization (SSE/AVX on x86, NEON on ARM)
• Loop unrolling
• Function inlining
• Constant folding
• Dead code elimination
```

## Error Handling Strategy

```
┌─────────────────────────────────────────┐
│  JavaScript Call                        │
│  native.processSpectrum(data)           │
└─────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│  Wrapper (native/index.js)              │
│  try {                                  │
│    if (useNative) return native.fn()    │
│  } catch {                              │
│    // Fallback                          │
│  }                                      │
└─────────────────────────────────────────┘
            │
            ├─ Success ────▶ Return result
            │
            └─ Failure ────▶ JavaScript fallback
                            (Identical API)
```

## Deployment Architecture

```
Development:
├─ Local build
├─ Hot reload (manual rebuild for C++)
└─ Debug symbols available

Production:
├─ CI/CD builds native addon
├─ Platform-specific binaries
│  ├─ linux-x64.node
│  ├─ darwin-arm64.node
│  └─ win32-x64.node
└─ Fallback always available

Docker:
├─ Multi-stage build
├─ Build tools in build stage
├─ Only runtime in final image
└─ ~50MB overhead for tools
```

## API Surface

```
Native Module Exports:
├─ Spectrum Processing
│  ├─ computeBounds(points): Bounds
│  ├─ computeNoiseFloor(points): number
│  ├─ buildCoords(points, w, h, bounds): Float32Array
│  ├─ generateSpectrumTrace(cfg): Point[]
│  ├─ findPeaks(points, n): Point[]
│  ├─ nearestPoint(points, freq): Point
│  └─ processSpectrum(opts): Result
│
└─ Utility
   └─ isNativeAvailable(): boolean

All functions have identical JS fallbacks
```

## Integration Points

```
Current Codebase:
├─ src/app/workers/spectrum.worker.ts
│  └─ Can use native via worker context
│
├─ src/app/utils/spectrum.ts
│  └─ JS fallback implementations
│
├─ src/app/hooks/useSpectrumWorker.ts
│  └─ Unchanged - works with both
│
└─ src/app/utils/spectrum-native.ts
   └─ Native C++ loader with JS fallback

New Files:
├─ native/
│  ├─ addon.cpp (N-API bindings)
│  ├─ spectrum.cpp (algorithms)
│  └─ index.js (wrapper)
```

---

## Component Architecture

### Frontend (React + Next.js)

```
src/app/
├── page.tsx                    # Root entry point
├── layout.tsx                  # App layout wrapper
├── globals.css                 # Tailwind styles
│
├── components/                 # UI Components
│   ├── DashboardPage.tsx       # Main dashboard container
│   ├── SideNavigation.tsx      # Left sidebar navigation
│   ├── AnalyzerHeader.tsx      # Top header bar
│   │
│   ├── overview/               # Overview tab
│   │   ├── ControlPanel.tsx
│   │   ├── DualPathStatus.tsx
│   │   ├── MeasurementGrid.tsx
│   │   └── SpectrumPreview.tsx
│   │
│   ├── spectrum/               # Spectrum tab
│   │   ├── SpectrumView.tsx    # Main spectrum view
│   │   └── CanvasSpectrum.tsx  # Canvas renderer
│   │
│   ├── measurements/           # Measurements tab
│   │   └── MeasurementsView.tsx
│   │
│   ├── setup/                  # Setup tab
│   │   └── SetupView.tsx
│   │
│   └── applications/           # Applications tab
│       └── ApplicationsView.tsx
│
├── hooks/                      # React Hooks
│   ├── useAnalyzer.ts          # Main controller (switches between mock/WS)
│   ├── useMockAnalyzer.ts      # Mock data generator
│   ├── useWebSocketAnalyzer.ts # WebSocket bridge client
│   └── useSpectrumWorker.ts    # Web Worker interface
│
├── workers/                    # Web Workers
│   ├── spectrum.worker.ts      # Main worker (uses C++/JS)
│   └── spectrum.worker.types.ts # Shared types
│
├── utils/                      # Utilities
│   ├── spectrum.ts             # Spectrum utilities
│   ├── spectrum-native.ts      # Native C++ loader
│   ├── format.ts               # Number/unit formatting
│   ├── config.ts               # Configuration helpers
│   ├── collections.ts          # Array utilities
│   ├── logs.ts                 # Activity logging
│   └── id.ts                   # ID generation
│
├── types/                      # TypeScript Types
│   └── analyzer.ts             # Core analyzer types
│
├── mock/                       # Mock Data
│   ├── state.ts                # Mock analyzer state
│   ├── measurements.ts         # Mock measurements
│   └── presets.ts              # Instrument presets
│
└── bridge/                     # WebSocket Bridge
    └── schema.ts               # Zod message schemas
```

### Backend (C++ Native Addon)

```
native/
├── addon.cpp                   # N-API bindings (JS ↔ C++)
├── spectrum.cpp                # Core algorithms
├── spectrum.h                  # Header definitions
├── index.js                    # JavaScript wrapper
└── index.d.ts                  # TypeScript definitions
```

---

## Data Flow Patterns

### Pattern 1: User Interaction → State Update

```
User clicks "Start Capture"
    ↓
React onClick handler
    ↓
useAnalyzer hook
    ↓
useMockAnalyzer or useWebSocketAnalyzer
    ↓
State updates (via React setState)
    ↓
Components re-render
```

### Pattern 2: Spectrum Data Processing

```
Raw spectrum data received
    ↓
Posted to Web Worker
    ↓
Worker invokes spectrum-native.ts
    ↓
    ├─ Native C++ available → Fast path (5-10x)
    └─ Native unavailable → JS fallback
    ↓
Results posted back to main thread
    ↓
State updated
    ↓
Canvas/SVG renders updated
```

### Pattern 3: WebSocket Bridge Communication

```
Bridge sends message (JSON)
    ↓
useWebSocketAnalyzer receives
    ↓
Zod schema validation
    ↓
    ├─ "spectrum" → Update trace data
    ├─ "measurements" → Update measurements
    ├─ "config" → Merge config changes
    ├─ "state" → Merge state changes
    └─ "heartbeat" → Update connection status
    ↓
React state updates
    ↓
UI reflects changes
```

---

## Key Takeaways

1. **Zero Breaking Changes**: Existing code continues to work
2. **Graceful Degradation**: Falls back to JS if native unavailable
3. **Type Safe**: Full TypeScript definitions throughout
4. **Cross-Platform**: Builds on macOS, Linux, Windows
5. **Performance**: 5-10x faster for large datasets
6. **Memory Efficient**: Zero-copy ArrayBuffer transfers where possible
7. **Testable**: Comprehensive test suite with Vitest
8. **Production Ready**: Error handling, fallbacks, and monitoring

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 | UI rendering |
| **Framework** | Next.js 15 | Server/client architecture |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Type Safety** | TypeScript 5 | Static typing |
| **Native Code** | C++ (N-API) | High-performance computing |
| **Validation** | Zod | Runtime schema validation |
| **Testing** | Vitest 2 | Unit/component tests |
| **Build** | Turbopack | Fast development builds |
| **Workers** | Web Workers | Offloaded processing |
| **Canvas** | Canvas 2D API | High-performance rendering |

---

## Performance Optimizations

1. **C++ Native Addon**: 5-10x faster spectrum math
2. **Web Worker**: Prevents UI blocking during computation
3. **Canvas Rendering**: Fast drawing for large traces (>3k points)
4. **ArrayBuffer Transfer**: Zero-copy data transfer
5. **SIMD Instructions**: Auto-vectorization in C++
6. **Compiler Flags**: `-O3 -march=native -ffast-math`
7. **Memoization**: React hooks prevent unnecessary re-renders
8. **Code Splitting**: Next.js automatic route-based splitting

---

## Deployment Considerations

### Development
- Native addon builds during `npm install`
- Hot reload for React (C++ requires manual rebuild)
- Full TypeScript checking
- Source maps enabled

### Production
- Optimized Next.js build
- Native addon compiled for target platform
- Minified JavaScript bundles
- Static asset optimization

### Docker
- Multi-stage build recommended
- Include build tools in build stage only
- Platform-specific binary handling
- Graceful fallback if build fails

---

## Future Architecture Considerations

1. **WebGL Renderer**: For very large traces (>10k points)
2. **OffscreenCanvas**: Better Web Worker integration
3. **WebAssembly**: Alternative to N-API native addon
4. **Service Worker**: Offline support and caching
5. **IndexedDB**: Client-side trace history storage
6. **WebRTC**: Direct instrument communication
7. **Server Components**: Leverage Next.js 15 RSC features
8. **Streaming**: Real-time data streaming optimizations
