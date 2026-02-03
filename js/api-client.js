// API Client for Hugging Face Space Backend
export class APIClient {
    constructor() {
        // Backend API URL (Hugging Face Space)
        this.baseURL = 'https://texmexdex-midi-forge-backend.hf.space';
        // For local testing: 'http://localhost:7860'
    }
    
    async generateMusic(prompt, currentTrack) {
        try {
            const response = await fetch(`${this.baseURL}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    context: {
                        instrument: currentTrack.instrument,
                        existingNotes: currentTrack.notes.slice(-10) // Last 10 notes for context
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            // Fallback to local generation
            return this.fallbackGeneration(prompt);
        }
    }
    
    fallbackGeneration(prompt) {
        // Simple local generation for when API is unavailable
        const notes = [];
        const lowerPrompt = prompt.toLowerCase();
        
        if (lowerPrompt.includes('scale')) {
            // Generate a scale
            const startPitch = 60; // Middle C
            for (let i = 0; i < 8; i++) {
                notes.push({
                    start: i * 0.5,
                    duration: 0.5,
                    pitch: startPitch + i * 2,
                    velocity: 100
                });
            }
            return { notes, message: 'Generated C major scale (offline mode)' };
        } else if (lowerPrompt.includes('chord')) {
            // Generate a chord
            const root = 60;
            [0, 4, 7].forEach((interval, i) => {
                notes.push({
                    start: 0,
                    duration: 2,
                    pitch: root + interval,
                    velocity: 100
                });
            });
            return { notes, message: 'Generated C major chord (offline mode)' };
        } else if (lowerPrompt.includes('arpeggio')) {
            // Generate an arpeggio
            const root = 60;
            [0, 4, 7, 12].forEach((interval, i) => {
                notes.push({
                    start: i * 0.25,
                    duration: 0.25,
                    pitch: root + interval,
                    velocity: 100
                });
            });
            return { notes, message: 'Generated C major arpeggio (offline mode)' };
        }
        
        return { 
            notes: [], 
            message: 'Could not connect to AI backend. Try: "scale", "chord", or "arpeggio"' 
        };
    }
    
    async exportToBackend(tracks, bpm, format = 'midi') {
        try {
            const response = await fetch(`${this.baseURL}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tracks: tracks,
                    bpm: bpm,
                    format: format
                })
            });
            
            if (!response.ok) {
                throw new Error(`Export failed: ${response.status}`);
            }
            
            return await response.blob();
        } catch (error) {
            console.error('Export to backend failed:', error);
            throw error;
        }
    }
}
