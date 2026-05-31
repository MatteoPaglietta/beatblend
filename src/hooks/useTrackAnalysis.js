import { useCallback, useState } from 'react';
import { analyze } from 'web-audio-beat-detector';
import { analyzeKeyFromBuffer, getTrackTags } from '../services/audioAnalysis';
import { fetchTrackRecommendations } from '../services/discovery';

function parseBpmValue(value) {
    if (value == null) {
        return null;
    }

    const numeric = Number.parseFloat(String(value).replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
    }

    return numeric;
}

function foldTempoToPreferredRange(tempo, min = 70, max = 140) {
    if (!Number.isFinite(tempo) || tempo <= 0) {
        return null;
    }

    let adjusted = tempo;
    while (adjusted > max) {
        adjusted /= 2;
    }
    while (adjusted < min) {
        adjusted *= 2;
    }

    return adjusted;
}

function chooseDisplayBpm(detectedBpm, tagBpm) {
    const detected = parseBpmValue(detectedBpm);
    const metadata = parseBpmValue(tagBpm);

    if (!detected && metadata) {
        return Math.round(metadata);
    }

    if (!detected) {
        return null;
    }

    if (metadata) {
        const directDelta = Math.abs(detected - metadata);
        const halfDelta = Math.abs((detected / 2) - metadata);
        const doubleDelta = Math.abs((detected * 2) - metadata);
        const bestDelta = Math.min(directDelta, halfDelta, doubleDelta);

        if (bestDelta <= 2.5) {
            return Math.round(metadata);
        }
    }

    const normalized = foldTempoToPreferredRange(detected);
    if (!normalized) {
        return Math.round(detected);
    }

    return Math.round(normalized);
}

export function useTrackAnalysis() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [audioData, setAudioData] = useState({ title: null, artist: null, bpm: null, keyName: null });
    const [recommendations, setRecommendations] = useState({ bothMatch: [], bpmOnly: [], keyOnly: [] });
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const onDrop = useCallback(async (acceptedFiles) => {
        const uploadedFile = acceptedFiles[0];
        if (!uploadedFile) {
            return;
        }

        setFile(uploadedFile);
        setLoading(true);
        setError(null);
        setRecommendations({ bothMatch: [], bpmOnly: [], keyOnly: [] });
        setProgress({ current: 0, total: 0 });

        let audioCtx;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            const tempo = await analyze(audioBuffer);
            const tags = await getTrackTags(uploadedFile);
            const normalizedBpm = chooseDisplayBpm(tempo, tags.bpm);
            const trackTitle = tags.title || uploadedFile.name.replace(/\.[^/.]+$/, '');
            const trackArtist = tags.artist || 'Artista Sconosciuto';
            const calculatedKey = tags.keyName
                ? { keyName: tags.keyName }
                : await analyzeKeyFromBuffer(audioBuffer);

            setAudioData({
                title: trackTitle,
                artist: trackArtist,
                bpm: normalizedBpm,
                keyName: calculatedKey.keyName,
            });

            const recommendedTracks = await fetchTrackRecommendations({
                title: trackTitle,
                artist: trackArtist,
                targetBpm: normalizedBpm,
                targetKeyName: calculatedKey.keyName,
                onProgress: (current, total) => setProgress({ current, total }),
            });
            setRecommendations(recommendedTracks);
        } catch (err) {
            console.error(err);
            setError("Errore durante l'analisi audio o nel recupero dei brani consigliati.");
        } finally {
            if (audioCtx && audioCtx.state !== 'closed') {
                await audioCtx.close();
            }

            setLoading(false);
        }
    }, []);

    return {
        file,
        loading,
        error,
        audioData,
        recommendations,
        progress,
        onDrop,
    };
}
