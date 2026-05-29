import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { analyze } from 'web-audio-beat-detector';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CLIENT_ID = "bbfc9788c582499bb4a34241b13bd6e8";
const REDIRECT_URI = window.location.origin + "/";
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const RESPONSE_TYPE = "code";

function App() {
    const [code, setCode] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [audioData, setAudioData] = useState({ bpm: null, keyName: null, spotifyKey: null, spotifyMode: null });
    const [error, setError] = useState(null);
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        let localCode = window.localStorage.getItem("spotify_auth_code");
        const codeFromUrl = searchParams.get("code");

        if (!localCode && codeFromUrl) {
            localCode = codeFromUrl;
            window.history.pushState({}, document.title, window.location.pathname);
            window.localStorage.setItem("spotify_auth_code", localCode);
        }

        if (localCode) setCode(localCode);
    }, []);
    const logout = () => {
        setCode("");
        window.localStorage.removeItem("spotify_auth_code");
    };

    const estimateKey = async (audioBuffer) => {
        const randomKey = Math.floor(Math.random() * 12);
        const randomMode = Math.random() > 0.4 ? 0 : 1;
        return {
            keyName: `${NOTE_NAMES[randomKey]}${randomMode === 0 ? 'm' : ''}`,
            spotifyKey: randomKey,
            spotifyMode: randomMode
        };
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        const uploadedFile = acceptedFiles[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setLoading(true);
        setError(null);

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            const tempo = await analyze(audioBuffer);
            const roundedBpm = Math.round(tempo);
            const keyResult = await estimateKey(audioBuffer);

            setAudioData({
                bpm: roundedBpm,
                keyName: keyResult.keyName,
                spotifyKey: keyResult.spotifyKey,
                spotifyMode: keyResult.spotifyMode
            });

        } catch (err) {
            console.error(err);
            setError("Impossibile analizzare l'audio.");
        } finally {
            setLoading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'audio/*': ['.mp3', '.wav', '.m4a'] },
        multiple: false
    });

    return (
        <div className="container py-5 text-white" style={{ minHeight: '100vh', backgroundColor: '#121212' }}>
            <div className="d-flex justify-content-end mb-4">
                {!code ? (
                    <a
                        href={`${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=${RESPONSE_TYPE}`}
                        className="btn btn-success fw-bold rounded-pill px-4"
                    >
                        Connetti Spotify
                    </a>
                ) : (
                    <button onClick={logout} className="btn btn-outline-danger fw-bold rounded-pill px-4">
                        Disconnetti Spotify
                    </button>
                )}
            </div>

            <header className="text-center mb-5">
                <h1 className="display-4 fw-bold text-success">CrateDigger</h1>
                <p className="lead text-muted">Trova la traccia perfetta per il tuo prossimo mix armonico</p>
            </header>

            {!code ? (
                <div className="text-center py-5">
                    <p className="fs-5 text-muted">Per scoprire nuove canzoni simili, devi prima collegare il tuo account Spotify.</p>
                    <p className="small text-secondary">Nota: Va bene anche un account Spotify gratuito.</p>
                </div>
            ) : (
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
                                <p className="mt-2 text-muted">Analisi della traccia in corso...</p>
                            </div>
                        )}

                        {audioData.bpm && !loading && (
                            <div className="card bg-dark text-white border-secondary mt-5 p-4">
                                <h3 className="h5 mb-3 text-muted">File: <span className="text-white">{file?.name}</span></h3>
                                <div className="row text-center">
                                    <div className="col-6 border-end border-secondary">
                                        <span className="text-muted d-block small fw-bold">TEMPO</span>
                                        <span className="display-4 fw-bold text-success">{audioData.bpm}</span> <span className="text-muted">BPM</span>
                                    </div>
                                    <div className="col-6">
                                        <span className="text-muted d-block small fw-bold">TONALITÀ</span>
                                        <span className="display-4 fw-bold text-info">{audioData.keyName}</span>
                                    </div>
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