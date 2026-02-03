// MIDI Import/Export using midi-writer-js
export class MidiExporter {
    exportMidi(tracks, bpm) {
        const midiTracks = [];
        
        tracks.forEach(track => {
            const midiTrack = new MidiWriter.Track();
            midiTrack.setTempo(bpm);
            
            // Sort notes by start time
            const sortedNotes = [...track.notes].sort((a, b) => a.start - b.start);
            
            // Convert beats to ticks (assuming 128 ticks per beat)
            sortedNotes.forEach(note => {
                const startTick = Math.round(note.start * 128);
                const durationTick = Math.round(note.duration * 128);
                
                const midiNote = new MidiWriter.NoteEvent({
                    pitch: [note.pitch],
                    duration: `T${durationTick}`,
                    velocity: note.velocity,
                    startTick: startTick
                });
                
                midiTrack.addEvent(midiNote);
            });
            
            midiTracks.push(midiTrack);
        });
        
        const write = new MidiWriter.Writer(midiTracks);
        return write.buildFile();
    }
    
    async importMidi(arrayBuffer) {
        // Parse MIDI file
        const midiData = this.parseMidiFile(arrayBuffer);
        const tracks = [];
        
        midiData.tracks.forEach((midiTrack, index) => {
            const notes = [];
            let currentTime = 0;
            const activeNotes = new Map();
            
            midiTrack.forEach(event => {
                currentTime += event.deltaTime || 0;
                
                if (event.type === 'noteOn' && event.velocity > 0) {
                    activeNotes.set(event.noteNumber, {
                        pitch: event.noteNumber,
                        start: currentTime / 480, // Convert ticks to beats (480 ticks per beat)
                        velocity: event.velocity
                    });
                } else if (event.type === 'noteOff' || (event.type === 'noteOn' && event.velocity === 0)) {
                    const note = activeNotes.get(event.noteNumber);
                    if (note) {
                        note.duration = (currentTime / 480) - note.start;
                        notes.push(note);
                        activeNotes.delete(event.noteNumber);
                    }
                }
            });
            
            if (notes.length > 0) {
                tracks.push({
                    id: Date.now() + index,
                    name: `Track ${index + 1}`,
                    instrument: 'acoustic_grand_piano',
                    notes: notes,
                    volume: 0.8,
                    pan: 0,
                    mute: false,
                    solo: false
                });
            }
        });
        
        return tracks;
    }
    
    parseMidiFile(arrayBuffer) {
        // Simplified MIDI parser
        const view = new DataView(arrayBuffer);
        let offset = 0;
        
        // Read header
        const headerChunk = this.readString(view, offset, 4);
        offset += 4;
        
        if (headerChunk !== 'MThd') {
            throw new Error('Invalid MIDI file');
        }
        
        const headerLength = view.getUint32(offset);
        offset += 4;
        
        const format = view.getUint16(offset);
        offset += 2;
        
        const trackCount = view.getUint16(offset);
        offset += 2;
        
        const division = view.getUint16(offset);
        offset += 2;
        
        // Read tracks
        const tracks = [];
        for (let i = 0; i < trackCount; i++) {
            const track = this.readTrack(view, offset);
            tracks.push(track.events);
            offset = track.offset;
        }
        
        return { format, trackCount, division, tracks };
    }
    
    readTrack(view, offset) {
        const trackHeader = this.readString(view, offset, 4);
        offset += 4;
        
        if (trackHeader !== 'MTrk') {
            throw new Error('Invalid track header');
        }
        
        const trackLength = view.getUint32(offset);
        offset += 4;
        
        const endOffset = offset + trackLength;
        const events = [];
        
        let runningStatus = 0;
        
        while (offset < endOffset) {
            const deltaTime = this.readVariableLength(view, offset);
            offset = deltaTime.offset;
            
            let statusByte = view.getUint8(offset);
            
            if (statusByte < 0x80) {
                statusByte = runningStatus;
            } else {
                offset++;
                runningStatus = statusByte;
            }
            
            const event = { deltaTime: deltaTime.value };
            
            const messageType = statusByte & 0xF0;
            const channel = statusByte & 0x0F;
            
            if (messageType === 0x90) {
                event.type = 'noteOn';
                event.channel = channel;
                event.noteNumber = view.getUint8(offset++);
                event.velocity = view.getUint8(offset++);
            } else if (messageType === 0x80) {
                event.type = 'noteOff';
                event.channel = channel;
                event.noteNumber = view.getUint8(offset++);
                event.velocity = view.getUint8(offset++);
            } else if (messageType === 0xB0) {
                event.type = 'controller';
                event.channel = channel;
                event.controllerType = view.getUint8(offset++);
                event.value = view.getUint8(offset++);
            } else if (statusByte === 0xFF) {
                // Meta event
                const metaType = view.getUint8(offset++);
                const length = this.readVariableLength(view, offset);
                offset = length.offset + length.value;
                event.type = 'meta';
            } else {
                // Skip unknown events
                offset += 2;
            }
            
            events.push(event);
        }
        
        return { events, offset };
    }
    
    readVariableLength(view, offset) {
        let value = 0;
        let byte;
        
        do {
            byte = view.getUint8(offset++);
            value = (value << 7) | (byte & 0x7F);
        } while (byte & 0x80);
        
        return { value, offset };
    }
    
    readString(view, offset, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(view.getUint8(offset + i));
        }
        return str;
    }
}
