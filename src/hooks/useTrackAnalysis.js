import { useCallback, useState } from 'react';
import { analyze } from 'web-audio-beat-detector';
import { analyzeKeyFromBuffer, getTrackTags } from '../services/audioAnalysis';
import { fetchTrackRecommendations } from '../services/discovery';

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
            const roundedBpm = Math.round(tempo);
            const calculatedKey = await analyzeKeyFromBuffer(audioBuffer);

            const tags = await getTrackTags(uploadedFile);
            const trackTitle = tags.title || uploadedFile.name.replace(/\.[^/.]+$/, '');
            const trackArtist = tags.artist || 'Artista Sconosciuto';

            setAudioData({
                title: trackTitle,
                artist: trackArtist,
                bpm: roundedBpm,
                keyName: calculatedKey.keyName,
            });

            console.log(`📍 Target: BPM ${roundedBpm}, Key ${calculatedKey.keyName}`);
            const recommendedTracks = await fetchTrackRecommendations({
                title: trackTitle,
                artist: trackArtist,
                targetBpm: roundedBpm,
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
