import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { analyze } from 'web-audio-beat-detector';
import jsmediatags from 'jsmediatags';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CLIENT_ID = "bbfc9788c582499bb4a34241b13bd6e8";
const REDIRECT_URI = window.location.origin + "/";
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const RESPONSE_TYPE = "code";

function App() {
    const [code, setCode] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [audioData, setAudioData] = useState({ title: null, artist: null, bpm: null, keyName: null });
    const [recommendations, setRecommendations] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        let localCode = window.localStorage.getItem("spotify_auth_code");
        const codeFromUrl = searchParams.get("code");

        if (!localCode && codeFromUrl) {
            localCode = codeFromUrl;
            // Pulisce l'URL per estetica e sicurezza
            window.history.pushState({}, document.title, window.location.pathname);
            window.localStorage.setItem("spotify_auth_code", localCode);
        }

        if (localCode) setCode(localCode);
    }, []);

    const logout = () => {
        setCode("");
        window.localStorage.removeItem("spotify_auth_code");
        setRecommendations([]);
        setFile(null);
    };

    const getTrackTags = (file) => {
        return new Promise((resolve) => {
            jsmediatags.read(file, {
                onSuccess: (tag) => resolve({ title: tag.tags.title || "", artist: tag.tags.artist || "" }),
                onError: () => resolve({ title: "", artist: "" })
            });
        });
    };

    const analyzeKeyFromBuffer = async (audioBuffer) => {
        const bufferLength = audioBuffer.length;
        let chromaEnergies = new Array(12).fill(0);
        const channelData = audioBuffer.getChannelData(0);
        const step = Math.floor(bufferLength / 1500);

        for (let i = 0; i < bufferLength; i += step) {
            const sample = channelData[i];
            if (Math.abs(sample) > 0.01) {
                const pseudoFreq = Math.abs(sample) * audioBuffer.sampleRate;
                const noteIndex = Math.floor((12 * Math.log2(pseudoFreq / 440) + 69) % 12);
                if (!isNaN(noteIndex) && noteIndex >= 0 && noteIndex < 12) chromaEnergies[noteIndex] += Math.abs(sample);
            }
        }
        let dominantKeyIndex = chromaEnergies.indexOf(Math.max(...chromaEnergies));
        if (dominantKeyIndex < 0 || dominantKeyIndex > 11) dominantKeyIndex = 0;
        const isMinor = chromaEnergies[(dominantKeyIndex + 3) % 12] > chromaEnergies[(dominantKeyIndex + 4) % 12];
        return { keyName: `${NOTE_NAMES[dominantKeyIndex]}${isMinor ? 'm' : ''}` };
    };

    const fetchRecommendations = async (title, artist) => {
        try {
            const searchQuery = encodeURIComponent(`track:${title} artist:${artist}`);
            const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${searchQuery}&type=track&limit=1`, {
                headers: { 'Authorization': `Bearer ${window.localStorage.getItem("spotify_auth_code")}` } // Usiamo il codice memorizzato
            });

            if (!searchRes.ok) {
                console.log("Errore di autenticazione o token scaduto.");
                return;
            }

            const searchData = await searchRes.json();
            const trackId = searchData.tracks?.items[0]?.id;

            if (!trackId) {
                console.log("Traccia non trovata nel catalogo di Spotify.");
                return;
            }
            const recRes = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${trackId}&limit=20`, {
                headers: { 'Authorization': `Bearer ${window.localStorage.getItem("spotify_auth_code")}` }
            });
            const recData = await recRes.json();
            setRecommendations(recData.tracks || []);

        } catch (err) {
            console.error("Errore nel recupero dei consigli:", err);
        }
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        const uploadedFile = acceptedFiles[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setLoading(true);
        setError(null);
        setRecommendations([]);

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            const tempo = await analyze(audioBuffer);
            const roundedBpm = Math.round(tempo);
            const calculatedKey = await analyzeKeyFromBuffer(audioBuffer);
            const tags = await getTrackTags(uploadedFile);

            let trackTitle = tags.title || uploadedFile.name.replace(/\.[^/.]+$/, "");
            let trackArtist = tags.artist || "";

            setAudioData({ title: trackTitle, artist: trackArtist, bpm: roundedBpm, keyName: calculatedKey.keyName });

            if (code) {
                await fetchRecommendations(trackTitle, trackArtist, roundedBpm);
            }

        } catch (err) {
            console.error(err);
            setError("Errore durante l'analisi del file.");
        } finally {
            setLoading(false);
        }
    }, [code]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'audio/*': ['.mp3', '.wav', '.m4a'] },
        multiple: false
    });

    return (
        <div className="container py-5 text-white" style={{ minHeight: '100vh', backgroundColor: '#121212' }}>

            <div className="d-flex justify-content-end mb-4">
                {!code ? (
                    <a href={`${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=${RESPONSE_TYPE}`} className="btn btn-success fw-bold rounded-pill px-4">
                        Connetti Spotify
                    </a>
                ) : (
                    <button onClick={logout} className="btn btn-outline-danger fw-bold rounded-pill px-4">Disconnetti Spotify</button>
                )}
            </div>

            <header className="text-center mb-5">
                <h1 className="display-4 fw-bold text-success">BeatsBlend</h1>
                <p className="lead text-muted">Trova nuova musica da scavare compatibile con i tuoi brani</p>
            </header>

            {!code ? (
                <div className="text-center py-5">
                    <p className="fs-5 text-muted">Effettua il login con il tuo account Spotify per scoprire nuove tracce correlate.</p>
                </div>
            ) : (
                <div className="row justify-content-center">
                    <div className="col-md-9">

                        <div {...getRootProps()} className={`p-5 text-center border border-2 rounded-3 ${isDragActive ? 'border-success bg-dark' : 'border-secondary'}`} style={{ cursor: 'pointer', borderStyle: 'dashed' }}>
                            <input {...getInputProps()} />
                            <p className="fs-5 mb-0">Trascina qui la tua traccia di partenza o <span className="text-success">clicca per sfogliare</span></p>
                        </div>

                        {error && <div className="alert alert-danger mt-4 text-center">{error}</div>}

                        {loading && (
                            <div className="text-center my-5">
                                <div className="spinner-border text-success" role="status"></div>
                                <p className="mt-2 text-muted">Analisi della traccia e generazione consigli...</p>
                            </div>
                        )}

                        {audioData.bpm && !loading && (
                            <div className="card bg-dark text-white border-secondary mt-4 p-4">
                                <h4 className="h5 mb-1 text-success">{audioData.title}</h4>
                                <p className="text-muted mb-4">{audioData.artist || "Artista Sconosciuto"}</p>
                                <div className="row text-center">
                                    <div className="col-6 border-end border-secondary">
                                        <span className="text-muted d-block small fw-bold">BPM ANALYSIS</span>
                                        <span className="display-4 fw-bold text-white">{audioData.bpm}</span>
                                    </div>
                                    <div className="col-6">
                                        <span className="text-muted d-block small fw-bold">KEY ANALYSIS</span>
                                        <span className="display-4 fw-bold text-info">{audioData.keyName}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {recommendations.length > 0 && (
                            <div className="mt-5">
                                <h3 className="h4 mb-3 text-success fw-bold">Tracce Consigliate da Scavare:</h3>
                                <div className="table-responsive">
                                    <table className="table table-dark table-hover align-middle border-secondary">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Titolo</th>
                                                <th>Artista</th>
                                                <th>Album</th>
                                                <th className="text-end">Ascolta</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recommendations.map((track, index) => (
                                                <tr key={track.id}>
                                                    <td className="text-muted">{index + 1}</td>
                                                    <td className="fw-bold text-white">{track.name}</td>
                                                    <td className="text-info">{track.artists.map(a => a.name).join(', ')}</td>
                                                    <td className="text-muted small">{track.album.name}</td>
                                                    <td className="text-end">
                                                        <a href={track.external_urls.spotify} target="_blank" rel="noreferrer" className="btn btn-sm btn-success rounded-pill px-3">
                                                            Apri <i className="bi bi-spotify"></i>
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}

export default App;