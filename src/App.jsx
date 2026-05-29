import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [audioData, setAudioData] = useState({ bpm: null, key: null });

  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);

    console.log("File ricevuto:", uploadedFile.name);
    
    setTimeout(() => {
      setLoading(false);
      setAudioData({ bpm: 124, key: '8A' });
    }, 2000);

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
          
          <div 
            {...getRootProps()} 
            className={`p-5 text-center border border-2 rounded-3 cp-pointer ${
              isDragActive ? 'border-success bg-dark' : 'border-secondary'
            }`}
            style={{ cursor: 'pointer', borderStyle: 'dashed !important', transition: '0.2s' }}
          >
            <input {...getInputProps()} />
            <i className="bi bi-cloud-upload display-3 text-secondary mb-3"></i>
            {isDragActive ? (
              <p className="fs-5 text-success">Lascia qui il file...</p>
            ) : (
              <p className="fs-5">Trascina qui il tuo file MP3 o <span className="text-success">clicca per cercarlo</span></p>
            )}
            <small className="text-muted">Supporta MP3, WAV, M4A</small>
          </div>

          {loading && (
            <div className="text-center my-5">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Analisi in corso...</span>
              </div>
              <p className="mt-2 text-muted">Analizzando la traccia (BPM & Key)...</p>
            </div>
          )}

          {audioData.bpm && !loading && (
            <div className="card bg-dark text-white border-secondary mt-5 p-4 animate__animated animate__fadeIn">
              <h3 className="h5 mb-3 text-muted">Traccia Analizzata: <span className="text-white">{file?.name}</span></h3>
              <div className="row text-center">
                <div className="col-6 border-end border-secondary">
                  <span className="text-muted d-block small uppercase fw-bold">TEMPO</span>
                  <span className="display-5 fw-bold text-success">{audioData.bpm}</span> <span className="text-muted">BPM</span>
                </div>
                <div className="col-6">
                  <span className="text-muted d-block small uppercase fw-bold">KEY (CAMELOT)</span>
                  <span className="display-5 fw-bold text-info">{audioData.key}</span>
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