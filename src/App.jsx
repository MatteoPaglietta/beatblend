import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { analyze } from 'web-audio-beat-detector';
import jsmediatags from 'jsmediatags';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [audioData, setAudioData] = useState({ title: null, artist: null, bpm: null, keyName: null });
  const [error, setError] = useState(null);

  const getTrackTags = (file) => {
    return new Promise((resolve) => {
      jsmediatags.read(file, {
        onSuccess: function(tag) {
          resolve({
            title: tag.tags.title || "",
            artist: tag.tags.artist || ""
          });
        },
        onError: function() {
          resolve({ title: "", artist: "" });
        }
      });
    });
  };

  const analyzeKeyFromBuffer = async (audioBuffer) => {
    const bufferLength = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    
    let chromaEnergies = new Array(12).fill(0);
    
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const step = Math.floor(bufferLength / 2000);
      
      for (let i = 0; i < bufferLength; i += step) {
        const sample = channelData[i];
        if (Math.abs(sample) > 0.01) {
          const pseudoFreq = Math.abs(sample) * audioBuffer.sampleRate;
          const noteIndex = Math.floor((12 * Math.log2(pseudoFreq / 440) + 69) % 12);
          if (!isNaN(noteIndex) && noteIndex >= 0 && noteIndex < 12) {
            chromaEnergies[noteIndex] += Math.abs(sample);
          }
        }
      }
    }

    const maxEnergy = Math.max(...chromaEnergies);
    let dominantKeyIndex = chromaEnergies.indexOf(maxEnergy);
    
    const minorThird = (dominantKeyIndex + 3) % 12;
    const majorThird = (dominantKeyIndex + 4) % 12;
    const isMinor = chromaEnergies[minorThird] > chromaEnergies[majorThird];
    if (dominantKeyIndex < 0 || dominantKeyIndex > 11) dominantKeyIndex = 0;

    return {
      keyName: `${NOTE_NAMES[dominantKeyIndex]}${isMinor ? 'm' : ''}`
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

      const calculatedKey = await analyzeKeyFromBuffer(audioBuffer);

      const tags = await getTrackTags(uploadedFile);
      let trackTitle = tags.title || uploadedFile.name.replace(/\.[^/.]+$/, "");
      let trackArtist = tags.artist || "Artista Sconosciuto";

      setAudioData({
        title: trackTitle,
        artist: trackArtist,
        bpm: roundedBpm,
        keyName: calculatedKey.keyName
      });

    } catch (err) {
      console.error(err);
      setError("Errore durante l'analisi dell'audio. Prova con un altro brano.");
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
      <header className="text-center mb-5">
        <h1 className="display-4 fw-bold text-success">CrateDigger</h1>
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
              <p className="mt-2 text-muted">Analisi spettrografica del brano...</p>
            </div>
          )}

          {audioData.bpm && !loading && (
            <div className="card bg-dark text-white border-secondary mt-5 p-4">
              <h4 className="h5 mb-1 text-success">{audioData.title}</h4>
              <p className="text-muted mb-4">{audioData.artist}</p>
              
              <div className="row text-center">
                <div className="col-6 border-end border-secondary">
                  <span className="text-muted d-block small fw-bold">TEMPO RILEVATO</span>
                  <span className="display-4 fw-bold text-white">{audioData.bpm}</span> <span className="text-muted">BPM</span>
                </div>
                <div className="col-6">
                  <span className="text-muted d-block small fw-bold">TONALITÀ RILEVATA</span>
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