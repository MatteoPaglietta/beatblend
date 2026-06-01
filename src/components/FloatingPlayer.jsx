import { useEffect, useMemo, useRef, useState } from "react";

function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return "00:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function IconPlay() {
    return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>;
}

function IconPause() {
    return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor" /></svg>;
}

function IconBackward() {
    return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 6v12L3 12zm10 0v12l-8-6z" fill="currentColor" /></svg>;
}

function IconForward() {
    return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13 6v12l8-6zM3 6v12l8-6z" fill="currentColor" /></svg>;
}

function IconVolume({ muted, volume }) {
    if (muted || volume === 0) {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 9v6h4l5 4V5L9 9z" fill="currentColor" />
                <path d="M17 9l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 9v6h4l5 4V5L9 9z" fill="currentColor" />
            <path d="M16 9.5a4 4 0 0 1 0 5m2.5-7.5a7 7 0 0 1 0 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
    );
}

function FloatingPlayer({ file, title }) {
    const audioRef = useRef(null);
    const titleViewportRef = useRef(null);
    const titleTextRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.85);
    const [volumeBeforeMute, setVolumeBeforeMute] = useState(0.85);
    const [isMuted, setIsMuted] = useState(false);
    const [isVolumeOpen, setIsVolumeOpen] = useState(false);
    const [isVolumeMounted, setIsVolumeMounted] = useState(false);
    const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
    const [titleShift, setTitleShift] = useState(0);
    const volumePopoverRef = useRef(null);
    const volumeCloseTimerRef = useRef(null);
    const volumeFadeTimerRef = useRef(null);
    const closeVolumePopoverRef = useRef(null);

    const objectUrl = useMemo(() => {
        if (!file) return null;
        return URL.createObjectURL(file);
    }, [file]);

    useEffect(() => {
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [objectUrl]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !objectUrl) return;
        audio.currentTime = 0;
        setCurrentTime(0);
        setDuration(0);
        const playPromise = audio.play();
        if (playPromise?.then) {
            playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
    }, [objectUrl]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = volume;
    }, [volume]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.muted = isMuted;
    }, [isMuted]);

    useEffect(() => {
        const onDocumentPointerDown = (event) => {
            if (!volumePopoverRef.current) return;
            if (!volumePopoverRef.current.contains(event.target)) {
                closeVolumePopoverRef.current?.();
            }
        };

        document.addEventListener('pointerdown', onDocumentPointerDown);
        return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
    }, []);

    useEffect(() => {
        return () => {
            if (volumeCloseTimerRef.current) {
                clearTimeout(volumeCloseTimerRef.current);
            }
            if (volumeFadeTimerRef.current) {
                clearTimeout(volumeFadeTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (volumeCloseTimerRef.current) {
            clearTimeout(volumeCloseTimerRef.current);
            volumeCloseTimerRef.current = null;
        }

        if (!isVolumeOpen) {
            return;
        }

        volumeCloseTimerRef.current = setTimeout(() => {
            closeVolumePopoverRef.current?.();
        }, 3000);

        return () => {
            if (volumeCloseTimerRef.current) {
                clearTimeout(volumeCloseTimerRef.current);
                volumeCloseTimerRef.current = null;
            }
        };
    }, [isVolumeOpen]);

    const displayedTitle = title || file?.name || '';

    useEffect(() => {
        const measureTitleOverflow = () => {
            const viewport = titleViewportRef.current;
            const text = titleTextRef.current;
            if (!viewport || !text) {
                setIsTitleOverflowing(false);
                setTitleShift(0);
                return;
            }

            const overflowWidth = Math.ceil(text.scrollWidth - viewport.clientWidth);
            const hasOverflow = overflowWidth > 2;

            setIsTitleOverflowing(hasOverflow);
            setTitleShift(hasOverflow ? overflowWidth + 24 : 0);
        };

        measureTitleOverflow();
        window.addEventListener('resize', measureTitleOverflow);

        let resizeObserver;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(measureTitleOverflow);
            if (titleViewportRef.current) resizeObserver.observe(titleViewportRef.current);
            if (titleTextRef.current) resizeObserver.observe(titleTextRef.current);
        }

        return () => {
            window.removeEventListener('resize', measureTitleOverflow);
            if (resizeObserver) resizeObserver.disconnect();
        };
    }, [displayedTitle]);

    if (!file || !objectUrl) return null;

    const closeVolumePopover = () => {
        setIsVolumeOpen(false);
        if (volumeCloseTimerRef.current) {
            clearTimeout(volumeCloseTimerRef.current);
            volumeCloseTimerRef.current = null;
        }
        if (volumeFadeTimerRef.current) {
            clearTimeout(volumeFadeTimerRef.current);
        }
        volumeFadeTimerRef.current = setTimeout(() => {
            setIsVolumeMounted(false);
            volumeFadeTimerRef.current = null;
        }, 180);
    };

    closeVolumePopoverRef.current = closeVolumePopover;

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            try {
                await audio.play();
                setIsPlaying(true);
            } catch {
                setIsPlaying(false);
            }
        } else {
            audio.pause();
            setIsPlaying(false);
        }
    };

    const seekRelative = (seconds) => {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(audio.duration)) return;
        const next = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration);
        audio.currentTime = next;
        setCurrentTime(next);
    };

    const onSeek = (event) => {
        const audio = audioRef.current;
        if (!audio) return;
        const next = Number(event.target.value);
        audio.currentTime = next;
        setCurrentTime(next);
    };

    const onLoadedMetadata = () => {
        const audio = audioRef.current;
        if (!audio) return;
        setDuration(audio.duration || 0);
    };

    const onTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio) return;
        setCurrentTime(audio.currentTime || 0);
    };

    const onEnded = () => setIsPlaying(false);

    const restartAutoCloseTimer = () => {
        if (volumeCloseTimerRef.current) {
            clearTimeout(volumeCloseTimerRef.current);
        }
        volumeCloseTimerRef.current = setTimeout(() => {
            closeVolumePopover();
        }, 3000);
    };

    const openVolumePopover = () => {
        if (volumeFadeTimerRef.current) {
            clearTimeout(volumeFadeTimerRef.current);
            volumeFadeTimerRef.current = null;
        }
        setIsVolumeMounted(true);
        setIsVolumeOpen(true);
    };

    const onVolumeChange = (event) => {
        const next = Number(event.target.value);
        setVolume(next);
        if (isMuted && next > 0) setIsMuted(false);
        restartAutoCloseTimer();
    };

    const toggleMute = () => {
        if (isMuted) {
            setVolume(volumeBeforeMute);
            setIsMuted(false);
        } else {
            setVolumeBeforeMute(volume);
            setVolume(0);
            setIsMuted(true);
        }
    };

    const isTouchDevice = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    const onVolumeIconClick = () => {
        if (isTouchDevice()) {
            toggleMute();
            return;
        }

        if (!isVolumeMounted) {
            openVolumePopover();
            restartAutoCloseTimer();
            return;
        }

        if (!isVolumeOpen) {
            openVolumePopover();
            restartAutoCloseTimer();
            return;
        }

        toggleMute();
        restartAutoCloseTimer();
    };

    return (
        <aside className="floating-player" aria-label="Player traccia caricata">
            <audio ref={audioRef} src={objectUrl} preload="metadata" onLoadedMetadata={onLoadedMetadata} onTimeUpdate={onTimeUpdate} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={onEnded} />
            <div className="floating-player__meta">
                <div
                    ref={titleViewportRef}
                    className={`floating-player__title-viewport${isTitleOverflowing ? ' is-overflowing' : ''}`}
                    style={{ '--title-shift': `${titleShift}px` }}
                >
                    <strong ref={titleTextRef} className="floating-player__title" title={displayedTitle}>{displayedTitle}</strong>
                </div>
            </div>
            <div className="floating-player__timeline">
                <span className="floating-player__time">{formatTime(currentTime)}</span>
                <input className="floating-player__range" type="range" min={0} max={duration || 0} value={Math.min(currentTime, duration || 0)} step={0.1} onChange={onSeek} aria-label="Posizione brano" />
                <span className="floating-player__time">-{formatTime(Math.max(duration - currentTime, 0))}</span>
            </div>
            <div className="floating-player__controls">
                <button type="button" className="floating-player__btn floating-player__btn--icon" onClick={() => seekRelative(-10)} aria-label="Indietro 10 secondi">
                    <IconBackward />
                </button>
                <button type="button" className="floating-player__btn floating-player__btn--play floating-player__btn--icon" onClick={togglePlay} aria-label={isPlaying ? "Metti in pausa" : "Riproduci"}>
                    {isPlaying ? <IconPause /> : <IconPlay />}
                </button>
                <button type="button" className="floating-player__btn floating-player__btn--icon" onClick={() => seekRelative(10)} aria-label="Avanti 10 secondi">
                    <IconForward />
                </button>
                <div className="floating-player__volume-wrap" ref={volumePopoverRef}>
                    <button type="button" className="floating-player__btn floating-player__btn--icon" onClick={onVolumeIconClick} aria-label={isMuted ? "Attiva audio" : "Disattiva audio"} aria-expanded={isVolumeOpen}>
                        <IconVolume muted={isMuted} volume={volume} />
                    </button>
                    {isVolumeMounted && (
                        <div className={`floating-player__volume-popover${isVolumeOpen ? ' is-open' : ''}`} role="dialog" aria-label="Controllo volume" onPointerDown={restartAutoCloseTimer}>
                            <input id="player-volume" className="floating-player__volume floating-player__volume--vertical" type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={onVolumeChange} aria-label="Volume" />
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

export default FloatingPlayer;
