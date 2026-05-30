import jsmediatags from 'jsmediatags';
import { NOTE_NAMES } from '../constants/music';

export function getTrackTags(file) {
    return new Promise((resolve) => {
        jsmediatags.read(file, {
            onSuccess: (tag) => resolve({ title: tag.tags.title || '', artist: tag.tags.artist || '' }),
            onError: () => resolve({ title: '', artist: '' }),
        });
    });
}

export async function analyzeKeyFromBuffer(audioBuffer) {
    const bufferLength = audioBuffer.length;
    const chromaEnergies = new Array(12).fill(0);
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(bufferLength / 1500));

    for (let i = 0; i < bufferLength; i += step) {
        const sample = channelData[i];
        if (Math.abs(sample) > 0.01) {
            const pseudoFreq = Math.abs(sample) * audioBuffer.sampleRate;
            const noteIndex = Math.floor((12 * Math.log2(pseudoFreq / 440) + 69) % 12);
            if (!Number.isNaN(noteIndex) && noteIndex >= 0 && noteIndex < 12) {
                chromaEnergies[noteIndex] += Math.abs(sample);
            }
        }
    }

    let dominantKeyIndex = chromaEnergies.indexOf(Math.max(...chromaEnergies));
    if (dominantKeyIndex < 0 || dominantKeyIndex > 11) {
        dominantKeyIndex = 0;
    }

    const isMinor = chromaEnergies[(dominantKeyIndex + 3) % 12] > chromaEnergies[(dominantKeyIndex + 4) % 12];
    return { keyName: `${NOTE_NAMES[dominantKeyIndex]}${isMinor ? 'm' : ''}` };
}
