function TrackTable({ tracks }) {
    if (!tracks?.length) return <p className="text-secondary mb-0 ps-1">Nessun risultato in questa categoria.</p>;

    return (
        <div className="neo-card p-0 overflow-hidden">
            <div className="table-responsive">
                <table className="table neo-table align-middle mb-0">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Titolo</th>
                            <th>Artista</th>
                            <th className="text-center">BPM</th>
                            <th className="text-center">Tonalità</th>
                            <th className="text-end">Ascolta</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tracks.map((track, index) => (
                            <tr key={track.id}>
                                <td className="text-secondary">{index + 1}</td>
                                <td className="fw-semibold text-white">{track.title}</td>
                                <td className="text-info">{track.artist?.name}</td>
                                <td className="text-center fw-semibold">{track.bpm}</td>
                                <td className="text-center accent-text fw-semibold">{track.bpm_key}</td>
                                <td className="text-end">
                                    <a
                                        href={track.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn neo-btn btn-sm px-3"
                                        aria-label={`Apri ${track.title}`}
                                    >
                                        Apri Traccia
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RecommendationsTable({ recommendations }) {
    const { bothMatch = [], bpmOnly = [], keyOnly = [] } = recommendations || {};
    const total = bothMatch.length + bpmOnly.length + keyOnly.length;

    if (total === 0) return null;

    return (
        <section className="mt-4 mt-md-5" aria-label="Tracce consigliate">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
                <h3 className="h4 mb-0">Tracce consigliate</h3>
                <span className="table-count">{total} risultati</span>
            </div>

            <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="rec-badge rec-badge--both">BPM + Tonalità</span>
                    <span className="table-count">{bothMatch.length}</span>
                </div>
                <TrackTable tracks={bothMatch} />
            </div>

            <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="rec-badge rec-badge--bpm">Solo BPM</span>
                    <span className="table-count">{bpmOnly.length}</span>
                </div>
                <TrackTable tracks={bpmOnly} />
            </div>

            <div className="mb-2">
                <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="rec-badge rec-badge--key">Solo Tonalità</span>
                    <span className="table-count">{keyOnly.length}</span>
                </div>
                <TrackTable tracks={keyOnly} />
            </div>
        </section>
    );
}

export default RecommendationsTable;
