function AnalysisCard({ audioData, loading }) {
    if (!audioData?.bpm || loading) {
        return null;
    }

    return (
        <article className="neo-card mt-4" aria-label="Risultato analisi traccia">
            <header className="mb-4">
                <h2 className="h4 mb-1 text-white">{audioData.title}</h2>
                <p className="text-secondary mb-0">{audioData.artist}</p>
            </header>
            <div className="row g-3 text-center">
                <div className="col-12 col-sm-6">
                    <div className="neo-inset metric-box h-100">
                        <span className="metric-label d-block">BPM</span>
                        <span className="metric-value">{audioData.bpm}</span>
                    </div>
                </div>
                <div className="col-12 col-sm-6">
                    <div className="neo-inset metric-box h-100">
                        <span className="metric-label d-block">Tonalità</span>
                        <span className="metric-value accent-text">{audioData.keyName}</span>
                    </div>
                </div>
            </div>
        </article>
    );
}

export default AnalysisCard;
