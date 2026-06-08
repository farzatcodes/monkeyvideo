import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  MessageSquare,
  MessageSquareOff,
  Send,
} from "lucide-react";

// ─── Fallback data (used when /comments.json returns 404) ─────────────────────
const MOCK_COMMENTS_JSON = [
  { id: "1",  time: 2,  username: "DragonSlayer99",  userColor: "#FF6B6B", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DragonSlayer99",  text: "This is so epic! 🔥" },
  { id: "2",  time: 4,  username: "CodeWizard",       userColor: "#4ECDC4", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CodeWizard",       text: "The animation here is incredible" },
  { id: "3",  time: 6,  username: "PixelHunter",      userColor: "#45B7D1", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=PixelHunter",      text: "I've watched this like 50 times already lol" },
  { id: "4",  time: 8,  username: "StarGazer",        userColor: "#FFA500", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=StarGazer",        text: "The music sync is absolutely perfect ✨" },
  { id: "5",  time: 10, username: "NightOwl",         userColor: "#9B59B6", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=NightOwl",         text: "Sintel honestly deserves a full sequel" },
  { id: "6",  time: 12, username: "TechNerd42",       userColor: "#2ECC71", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TechNerd42",       text: "This scene gave me chills the first time" },
  { id: "7",  time: 15, username: "ArtLover",         userColor: "#E74C3C", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ArtLover",         text: "Blender Foundation releasing this for free is insane" },
  { id: "8",  time: 18, username: "FilmBuff",         userColor: "#F39C12", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=FilmBuff",         text: "The voice acting is surprisingly good" },
  { id: "9",  time: 21, username: "OpenSourceFan",    userColor: "#1ABC9C", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=OpenSourceFan",    text: "ALL MADE WITH OPEN SOURCE TOOLS 🙌" },
  { id: "10", time: 24, username: "RandomViewer",     userColor: "#3498DB", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=RandomViewer",     text: "Who else is here from a YouTube rabbit hole?" },
  { id: "11", time: 27, username: "MovieCritic",      userColor: "#E91E63", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MovieCritic",      text: "10/10 story told in under 15 minutes" },
  { id: "12", time: 31, username: "AnimeFan",         userColor: "#FF9800", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=AnimeFan",         text: "This hits different every single time" },
  { id: "13", time: 35, username: "DesignGuru",       userColor: "#00BCD4", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DesignGuru",       text: "The color grading in this scene is masterful 🎨" },
  { id: "14", time: 39, username: "MusicLover",       userColor: "#8BC34A", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MusicLover",       text: "Jan Morgenstern's score is absolutely incredible" },
  { id: "15", time: 43, username: "CasualViewer",     userColor: "#FF5722", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CasualViewer",     text: "I don't usually comment but WOW 😭" },
  { id: "16", time: 47, username: "3DModeler",        userColor: "#607D8B", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3DModeler",        text: "As a Blender user, the cloth sim here is insane" },
  { id: "17", time: 51, username: "PhilosophyBro",   userColor: "#9C27B0", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=PhilosophyBro",    text: "The themes of loss and revenge hit so deep" },
  { id: "18", time: 55, username: "FirstTimer",       userColor: "#4CAF50", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=FirstTimer",       text: "First watch ever — this is absolutely beautiful 🥺" },
  { id: "19", time: 58, username: "NostalgiaBro",     userColor: "#FF6B9D", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=NostalgiaBro",     text: "Been watching this since 2010, still perfect" },
  { id: "20", time: 62, username: "VFXStudent",       userColor: "#FFD700", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=VFXStudent",       text: "Studying this frame-by-frame for my uni project" },
];

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function App() {
  const videoRef     = useRef(null);
  const chatRef      = useRef(null);
  const hideTimer    = useRef(null);

  const [allComments,     setAllComments]     = useState([]);
  const [visibleComments, setVisibleComments] = useState([]);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [isMuted,         setIsMuted]         = useState(false);
  const [currentTime,     setCurrentTime]     = useState(0);
  const [duration,        setDuration]        = useState(0);
  const [showChat,        setShowChat]        = useState(true);
  const [showControls,    setShowControls]    = useState(true);
  const [userInput,       setUserInput]       = useState("");

  // Fetch comments; fall back to mock on any error
  useEffect(() => {
    fetch("/comments.json")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setAllComments)
      .catch(() => setAllComments(MOCK_COMMENTS_JSON));
  }, []);

  // Recompute visible comments whenever time or comment list changes
  useEffect(() => {
    setVisibleComments(
      [...allComments]
        .filter((c) => c.time <= currentTime)
        .sort((a, b) => a.time - b.time)
    );
  }, [allComments, currentTime]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [visibleComments]);

  // Auto-hide controls 3 s after last mouse move while playing
  const resetHideTimer = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (isPlaying) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Number(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    setAllComments((prev) => [
      ...prev,
      {
        id:       `user-${Date.now()}`,
        time:     videoRef.current?.currentTime ?? currentTime,
        username: "You",
        userColor:"#818CF8",
        avatar:   "https://api.dicebear.com/7.x/avataaars/svg?seed=YouUser",
        text:     userInput.trim(),
        isUser:   true,
      },
    ]);
    setUserInput("");
  };

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .seek-bar { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; width: 100%; }
        .seek-bar::-webkit-slider-runnable-track { height: 4px; background: rgba(255,255,255,0.25); border-radius: 2px; }
        .seek-bar::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: #818cf8; margin-top: -5px; transition: transform 0.1s;
        }
        .seek-bar:hover::-webkit-slider-thumb { transform: scale(1.35); }
        .seek-bar::-moz-range-track { height: 4px; background: rgba(255,255,255,0.25); border-radius: 2px; }
        .seek-bar::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #818cf8; border: none; }
      `}</style>

      <div className="min-h-screen bg-slate-950 flex flex-col items-center py-8 px-4">
        <div className="w-full max-w-4xl">

          {/* Header */}
          <div className="mb-5">
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
              Live<span className="text-indigo-400">Stream</span>{" "}
              <span className="text-slate-400 font-normal text-lg">Replay</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Monkey Documentary Roast — 875 live comments
            </p>
          </div>

          {/* Video container */}
          <div
            className="relative w-full rounded-xl overflow-hidden shadow-2xl bg-black ring-1 ring-white/10 cursor-pointer select-none"
            style={{ aspectRatio: "16/9" }}
            onMouseMove={resetHideTimer}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            onClick={togglePlayPause}
          >
            <video
              ref={videoRef}
              src="/monkey.mp4"
              crossOrigin="anonymous"
              className="w-full h-full object-contain"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Central play icon while paused */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 backdrop-blur-sm rounded-full p-5 ring-1 ring-white/20 shadow-2xl">
                  <Play className="w-10 h-10 text-white fill-white" />
                </div>
              </div>
            )}

            {/* Live chat overlay — bottom third */}
            {showChat && (
              <div className="absolute bottom-14 left-0 right-0 h-[38%] flex flex-col justify-end pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div
                  ref={chatRef}
                  className="relative z-10 overflow-y-auto no-scrollbar px-4 pb-3 space-y-1.5"
                  style={{ pointerEvents: "auto" }}
                >
                  {visibleComments.length === 0 && (
                    <p className="text-slate-500 text-xs italic">
                      Chat appears as the video plays…
                    </p>
                  )}
                  {visibleComments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <img
                        src={c.avatar}
                        alt={c.username}
                        className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 bg-slate-700"
                      />
                      <p className="text-xs leading-snug">
                        <span className="text-slate-400 mr-1">[{formatTime(c.time)}]</span>
                        <span className="font-semibold mr-1" style={{ color: c.userColor }}>
                          {c.username}{c.isUser ? " (You)" : ""}:
                        </span>
                        <span className="text-slate-100">{c.text}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom control bar */}
            <div
              className={`absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 bg-gradient-to-t from-black/95 to-transparent transition-opacity duration-300 ${
                showControls || !isPlaying ? "opacity-100" : "opacity-0"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Seek bar */}
              <input
                type="range"
                className="seek-bar mb-2"
                min={0}
                max={duration || 100}
                step={0.05}
                value={currentTime}
                onChange={handleSeek}
              />

              {/* Controls row */}
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayPause}
                  className="text-white hover:text-indigo-400 transition-colors"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying
                    ? <Pause className="w-5 h-5 fill-white" />
                    : <Play  className="w-5 h-5 fill-white" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="text-white hover:text-indigo-400 transition-colors"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted
                    ? <VolumeX className="w-5 h-5" />
                    : <Volume2 className="w-5 h-5" />}
                </button>

                <span className="text-slate-300 text-xs font-mono select-none">
                  {formatTime(currentTime)}
                  <span className="text-slate-600 mx-1">/</span>
                  {formatTime(duration)}
                </span>

                <div className="flex-1" />

                <button
                  onClick={() => setShowChat((v) => !v)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-md font-medium transition-all ${
                    showChat
                      ? "bg-indigo-600/80 hover:bg-indigo-600 text-white"
                      : "bg-white/10 hover:bg-white/20 text-slate-300"
                  }`}
                >
                  {showChat
                    ? <MessageSquare    className="w-3.5 h-3.5" />
                    : <MessageSquareOff className="w-3.5 h-3.5" />}
                  Chat
                </button>
              </div>
            </div>
          </div>

          {/* Comment input */}
          <div className="mt-4 bg-slate-900 rounded-xl p-4 shadow-xl ring-1 ring-white/5">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">
              Add a comment at{" "}
              <span className="text-indigo-400 font-mono">{formatTime(currentTime)}</span>
            </p>
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=YouUser"
                alt="You"
                className="w-8 h-8 rounded-full flex-shrink-0 bg-slate-700"
              />
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Say something…"
                className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
              />
              <button
                type="submit"
                disabled={!userInput.trim()}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-all"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}
