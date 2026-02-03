// Piano Roll Editor
export class PianoRoll {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Constants
        this.NOTE_HEIGHT = 15;
        this.BEAT_WIDTH = 60;
        this.PIANO_WIDTH = 60;
        this.NUM_NOTES = 128;
        
        // State
        this.notes = [];
        this.selectedNotes = new Set();
        this.playheadPosition = 0;
        this.viewOffset = { x: 0, y: 0 };
        this.zoom = 1.0;
        
        // Interaction
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = null;
        this.currentNote = null;
        
        // Callbacks
        this.onNoteAdd = null;
        this.onNoteChange = null;
        this.onNoteDelete = null;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.draw();
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = 2000;
        this.canvas.height = this.NUM_NOTES * this.NOTE_HEIGHT;
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setNotes(notes) {
        this.notes = notes;
        this.selectedNotes.clear();
        this.draw();
    }
    
    setPlayheadPosition(beats) {
        this.playheadPosition = beats;
        this.draw();
    }
    
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const clickedNote = this.getNoteAt(x, y);
        
        if (e.button === 2) { // Right click - delete
            if (clickedNote) {
                this.deleteNote(clickedNote);
            }
            return;
        }
        
        if (e.shiftKey && !clickedNote) {
            // Add new note
            const beat = Math.floor(x / this.BEAT_WIDTH);
            const pitch = this.NUM_NOTES - 1 - Math.floor(y / this.NOTE_HEIGHT);
            
            const newNote = {
                start: beat,
                duration: 1,
                pitch: pitch,
                velocity: 100
            };
            
            this.notes.push(newNote);
            if (this.onNoteAdd) this.onNoteAdd(newNote);
            this.draw();
        } else if (clickedNote) {
            // Check if clicking on resize handle
            const noteX = clickedNote.start * this.BEAT_WIDTH;
            const noteWidth = clickedNote.duration * this.BEAT_WIDTH;
            
            if (x > noteX + noteWidth - 10) {
                this.isResizing = true;
                this.currentNote = clickedNote;
            } else {
                this.isDragging = true;
                this.currentNote = clickedNote;
                this.dragStart = { x, y };
                
                if (!e.ctrlKey && !this.selectedNotes.has(clickedNote)) {
                    this.selectedNotes.clear();
                }
                this.selectedNotes.add(clickedNote);
            }
            this.draw();
        } else if (!e.shiftKey) {
            // Clear selection
            this.selectedNotes.clear();
            this.draw();
        }
    }
    
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.isResizing && this.currentNote) {
            const newDuration = Math.max(0.25, (x / this.BEAT_WIDTH) - this.currentNote.start);
            this.currentNote.duration = Math.round(newDuration * 4) / 4; // Snap to 16th
            if (this.onNoteChange) this.onNoteChange(this.currentNote);
            this.draw();
        } else if (this.isDragging && this.currentNote && this.dragStart) {
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;
            
            const beatDelta = Math.round(dx / this.BEAT_WIDTH);
            const pitchDelta = -Math.round(dy / this.NOTE_HEIGHT);
            
            if (beatDelta !== 0 || pitchDelta !== 0) {
                this.selectedNotes.forEach(note => {
                    note.start = Math.max(0, note.start + beatDelta);
                    note.pitch = Math.max(0, Math.min(127, note.pitch + pitchDelta));
                    if (this.onNoteChange) this.onNoteChange(note);
                });
                
                this.dragStart = { x, y };
                this.draw();
            }
        }
    }
    
    onMouseUp(e) {
        this.isDragging = false;
        this.isResizing = false;
        this.currentNote = null;
        this.dragStart = null;
    }
    
    onWheel(e) {
        e.preventDefault();
        
        if (e.ctrlKey) {
            // Zoom
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom = Math.max(0.5, Math.min(2, this.zoom * zoomDelta));
            this.BEAT_WIDTH = 60 * this.zoom;
            this.draw();
        }
    }
    
    getNoteAt(x, y) {
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const note = this.notes[i];
            const noteX = note.start * this.BEAT_WIDTH;
            const noteY = (this.NUM_NOTES - 1 - note.pitch) * this.NOTE_HEIGHT;
            const noteWidth = note.duration * this.BEAT_WIDTH;
            
            if (x >= noteX && x <= noteX + noteWidth &&
                y >= noteY && y <= noteY + this.NOTE_HEIGHT) {
                return note;
            }
        }
        return null;
    }
    
    deleteNote(note) {
        const index = this.notes.indexOf(note);
        if (index > -1) {
            this.notes.splice(index, 1);
            this.selectedNotes.delete(note);
            if (this.onNoteDelete) this.onNoteDelete(note);
            this.draw();
        }
    }
    
    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw notes
        this.notes.forEach(note => {
            const x = note.start * this.BEAT_WIDTH;
            const y = (this.NUM_NOTES - 1 - note.pitch) * this.NOTE_HEIGHT;
            const w = note.duration * this.BEAT_WIDTH;
            const h = this.NOTE_HEIGHT - 2;
            
            const isSelected = this.selectedNotes.has(note);
            ctx.fillStyle = isSelected ? '#e94560' : '#00d4ff';
            ctx.fillRect(x, y, w, h);
            
            ctx.strokeStyle = isSelected ? '#ff5577' : '#00ffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, w, h);
        });
        
        // Draw playhead
        if (this.playheadPosition > 0) {
            const x = this.playheadPosition * this.BEAT_WIDTH;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    }
    
    drawGrid() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Vertical lines (beats)
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        for (let i = 0; i < width / this.BEAT_WIDTH; i++) {
            const x = i * this.BEAT_WIDTH;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            
            // Bar lines (every 4 beats)
            if (i % 4 === 0) {
                ctx.strokeStyle = '#2a2a2a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
                ctx.strokeStyle = '#1a1a1a';
                ctx.lineWidth = 1;
            }
        }
        
        // Horizontal lines (notes)
        for (let i = 0; i < this.NUM_NOTES; i++) {
            const y = i * this.NOTE_HEIGHT;
            const isBlackKey = [1, 3, 6, 8, 10].includes(i % 12);
            
            if (isBlackKey) {
                ctx.fillStyle = '#0f0f0f';
                ctx.fillRect(0, y, width, this.NOTE_HEIGHT);
            }
            
            ctx.strokeStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    // Tool functions
    selectAll() {
        this.selectedNotes.clear();
        this.notes.forEach(note => this.selectedNotes.add(note));
        this.draw();
    }
    
    deleteSelection() {
        this.selectedNotes.forEach(note => {
            const index = this.notes.indexOf(note);
            if (index > -1) {
                this.notes.splice(index, 1);
                if (this.onNoteDelete) this.onNoteDelete(note);
            }
        });
        this.selectedNotes.clear();
        this.draw();
    }
    
    duplicateSelection() {
        const newNotes = [];
        this.selectedNotes.forEach(note => {
            const newNote = {
                start: note.start + note.duration,
                duration: note.duration,
                pitch: note.pitch,
                velocity: note.velocity
            };
            newNotes.push(newNote);
            this.notes.push(newNote);
            if (this.onNoteAdd) this.onNoteAdd(newNote);
        });
        
        this.selectedNotes.clear();
        newNotes.forEach(note => this.selectedNotes.add(note));
        this.draw();
    }
    
    transposeSelection(semitones) {
        this.selectedNotes.forEach(note => {
            note.pitch = Math.max(0, Math.min(127, note.pitch + semitones));
            if (this.onNoteChange) this.onNoteChange(note);
        });
        this.draw();
    }
    
    quantizeSelection() {
        const grid = 0.25; // 16th note
        this.selectedNotes.forEach(note => {
            note.start = Math.round(note.start / grid) * grid;
            note.duration = Math.max(grid, Math.round(note.duration / grid) * grid);
            if (this.onNoteChange) this.onNoteChange(note);
        });
        this.draw();
    }
    
    humanizeSelection() {
        this.selectedNotes.forEach(note => {
            note.start += (Math.random() - 0.5) * 0.05;
            note.velocity = Math.max(1, Math.min(127, note.velocity + Math.floor((Math.random() - 0.5) * 20)));
            if (this.onNoteChange) this.onNoteChange(note);
        });
        this.draw();
    }
}
