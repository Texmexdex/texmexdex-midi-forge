// TeXmExDeX Type Midi Forge - Main Application
import { PianoRoll } from './pianoroll.js';
import { AudioEngine } from './audio-engine.js';
import { MidiExporter } from './midi-export.js';
import { APIClient } from './api-client.js';

class MidiForge {
    constructor() {
        this.tracks = [];
        this.currentTrackIndex = 0;
        this.bpm = 120;
        this.isPlaying = false;
        this.playbackPosition = 0;
        
        // Initialize components
        this.pianoRoll = new PianoRoll('piano-roll');
        this.audioEngine = new AudioEngine();
        this.midiExporter = new MidiExporter();
        this.apiClient = new APIClient();
        
        this.init();
    }
    
    async init() {
        // Create default track
        await this.addTrack('Piano', 'acoustic_grand_piano');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize audio engine
        await this.audioEngine.init();
        
        this.updateStatus('Ready - Click to add notes (Shift+Click)');
    }
    
    setupEventListeners() {
        // Transport controls
        document.getElementById('btn-play').addEventListener('click', () => this.togglePlayback());
        document.getElementById('btn-stop').addEventListener('click', () => this.stopPlayback());
        
        // BPM
        document.getElementById('input-bpm').addEventListener('change', (e) => {
            this.bpm = parseInt(e.target.value);
            this.audioEngine.setBPM(this.bpm);
        });
        
        // Track management
        document.getElementById('btn-add-track').addEventListener('click', () => this.addTrack());
        document.getElementById('btn-remove-track').addEventListener('click', () => this.removeTrack());
        
        // Track settings
        document.getElementById('select-instrument').addEventListener('change', (e) => {
            this.updateTrackInstrument(e.target.value);
        });
        
        document.getElementById('slider-volume').addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('volume-value').textContent = value;
            this.updateTrackVolume(value / 100);
        });
        
        document.getElementById('slider-pan').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const panText = value === 0 ? 'Center' : value < 0 ? `L${Math.abs(value)}` : `R${value}`;
            document.getElementById('pan-value').textContent = panText;
            this.updateTrackPan(value / 50);
        });
        
        document.getElementById('check-mute').addEventListener('change', (e) => {
            this.getCurrentTrack().mute = e.target.checked;
        });
        
        document.getElementById('check-solo').addEventListener('change', (e) => {
            this.getCurrentTrack().solo = e.target.checked;
        });
        
        // Toolbar
        document.getElementById('btn-select-all').addEventListener('click', () => this.pianoRoll.selectAll());
        document.getElementById('btn-duplicate').addEventListener('click', () => this.pianoRoll.duplicateSelection());
        document.getElementById('btn-delete').addEventListener('click', () => this.pianoRoll.deleteSelection());
        document.getElementById('btn-transpose-up').addEventListener('click', () => this.pianoRoll.transposeSelection(1));
        document.getElementById('btn-transpose-down').addEventListener('click', () => this.pianoRoll.transposeSelection(-1));
        document.getElementById('btn-quantize').addEventListener('click', () => this.pianoRoll.quantizeSelection());
        document.getElementById('btn-humanize').addEventListener('click', () => this.pianoRoll.humanizeSelection());
        
        // Import/Export
        document.getElementById('btn-import-midi').addEventListener('click', () => {
            document.getElementById('file-import-midi').click();
        });
        document.getElementById('file-import-midi').addEventListener('change', (e) => this.importMidi(e));
        document.getElementById('btn-export-midi').addEventListener('click', () => this.exportMidi());
        document.getElementById('btn-export-audio').addEventListener('click', () => this.exportAudio());
        
        // Chatbot
        document.getElementById('btn-send-chat').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        document.getElementById('btn-clear-chat').addEventListener('click', () => this.clearChat());
        
        // Piano roll callbacks
        this.pianoRoll.onNoteAdd = (note) => this.onNoteAdd(note);
        this.pianoRoll.onNoteChange = (note) => this.onNoteChange(note);
        this.pianoRoll.onNoteDelete = (note) => this.onNoteDelete(note);
    }
    
    async addTrack(name = null, instrument = 'acoustic_grand_piano') {
        const trackNum = this.tracks.length + 1;
        const track = {
            id: Date.now(),
            name: name || `Track ${trackNum}`,
            instrument: instrument,
            notes: [],
            volume: 0.8,
            pan: 0,
            mute: false,
            solo: false
        };
        
        this.tracks.push(track);
        await this.audioEngine.loadInstrument(track.id, instrument);
        this.renderTrackList();
        this.selectTrack(this.tracks.length - 1);
    }
    
    removeTrack() {
        if (this.tracks.length <= 1) {
            alert('Cannot remove the last track');
            return;
        }
        
        this.tracks.splice(this.currentTrackIndex, 1);
        this.currentTrackIndex = Math.max(0, this.currentTrackIndex - 1);
        this.renderTrackList();
        this.selectTrack(this.currentTrackIndex);
    }
    
    selectTrack(index) {
        this.currentTrackIndex = index;
        const track = this.getCurrentTrack();
        
        // Update piano roll
        this.pianoRoll.setNotes(track.notes);
        
        // Update UI
        document.getElementById('select-instrument').value = track.instrument;
        document.getElementById('slider-volume').value = track.volume * 100;
        document.getElementById('volume-value').textContent = Math.round(track.volume * 100);
        document.getElementById('slider-pan').value = track.pan * 50;
        const panText = track.pan === 0 ? 'Center' : track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 50))}` : `R${Math.round(track.pan * 50)}`;
        document.getElementById('pan-value').textContent = panText;
        document.getElementById('check-mute').checked = track.mute;
        document.getElementById('check-solo').checked = track.solo;
        
        this.renderTrackList();
    }
    
    renderTrackList() {
        const container = document.getElementById('track-list');
        container.innerHTML = '';
        
        this.tracks.forEach((track, index) => {
            const div = document.createElement('div');
            div.className = 'track-item' + (index === this.currentTrackIndex ? ' active' : '');
            div.textContent = track.name;
            div.addEventListener('click', () => this.selectTrack(index));
            container.appendChild(div);
        });
    }
    
    getCurrentTrack() {
        return this.tracks[this.currentTrackIndex];
    }
    
    async updateTrackInstrument(instrument) {
        const track = this.getCurrentTrack();
        track.instrument = instrument;
        await this.audioEngine.loadInstrument(track.id, instrument);
    }
    
    updateTrackVolume(volume) {
        this.getCurrentTrack().volume = volume;
    }
    
    updateTrackPan(pan) {
        this.getCurrentTrack().pan = pan;
    }
    
    onNoteAdd(note) {
        this.getCurrentTrack().notes.push(note);
    }
    
    onNoteChange(note) {
        // Note already updated by reference
    }
    
    onNoteDelete(note) {
        const track = this.getCurrentTrack();
        const index = track.notes.indexOf(note);
        if (index > -1) {
            track.notes.splice(index, 1);
        }
    }
    
    togglePlayback() {
        if (this.isPlaying) {
            this.pausePlayback();
        } else {
            this.startPlayback();
        }
    }
    
    startPlayback() {
        this.isPlaying = true;
        document.getElementById('btn-play').textContent = '⏸ Pause';
        this.audioEngine.startPlayback(this.tracks, this.playbackPosition);
        this.updateStatus('Playing...');
        
        // Update playback position
        this.playbackInterval = setInterval(() => {
            this.playbackPosition = this.audioEngine.getCurrentTime();
            this.pianoRoll.setPlayheadPosition(this.playbackPosition);
            this.updatePlaybackPosition();
        }, 50);
    }
    
    pausePlayback() {
        this.isPlaying = false;
        document.getElementById('btn-play').textContent = '▶ Play';
        this.audioEngine.pausePlayback();
        clearInterval(this.playbackInterval);
        this.updateStatus('Paused');
    }
    
    stopPlayback() {
        this.isPlaying = false;
        this.playbackPosition = 0;
        document.getElementById('btn-play').textContent = '▶ Play';
        this.audioEngine.stopPlayback();
        this.pianoRoll.setPlayheadPosition(0);
        clearInterval(this.playbackInterval);
        this.updatePlaybackPosition();
        this.updateStatus('Stopped');
    }
    
    updatePlaybackPosition() {
        const maxTime = this.getMaxTrackLength();
        document.getElementById('playback-position').textContent = 
            `${this.playbackPosition.toFixed(1)} / ${maxTime.toFixed(1)}`;
    }
    
    getMaxTrackLength() {
        let max = 0;
        this.tracks.forEach(track => {
            track.notes.forEach(note => {
                const end = note.start + note.duration;
                if (end > max) max = end;
            });
        });
        return max || 4;
    }
    
    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;
        
        input.value = '';
        this.addChatMessage('user', message);
        this.addChatMessage('system', 'Generating...');
        
        try {
            const response = await this.apiClient.generateMusic(message, this.getCurrentTrack());
            this.removeChatMessage('system');
            
            if (response.notes && response.notes.length > 0) {
                // Add generated notes to current track
                response.notes.forEach(note => {
                    this.getCurrentTrack().notes.push(note);
                });
                this.pianoRoll.setNotes(this.getCurrentTrack().notes);
                this.addChatMessage('assistant', `Generated ${response.notes.length} notes. ${response.message || ''}`);
            } else {
                this.addChatMessage('assistant', response.message || 'No notes generated.');
            }
        } catch (error) {
            this.removeChatMessage('system');
            this.addChatMessage('assistant', `Error: ${error.message}`);
        }
    }
    
    addChatMessage(type, text) {
        const container = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = `chat-message ${type}`;
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }
    
    removeChatMessage(type) {
        const messages = document.querySelectorAll(`.chat-message.${type}`);
        messages.forEach(msg => msg.remove());
    }
    
    clearChat() {
        document.getElementById('chat-messages').innerHTML = '';
    }
    
    async importMidi(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const tracks = await this.midiExporter.importMidi(arrayBuffer);
            
            // Clear existing tracks and add imported ones
            this.tracks = tracks;
            this.currentTrackIndex = 0;
            
            // Load instruments for all tracks
            for (const track of this.tracks) {
                await this.audioEngine.loadInstrument(track.id, track.instrument);
            }
            
            this.renderTrackList();
            this.selectTrack(0);
            this.updateStatus(`Imported ${tracks.length} track(s)`);
        } catch (error) {
            alert(`Error importing MIDI: ${error.message}`);
        }
    }
    
    exportMidi() {
        try {
            const midiData = this.midiExporter.exportMidi(this.tracks, this.bpm);
            const blob = new Blob([midiData], { type: 'audio/midi' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'texmexdex-midi-forge.mid';
            a.click();
            URL.revokeObjectURL(url);
            this.updateStatus('MIDI exported successfully');
        } catch (error) {
            alert(`Error exporting MIDI: ${error.message}`);
        }
    }
    
    async exportAudio() {
        this.updateStatus('Rendering audio...');
        try {
            const audioBlob = await this.audioEngine.renderToAudio(this.tracks, this.bpm);
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'texmexdex-midi-forge.wav';
            a.click();
            URL.revokeObjectURL(url);
            this.updateStatus('Audio exported successfully');
        } catch (error) {
            alert(`Error exporting audio: ${error.message}`);
            this.updateStatus('Ready');
        }
    }
    
    updateStatus(text) {
        document.getElementById('status-text').textContent = text;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MidiForge();
});
