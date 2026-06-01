import jsmediatags from 'jsmediatags';
import { NOTE_NAMES } from '../constants/music';

const FLAT_TO_SHARP = {
    Cb: 'B',
    Db: 'C#',
    Eb: 'D#',
    Fb: 'E',
    Gb: 'F#',
    Ab: 'G#',
    Bb: 'A#',
};

const SHARP_TO_FLAT = {
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
    'A#': 'Bb',
};
const CAMELOT_MAP = {
    '1A': 'G#m',
    '1B': 'B',
    '2A': 'D#m',
    '2B': 'F#',
    '3A': 'A#m',
    '3B': 'C#',
    '4A': 'Fm',
    '4B': 'G#',
    '5A': 'Cm',
    '5B': 'D#',
    '6A': 'Gm',
    '6B': 'A#',
    '7A': 'Dm',
    '7B': 'F',
    '8A': 'Am',
    '8B': 'C',
    '9A': 'Em',
    '9B': 'G',
    '10A': 'Bm',
    '10B': 'D',
    '11A': 'F#m',
    '11B': 'A',
    '12A': 'C#m',
    '12B': 'E',
};

function normalizePitchClass(raw) {
    if (!raw) return null;

    const letter = raw[0]?.toUpperCase();
    const accidental = raw[1] === '#' || raw[1] === 'b' ? raw[1] : '';
    const combined = `${letter}${accidental}`;

    if (FLAT_TO_SHARP[combined]) {
        return FLAT_TO_SHARP[combined];
    }

    return NOTE_NAMES.includes(combined) ? combined : null;
}

export function normalizeKeyName(rawKey) {
    if (!rawKey) return null;

    const normalized = String(rawKey).trim();
    if (!normalized) return null;

    const camelot = normalized.replace(/\s+/g, '').toUpperCase();
    if (CAMELOT_MAP[camelot]) {
        return CAMELOT_MAP[camelot];
    }

    const simplePattern = normalized.match(/^([A-Ga-g])([#b]?)(\s*(m|min|minor|maj|major)\s*)?$/i);
    if (!simplePattern) {
        return null;
    }

    const pitchClass = normalizePitchClass(`${simplePattern[1]}${simplePattern[2] || ''}`);
    if (!pitchClass) {
        return null;
    }

    const modeToken = (simplePattern[4] || '').toLowerCase();
    const isMinor = modeToken === 'm' || modeToken === 'min' || modeToken === 'minor';

    return `${pitchClass}${isMinor ? 'm' : ''}`;
}

const ESSENTIA_SAMPLE_RATE = 44100;

function extractMonoSamples(audioBuffer, maxSeconds = 150) {
    const sourceRate = audioBuffer.sampleRate;
    const sourceLength = Math.min(audioBuffer.length, Math.floor(sourceRate * maxSeconds));
    const channelCount = audioBuffer.numberOfChannels;

    const channelData = [];
    for (let channel = 0; channel < channelCount; channel += 1) {
        channelData.push(audioBuffer.getChannelData(channel));
    }

    const mono = new Float32Array(sourceLength);
    for (let i = 0; i < sourceLength; i += 1) {
        let sum = 0;
        for (let channel = 0; channel < channelCount; channel += 1) {
            sum += channelData[channel][i] || 0;
        }
        mono[i] = sum / channelCount;
    }

    if (sourceRate === ESSENTIA_SAMPLE_RATE) {
        return { samples: mono, sampleRate: ESSENTIA_SAMPLE_RATE };
    }

    const ratio = sourceRate / ESSENTIA_SAMPLE_RATE;
    const outLength = Math.floor(sourceLength / ratio);
    const resampled = new Float32Array(outLength);
    for (let i = 0; i < outLength; i += 1) {
        const srcPos = i * ratio;
        const srcIndex = Math.floor(srcPos);
        const frac = srcPos - srcIndex;
        const a = mono[srcIndex] ?? 0;
        const b = mono[srcIndex + 1] ?? 0;
        resampled[i] = a + frac * (b - a);
    }

    return { samples: resampled, sampleRate: ESSENTIA_SAMPLE_RATE };
}

export function getTrackTags(file) {
    return new Promise((resolve) => {
        jsmediatags.read(file, {
            onSuccess: (tag) => {
                const tags = tag?.tags || {};
                const rawKey = tags.initialkey || tags.initialKey || tags.TKEY || tags.key || '';
                const rawBpm = tags.bpm || tags.BPM || tags.TBPM || tags.tbpm || '';

                resolve({
                    title: tags.title || '',
                    artist: tags.artist || '',
                    keyName: normalizeKeyName(rawKey),
                    bpm: rawBpm,
                });
            },
            onError: () => resolve({ title: '', artist: '', keyName: null, bpm: null }),
        });
    });
}

let essentiaInstance = null;

async function getEssentia() {
    if (essentiaInstance) return essentiaInstance;
    const EssentiaCore = (await import('essentia.js/dist/essentia.js-core.es.js')).default;
    const { EssentiaWASM } = await import('essentia.js/dist/essentia-wasm.es.js');
    essentiaInstance = new EssentiaCore(EssentiaWASM);
    return essentiaInstance;
}

export async function analyzeKeyFromBuffer(audioBuffer) {
    const essentia = await getEssentia();

    const { samples: monoSamples, sampleRate } = extractMonoSamples(audioBuffer);
    const signal = essentia.arrayToVector(monoSamples);

    const profiles = ['bgate', 'temperley', 'shaath'];
    const votes = {};
    const strengths = {};

    for (const profile of profiles) {
        const result = essentia.KeyExtractor(
            signal,
            true,             // averageDetuningCorrection
            4096,             // frameSize
            4096,             // hopSize
            12,               // hpcpSize
            3500,             // maxFrequency
            60,               // maximumSpectralPeaks
            25,               // minFrequency
            0.2,              // pcpThreshold
            profile,          // profileType
            sampleRate,       // sampleRate reale del buffer
            0.0001,           // spectralPeaksThreshold
            440,              // tuningFrequency
            'cosine',         // weightType
            'hann'            // windowType
        );

        const rawKey = result.key;
        const rawScale = result.scale;
        const isMinor = rawScale === 'minor';
        const sharpKey = FLAT_TO_SHARP[rawKey] ?? rawKey;
        const displayKey = SHARP_TO_FLAT[sharpKey] ?? sharpKey;
        const keyName = `${displayKey}${isMinor ? 'm' : ''}`;
        const strength = Number.isFinite(result.strength) ? result.strength : 0;

        votes[keyName] = (votes[keyName] ?? 0) + 1;
        strengths[keyName] = (strengths[keyName] ?? 0) + strength;
    }

    signal.delete();

    const winner = Object.entries(votes)
        .sort((a, b) => {
            const voteDiff = b[1] - a[1];
            if (voteDiff !== 0) {
                return voteDiff;
            }
            return (strengths[b[0]] ?? 0) - (strengths[a[0]] ?? 0);
        })[0][0];

    return { keyName: winner };
}
