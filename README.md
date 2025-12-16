# Timbre Space EQ
[3 tools called]
<img width="1299" height="837" alt="3d_eq" src="https://github.com/user-attachments/assets/35c0368b-094a-4df3-873d-03a7131453fd" />


```markdown
# Timbre Space EQ

A real-time audio analysis and visualization system that maps perceptual audio qualities to three-dimensional spatial representations. Timbre Space EQ combines psychoacoustic feature extraction, harmonic analysis, and interactive 3D visualization to create an intuitive interface for understanding and manipulating musical timbre.

## Overview

Timbre Space EQ transforms audio signals into dynamic 3D visualizations where frequency content, harmonic structure, and timbral characteristics are represented as interactive particles moving through perceptual space. The system provides real-time analysis of spectral features, chord progressions, rhythm metrics, and lyric synchronization, enabling both analytical exploration and creative manipulation of audio content.

## Key Features

### Real-Time Audio Analysis
- **Spectral Feature Extraction**: Spectral centroid, rolloff, roughness, and zero-crossing rate computed at 60fps
- **Harmonic Analysis**: Automatic chord detection, key identification, and Roman numeral degree calculation
- **Rhythm Metrics**: Tempo estimation, beat strength, and syncopation analysis
- **Predictability Modeling**: First-order Markov chain analysis of chord progressions with entropy metrics

### Interactive 3D Visualization
- **Perceptual Timbre Space**: Three-dimensional mapping of brightness (X-axis), energy/depth (Y-axis), and warmth (Z-axis)
- **Dynamic Particle System**: Real-time generation of particles from spectral peaks with frequency-based positioning
- **Trajectory Visualization**: Heat-mapped trails showing temporal evolution of timbral characteristics
- **Instrument Isolation**: Frequency region filtering for focused analysis of specific spectral bands
- **Spatial EQ Control**: Direct manipulation of equalizer parameters through 3D particle interaction

### Advanced Capabilities
- **Automatic Lyric Transcription**: OpenAI Whisper integration with word-level timestamp synchronization
- **Karaoke-Style Display**: Real-time lyric highlighting synchronized with audio playback
- **Circle of Fifths Visualization**: Interactive harmonic context display with chord degree analysis
- **Data Export**: JSON and CSV export of timbral features, harmonic progressions, and analysis metrics
- **Multiple Visualization Modes**: Spectral waterfall, frequency graphs, clustering, and trajectory overlays

## Technical Architecture

### Frontend
- **Framework**: Next.js 14 with App Router and React Server Components
- **3D Rendering**: React Three Fiber with Three.js for WebGL-based visualization
- **State Management**: Zustand for efficient audio state and feature management
- **UI Components**: Radix UI primitives with Tailwind CSS styling
- **Audio Processing**: Web Audio API with AnalyserNode for real-time FFT analysis

### Backend
- **API Routes**: Next.js serverless functions for transcription services
- **Audio Processing**: Client-side Web Audio API with 5-band parametric EQ
- **Transcription**: OpenAI Whisper API integration with audio compression pipeline

### Signal Processing
- **FFT Analysis**: 2048-point FFT with 1024 frequency bins at 44.1kHz sample rate
- **Feature Extraction**: Spectral centroid, rolloff, roughness, and zero-crossing rate algorithms
- **Harmonic Detection**: Peak detection and interval analysis for chord classification
- **EQ Processing**: Cascaded BiquadFilterNode chain with peaking filters at 60Hz, 250Hz, 1kHz, 3kHz, and 8kHz

## Tech Stack

### Core Technologies
- **Next.js 16.0.3** - React framework with server-side rendering
- **React 19.2.0** - UI library with concurrent features
- **TypeScript 5** - Type-safe development
- **Zustand** - Lightweight state management
- **Three.js** - 3D graphics library
- **React Three Fiber** - Declarative Three.js wrapper
- **React Three Drei** - Useful helpers for R3F
- **React Three Postprocessing** - Post-processing effects

### Audio Processing
- **Web Audio API** - Native browser audio processing
- **AnalyserNode** - Real-time frequency and time-domain analysis
- **BiquadFilterNode** - Parametric equalizer implementation
- **OfflineAudioContext** - Audio compression for transcription

### UI & Styling
- **Radix UI** - Accessible component primitives
- **Tailwind CSS 4.1.9** - Utility-first styling
- **Lucide React** - Icon library
- **next-themes** - Dark mode support

### External Services
- **OpenAI Whisper API** - Speech-to-text transcription
- **Vercel** - Deployment and hosting platform

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## Installation

### Prerequisites
- Node.js 18+ and npm/pnpm/yarn
- Modern browser with Web Audio API support
- OpenAI API key (optional, for transcription features)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/timbre-space-eq.git
cd timbre-space-eq

# Install dependencies
pnpm install
# or
npm install
# or
yarn install

# Set up environment variables
cp .env.example .env.local
# Add your OPEN_AI_API_KEY to .env.local (optional)

# Run development server
pnpm dev
# or
npm run dev

# Build for production
pnpm build
# or
npm run build
```

## Usage

### Basic Workflow

1. **Load Audio**: Upload an audio file (MP3, WAV, OGG, WebM, FLAC, AAC, M4A) through the file upload interface
2. **Playback Control**: Use play/pause controls to start audio analysis
3. **Visualization**: Observe particles moving through 3D timbre space representing frequency content
4. **Interaction**: Drag particles to adjust EQ settings, or use keyboard navigation for precise control
5. **Analysis**: View real-time metrics including spectral features, chord progressions, and rhythm data
6. **Transcription**: Use the transcription feature to generate synchronized lyrics with word-level timing

### Advanced Features

- **Instrument Isolation**: Filter visualization by frequency ranges to focus on specific instruments
- **Trail Visualization**: Enable trajectory trails to see temporal patterns in timbral evolution
- **Clustering Mode**: View connections between particles with similar frequency characteristics
- **Spectral Overlay**: Toggle waterfall visualization showing frequency content over time
- **Data Export**: Export analysis data as JSON or CSV for further processing

## Project Structure

```
timbre-space-eq/
├── app/
│   ├── api/
│   │   └── transcribe/        # OpenAI Whisper API integration
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main application page
├── components/
│   ├── timbre-space-visualizer.tsx  # 3D scene setup
│   ├── particle-field.tsx           # Particle system and interaction
│   ├── audio-controls.tsx           # Playback and EQ controls
│   ├── chord-display.tsx           # Harmonic visualization
│   ├── lyrics-display.tsx           # Karaoke-style lyrics
│   ├── predictability-panel.tsx     # Markov chain analysis
│   ├── spectral-overlay.tsx         # Waterfall visualization
│   └── ui/                          # Reusable UI components
├── lib/
│   ├── audio-store.ts         # Zustand store for audio state
│   └── utils.ts               # Utility functions
└── hooks/
    └── use-toast.ts           # Toast notification hook
```

## Performance Characteristics

- **Frame Rate**: 60fps target for visualization updates
- **Latency**: Sub-100ms total processing latency
- **FFT Resolution**: 1024 frequency bins with 21.5Hz resolution
- **Memory Usage**: Efficient particle lifecycle management with automatic culling
- **Browser Support**: Modern browsers with WebGL2 and Web Audio API support

## Research Applications

This system is designed for:
- **Music Perception Research**: Studying cross-modal correspondences and spatial metaphors for timbre
- **Computational Musicology**: Quantitative analysis of timbral-harmonic relationships
- **Music Education**: Intuitive visualization of abstract musical concepts
- **Audio Production**: Real-time frequency analysis and EQ manipulation
- **Machine Learning**: Export of feature-rich datasets for training models

## Limitations

- **Polyphonic Analysis**: Chord detection works best with clear harmonic content; complex voicings may be misidentified
- **Real-Time Constraints**: Simplified algorithms prioritize low latency over maximum accuracy
- **Browser Dependencies**: Requires WebGL2 and Web Audio API support
- **File Size**: Transcription limited to 3MB compressed audio files

## Future Enhancements

- GPU-accelerated source separation for true per-instrument analysis
- Constant-Q Transform for improved harmonic resolution
- Machine learning-based timbre embeddings
- Enhanced key detection using Krumhansl-Schmuckler algorithm
- Cross-performance comparison and style analysis tools

## License

MIT Liscense

## Acknowledgments

Built with React Three Fiber, Three.js, and the Web Audio API. Transcription powered by OpenAI Whisper.


