import { useEffect, useState } from 'react';
import './App.css';
import AppHeader from './components/AppHeader';
import UploadDropzone from './components/UploadDropzone';
import ErrorAlert from './components/ErrorAlert';
import LoadingState from './components/LoadingState';
import AnalysisCard from './components/AnalysisCard';
import RecommendationsTable from './components/RecommendationsTable';
import ThemeToggle from './components/ThemeToggle';
import FloatingPlayer from './components/FloatingPlayer';
import { useTrackAnalysis } from './hooks/useTrackAnalysis';

function App() {
    const { file, loading, error, audioData, recommendations, progress, onDrop } = useTrackAnalysis();
    const [theme, setTheme] = useState(() => {
        const storedTheme = localStorage.getItem('bb-theme');
        if (storedTheme === 'light' || storedTheme === 'dark') {
            return storedTheme;
        }

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('bb-theme', theme);
    }, [theme]);

    const handleThemeSelect = (selectedTheme) => {
        if (selectedTheme === theme) {
            return;
        }

        setTheme(selectedTheme);
    };

    const playerTitle = file?.name?.replace(/\.[^/.]+$/, '').trim();

    return (
        <main className="app-shell">
            <div className="container py-4 py-md-5">
                <div className="row justify-content-center">
                    <div className="col-12 col-lg-10 col-xl-9">
                        <div className="d-flex justify-content-end mb-3">
                            <ThemeToggle theme={theme} onSelectTheme={handleThemeSelect} />
                        </div>
                        <AppHeader />
                        <section className="neo-surface p-3 p-md-4" aria-label="Analisi traccia audio">
                            <UploadDropzone onDrop={onDrop} />
                            <ErrorAlert message={error} />
                            {loading && <LoadingState progress={progress} fileName={file?.name} />}
                            <AnalysisCard audioData={audioData} loading={loading} />
                            <RecommendationsTable recommendations={recommendations} />
                            {file && <p className="file-badge mt-3 mb-0">File caricato: {file.name}</p>}
                        </section>
                    </div>
                </div>
            </div>
            <FloatingPlayer
                file={file}
                title={playerTitle}
                artist={audioData?.artist}
            />
        </main>
    );
}

export default App;