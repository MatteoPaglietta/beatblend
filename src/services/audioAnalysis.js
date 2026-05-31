import jsmediatags from 'jsmediatags';
import { NOTE_NAMES } from '../constants/music';

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const FLAT_TO_SHARP = {
    Cb: 'B',
    Db: 'C#',
    Eb: 'D#',
    Fb: 'E',
    Gb: 'F#',
    Ab: 'G#',
    Bb: 'A#',
};
const CAMELot_MAP = {
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
    if (CAMELot_MAP[camelot]) {
        return CAMELot_MAP[camelot];
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

function bitReverse(index, bits) {
    let reversed = 0;
    for (let i = 0; i < bits; i += 1) {
        reversed = (reversed << 1) | (index & 1);
        index >>= 1;
    }
    return reversed;
}

function fftMagnitudes(frame) {
    const size = frame.length;
    const bits = Math.log2(size);
    const real = new Float64Array(size);
    const imag = new Float64Array(size);

    for (let i = 0; i < size; i += 1) {
        real[bitReverse(i, bits)] = frame[i];
    }

    for (let len = 2; len <= size; len <<= 1) {
        const half = len >> 1;
        const angleStep = (-2 * Math.PI) / len;
        for (let i = 0; i < size; i += len) {
            for (let j = 0; j < half; j += 1) {
                const angle = angleStep * j;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                const evenIndex = i + j;
                const oddIndex = evenIndex + half;

                const oddReal = real[oddIndex] * cos - imag[oddIndex] * sin;
                const oddImag = real[oddIndex] * sin + imag[oddIndex] * cos;

                const evenReal = real[evenIndex];
                const evenImag = imag[evenIndex];

                real[evenIndex] = evenReal + oddReal;
                imag[evenIndex] = evenImag + oddImag;
                real[oddIndex] = evenReal - oddReal;
                imag[oddIndex] = evenImag - oddImag;
            }
        }
    }

    const magnitudes = new Float64Array((size >> 1) + 1);
    for (let k = 0; k < magnitudes.length; k += 1) {
        magnitudes[k] = Math.hypot(real[k], imag[k]);
    }

    return magnitudes;
}

function rotateProfile(profile, tonicShift) {
    const rotated = new Float64Array(12);
    for (let i = 0; i < 12; i += 1) {
        rotated[i] = profile[(i - tonicShift + 12) % 12];
    }
    return rotated;
}

function cosineSimilarity(first, second) {
    let dot = 0;
    let firstNorm = 0;
    let secondNorm = 0;

    for (let i = 0; i < first.length; i += 1) {
        dot += first[i] * second[i];
        firstNorm += first[i] * first[i];
        secondNorm += second[i] * second[i];
    }

    if (firstNorm === 0 || secondNorm === 0) {
        return 0;
    }

    return dot / Math.sqrt(firstNorm * secondNorm);
}

function buildHannWindow(size) {
    const window = new Float64Array(size);
    for (let i = 0; i < size; i += 1) {
        window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return window;
}

function downsampleMono(audioBuffer, targetSampleRate = 11025, maxSeconds = 150) {
    const sourceRate = audioBuffer.sampleRate;
    const sourceLength = Math.min(audioBuffer.length, Math.floor(sourceRate * maxSeconds));
    const channelCount = audioBuffer.numberOfChannels;

    const channelData = [];
    for (let channel = 0; channel < channelCount; channel += 1) {
        channelData.push(audioBuffer.getChannelData(channel));
    }

    const ratio = sourceRate / targetSampleRate;
    if (ratio <= 1.05) {
        const mono = new Float32Array(sourceLength);
        for (let i = 0; i < sourceLength; i += 1) {
            let sum = 0;
            for (let channel = 0; channel < channelCount; channel += 1) {
                sum += channelData[channel][i] || 0;
            }
            mono[i] = sum / channelCount;
        }
        return { samples: mono, sampleRate: sourceRate };
    }

    const downLength = Math.max(1, Math.floor(sourceLength / ratio));
    const mono = new Float32Array(downLength);

    for (let i = 0; i < downLength; i += 1) {
        const sourceIndex = Math.floor(i * ratio);
        let sum = 0;
        for (let channel = 0; channel < channelCount; channel += 1) {
            sum += channelData[channel][sourceIndex] || 0;
        }
        mono[i] = sum / channelCount;
    }

    return { samples: mono, sampleRate: targetSampleRate };
}

function circularDistance(a, b) {
    const diff = Math.abs(a - b);
    return Math.min(diff, 1 - diff);
}

function estimateGlobalTuningOffset({ samples, sampleRate, frameSize, hopSize, window, minFrequency, maxFrequency, frameStride, totalFrames }) {
    const semitoneFractions = [];

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += frameStride) {
        const offset = frameIndex * hopSize;
        const frame = new Float64Array(frameSize);

        let rms = 0;
        for (let i = 0; i < frameSize; i += 1) {
            const sample = samples[offset + i] || 0;
            frame[i] = sample * window[i];
            rms += sample * sample;
        }
        rms = Math.sqrt(rms / frameSize);
        if (rms < 0.01) {
            continue;
        }

        const magnitudes = fftMagnitudes(frame);
        const maxBin = Math.min(magnitudes.length - 1, Math.floor((maxFrequency * frameSize) / sampleRate));
        const minBin = Math.max(1, Math.floor((minFrequency * frameSize) / sampleRate));

        let strongestMag = 0;
        for (let bin = minBin; bin <= maxBin; bin += 1) {
            strongestMag = Math.max(strongestMag, magnitudes[bin]);
        }

        if (strongestMag <= 0) {
            continue;
        }

        const threshold = strongestMag * 0.55;
        for (let bin = minBin; bin <= maxBin; bin += 1) {
            const magnitude = magnitudes[bin];
            if (magnitude < threshold) {
                continue;
            }

            const frequency = (bin * sampleRate) / frameSize;
            if (!Number.isFinite(frequency) || frequency <= 0) {
                continue;
            }

            const midiFloat = 69 + (12 * Math.log2(frequency / 440));
            if (!Number.isFinite(midiFloat)) {
                continue;
            }

            const nearest = Math.round(midiFloat);
            const frac = midiFloat - nearest;
            semitoneFractions.push(frac);
        }
    }

    if (semitoneFractions.length < 20) {
        return 0;
    }

    let bestOffset = 0;
    let bestScore = -Infinity;
    const candidates = 80;

    for (let i = 0; i <= candidates; i += 1) {
        const candidate = -0.5 + (i / candidates);
        let score = 0;
        for (let j = 0; j < semitoneFractions.length; j += 1) {
            const dist = circularDistance((semitoneFractions[j] + 0.5) % 1, (candidate + 0.5) % 1);
            score += Math.exp(-36 * dist * dist);
        }

        if (score > bestScore) {
            bestScore = score;
            bestOffset = candidate;
        }
    }

    return bestOffset;
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

export async function analyzeKeyFromBuffer(audioBuffer) {
    const { samples, sampleRate } = downsampleMono(audioBuffer);

    const frameSize = 4096;
    const hopSize = 2048;
    const minFrequency = 55;
    const maxFrequency = 1200;
    const bassMinFrequency = 40;
    const bassMaxFrequency = 220;
    const maxFramesToAnalyze = 900;
    const window = buildHannWindow(frameSize);
    const chroma = new Float64Array(12);
    const bassChroma = new Float64Array(12);

    if (samples.length < frameSize) {
        return { keyName: 'C' };
    }

    const totalFrames = Math.floor((samples.length - frameSize) / hopSize) + 1;
    const frameStride = Math.max(1, Math.floor(totalFrames / maxFramesToAnalyze));
    const globalTuningOffset = estimateGlobalTuningOffset({
        samples,
        sampleRate,
        frameSize,
        hopSize,
        window,
        minFrequency,
        maxFrequency,
        frameStride,
        totalFrames,
    });

    let validFrames = 0;

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += frameStride) {
        const offset = frameIndex * hopSize;
        const frame = new Float64Array(frameSize);

        let rms = 0;
        for (let i = 0; i < frameSize; i += 1) {
            const sample = samples[offset + i] || 0;
            frame[i] = sample * window[i];
            rms += sample * sample;
        }
        rms = Math.sqrt(rms / frameSize);

        if (rms < 0.01) {
            continue;
        }

        const magnitudes = fftMagnitudes(frame);
        const maxBin = Math.min(magnitudes.length - 1, Math.floor((maxFrequency * frameSize) / sampleRate));
        const minBin = Math.max(1, Math.floor((minFrequency * frameSize) / sampleRate));

        for (let bin = minBin; bin <= maxBin; bin += 1) {
            const frequency = (bin * sampleRate) / frameSize;
            if (!Number.isFinite(frequency) || frequency <= 0) {
                continue;
            }

            const magnitude = magnitudes[bin];
            if (!Number.isFinite(magnitude) || magnitude <= 0) {
                continue;
            }

            const midiFloat = 69 + (12 * Math.log2(frequency / 440)) - globalTuningOffset;
            if (!Number.isFinite(midiFloat)) {
                continue;
            }
            const weightedEnergy = (magnitude * magnitude) / Math.pow(frequency, 1.05);

            const baseClass = ((Math.floor(midiFloat) % 12) + 12) % 12;
            const frac = midiFloat - Math.floor(midiFloat);
            const nextClass = (baseClass + 1) % 12;

            const toBase = 1 - frac;
            const toNext = frac;

            chroma[baseClass] += weightedEnergy * toBase;
            chroma[nextClass] += weightedEnergy * toNext;

            if (frequency >= bassMinFrequency && frequency <= bassMaxFrequency) {
                const bassEnergy = (magnitude * magnitude) / Math.pow(frequency, 0.7);
                bassChroma[baseClass] += bassEnergy * toBase;
                bassChroma[nextClass] += bassEnergy * toNext;
            }
        }

        validFrames += 1;
    }

    if (validFrames === 0) {
        return { keyName: 'C' };
    }

    let chromaSum = 0;
    for (let i = 0; i < 12; i += 1) {
        chromaSum += chroma[i];
    }

    if (chromaSum <= 0) {
        return { keyName: 'C' };
    }

    let bassSum = 0;
    for (let i = 0; i < 12; i += 1) {
        bassSum += bassChroma[i];
    }

    for (let i = 0; i < 12; i += 1) {
        chroma[i] /= chromaSum;
        if (bassSum > 0) {
            bassChroma[i] /= bassSum;
        }
    }

    let bestScore = -Infinity;
    let bestTonic = 0;
    let bestIsMinor = false;
    const profileWeight = 0.84;
    const bassWeight = bassSum > 0 ? 0.1 : 0;
    const triadWeight = 0.12;

    for (let tonic = 0; tonic < 12; tonic += 1) {
        const majorProfileScore = cosineSimilarity(chroma, rotateProfile(MAJOR_PROFILE, tonic));
        const majorTriadScore =
            (chroma[tonic] * 0.45) +
            (chroma[(tonic + 4) % 12] * 0.3) +
            (chroma[(tonic + 7) % 12] * 0.25);
        const majorScore =
            (majorProfileScore * profileWeight) +
            (bassChroma[tonic] * bassWeight) +
            (majorTriadScore * triadWeight);
        if (majorScore > bestScore) {
            bestScore = majorScore;
            bestTonic = tonic;
            bestIsMinor = false;
        }

        const minorProfileScore = cosineSimilarity(chroma, rotateProfile(MINOR_PROFILE, tonic));
        const minorTriadScore =
            (chroma[tonic] * 0.45) +
            (chroma[(tonic + 3) % 12] * 0.3) +
            (chroma[(tonic + 7) % 12] * 0.25);
        const minorScore =
            (minorProfileScore * profileWeight) +
            (bassChroma[tonic] * bassWeight) +
            (minorTriadScore * triadWeight);
        if (minorScore > bestScore) {
            bestScore = minorScore;
            bestTonic = tonic;
            bestIsMinor = true;
        }
    }

    return { keyName: `${NOTE_NAMES[bestTonic]}${bestIsMinor ? 'm' : ''}` };
}
