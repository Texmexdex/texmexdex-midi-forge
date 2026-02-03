// Audio Engine using Tone.js and Soundfont Player
export class AudioEngine {
    constructor() {
        this.instruments = new Map();
        this.bpm = 120;
        this.isInitialized = false;
        this.currentTime = 0;
        this.playbackInterval = null;
        this.scheduledNotes = [];
    }
    
    async init() {
        try {
            await Tone.start();
            Tone.Transport.bpm.value = this.bpm;
            this.isInitialized = true;
            console.log('Audio engine initialized');
        } catch (error) {
            console.error('Failed to initialize audio engine:', error);
        }
    }
    
    async loadInstrument(trackId, instrumentName) {
        // Remove old instrument if exists
        if (this.instruments.has(trackId)) {
            const oldInstrument = this.instruments.get(trackId);
            if (oldInstrument.stop) {
                oldInstrument.stop();
            }
            this.instruments.delete(trackId);
        }
        
        try {
            // Use soundfont-player with CDN
            const ac = Tone.context.rawContext;
            const instrument = await Soundfont.instrument(ac, instrumentName, {
                soundfont: 'MusyngKite',
                format: 'mp3',
                nameToUrl: (name, soundfont, format) => {
                    return `https://gleitz.github.io/midi-js-soundfonts/${soundfont}/${name}-mp3.js`;
                }
            });
            
            this.instruments.set(trackId, instrument);
            console.log(`Loaded instrument: ${instrumentName} for track ${trackId}`);
            return true;
        } catch (error) {
            console.error(`Failed to load instrument ${instrumentName}:`, error);
            // Fallback to Tone.js synth with better configuration
            const synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: {
                    attack: 0.005,
                    decay: 0.1,
                    sustain: 0.3,
                    release: 1
                }
            }).toDestination();
            
            this.instruments.set(trackId, { 
                play: (note, time, options) => {
                    const freq = Tone.Frequency(note, 'midi').toFrequency();
                    const duration = options.duration || 1;
                    const velocity = (options.gain || 1);
                    synth.triggerAttackRelease(freq, duration, time, velocity);
                },
                stop: () => {
                    synth.releaseAll();
                },
                isFallback: true
            });
            return false;
        }
    }
    
    setBPM(bpm) {
        this.bpm = bpm;
        Tone.Transport.bpm.value = bpm;
    }
    
    startPlayback(tracks, startPosition = 0) {
        this.stopPlayback();
        
        const beatsPerSecond = this.bpm / 60;
        this.currentTime = startPosition;
        
        // Schedule all notes
        tracks.forEach(track => {
            if (track.mute) return;
            
            const instrument = this.instruments.get(track.id);
            if (!instrument) return;
            
            track.notes.forEach(note => {
                if (note.start >= startPosition) {
                    const timeOffset = (note.start - startPosition) / beatsPerSecond;
                    const duration = note.duration / beatsPerSecond;
                    
                    const scheduledNote = setTimeout(() => {
                        this.playNote(instrument, note.pitch, duration, note.velocity, track.volume, track.pan);
                    }, timeOffset * 1000);
                    
                    this.scheduledNotes.push(scheduledNote);
                }
            });
        });
        
        // Update current time
        this.playbackInterval = setInterval(() => {
            this.currentTime += 0.05; // 50ms updates
        }, 50);
    }
    
    playNote(instrument, pitch, duration, velocity, volume = 1, pan = 0) {
        try {
            const adjustedVelocity = (velocity / 127) * volume;
            const now = Tone.now();
            
            if (instrument.play && !instrument.isFallback) {
                // Soundfont instrument - use its native play method
                instrument.play(pitch, now, { 
                    duration: duration,
                    gain: adjustedVelocity 
                });
            } else if (instrument.play && instrument.isFallback) {
                // Fallback synth with custom play method
                instrument.play(pitch, now, { 
                    duration: duration,
                    gain: adjustedVelocity 
                });
            } else if (instrument.triggerAttackRelease) {
                // Direct Tone.js synth
                const freq = Tone.Frequency(pitch, 'midi').toFrequency();
                instrument.triggerAttackRelease(freq, duration, now, adjustedVelocity);
            }
        } catch (error) {
            console.error('Error playing note:', error);
        }
    }
    
    pausePlayback() {
        this.stopScheduledNotes();
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }
    
    stopPlayback() {
        this.stopScheduledNotes();
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
        this.currentTime = 0;
    }
    
    stopScheduledNotes() {
        this.scheduledNotes.forEach(timeout => clearTimeout(timeout));
        this.scheduledNotes = [];
        
        // Stop all playing notes
        this.instruments.forEach(instrument => {
            if (instrument.stop) {
                instrument.stop();
            }
        });
    }
    
    getCurrentTime() {
        return this.currentTime;
    }
    
    async renderToAudio(tracks, bpm) {
        // This is a simplified version - full implementation would use Tone.Offline
        return new Promise(async (resolve, reject) => {
            try {
                // Calculate total duration
                let maxDuration = 0;
                tracks.forEach(track => {
                    track.notes.forEach(note => {
                        const end = note.start + note.duration;
                        if (end > maxDuration) maxDuration = end;
                    });
                });
                
                const durationSeconds = (maxDuration / (bpm / 60)) + 1;
                
                // Use Tone.Offline to render
                const buffer = await Tone.Offline(({ transport }) => {
                    transport.bpm.value = bpm;
                    
                    tracks.forEach(track => {
                        if (track.mute) return;
                        
                        const synth = new Tone.PolySynth(Tone.Synth).toDestination();
                        
                        track.notes.forEach(note => {
                            const time = (note.start / (bpm / 60));
                            const duration = (note.duration / (bpm / 60));
                            const freq = Tone.Frequency(note.pitch, 'midi').toFrequency();
                            const velocity = (note.velocity / 127) * track.volume;
                            
                            synth.triggerAttackRelease(freq, duration, time, velocity);
                        });
                    });
                }, durationSeconds);
                
                // Convert to WAV blob
                const wav = this.bufferToWave(buffer);
                resolve(new Blob([wav], { type: 'audio/wav' }));
            } catch (error) {
                reject(error);
            }
        });
    }
    
    bufferToWave(buffer) {
        const numberOfChannels = buffer.numberOfChannels;
        const length = buffer.length * numberOfChannels * 2;
        const arrayBuffer = new ArrayBuffer(44 + length);
        const view = new DataView(arrayBuffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, buffer.sampleRate, true);
        view.setUint32(28, buffer.sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length, true);
        
        // Write audio data
        const channels = [];
        for (let i = 0; i < numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }
        
        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, channels[channel][i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }
        
        return arrayBuffer;
    }
}
