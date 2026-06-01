function LoadingState({ progress, fileName, phase = 'analysis' }) {
    const { current = 0, total = 0 } = progress || {};
    const isRecommendationsPhase = phase === 'recommendations';
    const hasProgress = total > 0;
    const cleanFileName = (fileName || '').replace(/\.[^/.]+$/, '').trim();
    const loadingLabel = cleanFileName ? `Analisi "${cleanFileName}" in corso...` : 'Analisi della traccia in corso...';

    return (
        <div className="neo-loading text-center my-4" role="status" aria-live="polite">
            <div className="pl" aria-hidden="true">
                <div className="pl__outer-ring"></div>
                <div className="pl__inner-ring"></div>
                <div className="pl__track-cover"></div>
                <div className="pl__ball">
                    <div className="pl__ball-texture"></div>
                    <div className="pl__ball-outer-shadow"></div>
                    <div className="pl__ball-inner-shadow"></div>
                    <div className="pl__ball-side-shadows"></div>
                </div>
            </div>
            {isRecommendationsPhase ? (
                <div className="mt-3">
                    <p className="mb-1 text-secondary">Cercando i mix migliori...</p>
                    {hasProgress ? (
                        <>
                            <div className="progress-track">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${Math.round((current / total) * 100)}%` }}
                                    aria-valuenow={current}
                                    aria-valuemin={0}
                                    aria-valuemax={total}
                                />
                            </div>
                            <p className="progress-label mt-1 mb-0">
                                <span className="accent-text fw-semibold">{current}</span>
                                <span className="text-secondary"> / {total}</span>
                            </p>
                        </>
                    ) : (
                        <p className="progress-label mt-1 mb-0 text-secondary">Preparazione risultati…</p>
                    )}
                </div>
            ) : (
                <p className="mt-3 mb-0 text-secondary">{loadingLabel}</p>
            )}
        </div>
    );
}

export default LoadingState;
