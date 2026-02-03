# TeXmExDeX Type Midi Forge - Frontend

Web-based MIDI sequencer with piano roll editor and AI-powered music generation.

## Features

- 🎹 Interactive piano roll editor
- 🎵 Multi-track MIDI sequencing
- 🔊 Real-time playback with Tone.js + Soundfont
- 🤖 AI chatbot for music generation
- 📥 MIDI import/export
- 🎧 Audio export (WAV)
- ✨ Editing tools: quantize, transpose, humanize, duplicate

## Tech Stack

- **Vanilla JavaScript** (ES6 modules)
- **Tone.js** - Web Audio synthesis
- **Soundfont-player** - Realistic instrument sounds
- **Canvas API** - Piano roll rendering
- **midi-writer-js** - MIDI file generation

## Deployment to GitHub Pages

### Option 1: Manual Deployment

1. Create a new repository: `texmexdex-midi-forge`
2. Copy all files from `web-frontend/` to the repository root
3. Go to Settings → Pages
4. Set Source to "main" branch, root folder
5. Save and wait for deployment

### Option 2: Using GitHub CLI

```bash
# Navigate to web-frontend directory
cd web-frontend

# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create repo and push
gh repo create texmexdex-midi-forge --public --source=. --remote=origin --push
```

### Option 3: Deploy Script

```bash
# From project root
cd web-frontend
git init
git add .
git commit -m "TeXmExDeX Type Midi Forge v1.0"
git branch -M main
git remote add origin https://github.com/texmexdex/texmexdex-midi-forge.git
git push -u origin main
```

Then enable GitHub Pages in repository settings.

## Configuration

After deploying the backend to Hugging Face, update the API URL in `js/api-client.js`:

```javascript
this.baseURL = 'https://texmexdex-midi-forge-backend.hf.space';
```

## Local Development

1. Start a local server:
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server -p 8000
```

2. Open `http://localhost:8000` in your browser

3. For backend testing, update API URL to `http://localhost:7860`

## Usage

### Adding Notes
- **Shift + Click** on piano roll to add notes
- **Click and drag** to move notes
- **Right click** to delete notes
- **Ctrl + Click** on note edge to resize

### Keyboard Shortcuts
- **Space** - Play/Pause
- **Ctrl+A** - Select all notes
- **Delete** - Delete selected notes
- **Ctrl+D** - Duplicate selection

### AI Music Generation
Type natural language commands in the chat:
- "Create a C major scale"
- "Make a sad melody in A minor"
- "Generate a bass line"
- "Create an arpeggio pattern"

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 13+)

## License

MIT License - See LICENSE file for details

## Links

- **Live Demo**: https://texmexdex.github.io/texmexdex-midi-forge
- **Backend API**: https://huggingface.co/spaces/texmexdex/midi-forge-backend
- **Desktop Version**: [PyMidi Forge](https://github.com/texmexdex/pymidi-forge)
