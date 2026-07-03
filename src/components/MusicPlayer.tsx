import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Shuffle, 
  Repeat, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  /** Đặt file MP3 vào thư mục public/music/ và điền tên file tại đây, ví dụ: '/music/dao-nay.mp3' */
  src: string;
  cover: string;
  durationText: string;
}

// ─── DANH SÁCH NHẠC ────────────────────────────────────────────────────────────
// Chỉ thêm bài nhạc bạn muốn ở đây.
// Để thêm bài: đặt file .mp3 vào thư mục "public/music/" rồi điền tên file bên dưới.
const PLAYLIST: Track[] = [
  {
    id: '1',
    title: 'Dạo Này',
    artist: 'Obito',
    src: '/music/dao-nay.mp3',          // ← Đặt file "dao-nay.mp3" vào public/music/
    cover: 'https://i.scdn.co/image/ab67616d0000b273fe5c0f1cd12023e6c4c65a0b',
    durationText: '4:44'
  },
  // Thêm bài mới tại đây theo cùng cấu trúc trên
];
// ───────────────────────────────────────────────────────────────────────────────

export const MusicPlayer: React.FC = () => {
  const [trackIndex, setTrackIndex] = useState(0);
  const activeTrack = PLAYLIST[trackIndex];
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [audioError, setAudioError] = useState(false);

  // Sync volume to audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // When track changes, reload and resume if was playing
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioError(false);
    setCurrentTime(0);
    setDuration(0);
    audio.load();
    if (wasPlayingRef.current) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [trackIndex]);

  const handlePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      wasPlayingRef.current = false;
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
        wasPlayingRef.current = true;
      } catch (err) {
        console.warn('Audio play failed:', err);
        setIsPlaying(false);
      }
    }
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    wasPlayingRef.current = isPlaying;
    if (isShuffle) {
      setTrackIndex(Math.floor(Math.random() * PLAYLIST.length));
    } else {
      setTrackIndex((prev) => (prev + 1) % PLAYLIST.length);
    }
  }, [isShuffle, isPlaying]);

  const handlePrev = useCallback(() => {
    wasPlayingRef.current = isPlaying;
    // If past 3 seconds, restart current track instead
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setTrackIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
  }, [isPlaying]);

  const handleEnded = useCallback(() => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else {
      wasPlayingRef.current = true;
      handleNext();
    }
  }, [isRepeat, handleNext]);

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleAudioError = () => {
    setAudioError(true);
    setIsPlaying(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) audioRef.current.currentTime = val;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) audioRef.current.volume = val;
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) audioRef.current.volume = newMuted ? 0 : volume;
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={activeTrack.src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleAudioError}
        preload="metadata"
      />

      <style>{`
        @keyframes spin-vinyl {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes player-pop {
          0%   { opacity: 0; transform: translateY(16px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .music-player-root {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
        }

        /* ── Mini Pill ── */
        .music-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px 8px 8px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(0, 0, 0, 0.09);
          border-radius: 50px;
          box-shadow: 0 6px 28px rgba(0, 0, 0, 0.11), 0 2px 6px rgba(0, 0, 0, 0.06);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          animation: player-pop 0.35s ease both;
          min-width: 195px;
          user-select: none;
        }
        .music-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 36px rgba(0, 0, 0, 0.14), 0 4px 10px rgba(0, 0, 0, 0.08);
        }
        .vinyl {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          position: relative;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        }
        .vinyl img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          animation: spin-vinyl 7s linear infinite;
          animation-play-state: paused;
        }
        .vinyl img.spinning { animation-play-state: running; }
        .vinyl::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.4);
        }
        .pill-info { flex: 1; min-width: 0; }
        .pill-info h5 {
          font-size: 12px;
          font-weight: 700;
          color: #1D1D1F;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pill-info p {
          font-size: 10px;
          color: #8E8E93;
          margin: 1px 0 0 0;
          white-space: nowrap;
        }
        .pill-play {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #1D1D1F;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.15s, background 0.15s;
          color: white;
        }
        .pill-play:hover { transform: scale(1.12); background: #3a3a3c; }
        .pill-expand {
          background: transparent;
          border: none;
          color: #B0B0B5;
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
          transition: color 0.15s;
        }
        .pill-expand:hover { color: #1D1D1F; }

        /* ── Error State ── */
        .pill-error {
          font-size: 10px;
          color: #FF3B30;
          padding: 2px 0 0 0;
        }

        /* ── Expanded Card ── */
        .music-card {
          background: rgba(255, 255, 255, 0.93);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 22px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.14), 0 6px 18px rgba(0, 0, 0, 0.07);
          padding: 18px 18px 16px;
          width: 290px;
          animation: player-pop 0.3s ease both;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .card-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #8E8E93;
        }
        .card-collapse {
          width: 26px;
          height: 26px;
          background: rgba(0,0,0,0.05);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #8E8E93;
          transition: all 0.15s;
        }
        .card-collapse:hover { background: rgba(0,0,0,0.1); color: #1D1D1F; }

        .card-album {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        }
        .card-album img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          animation: spin-vinyl 14s linear infinite;
          animation-play-state: paused;
          display: block;
        }
        .card-album img.spinning { animation-play-state: running; }

        .card-track-info { margin-bottom: 12px; }
        .card-track-info h4 {
          font-size: 15px;
          font-weight: 700;
          color: #1D1D1F;
          margin: 0 0 3px;
        }
        .card-track-info p {
          font-size: 12px;
          color: #8E8E93;
          margin: 0;
        }

        /* Progress */
        .progress-area { margin-bottom: 14px; }
        .progress-track {
          position: relative;
          height: 4px;
          background: rgba(0,0,0,0.09);
          border-radius: 4px;
          margin-bottom: 5px;
        }
        .progress-fill {
          height: 100%;
          background: #1D1D1F;
          border-radius: 4px;
          pointer-events: none;
          transition: width 0.1s linear;
        }
        .progress-range {
          position: absolute;
          top: -8px;
          left: 0;
          width: 100%;
          height: 20px;
          opacity: 0;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
        }
        .progress-times {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #8E8E93;
          font-family: 'SF Mono', monospace;
        }

        /* Controls */
        .controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          margin-bottom: 14px;
        }
        .ctrl {
          background: transparent;
          border: none;
          color: #AEAEB2;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 0.15s, transform 0.15s;
        }
        .ctrl:hover { color: #1D1D1F; transform: scale(1.1); }
        .ctrl.on { color: #1D1D1F; }
        .play-btn {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: #1D1D1F;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #fff;
          box-shadow: 0 4px 16px rgba(0,0,0,0.22);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .play-btn:hover { transform: scale(1.07); box-shadow: 0 8px 22px rgba(0,0,0,0.28); }
        .play-btn:active { transform: scale(0.95); }

        /* Volume */
        .vol-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .vol-slider {
          flex: 1;
          height: 3px;
          border-radius: 3px;
          background: rgba(0,0,0,0.1);
          cursor: pointer;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          accent-color: #1D1D1F;
        }
        .vol-slider::-webkit-slider-thumb {
          appearance: none;
          -webkit-appearance: none;
          width: 13px;
          height: 13px;
          background: #1D1D1F;
          border-radius: 50%;
          cursor: pointer;
        }

        /* Error banner */
        .error-banner {
          font-size: 11px;
          color: #FF3B30;
          background: rgba(255,59,48,0.08);
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 10px;
          line-height: 1.4;
        }
      `}</style>

      <div className="music-player-root">

        {/* ── Mini Pill ── */}
        {!isExpanded && (
          <div className="music-pill" onClick={() => setIsExpanded(true)}>
            <div className="vinyl">
              <img
                src={activeTrack.cover}
                alt="album"
                className={isPlaying ? 'spinning' : ''}
              />
            </div>

            <div className="pill-info">
              <h5>{activeTrack.title}</h5>
              <p>{isPlaying ? 'Đang phát · ' + activeTrack.artist : activeTrack.artist}</p>
              {audioError && <div className="pill-error">⚠ Không tải được file nhạc</div>}
            </div>

            <button
              className="pill-play"
              onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
              title={isPlaying ? 'Tạm dừng' : 'Phát'}
            >
              {isPlaying
                ? <Pause size={13} fill="white" />
                : <Play size={13} fill="white" style={{ marginLeft: '1px' }} />
              }
            </button>

            <button
              className="pill-expand"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
            >
              <ChevronUp size={15} />
            </button>
          </div>
        )}

        {/* ── Expanded Card ── */}
        {isExpanded && (
          <div className="music-card">
            <div className="card-header">
              <span className="card-label">🎵 Nhạc nền</span>
              <button className="card-collapse" onClick={() => setIsExpanded(false)}>
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Album */}
            <div className="card-album">
              <img
                src={activeTrack.cover}
                alt="Album Cover"
                className={isPlaying ? 'spinning' : ''}
              />
            </div>

            {/* Track info */}
            <div className="card-track-info">
              <h4>{activeTrack.title}</h4>
              <p>{activeTrack.artist}</p>
            </div>

            {/* Error */}
            {audioError && (
              <div className="error-banner">
                ⚠ Không tải được file nhạc.<br />
                Hãy đặt file <strong>dao-nay.mp3</strong> vào thư mục <code>public/music/</code>
              </div>
            )}

            {/* Progress */}
            <div className="progress-area">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
                <input
                  type="range"
                  className="progress-range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                />
              </div>
              <div className="progress-times">
                <span>{formatTime(currentTime)}</span>
                <span>{duration > 0 ? formatTime(duration) : activeTrack.durationText}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="controls">
              <button
                className={`ctrl${isShuffle ? ' on' : ''}`}
                onClick={() => setIsShuffle(!isShuffle)}
                title="Ngẫu nhiên"
              >
                <Shuffle size={15} />
              </button>

              <button className="ctrl" onClick={handlePrev} title="Bài trước / Phát lại">
                <SkipBack size={20} />
              </button>

              <button className="play-btn" onClick={handlePlayPause}>
                {isPlaying
                  ? <Pause size={20} fill="white" />
                  : <Play size={20} fill="white" style={{ marginLeft: '2px' }} />
                }
              </button>

              <button className="ctrl" onClick={handleNext} title="Bài tiếp">
                <SkipForward size={20} />
              </button>

              <button
                className={`ctrl${isRepeat ? ' on' : ''}`}
                onClick={() => setIsRepeat(!isRepeat)}
                title="Lặp lại"
              >
                <Repeat size={15} />
              </button>
            </div>

            {/* Volume */}
            <div className="vol-row">
              <button className="ctrl" onClick={toggleMute}>
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                className="vol-slider"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
