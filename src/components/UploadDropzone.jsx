import { useDropzone } from 'react-dropzone';

function UploadDropzone({ onDrop }) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'audio/*': ['.mp3', '.wav', '.m4a'] },
        multiple: false,
    });

    return (
        <section className="mb-3" aria-label="Caricamento traccia audio">
            <div
                {...getRootProps()}
                className={`neo-dropzone ${isDragActive ? 'is-active' : ''}`}
                role="button"
                tabIndex={0}
                aria-label="Area upload file audio"
            >
                <input {...getInputProps()} aria-label="Seleziona un file audio" />
                <p className="fs-5 fw-semibold mb-2">Trascina qui il tuo file MP3, WAV o M4A</p>
                <p className="mb-0 text-secondary">oppure <span className="accent-text">clicca per selezionarlo</span></p>
            </div>
        </section>
    );
}

export default UploadDropzone;
