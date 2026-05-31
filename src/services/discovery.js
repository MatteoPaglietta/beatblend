import { analyzeKeyFromBuffer } from './audioAnalysis';

const CAMELOT_WHEEL = {
    C: { num: 8 },
    Cm: { num: 8 },
    D: { num: 1 },
    Dm: { num: 1 },
    E: { num: 3 },
    Em: { num: 3 },
    F: { num: 4 },
    Fm: { num: 4 },
    G: { num: 5 },
    Gm: { num: 5 },
    A: { num: 12 },
    Am: { num: 12 },
    B: { num: 2 },
    Bm: { num: 2 },
    'C#': { num: 9 },
    'C#m': { num: 9 },
    'D#': { num: 2 },
    'D#m': { num: 2 },
    'F#': { num: 6 },
    'F#m': { num: 6 },
    'G#': { num: 10 },
    'G#m': { num: 10 },
    'A#': { num: 11 },
    'A#m': { num: 11 },
    Bb: { num: 11 },
    Bbm: { num: 11 },
    Db: { num: 9 },
    Dbm: { num: 9 },
    Eb: { num: 10 },
    Ebm: { num: 10 },
    Gb: { num: 6 },
    Gbm: { num: 6 },
    Ab: { num: 10 },
    Abm: { num: 10 },
};

function getCamelotInfo(keyName) {
    if (!keyName) {
        return null;
    }

    return CAMELOT_WHEEL[keyName] || null;
}

function normalizeText(text) {
    return (text || '').toLowerCase().trim();
}

function buildSearchTerms({ targetBpm }) {
    if (targetBpm < 85) {
        return ['lofi', 'downtempo', 'chillhop', 'ambient electronic', 'trip hop'];
    }
    if (targetBpm < 100) {
        return ['rnb', 'neo soul', 'chillout', 'deep house', 'hip hop'];
    }
    if (targetBpm < 110) {
        return ['boom bap', 'hip hop', 'trap soul', 'rap', 'chill trap'];
    }
    if (targetBpm < 120) {
        return ['house', 'tech house', 'afrobeats', 'dancehall', 'uk garage'];
    }
    if (targetBpm < 128) {
        return ['progressive house', 'electro house', 'edm', 'dance pop', 'club'];
    }
    if (targetBpm < 135) {
        return ['techno', 'trance', 'melodic techno', 'electronic dance', 'hardgroove'];
    }
    if (targetBpm < 145) {
        return ['dubstep', 'future bass', 'trap edm', 'bass music', 'brostep'];
    }
    if (targetBpm < 160) {
        return ['trap', 'drill', 'grime', 'uk drill', 'rap'];
    }
    if (targetBpm < 175) {
        return ['drum and bass', 'liquid dnb', 'neurofunk', 'jump up', 'jungle'];
    }

    return ['hard techno', 'gabber', 'speedcore', 'hardcore', 'psytrance'];
}

async function searchDeezerTracks(term, limit = 100) {
    const query = encodeURIComponent(term);
    const response = await fetch(`/api-deezer/search?q=${query}&limit=${limit}`);

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    return data?.data || [];
}

async function getDeezerTrackDetails(trackId) {
    const response = await fetch(`/api-deezer/track/${trackId}`);
    if (!response.ok) {
        return null;
    }

    return response.json();
}

function mapDeezerTrack(track) {
    return {
        id: String(track.id),
        title: track.title,
        artist: { name: track.artist?.name || 'Artista sconosciuto' },
        link: track.link,
        previewUrl: track.preview,
        bpmMeta: Number(track.bpm) || null,
    };
}

async function enrichCandidatesWithBpm(candidates) {
    const BATCH_SIZE = 20;
    const enriched = [];

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batch = candidates.slice(i, i + BATCH_SIZE);

        const batchDetails = await Promise.allSettled(
            batch.map((candidate) => {
                if (candidate.bpmMeta) {
                    return Promise.resolve({ bpm: candidate.bpmMeta });
                }

                return getDeezerTrackDetails(candidate.id);
            }),
        );

        for (let j = 0; j < batch.length; j++) {
            const base = batch[j];
            const detailsResult = batchDetails[j];
            const details = detailsResult.status === 'fulfilled' ? detailsResult.value : null;
            const bpmMeta = Number(details?.bpm) || base.bpmMeta || null;

            enriched.push({
                ...base,
                bpmMeta,
            });
        }
    }

    return enriched;
}

async function analyzePreviewKey(previewUrl, audioContext) {
    const response = await fetch(previewUrl, { mode: 'cors' });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const keyData = await analyzeKeyFromBuffer(audioBuffer);

    return {
        keyName: keyData.keyName,
    };
}

function isBpmMatch(candidateBpm, targetBpm) {
    if (!candidateBpm || !targetBpm) {
        return false;
    }

    return Math.abs(candidateBpm - targetBpm) <= 3;
}

function isKeyMatch(candidateKeyName, targetKeyName) {
    if (!candidateKeyName || !targetKeyName) {
        return false;
    }

    if (normalizeText(candidateKeyName) === normalizeText(targetKeyName)) {
        return true;
    }

    const targetCamelot = getCamelotInfo(targetKeyName);
    const candidateCamelot = getCamelotInfo(candidateKeyName);

    if (!targetCamelot || !candidateCamelot) {
        const targetIsMajor = !targetKeyName.includes('m');
        const candidateIsMajor = !candidateKeyName.includes('m');
        return targetIsMajor === candidateIsMajor;
    }

    const numDiff = Math.abs(targetCamelot.num - candidateCamelot.num);
    return numDiff === 0 || numDiff === 1 || numDiff === 11;
}

function classifyMatch({ candidateBpm, candidateKeyName, targetBpm, targetKeyName }) {
    const bpm = isBpmMatch(candidateBpm, targetBpm);
    const key = isKeyMatch(candidateKeyName, targetKeyName);

    if (bpm && key) {
        return 'both';
    }
    if (bpm) {
        return 'bpm';
    }
    if (key) {
        return 'key';
    }

    return null;
}

export async function fetchTrackRecommendations({ targetBpm, targetKeyName, onProgress }) {
    if (!targetBpm) {
        return { bothMatch: [], bpmOnly: [], keyOnly: [] };
    }

    const terms = buildSearchTerms({ targetBpm });
    const searchResults = await Promise.allSettled(terms.map((term) => searchDeezerTracks(term, 100)));

    const uniqueCandidates = new Map();
    const MAX_CANDIDATES = 220;

    for (const result of searchResults) {
        if (result.status !== 'fulfilled') {
            continue;
        }

        for (const track of result.value) {
            const mapped = mapDeezerTrack(track);
            if (!mapped.id || !mapped.previewUrl || uniqueCandidates.has(mapped.id)) {
                continue;
            }

            uniqueCandidates.set(mapped.id, mapped);
            if (uniqueCandidates.size >= MAX_CANDIDATES) {
                break;
            }
        }

        if (uniqueCandidates.size >= MAX_CANDIDATES) {
            break;
        }
    }

    if (uniqueCandidates.size === 0) {
        return { bothMatch: [], bpmOnly: [], keyOnly: [] };
    }

    const rawCandidates = Array.from(uniqueCandidates.values());
    const candidates = await enrichCandidatesWithBpm(rawCandidates);

    const prioritized = [...candidates].sort((first, second) => {
        const firstDelta = first.bpmMeta ? Math.abs(first.bpmMeta - targetBpm) : Number.MAX_SAFE_INTEGER;
        const secondDelta = second.bpmMeta ? Math.abs(second.bpmMeta - targetBpm) : Number.MAX_SAFE_INTEGER;
        return firstDelta - secondDelta;
    });

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const bothMatch = [];
    const bpmOnly = [];
    const keyOnly = [];
    let analyzed = 0;
    let bpmKnown = 0;
    const BATCH_SIZE = 8;

    try {
        for (let i = 0; i < prioritized.length; i += BATCH_SIZE) {
            const batch = prioritized.slice(i, i + BATCH_SIZE);

            const keyResults = await Promise.allSettled(
                batch.map((candidate) => analyzePreviewKey(candidate.previewUrl, audioContext)),
            );

            for (let j = 0; j < batch.length; j++) {
                analyzed += 1;
                onProgress?.(analyzed, prioritized.length);

                const candidate = batch[j];
                const keyResult = keyResults[j];
                const candidateBpm = candidate.bpmMeta;

                if (candidateBpm) {
                    bpmKnown += 1;
                }

                if (keyResult.status !== 'fulfilled') {
                    continue;
                }

                const candidateKeyName = keyResult.value.keyName;
                const category = classifyMatch({
                    candidateBpm,
                    candidateKeyName,
                    targetBpm,
                    targetKeyName,
                });

                if (!category) {
                    continue;
                }

                const entry = {
                    ...candidate,
                    bpm: candidateBpm,
                    bpm_key: candidateKeyName,
                };

                if (category === 'both') {
                    bothMatch.push(entry);
                } else if (category === 'bpm') {
                    bpmOnly.push(entry);
                } else {
                    keyOnly.push(entry);
                }
            }
        }
    } finally {
        if (audioContext.state !== 'closed') {
            await audioContext.close();
        }
    }

    const sortByBpmDistance = (first, second) => {
        const firstDelta = first.bpm ? Math.abs(first.bpm - targetBpm) : Number.MAX_SAFE_INTEGER;
        const secondDelta = second.bpm ? Math.abs(second.bpm - targetBpm) : Number.MAX_SAFE_INTEGER;
        return firstDelta - secondDelta;
    };

    bothMatch.sort(sortByBpmDistance);
    bpmOnly.sort(sortByBpmDistance);
    keyOnly.sort(sortByBpmDistance);

    return {
        bothMatch: bothMatch.slice(0, 12),
        bpmOnly: bpmOnly.slice(0, 12),
        keyOnly: keyOnly.slice(0, 12),
    };
}
