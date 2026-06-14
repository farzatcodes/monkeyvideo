import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, MessageSquare, MessageSquareOff, Send } from "lucide-react";

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
  { id: "1",  time: 2,  username: "Steve101",     userColor: "#FF6B6B", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Steve101",     text: "STOP 😂" },
  { id: "2",  time: 6,  username: "DebraV",       userColor: "#4ECDC4", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DebraV",       text: "Just STOP 👀" },
  { id: "3",  time: 10, username: "TomB",         userColor: "#FFD166", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TomB",         text: "We saw it! 😂" },
  { id: "4",  time: 15, username: "SarahJ",       userColor: "#06D6A0", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SarahJ",       text: "Nice try 😬" },
  { id: "5",  time: 20, username: "JeffM",        userColor: "#118AB2", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=JeffM",        text: "Nope 🔥" },
  { id: "6",  time: 25, username: "LindaB",       userColor: "#EF476F", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=LindaB",       text: "Still eating 😂" },
  { id: "7",  time: 30, username: "MikeFromOhio", userColor: "#F8961E", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MikeFromOhio", text: "That's not what happened 🔥" },
  { id: "8",  time: 35, username: "Carol77",      userColor: "#90BE6D", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol77",      text: "Nobody buying that 😂" },
  { id: "9",  time: 40, username: "Mark1972",     userColor: "#43AA8B", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mark1972",     text: "BIG PROBLEM 🤨" },
  { id: "10", time: 43, username: "JennyL",       userColor: "#577590", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=JennyL",       text: "Be serious 😳" },
];

const formatTime = (s) => {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

// ─── TTS ──────────────────────────────────────────────────────────────────────
let ttsVoice = null;
function loadVoice() {
  if (ttsVoice) return;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  ttsVoice =
    voices.find((v) => v.lang === "en-GB" && /daniel|oliver|george|male/i.test(v.name)) ||
    voices.find((v) => v.lang === "en-GB") ||
    voices.find((v) => v.lang.startsWith("en"));
}
function speakLine(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  loadVoice();
  const u = new SpeechSynthesisUtterance(text);
  if (ttsVoice) u.voice = ttsVoice;
  u.rate = 0.82; u.pitch = 0.72; u.volume = 1;
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
  const [isMuted,         setIsMuted]         = useState(true);
  const [currentTime,     setCurrentTime]     = useState(0);
  const [duration,        setDuration]        = useState(0);
  const [showChat,        setShowChat]        = useState(true);
  const [showControls,    setShowControls]    = useState(true);
  const [userInput,       setUserInput]       = useState("");

  const narratorLine = NARRATOR_LINES.find((l) => currentTime >= l.start && currentTime < l.end) ?? null;

  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoice;
      loadVoice();
    }
    return () => window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    if (!isPlaying || !narratorLine) { window.speechSynthesis.cancel(); return; }
    speakLine(narratorLine.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narratorLine?.start, isPlaying]);

  useEffect(() => {
    fetch("/comments.json")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setAllComments)
      .catch(() => setAllComments(MOCK_COMMENTS_JSON));
  }, []);

  useEffect(() => {
    setVisibleComments(
      [...allComments].filter((c) => c.time <= currentTime).sort((a, b) => a.time - b.time)
    );
  }, [allComments, currentTime]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [visibleComments]);

  const resetHideTimer = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (isPlaying) hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  };
  const toggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };
  const handleSeek = (e) => {
    e.stopPropagation();
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
        id: `user-${Date.now()}`,
        time: videoRef.current?.currentTime ?? currentTime,
        username: "You",
        userColor: "#818CF8",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=YouUser",
        text: userInput.trim(),
        isUser: true,
      },
    ]);
    setUserInput("");
  };

  const recentComments = visibleComments.slice(-4);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .seek-bar { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; width: 100%; }
        .seek-bar::-webkit-slider-runnable-track { height: 3px; background: rgba(255,255,255,0.3); border-radius: 2px; }
        .seek-bar::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 12px; height: 12px; border-radius: 50%;
          background: #fff; margin-top: -4.5px;
        }
        .seek-bar::-moz-range-track { height: 3px; background: rgba(255,255,255,0.3); border-radius: 2px; }
        .seek-bar::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #fff; border: none; }

        @keyframes riseUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .comment-rise { animation: riseUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .narrator-fade { animation: fadeIn 0.5s ease both; }
      `}</style>

      <div className="min-h-screen bg-black flex items-start justify-center">
        {/* Phone-width container */}
        <div className="w-full" style={{ maxWidth: 420 }}>

          {/* ── Video frame ────────────────────────────────────── */}
          <div
            className="relative w-full bg-black overflow-hidden"
            style={{ aspectRatio: "9/16" }}
            onClick={togglePlayPause}
            onMouseMove={resetHideTimer}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            <video
              ref={videoRef}
              src="/monkey.mp4"
              crossOrigin="anonymous"
              muted
              playsInline
              className="w-full h-full object-cover"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => { setIsPlaying(false); window.speechSynthesis?.cancel(); }}
            />

            {/* Pause icon — centre */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/40 backdrop-blur-sm rounded-full p-5">
                  <Play className="w-10 h-10 text-white fill-white" />
                </div>
              </div>
            )}

            {/* Narrator text — upper-centre of frame */}
            {narratorLine && (
              <div
                key={narratorLine.start}
                className="narrator-fade absolute inset-x-0 flex justify-center px-8 pointer-events-none"
                style={{ top: "36%" }}
              >
                <p
                  className="text-white text-center leading-snug text-lg font-semibold max-w-xs"
                  style={{
                    fontFamily: "'Georgia', serif",
                    fontStyle: "italic",
                    textShadow: "0 2px 12px rgba(0,0,0,1), 0 0 30px rgba(0,0,0,0.9)",
                  }}
                >
                  {narratorLine.text}
                </p>
              </div>
            )}

            {/* ── Gradient — blended, covers bottom 58% ── */}
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none"
              style={{
                height: "58%",
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.92) 15%, rgba(0,0,0,0.78) 30%, rgba(0,0,0,0.55) 48%, rgba(0,0,0,0.22) 68%, transparent 100%)",
              }}
            />

            {/* ── Comments — rise from bottom, above controls ── */}
            {showChat && (
              <div
                className="absolute inset-x-0 px-4 pointer-events-none"
                style={{ bottom: 64 }}
              >
                <div
                  ref={chatRef}
                  className="overflow-y-auto no-scrollbar space-y-3"
                  style={{ pointerEvents: "auto", maxHeight: "42%" }}
                >
                  {recentComments.map((c) => (
                    <div key={c.id} className="comment-rise flex items-start gap-3">
                      <img
                        src={c.avatar}
                        alt={c.username}
                        className="w-10 h-10 rounded-full flex-shrink-0 bg-slate-700"
                      />
                      <div>
                        <p
                          className="text-sm font-bold leading-tight"
                          style={{
                            color: c.userColor,
                            textShadow: "0 1px 6px rgba(0,0,0,0.8)",
                          }}
                        >
                          {c.username}{c.isUser ? " (You)" : ""}
                        </p>
                        <p
                          className="text-white text-sm leading-snug mt-0.5"
                          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}
                        >
                          {c.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Controls bar ── */}
            <div
              className={`absolute inset-x-0 bottom-0 px-4 pb-3 pt-2 transition-opacity duration-300 ${
                showControls || !isPlaying ? "opacity-100" : "opacity-0"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="range"
                className="seek-bar mb-2"
                min={0}
                max={duration || 100}
                step={0.05}
                value={currentTime}
                onChange={handleSeek}
              />
              <div className="flex items-center gap-3">
                <button onClick={(e) => { e.stopPropagation(); togglePlayPause(); }} className="text-white">
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                </button>
                <button onClick={toggleMute} className="text-white">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <span className="text-white/70 text-xs font-mono select-none">
                  {formatTime(currentTime)}<span className="mx-1 text-white/30">/</span>{formatTime(duration)}
                </span>
                <div className="flex-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); setShowChat((v) => !v); }}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                    showChat ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
                  }`}
                >
                  {showChat ? <MessageSquare className="w-3.5 h-3.5" /> : <MessageSquareOff className="w-3.5 h-3.5" />}
                  Chat
                </button>
              </div>
            </div>
          </div>

          {/* ── Comment count + input ────────────────────────── */}
          <div className="bg-black px-4 pt-3 pb-4 border-t border-white/5">
            <p className="text-white/40 text-xs mb-3">
              Comments · {visibleComments.length}
            </p>
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=YouUser"
                alt="You"
                className="w-9 h-9 rounded-full flex-shrink-0 bg-slate-800"
              />
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Write a comment…"
                className="flex-1 bg-white/8 text-white placeholder-white/30 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 border border-white/10 transition"
              />
              <button
                type="submit"
                disabled={!userInput.trim()}
                className="flex-shrink-0 text-white/40 hover:text-white disabled:opacity-30 transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}
