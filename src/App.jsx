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

// ─── Narrator script ──────────────────────────────────────────────────────────
const NARRATOR_LINES = [
  { start:  0, end:  5, text: "Gathered within a small social cluster, several members of the troop engage in routine interaction while a dominant male focuses on replenishing his energy reserves." },
  { start:  5, end: 10, text: "The younger offspring remain close to their caretakers, protected by a network of maternal supervision that has evolved over countless generations." },
  { start: 10, end: 15, text: "One female without dependent offspring approaches the group, apparently displaying an interest in the well-being of the younger members." },
  { start: 15, end: 20, text: "Among many primate species, such interactions provide opportunities for social learning and help strengthen bonds within the troop." },
  { start: 20, end: 25, text: "Not all mothers participate equally. One female chooses to remain somewhat detached from the central gathering, maintaining a cautious distance." },
  { start: 25, end: 30, text: "The younger monkeys continue to attract considerable attention, illustrating their importance to the long-term success of the group." },
  { start: 30, end: 35, text: "The dominant male remains remarkably focused despite the increasing social activity occurring around him." },
  { start: 35, end: 40, text: "Although minor disagreements occasionally emerge, such interactions are a normal component of troop life and rarely disrupt overall stability." },
  { start: 40, end: 44, text: "As the encounter draws to a close, the group gradually settles into a more balanced state, demonstrating the resilience of highly social primates." },
];

// ─── Fallback comment data ────────────────────────────────────────────────────
const MOCK_COMMENTS_JSON = [
  { id: "1",  time: 2,  username: "Steve101",  userColor: "#FF6B6B", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Steve101",  text: "STOP 😂" },
  { id: "2",  time: 6,  username: "DebraV",    userColor: "#4ECDC4", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DebraV",    text: "Just STOP 👀" },
  { id: "3",  time: 10, username: "TomB",      userColor: "#FFD166", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TomB",      text: "We saw it! 😂" },
  { id: "4",  time: 15, username: "SarahJ",    userColor: "#06D6A0", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SarahJ",    text: "Nice try 😬" },
  { id: "5",  time: 20, username: "JeffM",     userColor: "#118AB2", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=JeffM",     text: "Nope 🔥" },
  { id: "6",  time: 25, username: "LindaB",    userColor: "#EF476F", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=LindaB",    text: "Still eating 😂" },
  { id: "7",  time: 30, username: "MikeFromOhio", userColor: "#F8961E", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MikeFromOhio", text: "That's not what happened 🔥" },
  { id: "8",  time: 35, username: "Carol77",   userColor: "#90BE6D", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol77",   text: "Nobody buying that 😂" },
  { id: "9",  time: 40, username: "Mark1972",  userColor: "#43AA8B", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mark1972",  text: "BIG PROBLEM 🤨" },
  { id: "10", time: 43, username: "JennyL",    userColor: "#577590", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=JennyL",    text: "Be serious 😳" },
];

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// ─── TTS helper ───────────────────────────────────────────────────────────────
let ttsVoice = null;

function loadTTSVoice() {
  if (ttsVoice) return;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  ttsVoice =
    voices.find((v) => v.lang === "en-GB" && /male|daniel|oliver|george/i.test(v.name)) ||
    voices.find((v) => v.lang === "en-GB") ||
    voices.find((v) => v.lang.startsWith("en"));
}

function speakLine(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  loadTTSVoice();
  const u = new SpeechSynthesisUtterance(text);
  if (ttsVoice) u.voice = ttsVoice;
  u.rate   = 0.82;
  u.pitch  = 0.72;
  u.volume = 1.0;
  window.speechSynthesis.speak(u);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function App() {
  const videoRef  = useRef(null);
  const chatRef   = useRef(null);
  const hideTimer = useRef(null);

  const [allComments,     setAllComments]     = useState([]);
  const [visibleComments, setVisibleComments] = useState([]);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [isMuted,         setIsMuted]         = useState(true);   // video starts muted
  const [currentTime,     setCurrentTime]     = useState(0);
  const [duration,        setDuration]        = useState(0);
  const [showChat,        setShowChat]        = useState(true);
  const [showControls,    setShowControls]    = useState(true);
  const [userInput,       setUserInput]       = useState("");

  const narratorLine = NARRATOR_LINES.find(
    (l) => currentTime >= l.start && currentTime < l.end
  ) ?? null;

  // Pre-load TTS voices as soon as they're available
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadTTSVoice;
      loadTTSVoice();
    }
    return () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); };
  }, []);

  // Speak narrator line when it changes (and video is playing)
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    if (!isPlaying || !narratorLine) {
      window.speechSynthesis.cancel();
      return;
    }
    speakLine(narratorLine.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narratorLine?.start, isPlaying]);

  // Fetch comments; fall back to mock on any error
  useEffect(() => {
    fetch("/comments.json")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setAllComments)
      .catch(() => setAllComments(MOCK_COMMENTS_JSON));
  }, []);

  // Filter to comments whose timestamp has passed
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
    window.speechSynthesis?.cancel();
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

  // Show only the most recent comments so the rising effect stays clean
  const recentComments = visibleComments.slice(-8);

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

        @keyframes riseUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .comment-rise { animation: riseUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
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
              Monkey Documentary Roast — 40 live comments
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
            {/* Video — muted by default, volume controlled separately from mute toggle */}
            <video
              ref={videoRef}
              src="/monkey.mp4"
              crossOrigin="anonymous"
              muted
              className="w-full h-full object-contain"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => { setIsPlaying(false); window.speechSynthesis?.cancel(); }}
            />

            {/* Central play icon while paused */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 backdrop-blur-sm rounded-full p-5 ring-1 ring-white/20 shadow-2xl">
                  <Play className="w-10 h-10 text-white fill-white" />
                </div>
              </div>
            )}

            {/* ── Unified gradient overlay — covers bottom 60%, blended not cropped ── */}
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-none"
              style={{
                height: "60%",
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.88) 18%, rgba(0,0,0,0.70) 36%, rgba(0,0,0,0.40) 55%, rgba(0,0,0,0.12) 72%, transparent 100%)",
              }}
            />

            {/* Narrator subtitle */}
            {narratorLine && (
              <div className="absolute bottom-[30%] left-0 right-0 flex justify-center px-6 pointer-events-none">
                <p
                  className="text-center text-white text-sm sm:text-base leading-relaxed tracking-wide max-w-2xl"
                  style={{
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    textShadow: "0 1px 8px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.8)",
                    fontStyle: "italic",
                  }}
                >
                  {narratorLine.text}
                </p>
              </div>
            )}

            {/* Live chat — rises from bottom */}
            {showChat && (
              <div
                className="absolute left-0 right-0 px-4 pb-[3.5rem] pointer-events-none"
                style={{ bottom: 0 }}
              >
                <div
                  ref={chatRef}
                  className="overflow-y-auto no-scrollbar space-y-1.5 max-h-[28%]"
                  style={{ pointerEvents: "auto" }}
                >
                  {recentComments.length === 0 && isPlaying && (
                    <p className="text-slate-500 text-xs italic">
                      Chat appears as the video plays…
                    </p>
                  )}
                  {recentComments.map((c) => (
                    <div key={c.id} className="comment-rise flex items-start gap-2">
                      <img
                        src={c.avatar}
                        alt={c.username}
                        className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 bg-slate-700"
                      />
                      <p className="text-xs leading-snug drop-shadow-md">
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
              className={`absolute bottom-0 left-0 right-0 px-4 pb-3 pt-4 transition-opacity duration-300 ${
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
