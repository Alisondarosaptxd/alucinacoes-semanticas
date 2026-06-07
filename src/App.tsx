import React, { useState, useEffect, useRef } from "react";
import { 
  Music, 
  Tv, 
  Image as ImageIcon, 
  Folder, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Radio, 
  Sliders, 
  Volume2, 
  Sparkles,
  RefreshCw,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Track, GalleryItem, FeaturedTrack, GameplayItem } from "./types";

export default function App() {
  // Navigation State
  // "home" (visual archive), "playlist" (curated songs), "gameplays" (retro visual CRT), "archive" (grid explore)
  const [activeTab, setActiveTab] = useState<"home" | "playlist" | "gameplays" | "archive">("home");

  // Last.fm & Scrobble States
  const [lastfmUser, setLastfmUser] = useState("Alison__R");
  const [currentUserInput, setCurrentUserInput] = useState("Alison__R");
  const [scrobbleTrack, setScrobbleTrack] = useState<Track | null>(null);
  const [scrobbleError, setScrobbleError] = useState<string | null>(null);
  const [isScrobbleLoading, setIsScrobbleLoading] = useState(false);

  // Gallery States
  const [images, setImages] = useState<GalleryItem[]>([]);
  const homeImages = images.slice(0, 12);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Featured Track Configuration
  const [featuredTrack, setFeaturedTrack] = useState<FeaturedTrack>({
    title: "Carnival of Rust",
    artist: "Poets of the Fall",
    spotifyId: "3S27v6S8p0Z7WzS0zG4G82",
    spotifyUrl: "https://open.spotify.com/intl-pt/track/3S27v6S8p0Z7WzS0zG4G82",
    coverUrl: "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?auto=format&fit=crop&w=400&q=80"
  });

  // Gameplays dynamically loaded and synced from the user's Notion database!
  const [gameplays, setGameplays] = useState<GameplayItem[]>([]);
  const [isGameplaysLoading, setIsGameplaysLoading] = useState(true);
  const [gameplaysError, setGameplaysError] = useState<string | null>(null);
  const [selectedGameplayIdx, setSelectedGameplayIdx] = useState(0);

  // Retro Simulated CRT and Neural Synth States
  const [synthOn, setSynthOn] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [glitchIntensity, setGlitchIntensity] = useState(50);
  const [crtFilterMode, setCrtFilterMode] = useState<"normal" | "amber" | "green" | "cyber">("cyber");
  const [synthFrequency, setSynthFrequency] = useState(55);
  const [synthDetune, setSynthDetune] = useState(15);
  const [filterQ, setFilterQ] = useState(4);
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<{ osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronise base synthesizer frequency on gameplay selector shift
  useEffect(() => {
    let baseFreq = 55;
    if (gameplays[selectedGameplayIdx]) {
      const title = gameplays[selectedGameplayIdx].title.toLowerCase();
      if (title.includes("sky")) baseFreq = 73.42; 
      else if (title.includes("silent") || title.includes("metro")) baseFreq = 41.20; 
      else if (title.includes("yume")) baseFreq = 65.41; 
      else if (title.includes("fallout") || title.includes("bully")) baseFreq = 48.99; 
      else if (title.includes("batman")) baseFreq = 51.91; 
      else if (title.includes("creed")) baseFreq = 58.27; 
    }
    setSynthFrequency(baseFreq);
  }, [selectedGameplayIdx, gameplays]);

  // Web Audio Synth procedural atmospheric drone startup/cleanup
  useEffect(() => {
    if (synthOn) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gainNode = ctx.createGain();

        osc1.type = "sawtooth";
        osc2.type = "triangle";

        // Initial setup
        osc1.frequency.setValueAtTime(synthFrequency, ctx.currentTime);
        osc2.frequency.setValueAtTime(synthFrequency * 1.5, ctx.currentTime);
        osc1.detune.setValueAtTime(-synthDetune, ctx.currentTime);
        osc2.detune.setValueAtTime(synthDetune, ctx.currentTime);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(400, ctx.currentTime);
        filter.Q.setValueAtTime(filterQ, ctx.currentTime);

        // Slow cinematic filter sweep envelope LFO
        const filterSweep = () => {
          if (!audioContextRef.current) return;
          try {
            const now = ctx.currentTime;
            filter.frequency.setValueAtTime(filter.frequency.value, now);
            filter.frequency.exponentialRampToValueAtTime(150 + Math.random() * 500, now + 1.8);
          } catch (_) {}
        };
        const sweepInterval = setInterval(filterSweep, 2000);

        // Slow warm fade-in
        gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.6); // Gentle cozy volume

        // Connections
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start();
        osc2.start();

        synthNodesRef.current = { osc1, osc2, gain: gainNode, filter };

        return () => {
          clearInterval(sweepInterval);
          try {
            osc1.stop();
            osc2.stop();
            ctx.close();
          } catch (_) {}
          audioContextRef.current = null;
          synthNodesRef.current = null;
        };
      } catch (e) {
        console.warn("Retina Neural Synth failed to start:", e);
      }
    } else {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (_) {}
        audioContextRef.current = null;
        synthNodesRef.current = null;
      }
    }
  }, [synthOn]);

  // Dynamically update active synth audio nodes in-place to prevent click stuttering during sweeps
  useEffect(() => {
    if (synthOn && synthNodesRef.current && audioContextRef.current) {
      try {
        const { osc1, osc2, filter } = synthNodesRef.current;
        const now = audioContextRef.current.currentTime;
        // Smoothly ramp transitions to filter out high-frequency click transients
        osc1.frequency.exponentialRampToValueAtTime(Math.max(1, synthFrequency), now + 0.155);
        osc2.frequency.exponentialRampToValueAtTime(Math.max(1, synthFrequency * 1.5), now + 0.155);
        osc1.detune.linearRampToValueAtTime(-synthDetune, now + 0.11);
        osc2.detune.linearRampToValueAtTime(synthDetune, now + 0.11);
        filter.Q.linearRampToValueAtTime(Math.max(0.1, filterQ), now + 0.11);
      } catch (_) {}
    }
  }, [synthFrequency, synthDetune, filterQ, synthOn]);

  // Procedural CRT rendering loops for HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    // Use standard 16:9 pixel grid for genuine retro feel
    canvas.width = 480;
    canvas.height = 270;

    // Particle pool
    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];
    const initParticles = (count: number) => {
      particles.length = 0;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.0,
          vy: (Math.random() - 0.5) * 1.0,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.4 + 0.3
        });
      }
    };

    const activeGame = gameplays[selectedGameplayIdx];
    const title = activeGame?.title?.toLowerCase() || "";
    
    // Choose theme visual paradigm based on active game characteristics
    let pattern: "cosmic" | "horror" | "psychedelic" | "matrix" | "radar" | "animus" | "general" = "general";
    if (title.includes("sky")) pattern = "cosmic";
    else if (title.includes("silent") || title.includes("metro")) pattern = "horror";
    else if (title.includes("yume")) pattern = "psychedelic";
    else if (title.includes("fallout") || title.includes("bully") || title.includes("stranded")) pattern = "matrix";
    else if (title.includes("batman")) pattern = "radar";
    else if (title.includes("creed")) pattern = "animus";

    initParticles(pattern === "cosmic" ? 50 : pattern === "horror" ? 30 : pattern === "animus" ? 40 : 25);

    const render = () => {
      frame++;
      
      // Clear screen base
      ctx.fillStyle = "#0c0a09"; // Dark stone base
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply Filter Tints based on user selected crtFilterMode
      let mainColor = "#06b6d4"; // default cyber cyan
      let secondaryColor = "#f43f5e"; // default cyber rose
      if (crtFilterMode === "amber") {
        mainColor = "#f59e0b"; // retro terminal amber
        secondaryColor = "#d97706";
      } else if (crtFilterMode === "green") {
        mainColor = "#22c55e"; // classic green phosphorus
        secondaryColor = "#16a34a";
      } else if (crtFilterMode === "normal") {
        mainColor = "#e2e8f0"; // monochrome slate
        secondaryColor = "#94a3b8";
      } else if (crtFilterMode === "cyber") {
        mainColor = "#06b6d4";
        secondaryColor = "#ec4899";
      }

      // Draw active procedural pattern
      if (pattern === "cosmic") {
        // Deep Space Constellation Web
        particles.forEach((p, index) => {
          p.x += p.vx * 0.3;
          p.y += p.vy * 0.3;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

          ctx.fillStyle = `${mainColor}${Math.floor(p.alpha * 255).toString(16).padStart(2, "0")}`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          // draw mesh lines
          for (let j = index + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 50) {
              ctx.strokeStyle = `${mainColor}${Math.floor((1 - dist / 50) * 35).toString(16).padStart(2, "0")}`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        });

        // Pulsing core gravitational horizon
        const pulse = 45 + Math.sin(frame * 0.04) * 10;
        ctx.strokeStyle = `${secondaryColor}66`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `${mainColor}aa`;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, pulse * 0.4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `${mainColor}bf`;
        ctx.font = "italic 8px monospace";
        ctx.fillText("STATUS_FEED: SINC_UNIVERSAL_COSMIC", 20, 25);
        ctx.fillText(`WARP_INDEX: ${(4.12 + Math.sin(frame * 0.012) * 0.04).toFixed(3)} L.Y.`, 20, 37);

      } else if (pattern === "horror") {
        // Psychological tension oscilloscope heartbeat
        ctx.strokeStyle = `${secondaryColor}dd`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(20, canvas.height / 2);
        for (let x = 20; x < canvas.width - 20; x++) {
          let y = canvas.height / 2;
          const dist = Math.abs(x - canvas.width / 2);
          if (dist < 60) {
            const beatCycle = (frame * 0.04) % Math.PI;
            if (beatCycle < 0.6) {
              y += Math.sin(x * 0.4 + frame * 0.4) * Math.sin(beatCycle * Math.PI) * 32;
            }
          } else {
            y += Math.sin(x * 0.03 + frame * 0.1) * 1.5;
          }
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        if (Math.random() < 0.15) {
          ctx.strokeStyle = `${secondaryColor}22`;
          ctx.beginPath();
          const scanY = Math.random() * canvas.height;
          ctx.moveTo(0, scanY);
          ctx.lineTo(canvas.width, scanY);
          ctx.stroke();
        }

        ctx.fillStyle = `${secondaryColor}cc`;
        ctx.font = "bold 8px monospace";
        ctx.fillText("CONEXÃO_MATE_CEREBRAL: ALTA_TENSÃO", 20, 25);
        ctx.fillText(`PULSO: ${64 + Math.round(Math.sin(frame * 0.03) * 5)} bpm`, 20, 37);

      } else if (pattern === "psychedelic") {
        // Pulsing pixel plasma grid kaleidoscope
        const sz = 16;
        for (let x = 0; x < canvas.width; x += sz) {
          for (let y = 0; y < canvas.height; y += sz) {
            const value = Math.sin(x * 0.015 + frame * 0.03) * Math.cos(y * 0.01 + frame * 0.02) + Math.cos((x - y) * 0.008);
            const rawIntensity = Math.floor((value + 1) * 110);
            
            ctx.fillStyle = crtFilterMode === "normal"
              ? `#${rawIntensity.toString(16).padStart(2, "0")}${rawIntensity.toString(16).padStart(2, "0")}${rawIntensity.toString(16).padStart(2, "0")}`
              : `#${Math.floor(rawIntensity * 0.3).toString(16).padStart(2, "0")}${Math.floor(rawIntensity * 0.8).toString(16).padStart(2, "0")}${rawIntensity.toString(16).padStart(2, "0")}`;
            ctx.fillRect(x + 2, y + 2, sz - 3, sz - 3);
          }
        }

        ctx.fillStyle = "#ffffffdf";
        ctx.font = "bold 8px monospace";
        ctx.fillText("PORTAL_ONÍRICO: ABERTO_GRID_PLASMA", 20, 25);

      } else if (pattern === "matrix") {
        // Digital falling code streams
        ctx.fillStyle = `${mainColor}1b`;
        particles.forEach(p => {
          p.y += 2.0;
          if (p.y > canvas.height) {
            p.y = 0;
            p.x = Math.random() * canvas.width;
          }
          ctx.font = "7px monospace";
          ctx.fillText(String.fromCharCode(33 + Math.floor(Math.random() * 80)), p.x, p.y);
        });

        ctx.strokeStyle = `${mainColor}33`;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        ctx.fillStyle = mainColor;
        ctx.font = "bold 8px monospace";
        ctx.fillText("SISTEMA: DIAGNÓSTICO_TERMINAL", 22, 26);
        ctx.fillText(`ALOCAÇÃO_VRAM: ${(1024 + Math.sin(frame * 0.01) * 200).toFixed(0)} KB | BUFFER_SAVE: OK`, 22, 38);

      } else if (pattern === "radar") {
        // High fidelity circular tactical radar
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const rad = 90;

        ctx.strokeStyle = `${mainColor}22`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.arc(cx, cy, rad * 0.6, 0, Math.PI * 2);
        ctx.arc(cx, cy, rad * 0.3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx - rad - 5, cy); ctx.lineTo(cx + rad + 5, cy);
        ctx.moveTo(cx, cy - rad - 5); ctx.lineTo(cx, cy + rad + 5);
        ctx.stroke();

        const sweepAngle = (frame * 0.018) % (Math.PI * 2);
        ctx.strokeStyle = `${mainColor}cc`;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweepAngle) * rad, cy + Math.sin(sweepAngle) * rad);
        ctx.stroke();

        // Targets response representation on sweep crossing
        particles.forEach(p => {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const d = Math.hypot(dx, dy);
          if (d < rad) {
            const pAngle = Math.atan2(dy, dx);
            let diff = sweepAngle - pAngle;
            if (diff < 0) diff += Math.PI * 2;
            if (diff < 0.5) {
              ctx.fillStyle = `${secondaryColor}${Math.floor((1 - diff / 0.5) * 255).toString(16).padStart(2, "0")}`;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });

        ctx.fillStyle = mainColor;
        ctx.font = "bold 8px monospace";
        ctx.fillText("SONAR_TÁTICO_ATIVADO: DETECÇÃO", 20, 25);

      } else if (pattern === "animus") {
        // Cyan geometry grid
        ctx.strokeStyle = `${mainColor}0f`;
        const tw = 40;
        for (let i = 0; i < canvas.width + tw; i += tw) {
          ctx.beginPath();
          ctx.moveTo(i, 0); ctx.lineTo(i - tw / 2, canvas.height);
          ctx.moveTo(i, 0); ctx.lineTo(i + tw / 2, canvas.height);
          ctx.stroke();
        }

        particles.forEach(p => {
          p.x += p.vx * 1.5;
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;

          ctx.strokeStyle = `${mainColor}33`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 10, p.y);
          ctx.stroke();
        });

        ctx.fillStyle = mainColor;
        ctx.font = "bold 8px monospace";
        ctx.fillText("RELAXADOR_ANIMUS_MESA_NÚCLEO", 20, 25);
        ctx.fillText(`NÍVEL_SINC: ${(88.42 + Math.sin(frame * 0.004) * 5.5).toFixed(2)}%`, 20, 37);

      } else {
        // Synthwave perspective infinite grid and sunset
        const hz = canvas.height * 0.65;

        // Perspective roads
        ctx.strokeStyle = `${mainColor}22`;
        for (let x = -80; x <= canvas.width + 80; x += 45) {
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2, hz);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        // Horizontal scrolling bars
        const offset = (frame * 1.2) % 20;
        for (let y = hz; y < canvas.height; y += 10) {
          const relativeY = y + (offset * ((y - hz) / (canvas.height - hz)));
          if (relativeY < canvas.height) {
            ctx.strokeStyle = `${mainColor}${Math.floor(((relativeY - hz) / (canvas.height - hz)) * 120).toString(16).padStart(2, "0")}`;
            ctx.beginPath();
            ctx.moveTo(0, relativeY);
            ctx.lineTo(canvas.width, relativeY);
            ctx.stroke();
          }
        }

        // Neon sunset
        const rSun = 34;
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, hz - 2, rSun, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = "#0c0a09";
        for (let sy = hz - rSun; sy < hz; sy += 4.5) {
          ctx.fillRect(canvas.width / 2 - rSun - 5, sy, rSun * 2 + 10, 1.2 + (hz - sy) * 0.06);
        }

        ctx.fillStyle = mainColor;
        ctx.font = "bold 8px monospace";
        ctx.fillText("SIMULADOR_VETORIAL_AMBIENTE", 20, 26);
      }

      // Render horizontal screen roll distortion & glitches
      const baseProb = 0.012;
      const currentProb = baseProb * (glitchIntensity / 50);
      if (glitchActive || (glitchIntensity > 0 && Math.random() < currentProb)) {
        const maxRows = Math.max(1, Math.floor(4 * (glitchIntensity / 50)));
        const rowsCount = Math.floor(Math.random() * maxRows) + 2;
        for (let k = 0; k < rowsCount; k++) {
          const rowH = Math.random() * 12 + 4;
          const locY = Math.random() * (canvas.height - rowH);
          const offsetDistX = (Math.random() - 0.5) * (40 * (glitchIntensity / 50));
          ctx.drawImage(canvas, 0, locY, canvas.width, rowH, offsetDistX, locY, canvas.width, rowH);
        }
      }

      // Outer bezel dark edge vignetting
      ctx.strokeStyle = `${mainColor}14`;
      ctx.lineWidth = 14;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [selectedGameplayIdx, gameplays, glitchActive, crtFilterMode, glitchIntensity]);

  // Custom visual carousel horizontal scroll state
  const [sliderIndex, setSliderIndex] = useState(0);

  // Pre-configured aesthetic playlist - actual top 5 tracks from Alison__R's Last.fm profile
  const curatedPlaylist = [
    {
      title: "Carnival of Rust",
      artist: "Poets of the Fall",
      spotifyId: "3S27v6S8p0Z7WzS0zG4G82",
      genre: "Alternative Rock / Indie",
      album: "Carnival of Rust",
      coverUrl: "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?auto=format&fit=crop&w=400&q=80"
    },
    {
      title: "Дорога",
      artist: "Auktyon",
      spotifyId: "6H6W9n07yOidI9pYjG3Tj6",
      genre: "Russian Rock / Avant-Garde",
      album: "Птица",
      coverUrl: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=400&q=80"
    },
    {
      title: "Between the Bars",
      artist: "Elliott Smith",
      spotifyId: "2Y9zoC7n6A3v7IDgVE67g8",
      genre: "Indie Singer-Songwriter / Folk",
      album: "Either/Or",
      coverUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=80"
    },
    {
      title: "Two Cents Worth",
      artist: "Kansas",
      spotifyId: "5lE3O1MvKWhB9Zp73E9uWq",
      genre: "Progressive Rock / Art Rock",
      album: "Masque",
      coverUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=400&q=80"
    },
    {
      title: "Cherry Blossom Girl",
      artist: "Air",
      spotifyId: "3K69q9p8Y8zYfXkMc87m9b",
      genre: "Downtempo / Electronic / Synthpop",
      album: "Talkie Walkie",
      coverUrl: "https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=400&q=80"
    }
  ];

  // Fetch Gallery Images
  const fetchGallery = async () => {
    setIsGalleryLoading(true);
    try {
      const response = await fetch("/api/notion-gallery");
      if (!response.ok) throw new Error("Erro na rede");
      const data = await response.json();
      if (data && data.images) {
        setImages(data.images);
      }
    } catch (err) {
      console.error("Falha ao carregar API da galeria, usando fallbacks:", err);
      // Fallback local caso o endpoint falhe
      const fallbackList: GalleryItem[] = [
        {
          id: "f1",
          url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=80",
          title: "Sintonia Retrofuturista",
          category: "Estético",
          date: "01/06/2026"
        },
        {
          id: "f2",
          url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
          title: "Caminho Neon Vaporwave",
          category: "Vaporwave",
          date: "28/05/2026"
        },
        {
          id: "f3",
          url: "https://images.unsplash.com/photo-1542640244-7e672d6cef21?auto=format&fit=crop&w=1200&q=80",
          title: "Escada Rolante Solitária",
          category: "Liminar",
          date: "24/05/2026"
        },
        {
          id: "f4",
          url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=1200&q=80",
          title: "Terminal Metropolitano Vazio",
          category: "Liminar",
          date: "19/05/2026"
        },
        {
          id: "f5",
          url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80",
          title: "Poste de Luz na Meia-Noite",
          category: "Misterioso",
          date: "14/05/2026"
        },
        {
          id: "f6",
          url: "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=1200&q=80",
          title: "Ilusão Espectral Roxa",
          category: "Abstrato",
          date: "10/05/2026"
        },
        {
          id: "f7",
          url: "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=1200&q=80",
          title: "Corredor do Abismo",
          category: "Liminar",
          date: "05/05/2026"
        },
        {
          id: "f8",
          url: "https://images.unsplash.com/photo-1504701954957-2390f806e9f4?auto=format&fit=crop&w=1200&q=80",
          title: "Cais Encoberto pela Névoa",
          category: "Nostalgia",
          date: "01/05/2026"
        }
      ];
      setImages(fallbackList);
    } finally {
      setIsGalleryLoading(false);
    }
  };

  const fetchGameplays = async () => {
    setIsGameplaysLoading(true);
    setGameplaysError(null);
    try {
      const response = await fetch("/api/notion-gameplays");
      if (!response.ok) throw new Error("Falha no acoplamento de rede com Notion.");
      const data = await response.json();
      if (data && data.items) {
        setGameplays(data.items);
      } else {
        throw new Error("Sinal de gameplays corrompido.");
      }
    } catch (err: any) {
      console.error("Falha ao sincronizar gameplays do Notion:", err);
      setGameplaysError(err.message || "Erro desconhecido");
    } finally {
      setIsGameplaysLoading(false);
    }
  };

  // Fetch scrobbles transparently with a resilient client-side fallback
  const fetchScrobbles = async (username: string) => {
    setIsScrobbleLoading(true);
    setScrobbleError(null);
    try {
      const response = await fetch(`/api/lastfm?user=${encodeURIComponent(username)}`);
      if (!response.ok) throw new Error("Status inválido no proxy");
      const data = await response.json();
      
      const track = data.recenttracks?.track?.[0];
      if (track) {
        const isLive = track["@attr"]?.nowplaying === "true";
        const cover = track.image?.find((img: any) => img.size === "medium")?.[
          "#text"
        ] || track.image?.[2]?.["#text"] || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=100&q=80";

        setScrobbleTrack({
          name: track.name,
          artist: track.artist?.["#text"] || "Artista Desconhecido",
          cover: cover,
          isLive: isLive
        });
      } else {
        setScrobbleTrack(null);
      }
    } catch (err: any) {
      console.warn("Falha no proxy, tentando requisição direta client-side:", err);
      try {
        const apiKey = "29305d8bd3eda88f769fa007c62ec4f4";
        const directUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${encodeURIComponent(apiKey)}&format=json&limit=1`;
        
        const directResponse = await fetch(directUrl);
        if (!directResponse.ok) throw new Error("Falha também no fetch direto");
        const dataDirect = await directResponse.json();
        
        const track = dataDirect.recenttracks?.track?.[0];
        if (track) {
          const isLive = track["@attr"]?.nowplaying === "true";
          const cover = track.image?.find((img: any) => img.size === "medium")?.[
            "#text"
          ] || track.image?.[2]?.["#text"] || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=100&q=80";

          setScrobbleTrack({
            name: track.name,
            artist: track.artist?.["#text"] || "Artista Desconhecido",
            cover: cover,
            isLive: isLive
          });
        } else {
          setScrobbleTrack(null);
        }
      } catch (directErr: any) {
        console.error("Falha em ambos os métodos de fetch do Last.fm:", directErr);
        setScrobbleError("Indisponível");
      }
    } finally {
      setIsScrobbleLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
    fetchGameplays();
    fetchScrobbles(lastfmUser);

    // Dynamic timer to keep scrobbles updated, similar to original HTML index
    const interval = setInterval(() => {
      fetchScrobbles(lastfmUser);
    }, 45000);

    return () => clearInterval(interval);
  }, [lastfmUser]);

  // Handle Carousel navigation
  const handleNextSlide = () => {
    if (!homeImages.length) return;
    setSliderIndex((prev: number) => (prev + 1) % homeImages.length);
  };

  const handlePrevSlide = () => {
    if (!homeImages.length) return;
    setSliderIndex((prev: number) => (prev - 1 + homeImages.length) % homeImages.length);
  };

  // Lightbox navigation
  const handleNextLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex === null || !images.length) return;
    setSelectedImageIndex((selectedImageIndex + 1) % images.length);
  };

  const handlePrevLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex === null || !images.length) return;
    setSelectedImageIndex((selectedImageIndex - 1 + images.length) % images.length);
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      if (e.key === "Escape") setSelectedImageIndex(null);
      if (e.key === "ArrowRight") setSelectedImageIndex((selectedImageIndex + 1) % images.length);
      if (e.key === "ArrowLeft") setSelectedImageIndex((selectedImageIndex - 1 + images.length) % images.length);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageIndex, images]);

  // Submit User switch
  const handleUserSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUserInput.trim()) {
      setLastfmUser(currentUserInput.trim());
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen text-brand-text relative select-none">
      
      {/* SIDEBAR */}
      <aside 
        id="side-bar"
        className="w-full md:w-[286px] shrink-0 bg-[#040405]/94 md:fixed md:inset-y-0 md:left-0 border-b md:border-b-0 md:border-r border-brand-line p-6 md:py-8 md:px-7 flex flex-col justify-between backdrop-blur-xl z-20"
      >
        <div>
          {/* Logo / Header Area */}
          <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-0 md:mb-8 mb-5">
            <div className="relative">
              <motion.img 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                src="https://i.pinimg.com/736x/20/b2/37/20b237388a6ee1845de7c2d31d069d23.jpg" 
                alt="Alucinações Semânticas" 
                className="w-14 h-14 md:w-[74px] md:h-[74px] rounded-none object-cover border border-brand-aqua glow-amber-sm" 
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-brand-aqua border border-black" />
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-brand-aqua border border-black" />
            </div>
            <div className="md:mt-5 text-left">
              <h1 className="font-display text-2xl md:text-[1.86rem] leading-none tracking-wider text-brand-aqua font-bold">
                Alucinações<br />Semânticas
              </h1>
              <p className="text-[10px] md:text-[11px] text-brand-muted uppercase tracking-[0.2em] font-mono mt-1 md:mt-2">
                // AUGMENTED_SENSES
              </p>
            </div>
          </div>

          <div className="h-[1px] bg-brand-line my-4 md:my-5"></div>

          {/* Navigation Links */}
          <nav className="grid grid-cols-2 gap-2 md:flex md:flex-col md:gap-1.5 font-mono" aria-label="Navegação principal">
            <button 
              id="nav-home"
              onClick={() => setActiveTab("home")}
              className={`flex items-center gap-3 px-3 py-2 rounded text-xs md:text-[13px] tracking-widest cursor-pointer border transition-all uppercase ${
                activeTab === "home" 
                  ? "bg-brand-aqua/10 border-brand-aqua text-brand-aqua font-bold glow-amber-sm" 
                  : "border-transparent text-brand-soft hover:border-brand-line hover:bg-white/4 hover:text-brand-text"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Home
            </button>
            <button 
              id="nav-playlist"
              onClick={() => setActiveTab("playlist")}
              className={`flex items-center gap-3 px-3 py-2 rounded text-xs md:text-[13px] tracking-widest cursor-pointer border transition-all uppercase ${
                activeTab === "playlist" 
                  ? "bg-brand-aqua/10 border-brand-aqua text-brand-aqua font-bold glow-amber-sm" 
                  : "border-transparent text-brand-soft hover:border-brand-line hover:bg-white/4 hover:text-brand-text"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              Playlist
            </button>
            <button 
              id="nav-gameplay"
              onClick={() => setActiveTab("gameplays")}
              className={`flex items-center gap-3 px-3 py-2 rounded text-xs md:text-[13px] tracking-widest cursor-pointer border transition-all uppercase ${
                activeTab === "gameplays" 
                  ? "bg-brand-aqua/10 border-brand-aqua text-brand-aqua font-bold glow-amber-sm" 
                  : "border-transparent text-brand-soft hover:border-brand-line hover:bg-white/4 hover:text-brand-text"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              Gameplays
            </button>
            <button 
              id="nav-archive"
              onClick={() => setActiveTab("archive")}
              className={`flex items-center gap-3 px-3 py-2 rounded text-xs md:text-[13px] tracking-widest cursor-pointer border transition-all uppercase ${
                activeTab === "archive" 
                  ? "bg-brand-aqua/10 border-brand-aqua text-brand-aqua font-bold glow-amber-sm" 
                  : "border-transparent text-brand-soft hover:border-brand-line hover:bg-white/4 hover:text-brand-text"
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              Archive
            </button>
          </nav>
        </div>

        <div className="mt-6 md:mt-auto">
          <div className="h-[1px] bg-brand-line my-4 md:mb-5"></div>

          {/* Sintonizar Last.fm Custom User Form */}
          <form onSubmit={handleUserSearchSubmit} className="mb-4 relative font-mono">
            <div className="flex items-center gap-1.5 border border-brand-line hover:border-brand-line-strong rounded bg-black/40 p-1.5 transition-all">
              <Search className="w-3.5 h-3.5 text-brand-soft shrink-0 ml-1" />
              <input 
                id="lastfm-search-input"
                type="text" 
                value={currentUserInput} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentUserInput(e.target.value)}
                placeholder="User Last.fm"
                className="w-full bg-transparent text-[11px] text-brand-soft focus:outline-none placeholder:text-brand-muted py-0.5"
              />
              <button 
                id="lastfm-search-submit"
                type="submit" 
                className="hover:text-brand-aqua text-brand-muted transition-colors text-[10px] uppercase font-bold tracking-wider px-1 cursor-pointer shrink-0"
              >
                Ir
              </button>
            </div>
          </form>

          {/* Now Playing Widget from Last.fm */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-brand-muted uppercase tracking-[0.16em] font-mono flex items-center gap-1.5">
                {scrobbleTrack?.isLive ? (
                  <>
                    <span className="inline-block w-1.5 h-1.5 bg-brand-rose animate-pulse" />
                    [ TRANSMISSÃO: ATIVA ]
                  </>
                ) : (
                  <>[ TELEMETRIA: DISCO ]</>
                )}
              </span>
              <button 
                id="refresh-scrobbles"
                onClick={() => fetchScrobbles(lastfmUser)} 
                title="Sincronizar scrobble"
                className={`text-brand-muted hover:text-brand-aqua transition-colors cursor-pointer ${isScrobbleLoading ? "animate-spin" : ""}`}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-none bg-brand-panel/90 border border-brand-line relative overflow-hidden group">
              {/* Specialized Cyber Turntable Platter Deck (Deus Ex Aesthetic) */}
              <div className="relative w-16 h-16 shrink-0 bg-black/60 border border-brand-line/40 rounded flex items-center justify-center overflow-hidden">
                {/* Cyber tech grid background on platter bed */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,179,0,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,179,0,0.15)_1px,transparent_1px)] bg-[size:4px_4px]" />
                
                {/* Deus Ex Corner bracket overlays */}
                <div className="absolute top-0.5 left-0.5 w-1 h-1 border-t border-l border-brand-aqua/40" />
                <div className="absolute top-0.5 right-0.5 w-1 h-1 border-t border-r border-brand-aqua/40" />
                <div className="absolute bottom-0.5 left-0.5 w-1 h-1 border-b border-l border-brand-aqua/40" />
                <div className="absolute bottom-0.5 right-0.5 w-1 h-1 border-b border-r border-brand-aqua/40" />

                {/* Strobe speed markers on left side */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-brand-aqua/20 flex flex-col gap-[1px]">
                  <span className="w-full h-[1px] bg-brand-aqua/70 animate-pulse" />
                  <span className="w-full h-[1px] bg-brand-aqua/40" />
                </div>

                {/* Circular Vinyl Disk Container */}
                <motion.div 
                  className="w-[52px] h-[52px] rounded-full relative shadow-[0_4px_10px_rgba(0,0,0,0.55)] flex items-center justify-center cursor-pointer select-none"
                  style={{
                    background: "radial-gradient(circle, #2a2a2e 0%, #151618 42%, #0a0a0c 85%, #000 100%)"
                  }}
                  animate={scrobbleTrack ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                >
                  {/* Phonograph sound grooves details */}
                  <div className="absolute inset-1 rounded-full border border-black/25 pointer-events-none" />
                  <div className="absolute inset-2.5 rounded-full border border-zinc-900/35 pointer-events-none" />
                  <div className="absolute inset-4 rounded-full border border-zinc-900/55 pointer-events-none border-dashed" />

                  {/* Centered Spindle Hub wearing circular Album Cover */}
                  <div className="w-[34px] h-[34px] rounded-full border border-brand-aqua/70 bg-black overflow-hidden relative z-10 flex items-center justify-center">
                    <img 
                      id="scrobble-cover"
                      src={scrobbleTrack?.cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=100&q=80"} 
                      alt="Capa do scrobble" 
                      className="w-full h-full object-cover rounded-full bg-zinc-900 opacity-85 hover:opacity-100 transition-opacity" 
                      referrerPolicy="no-referrer"
                    />
                    {/* Brass spindle pinhole */}
                    <div className="absolute w-1 h-1 bg-brand-aqua border border-brand-panel rounded-full z-20 shadow-inner" />
                  </div>

                  {/* Deus Ex interactive augmented halo */}
                  <div className="absolute inset-[2.5px] rounded-full border border-brand-aqua/10 pointer-events-none animate-pulse" />
                </motion.div>

                {/* Mechanical Tonearm stylus sitting / docking dynamically */}
                <div 
                  className="absolute top-1 right-1 w-6 h-10 pointer-events-none z-20 origin-top-right transition-transform duration-700 ease-out"
                  style={{
                    transform: scrobbleTrack ? "rotate(-12deg)" : "rotate(-36deg)"
                  }}
                >
                  {/* Brass Pivot Joint box */}
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-aqua border border-zinc-900 flex items-center justify-center absolute -top-0.5 -right-0.5 shadow-md">
                    <div className="w-1 h-1 rounded-full bg-zinc-800" />
                  </div>
                  {/* Arm lever stick */}
                  <div className="w-[1.5px] h-7 bg-brand-muted/80 absolute top-1.5 right-[4px] origin-top shadow-sm" />
                  {/* Headshell needle cartridge */}
                  <div className="w-[3px] h-2 bg-brand-aqua absolute top-8 right-[3px] rounded-[2px] filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] border-[0.5px] border-black/40" />
                </div>
              </div>
              
              {/* Music and Cyber Telemetry readouts */}
              <div className="min-w-0 flex-1 flex flex-col">
                <p id="scrobble-name" className="text-xs font-semibold text-brand-text truncate uppercase tracking-wide leading-snug">
                  {scrobbleError ? "Indisponível" : (scrobbleTrack?.name || "Silêncio...")}
                </p>
                <p id="scrobble-artist" className="text-[10px] text-brand-muted truncate font-mono">
                  {scrobbleError ? lastfmUser : (scrobbleTrack?.artist || "Last.fm")}
                </p>
                
                {/* Micro tech specs overlay */}
                <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-brand-line/50 text-[7.5px] font-mono tracking-tight text-zinc-500 uppercase select-none">
                  <span className="flex items-center gap-1">
                    <span className={`w-1 h-1 rounded-full ${scrobbleTrack ? "bg-brand-rose animate-ping" : "bg-zinc-700"}`} />
                  </span>
                  <span>|</span>
                  <span className={scrobbleTrack ? "text-brand-aqua/80 font-bold" : ""}>
                    {scrobbleTrack ? "RPM_33.3" : "SIGNAL_OFF"}
                  </span>
                  <span>|</span>
                  <span className="truncate max-w-[50px]">
                    {scrobbleTrack?.isLive ? "LIVE_STRM" : "LP_COAX"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main className="w-full md:pl-[286px] min-h-screen flex flex-col justify-between">
        
        {/* UPPER HERO SECTION */}
        <section className="px-6 py-10 md:py-14 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end relative overflow-hidden shrink-0">
          <div className="lg:col-span-7 xl:col-span-8">
            <span className="text-[10px] md:text-xs text-brand-aqua font-mono tracking-[0.25em] uppercase block mb-3 md:mb-4">
              // AUGMENTATION_FEED: SENSORY_REDUX [CONNECTED]
            </span>
            <h1 className="font-display text-5xl sm:text-7xl lg:text-[6.8rem] leading-[0.88] tracking-wider text-brand-text">
              LIMINAL<br />
              <span className="text-transparent" style={{ WebkitTextStroke: "1px var(--color-brand-aqua)" }}>
                FRAMES
              </span>
            </h1>
          </div>

          {/* SPOTIFY EMBEDDED FEATURED CARD */}
          <div className="lg:col-span-5 xl:col-span-4 justify-self-stretch lg:justify-self-end w-full max-w-full lg:max-w-[420px]">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="p-3.5 border border-brand-line rounded-lg bg-brand-panel/68 shadow-[0_26px_70px_rgba(0,0,0,0.28)] backdrop-blur-md"
            >
              <div className="grid grid-cols-5 gap-3.5 items-center mb-3">
                <img 
                  id="featured-song-cover"
                  src={featuredTrack.coverUrl} 
                  alt={featuredTrack.title} 
                  className="col-span-1 aspect-square rounded object-cover border border-white/5 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div id="featured-info" className="col-span-4 min-w-0">
                  <h4 className="text-sm font-semibold truncate text-brand-text">
                    {featuredTrack.title}
                  </h4>
                  <p className="text-[11px] text-brand-muted truncate mt-0.5">
                    {featuredTrack.artist}
                  </p>
                </div>
              </div>

              {/* Embedding custom responsive Spotify track */}
              <div className="h-20 w-full overflow-hidden rounded bg-black border border-brand-line">
                <iframe 
                  id="spotify-embed"
                  title={`${featuredTrack.artist} - ${featuredTrack.title}`}
                  src={`https://open.spotify.com/embed/track/${featuredTrack.spotifyId}?utm_source=generator&theme=0`} 
                  width="100%" 
                  height="80" 
                  className="border-0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                  loading="lazy"
                />
              </div>

              <div className="flex justify-between items-center mt-2.5">
                <a 
                  id="spotify-external-link"
                  href={featuredTrack.spotifyUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] text-brand-aqua uppercase tracking-[0.14em] font-medium hover:text-brand-text transition-colors"
                >
                  abrir no Spotify
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span className="text-[9px] text-brand-muted font-mono truncate max-w-[100px]">{featuredTrack.title}</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CONTROLLABLE CONTENT AREA BY ACTIVE TAB */}
        <section className="flex-1 w-full px-6 md:px-12 flex flex-col justify-center">
          
          <div className="flex items-center gap-4.5 mb-4 shrink-0">
            <span className="text-[10px] border border-brand-line rounded-full px-3 py-1 text-brand-soft uppercase tracking-[0.18em]">
              {activeTab === "home" && "curadoria"}
              {activeTab === "playlist" && "sintonias"}
              {activeTab === "gameplays" && "onirismo crt"}
              {activeTab === "archive" && "catálogo"}
            </span>
            <div className="h-[1px] flex-1 bg-brand-line"></div>
            <span className="text-[10px] text-brand-soft tracking-[0.18em] uppercase">
              {activeTab === "home" && `${homeImages.length} recentes`}
              {activeTab === "playlist" && `${curatedPlaylist.length} faixas`}
              {activeTab === "gameplays" && `${gameplays.length} mundos`}
              {activeTab === "archive" && `${images.length} imagens no total`}
            </span>
          </div>

          <div className="relative py-4 select-none min-h-[360px] flex items-center justify-center">
            
            {/* TAB: 1. HOME - CAROUSEL SLIDER */}
            {activeTab === "home" && (
              <div className="w-full flex flex-col items-center">
                <AnimatePresence mode="wait">
                  {isGalleryLoading ? (
                    <div className="flex gap-6 overflow-hidden max-w-full justify-center">
                      {[1, 2, 3].map((n) => (
                        <div 
                          key={n}
                          className="w-[230px] md:w-[292px] h-[334px] md:h-[426px] rounded-lg bg-gradient-to-r from-brand-panel via-brand-panel2 to-brand-panel bg-[length:200%_100%] animate-pulse"
                        />
                      ))}
                    </div>
                  ) : images.length === 0 ? (
                    <div className="text-center p-8 border border-brand-line rounded-lg bg-white/[0.02]">
                      <p className="text-brand-soft text-sm">Arquivo visual vazio temporariamente.</p>
                      <button 
                        onClick={fetchGallery}
                        className="mt-4 px-4 py-2 bg-brand-aqua/20 border border-brand-line-strong rounded-lg text-xs"
                      >
                        Recarregar
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-full flex items-center justify-center">
                      
                      {/* Left Button */}
                      <button 
                        id="carousel-btn-prev"
                        onClick={handlePrevSlide}
                        className="absolute left-0 md:left-4 z-10 w-11 h-11 rounded-full border border-brand-line bg-[#101820]/80 flex items-center justify-center text-brand-text hover:bg-brand-aqua hover:text-brand-bg transition-all cursor-pointer shadow-lg backdrop-blur"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      {/* Main Center Image Showcase with motion transition */}
                      <div className="flex items-center justify-center gap-6 overflow-hidden w-full max-w-[940px] px-8 sm:px-14 py-4">
                        
                        {/* Selected visual card item with motion scale */}
                        <motion.div 
                          key={sliderIndex}
                          initial={{ opacity: 0, scale: 0.95, filter: "brightness(0.6)" }}
                          animate={{ opacity: 1, scale: 1, filter: "brightness(1)" }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                          className="relative w-[80vw] sm:w-[320px] lg:w-[360px] aspect-[3/4] rounded-lg overflow-hidden border border-brand-line shadow-[0_26px_70px_rgba(0,0,0,0.5)] group cursor-zoom-in"
                          onClick={() => setSelectedImageIndex(sliderIndex)}
                        >
                          <img 
                            src={homeImages[sliderIndex]?.url} 
                            alt={homeImages[sliderIndex]?.title || "Frame"} 
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                          
                          {/* Rich overlays inside visual */}
                          <div className="absolute inset-x-0 bottom-0 min-h-[44%] p-5 flex flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent transition-opacity duration-300 group-hover:opacity-100">
                            <span className="text-[9px] tracking-[0.2em] text-brand-aqua uppercase">
                              {homeImages[sliderIndex]?.category || "Geral"}
                            </span>
                            <h3 className="font-serif text-lg text-brand-text font-medium mt-1 leading-tight">
                              {homeImages[sliderIndex]?.title || "Frame Liminar"}
                            </h3>
                            <div className="flex justify-between items-center mt-3 text-[10px] text-brand-muted font-mono border-t border-brand-line pt-2">
                              <span>Sintonias Visual</span>
                              <span>{homeImages[sliderIndex]?.date || "01/06/23"}</span>
                            </div>
                          </div>

                          {/* Float visual tags */}
                          <div className="absolute top-4 right-4 px-2 py-0.5 bg-black/50 backdrop-blur-sm border border-brand-line text-[9px] rounded uppercase font-mono tracking-widest text-brand-gold">
                            {sliderIndex + 1}/{homeImages.length}
                          </div>
                        </motion.div>

                      </div>

                      {/* Right Button */}
                      <button 
                        id="carousel-btn-next"
                        onClick={handleNextSlide}
                        className="absolute right-0 md:right-4 z-10 w-11 h-11 rounded-full border border-brand-line bg-[#101820]/80 flex items-center justify-center text-brand-text hover:bg-brand-aqua hover:text-brand-bg transition-all cursor-pointer shadow-lg backdrop-blur"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                    </div>
                  )}
                </AnimatePresence>

                {/* Micro thumbnail navigation under carousel */}
                <div id="carousel-indicator-row" className="flex items-center gap-1.5 mt-5 max-w-full overflow-x-auto py-1">
                  {homeImages.map((img: GalleryItem, idx: number) => (
                    <button
                      key={img.id}
                      onClick={() => setSliderIndex(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all shrink-0 ${
                        idx === sliderIndex 
                          ? "bg-brand-aqua scale-125 shadow-md" 
                          : "bg-brand-muted/30 hover:bg-brand-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* TAB: 2. PLAYLIST - INTEGRATED CURATED SONGS CHILLWAVE */}
            {activeTab === "playlist" && (
              <div className="w-full max-w-[800px] grid grid-cols-1 md:grid-cols-2 gap-6 items-start self-center">
                
                {/* List of custom songs */}
                <div className="space-y-2.5 font-mono">
                  <h3 className="text-brand-aqua text-sm font-bold mb-3 block flex items-center gap-2 uppercase tracking-widest">
                    <Music className="w-4 h-4 text-brand-aqua" /> [ RECEPTOR_DE_SINTONIAS ]
                  </h3>

                  {curatedPlaylist.map((song, idx) => (
                    <button
                      id={`song-select-${song.spotifyId}`}
                      key={song.spotifyId}
                      onClick={() => {
                        setFeaturedTrack({
                          title: song.title,
                          artist: song.artist,
                          spotifyId: song.spotifyId,
                          spotifyUrl: `https://open.spotify.com/intl-pt/track/${song.spotifyId}`,
                          coverUrl: song.coverUrl
                        });
                      }}
                      className={`w-full text-left p-3 rounded-none border flex justify-between items-center transition-all cursor-pointer ${
                        featuredTrack.spotifyId === song.spotifyId 
                          ? "bg-brand-aqua/10 border-brand-aqua text-brand-text glow-amber-sm" 
                          : "bg-brand-panel border-brand-line hover:border-brand-aqua/40 text-brand-soft"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate leading-none uppercase">
                          {idx + 1}. {song.title}
                        </p>
                        <p className="text-[10px] text-brand-muted truncate mt-1">
                          {song.artist} • <span className="italic">{song.album}</span>
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-brand-aqua uppercase bg-brand-aqua/5 px-2 py-0.5 border border-brand-line">
                        {song.genre.split(" / ")[0]}
                      </span>
                    </button>
                  ))}
                  
                  <div className="p-3 border border-dashed border-brand-line text-center text-brand-muted text-[10px] uppercase font-mono">
                    // SELECIONE UMA FREQUÊNCIA PARA ACOPLAMENTO DE SINAL
                  </div>
                </div>

                {/* Cybernetic rotating core artwork visualizer */}
                <div className="p-5 border border-brand-line rounded-none bg-brand-panel/40 flex flex-col items-center justify-center text-center self-stretch font-mono">
                  <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                    <div className="absolute inset-0 rounded-none border border-brand-aqua bg-gradient-to-tr from-brand-panel to-[#030304] flex items-center justify-center shadow-lg glow-amber-sm">
                      {/* Inner rotating sensor brackets */}
                      <span className="w-24 h-24 rounded-none border border-brand-line-strong flex items-center justify-center animate-spin">
                        <span className="w-8 h-8 rounded-none border border-brand-aqua flex items-center justify-center" />
                      </span>
                    </div>
                    {/* Floating artwork over record */}
                    <motion.div 
                      className="absolute inset-[32px] rounded-none overflow-hidden border border-brand-line bg-brand-panel"
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                    >
                      <img 
                        src={featuredTrack.coverUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=300&q=80"} 
                        alt="Vinyl center" 
                        className="w-full h-full object-cover opacity-80" 
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  </div>
                  <h4 className="text-[10px] font-mono uppercase bg-brand-aqua/10 text-brand-aqua px-2.5 py-0.5 border border-brand-line tracking-widest leading-none mb-2">
                    NÚCLEO_NEURAL_SINTONIZADO
                  </h4>
                  <p className="text-xs font-bold text-brand-text max-w-xs uppercase">{featuredTrack.title}</p>
                  <p className="text-[10px] text-brand-muted mt-0.5">{featuredTrack.artist}</p>
                </div>

              </div>
            )}

            {/* TAB: 3. GAMEPLAYS - PSYCHEDELIC CRT GAMEPLAY SIMULATOR */}
            {activeTab === "gameplays" && (
              <div className="w-full max-w-[800px] flex flex-col items-center">
                
                {isGameplaysLoading ? (
                  <div className="py-16 text-center text-xs uppercase tracking-widest text-brand-aqua font-mono flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-brand-aqua" />
                    <span>// ACOPLANDO RECEPTOR RETINIANO AO BANCO DE DADOS NOTION...</span>
                    <span className="text-[9px] text-brand-muted mt-2">sincronizando frequências e listagem de mundos</span>
                  </div>
                ) : gameplaysError && gameplays.length === 0 ? (
                  <div className="py-12 border border-brand-line p-4 text-center text-xs uppercase tracking-widest text-brand-rose font-mono flex flex-col items-center justify-center gap-3">
                    <X className="w-6 h-6 text-brand-rose" />
                    <span>// FALHA NO ACOPLAMENTO DE DADOS</span>
                    <span className="text-[10px] text-brand-muted normal-case mt-1">
                      O receptor retro não pôde ler o Notion. Usando protocolo de fallback local.
                    </span>
                    <button 
                      onClick={() => fetchGameplays()}
                      className="px-3 py-1.5 border border-brand-rose hover:bg-brand-rose/10 text-[9px] font-bold uppercase cursor-pointer transition-colors mt-2"
                    >
                      Reestabelecer Conexão
                    </button>
                  </div>
                ) : gameplays.length === 0 ? (
                  <div className="py-16 text-center text-xs uppercase tracking-widest text-brand-muted font-mono">
                    // NENHUMA FREQUÊNCIA DE GAMEPLAY DISPONÍVEL NO RECEPTOR
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start font-mono">
                    
                    {/* CRT simulation panel player */}
                    <div className="md:col-span-8 flex flex-col">
                      {/* Outer retro CRT hardware box */}
                      <div className="relative border-4 border-zinc-800 rounded-none bg-zinc-950 p-1 shadow-2xl overflow-hidden aspect-video flex flex-col justify-between">
                        
                        {/* Glass glare overlay */}
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.015] to-white/[0.05] z-10" />
                        {/* Scanlines overlay effect */}
                        <div 
                          className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.22)_50%),_linear-gradient(90deg,_rgba(255,179,0,0.04),_rgba(0,255,0,0.015),_rgba(0,179,255,0.04))] bg-[size:100%_4px,_6px_100%] z-10 mix-blend-overlay transition-opacity duration-300" 
                          style={{ opacity: 0.15 + (glitchIntensity / 100) * 0.85 }}
                        />

                        {/* Interactive Vector Animation Canvas */}
                        <canvas 
                          ref={canvasRef}
                          className="w-full h-full bg-[#09090b] relative z-0"
                        />

                        {/* Low CRT light info bar */}
                        <div className="absolute bottom-3 left-3 bg-brand-rose text-white font-mono text-[9px] px-2 py-0.5 rounded-none uppercase tracking-widest z-10 flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                          BIOMETRIC_FEED INDEX_0{selectedGameplayIdx + 1}
                        </div>

                        {/* Low CRT stats right indicator */}
                        <div className="absolute bottom-3 right-3 bg-black/60 border border-brand-line text-brand-aqua font-mono text-[8.5px] px-2 py-0.5 rounded-none uppercase z-10">
                          {crtFilterMode.toUpperCase()} FILTER
                        </div>
                      </div>
                      
                      {/* Interactive Controls Sub-panel */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3.5">
                        {/* Audio drone synth button */}
                        <button
                          onClick={() => setSynthOn(!synthOn)}
                          className={`px-2.5 py-1.5 border text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            synthOn 
                              ? "bg-brand-rose/15 border-brand-rose text-brand-rose" 
                              : "bg-brand-panel/60 border-brand-line hover:border-brand-aqua/40 text-brand-soft"
                          }`}
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${synthOn ? "animate-pulse" : ""}`} />
                          <span>{synthOn ? "[ RETINA_SIND_LIGADO ]" : "SINTETIZAR ÁUDIO"}</span>
                        </button>

                        {/* Glitch injection stimulus */}
                        <button
                          onClick={() => {
                            if (glitchIntensity === 0) return;
                            const duration = 200 + (glitchIntensity / 100) * 1600;
                            setGlitchActive(true);
                            setTimeout(() => setGlitchActive(false), duration);
                          }}
                          disabled={glitchIntensity === 0}
                          className={`px-2.5 py-1.5 border text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                            glitchIntensity === 0 
                              ? "bg-black/35 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50" 
                              : "bg-brand-panel/60 border-brand-line hover:border-brand-aqua/50 text-brand-soft cursor-pointer"
                          }`}
                        >
                          <Sliders className={`w-3.5 h-3.5 ${glitchIntensity === 0 ? "text-zinc-600" : "text-brand-aqua animate-pulse"}`} />
                          <span>PROVOCAR GLITCH</span>
                        </button>

                        {/* Color cycle mode button */}
                        <button
                          onClick={() => {
                            const modes: Array<"normal" | "amber" | "green" | "cyber"> = ["cyber", "amber", "green", "normal"];
                            const nextIdx = (modes.indexOf(crtFilterMode) + 1) % modes.length;
                            setCrtFilterMode(modes[nextIdx]);
                          }}
                          className="px-2.5 py-1.5 bg-brand-panel/60 border border-brand-line hover:border-brand-aqua/50 text-[9px] font-bold uppercase text-brand-soft transition-all flex items-center justify-center gap-1.5 cursor-pointer col-span-2 sm:col-span-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-brand-aqua" />
                          <span>TÔNICA: {crtFilterMode.toUpperCase()}</span>
                        </button>
                      </div>

                      {/* Interactive Controls Sliders Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        
                        {/* Glitch CRT Panel */}
                        <div className="p-3 border border-brand-line bg-brand-panel/20 flex flex-col justify-between gap-2.5 h-full">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-brand-soft uppercase tracking-widest flex items-center gap-1.5">
                              <Sliders className="w-3 h-3 text-brand-aqua" />
                              INTENSIDADE RETRO CRT (GLITCH FILTRES)
                            </span>
                            <span className="text-[10px] font-mono text-brand-aqua border border-brand-line/60 bg-brand-panel/80 px-1.5 py-0.5 font-bold">
                              {glitchIntensity}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[8px] text-zinc-600 font-bold uppercase select-none">MIN</span>
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              value={glitchIntensity}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlitchIntensity(Number(e.target.value))}
                              className="flex-1 h-1 bg-zinc-800 accent-brand-rose outline-none appearance-none cursor-pointer border border-zinc-700/50 rounded-none"
                              style={{
                                WebkitAppearance: "none",
                                background: `linear-gradient(to right, var(--color-brand-aqua, #06b6d4) 0%, var(--color-brand-aqua, #06b6d4) ${glitchIntensity}%, #27272a ${glitchIntensity}%, #27272a 100%)`
                              }}
                            />
                            <span className="text-[8px] text-zinc-600 font-bold uppercase select-none">MAX</span>
                          </div>
                          <div className="flex items-center justify-between text-[7.5px] text-zinc-500 font-mono tracking-tight mt-0.5">
                            <span>[ SCANLINES: {glitchIntensity === 0 ? "DESATIVADO" : `${Math.floor(15 + glitchIntensity * 0.85)}%`} ]</span>
                            <span>[ SINAL: {glitchIntensity === 0 ? "CLEAR" : glitchIntensity <= 30 ? "RUÍDO MÍN" : glitchIntensity <= 70 ? "ANOMALIA STB" : "NÍVEL CRÍTICO"} ]</span>
                          </div>
                        </div>

                        {/* Mod Synth Atmospheric Drone Board */}
                        <div className="p-3 border border-brand-line bg-brand-panel/20 flex flex-col gap-2.5 h-full">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-brand-soft uppercase tracking-widest flex items-center gap-1.5">
                              <Radio className="w-3 h-3 text-brand-aqua" />
                              SINTETIZADOR NEURAL: CONFIG_COAX
                            </span>
                            <span className={`text-[10px] font-mono border border-brand-line/60 bg-brand-panel/80 px-1.5 py-0.5 font-bold ${synthOn ? "text-brand-rose" : "text-zinc-600"}`}>
                              {synthOn ? "ATIVO" : "INATIVO"}
                            </span>
                          </div>

                          {/* Base pitch frequency control */}
                          <div className="flex flex-col gap-1 select-none">
                            <div className="flex justify-between items-center text-[8px] text-zinc-500 font-bold uppercase leading-none">
                              <span>Tonalidade Base</span>
                              <span className="text-brand-aqua font-mono">{synthFrequency} Hz</span>
                            </div>
                            <input 
                              type="range"
                              min="30"
                              max="120"
                              value={synthFrequency}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSynthFrequency(Number(e.target.value))}
                              disabled={!synthOn}
                              className={`w-full h-0.5 bg-zinc-800 accent-brand-aqua outline-none appearance-none ${synthOn ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                              style={{ WebkitAppearance: "none" }}
                            />
                          </div>

                          {/* Chorus Detune controls */}
                          <div className="flex flex-col gap-1 select-none">
                            <div className="flex justify-between items-center text-[8px] text-zinc-500 font-bold uppercase leading-none border-t border-zinc-900 pt-1.5 font-mono">
                              <span>Chorus Detune</span>
                              <span className="text-brand-aqua font-mono">±{synthDetune} c</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="40"
                              value={synthDetune}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSynthDetune(Number(e.target.value))}
                              disabled={!synthOn}
                              className={`w-full h-0.5 bg-zinc-800 accent-brand-aqua outline-none appearance-none ${synthOn ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                              style={{ WebkitAppearance: "none" }}
                            />
                          </div>

                          {/* Resonance Peak Filter Q selector */}
                          <div className="flex flex-col gap-1 select-none">
                            <div className="flex justify-between items-center text-[8px] text-zinc-500 font-bold uppercase leading-none border-t border-zinc-900 pt-1.5">
                              <span>Filtro de Ressonância (Q)</span>
                              <span className="text-brand-aqua font-mono">Q={filterQ}</span>
                            </div>
                            <input 
                              type="range"
                              min="1"
                              max="11"
                              value={filterQ}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterQ(Number(e.target.value))}
                              disabled={!synthOn}
                              className={`w-full h-0.5 bg-zinc-800 accent-brand-aqua outline-none appearance-none ${synthOn ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                              style={{ WebkitAppearance: "none" }}
                            />
                          </div>
                        </div>

                      </div>

                      {/* Display current game details */}
                      {gameplays[selectedGameplayIdx] && (
                        <div className="mt-4 p-4 border border-brand-line bg-brand-panel/40 flex gap-4 min-h-[90px]">
                          {gameplays[selectedGameplayIdx].cover && (
                            <img 
                              src={gameplays[selectedGameplayIdx].cover} 
                              alt={gameplays[selectedGameplayIdx].title} 
                              className="w-[60px] h-[80px] object-cover border border-brand-line select-none flex-shrink-0 bg-zinc-900"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="flex-1 flex flex-col justify-start min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-mono uppercase bg-brand-aqua/10 text-brand-aqua px-2.5 py-0.5 border border-brand-line tracking-widest leading-none">
                                {gameplays[selectedGameplayIdx].year === "Retro" ? "SÉRIE RETRO" : `LANÇAMENTO: ${gameplays[selectedGameplayIdx].year}`}
                              </span>
                              
                              {/* Custom Styled Status badges based on Notion status */}
                              {gameplays[selectedGameplayIdx].status === "Currently Playing" && (
                                <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 border border-emerald-500/30 tracking-widest leading-none">
                                  ● JOGANDO AGORA
                                </span>
                              )}
                              {gameplays[selectedGameplayIdx].status === "Completo" && (
                                <span className="text-[9px] font-mono uppercase bg-amber-500/10 text-amber-400 px-2 py-0.5 border border-amber-500/30 tracking-widest leading-none">
                                  ✓ TERMINADO
                                </span>
                              )}
                              {gameplays[selectedGameplayIdx].status === "Estagnado" && (
                                <span className="text-[9px] font-mono uppercase bg-zinc-500/25 text-zinc-400 px-2 py-0.5 border border-zinc-500/30 tracking-widest leading-none">
                                  PAUSADO
                                </span>
                              )}
                              {gameplays[selectedGameplayIdx].status === "Abandonado" && (
                                <span className="text-[9px] font-mono uppercase bg-rose-500/10 text-rose-400 px-2 py-0.5 border border-rose-500/30 tracking-widest leading-none">
                                  × ARQUIVADO
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-brand-text truncate uppercase mt-2">{gameplays[selectedGameplayIdx].title}</h4>
                            <p className="text-[10px] text-brand-muted mt-1 font-sans italic leading-relaxed line-clamp-2">
                              "{gameplays[selectedGameplayIdx].notes}"
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selection panel sidebar list */}
                    <div className="md:col-span-4 flex flex-col gap-2 max-w-full">
                      <h3 className="text-brand-aqua text-sm font-bold mb-2 block flex items-center gap-2 uppercase tracking-widest justify-between">
                        <span className="flex items-center gap-2">
                          <Tv className="w-4 h-4 text-brand-aqua" /> [ CANAIS_ONÍRICOS ]
                        </span>
                        <span className="text-[9px] text-brand-muted font-normal font-mono">
                          {gameplays.length} ITENS
                        </span>
                      </h3>

                      {/* Compact scrollable container */}
                      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                        {gameplays.map((game: GameplayItem, idx: number) => (
                          <button
                            id={`gameplay-channel-${game.id}`}
                            key={game.id}
                            onClick={() => setSelectedGameplayIdx(idx)}
                            className={`w-full text-left p-2.5 rounded-none border transition-all cursor-pointer flex flex-col justify-between ${
                              selectedGameplayIdx === idx 
                                ? "bg-brand-rose/10 border-brand-rose text-brand-text shadow-md" 
                                : "bg-brand-panel border-brand-line text-brand-soft hover:border-brand-aqua/40"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1 w-full pb-1">
                              <p className="text-[8.5px] text-brand-aqua uppercase font-mono tracking-wider">
                                CANAL 0{idx + 1}
                              </p>
                              {game.status === "Currently Playing" && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Jogando Atualmente" />
                              )}
                            </div>

                            <div className="flex gap-2.5 items-start mt-1 w-full">
                              {game.cover && (
                                <img
                                  src={game.cover}
                                  alt=""
                                  className="w-[32px] h-[44px] object-cover border border-brand-line flex-shrink-0 bg-zinc-950"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-xs font-bold truncate text-brand-text font-sans uppercase">
                                  {game.title}
                                </p>
                                <p className="text-[9px] text-brand-muted mt-0.5 leading-normal font-sans line-clamp-1">
                                  {game.vibe}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* TAB: 4. ARCHIVE - COMPLETE INDEX EXPAND GRID */}
            {activeTab === "archive" && (
              <div className="w-full max-w-[1000px] self-center">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 py-1">
                  {images.map((img: GalleryItem, idx: number) => (
                    <motion.div
                      id={`archive-grid-item-${img.id}`}
                      key={img.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      whileHover={{ scale: 1.025 }}
                      onClick={() => {
                        setSelectedImageIndex(idx);
                      }}
                      className="relative overflow-hidden aspect-[3/4] border border-brand-line rounded-none bg-brand-panel cursor-pointer group shadow-md"
                    >
                      <img src={img.url} alt={img.title || "Frame do arquivo visual"} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
                      
                      {/* Subtle hover titles */}
                      <div className="absolute inset-0 p-3 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="text-[8px] text-brand-aqua uppercase tracking-widest font-mono">
                          {img.category || "Foco"}
                        </span>
                        <p className="text-[10px] text-brand-text font-serif leading-tight font-light truncate mt-0.5">
                          {img.title || "Sem título"}
                        </p>
                      </div>

                      {/* category code tag */}
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-none text-[8px] text-brand-aqua uppercase font-mono tracking-widest border border-brand-line">
                        {img.category || "lim"}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>

        {/* BOTTOM METADATA BAR FOOTER */}
        <footer className="px-6 py-5 md:px-12 border-t border-brand-line flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="text-[10px] text-brand-muted uppercase tracking-[0.12em] font-light flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-brand-aqua" />
            alucinações semânticas · arquivo visual
          </div>
          <div id="footer-details" className="text-[10px] text-brand-muted font-mono tracking-wider uppercase">
            {activeTab === "home" && `visão: carrossel (${images.length} frames)`}
            {activeTab === "playlist" && `visão: sintetizador analógico`}
            {activeTab === "gameplays" && `visão: simulação crt tv`}
            {activeTab === "archive" && `visão: catálogo em grade`}
          </div>
        </footer>

      </main>

      {/* LIGHTBOX FOR ZOOM FULLSCREEN VIEWING WITH CHRONOS FRAME */}
      <AnimatePresence>
        {selectedImageIndex !== null && (
          <motion.div 
            id="lightbox-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setSelectedImageIndex(null)}
            className="fixed inset-0 bg-neutral-950/92 backdrop-blur-xl z-50 flex items-center justify-center p-6 md:p-12 cursor-zoom-out"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative max-w-full max-h-[85vh] flex flex-col items-center">
              
              {/* Close Button */}
              <button
                id="lightbox-close"
                onClick={() => setSelectedImageIndex(null)}
                className="absolute -top-11 right-0 md:right-4 w-9 h-9 rounded-full border border-brand-line bg-brand-panel text-brand-text flex items-center justify-center text-xl hover:bg-brand-rose hover:text-brand-bg transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Prev Button */}
              <button
                id="lightbox-prev"
                onClick={handlePrevLightbox}
                className="absolute top-1/2 left-2 md:-left-16 w-10 h-10 rounded-full border border-brand-line bg-brand-panel/90 text-brand-text flex items-center justify-center text-xl hover:bg-brand-aqua hover:text-brand-bg -translate-y-1/2 transition-colors cursor-pointer shadow-lg backdrop-blur-sm z-10"
                title="Anterior (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Next Button */}
              <button
                id="lightbox-next"
                onClick={handleNextLightbox}
                className="absolute top-1/2 right-2 md:-right-16 w-10 h-10 rounded-full border border-brand-line bg-brand-panel/90 text-brand-text flex items-center justify-center text-xl hover:bg-brand-aqua hover:text-brand-bg -translate-y-1/2 transition-colors cursor-pointer shadow-lg backdrop-blur-sm z-10"
                title="Próximo (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Image Frame Wrapper with Aesthetic Border details */}
              <motion.div 
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="border border-brand-line p-2 md:p-3 bg-brand-panel rounded-lg shadow-2xl max-w-4xl max-h-[75vh]"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <img 
                  id="lightbox-image-element"
                  src={images[selectedImageIndex]?.url} 
                  alt={images[selectedImageIndex]?.title || "Frame"} 
                  className="max-w-full max-h-[68vh] object-contain rounded border border-[#ffffff]/10"
                />
                
                <div className="mt-3 flex justify-between items-end border-t border-brand-line pt-3 px-1 text-left">
                  <div>
                    <span className="text-[9px] text-brand-aqua uppercase font-mono tracking-widest block">
                      {images[selectedImageIndex]?.category || "Geral"}
                    </span>
                    <h2 className="font-serif text-sm md:text-base font-light text-brand-text mt-0.5">
                      {images[selectedImageIndex]?.title || "Sem título"}
                    </h2>
                  </div>
                  <div className="text-right font-mono text-[9px] text-brand-muted">
                    <p>SÉRIE SINTONIA</p>
                    <p className="mt-0.5">{images[selectedImageIndex]?.date || "01/06/2026"}</p>
                  </div>
                </div>
              </motion.div>

              {/* Position counter indicator */}
              <div id="lightbox-index-text" className="text-brand-muted font-mono text-[10px] uppercase tracking-widest mt-4">
                Frame {selectedImageIndex + 1} de {images.length}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
