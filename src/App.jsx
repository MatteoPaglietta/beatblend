import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { analyze } from 'web-audio-beat-detector';
import jsmediatags from 'jsmediatags';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CLIENT_ID = "bbfc9788c582499bb4a34241b13bd6e8";
const CLIENT_SECRET = "d386e61727cb40dc88e4844b2354b80f";

function App() {
    const [accessToken, setAccessToken] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [audioData, setAudioData] = useState({ title: null, artist: null, bpm: null, keyName: null });
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const response = await fetch('https://accounts.spotify.com/api/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
                    },
                    body: 'grant_type=client_credentials'
                });
                const data = await response.json();
                setAccessToken(data.access_token);
            } catch (err) {
                console.error("Errore nel recupero del token Spotify:", err);
                setError("Impossibile connettersi a Spotify. Controlla Client ID e Secret.");
            }
        };

        fetchToken();
    }, []);

    const getTrackTags = (file) => {
        return new Promise((resolve) => {
            jsmediatags.read(file, {
                onSuccess: function (tag) {
                    resolve({
                        title: tag.tags.title || "",
                        artist: tag.tags.artist || ""
                    });
                },
                onError: function (error) {
                    console.log('Nessun tag ID3 trovato:', error.type, error.info);
                    resolve({ title: "", artist: "" });
                }
            });
        });
    };

    const getSpotifyAudioFeatures = async (title, artist, bpm) => {
        if (!accessToken) return null;

        const query = encodeURIComponent(`track:${title} artist:${artist}`);
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const searchData = await searchResponse.json();
        const track = searchData.tracks?.items[0];

        if (!track) {
            return null;
        }

        const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features/${track.id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const featuresData = await featuresResponse.json();

        const notaBase = NOTE_NAMES[featuresData.key];
        const tipoModo = featuresData.mode === 0 ? 'm' : '';

        return {
            keyName: `${notaBase}${tipoModo}`,
            spotifyKey: featuresData.key,
            spotifyMode: featuresData.mode,
            spotifyId: track.id
        };
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        const uploadedFile = acceptedFiles[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setLoading(true);
        setError(null);
        setAudioData({ title: null, artist: null, bpm: null, keyName: null });

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            const tempo = await analyze(audioBuffer);
            const roundedBpm = Math.round(tempo);

            const tags = await getTrackTags(uploadedFile);

            let trackTitle = tags.title || uploadedFile.name.replace(/\.[^/.]+$/, "");
            let trackArtist = tags.artist || "";

            const spotifyData = await getSpotifyAudioFeatures(trackTitle, trackArtist, roundedBpm);

            if (spotifyData) {
                setAudioData({
                    title: trackTitle,
                    artist: trackArtist,
                    bpm: roundedBpm,
                    keyName: spotifyData.keyName
                });
            } else {
                setAudioData({
                    title: trackTitle,
                    artist: trackArtist,
                    bpm: roundedBpm,
                    keyName: "Non trovata su Spotify"
                });
            }

        } catch (err) {
            console.error(err);
            setError("Errore durante l'analisi del file.");
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'audio/*': ['.mp3', '.wav', '.m4a'] },
        multiple: false
    });

    return (
        <div className="container py-5 text-white" style={{ minHeight: '100vh', backgroundColor: '#121212' }}>

            <header className="text-center mb-5">
                <h1 className="display-4 fw-bold text-success">BeatsBlend</h1>
                <p className="lead text-muted">Trova la traccia perfetta per il tuo prossimo mix armonico</p>
            </header>

            <div className="row justify-content-center">
                <div className="col-md-8">

                    <div {...getRootProps()} className={`p-5 text-center border border-2 rounded-3 ${isDragActive ? 'border-success bg-dark' : 'border-secondary'}`} style={{ cursor: 'pointer', borderStyle: 'dashed' }}>
                        <input {...getInputProps()} />
                        <p className="fs-5">Trascina qui il tuo file MP3 o <span className="text-success">clicca per cercarlo</span></p>
                    </div>

                    {error && <div className="alert alert-danger mt-4 text-center">{error}</div>}

                    {loading && (
                        <div className="text-center my-5">
                            <div className="spinner-border text-success" role="status"></div>
                            <p className="mt-2 text-muted">Identificazione traccia e analisi armonica...</p>
                        </div>
                    )}

                    {audioData.bpm && !loading && (
                        <div className="card bg-dark text-white border-secondary mt-5 p-4">
                            <h4 className="h5 mb-1 text-success">{audioData.title}</h4>
                            <p className="text-muted mb-4">{audioData.artist || "Artista Sconosciuto"}</p>

                            <div className="row text-center">
                                <div className="col-6 border-end border-secondary">
                                    <span className="text-muted d-block small fw-bold">TEMPO (REALE)</span>
                                    <span className="display-4 fw-bold text-white">{audioData.bpm}</span> <span className="text-muted">BPM</span>
                                </div>
                                <div className="col-6">
                                    <span className="text-muted d-block small fw-bold">TONALITÀ (SPOTIFY)</span>
                                    <span className="display-4 fw-bold text-info">{audioData.keyName}</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default App;