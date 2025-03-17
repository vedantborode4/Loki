import React, { useState, useEffect, useRef } from "react";
import { Mic, Send } from "lucide-react";
import lokiPhoto from "/image/Loki.jpg";

const LokiVoiceAssistant = () => {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [response, setResponse] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Your browser does not support Web Speech API");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };

    recognitionRef.current = recognition;
  }, []);

  // Preload the video when the component mounts
  useEffect(() => {
    // Create a preloaded video element
    const preloadVideo = document.createElement('video');
    preloadVideo.src = "/videos/lok1.mp4";
    preloadVideo.muted = true;
    preloadVideo.preload = "auto";
    
    // Force preloading by playing and immediately pausing
    preloadVideo.play().then(() => {
      preloadVideo.pause();
      preloadVideo.currentTime = 0;
    }).catch(err => console.error("Preload error:", err));
    
    return () => {
      preloadVideo.src = "";
    };
  }, []);

  const handleVoiceInput = () => {
    recognitionRef.current && recognitionRef.current.start();
  };

  const playAudioResponse = (audioBlob) => {
    setIsSpeaking(true);
    
    // Create URL for the audio blob
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Set up the audio element
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onplay = () => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(err => {
            console.error("Video play error:", err);
          });
        }
      };
      
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
        // Revoke the object URL to free up memory
        URL.revokeObjectURL(audioUrl);
      };
      
      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
        URL.revokeObjectURL(audioUrl);
      };
    } else {
      audioRef.current.src = audioUrl;
    }
    
    // Play the audio
    audioRef.current.play().catch(err => {
      console.error("Audio playback error:", err);
      setIsSpeaking(false);
    });
  };
  
  const handleSend = async (userInput = input) => {
    if (!userInput.trim()) return;
    
    try {
      setIsLoading(true);
      
      // Send the text to the backend API
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userInput })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the response data
      const data = await response.json();
      
      // Display the text response
      setResponse(data.text || "No text response received");
      
      // If the response contains audio data
      if (data.audio) {
        // Convert base64 audio data to a blob
        const audioData = atob(data.audio);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        
        for (let i = 0; i < audioData.length; i++) {
          uint8Array[i] = audioData.charCodeAt(i);
        }
        
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        playAudioResponse(audioBlob);
      } else {
        // Fallback to Web Speech API if no audio from backend
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(data.text || "No response");
        utterance.lang = "en-US";
        
        utterance.onstart = () => {
          setIsSpeaking(true);
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(err => console.error("Video play error:", err));
          }
        };
        
        utterance.onend = () => {
          setIsSpeaking(false);
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
        };
        
        utterance.onerror = () => {
          setIsSpeaking(false);
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
        };
        
        synth.speak(utterance);
      }
      
    } catch (error) {
      console.error("Error communicating with the backend:", error);
      setResponse("Error: Could not connect to Loki's server. Try again later.");
    } finally {
      setIsLoading(false);
      setInput("");
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat text-[#FFD700] font-loki px-4 py-8 animate-background-glow"
      style={{
        backgroundImage: `url(${lokiPhoto})`,
        backgroundBlendMode: "overlay",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
      }}
    >
      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px #FFD700, 0 0 20px #FFD700; }
          50% { box-shadow: 0 0 20px #B8860B, 0 0 40px #B8860B; }
        }
        .animate-background-glow {
          animation: glow 3s ease-in-out infinite;
        }
        
        .video-container {
          overflow: hidden;
          border-radius: 50%;
          width: 72px;
          height: 72px;
          border: 2px solid #FFD700;
          box-shadow: 0 0 20px #FFD700;
          transition: all 0.3s ease;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .loading-spinner {
          animation: spin 1.5s linear infinite;
        }
      `}</style>

      <h1 className="text-4xl font-bold text-center mb-6">Loki Voice Assistant</h1>

      <div className="flex justify-center mb-6">
        <div className="video-container" style={{ width: "240px", height: "240px" }}>
          {isSpeaking ? (
            <video 
              ref={videoRef}
              className="w-full h-full object-cover"
              src="/videos/lok1.mp4"
              playsInline
              muted={true}
              loop
              autoPlay
            />
          ) : (
            <img
              src={lokiPhoto}
              alt="Loki"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto bg-[#101010] border border-[#FFD700] shadow-lg rounded-2xl p-6 space-y-4">
        <div className="bg-[#1b1b1b] p-4 rounded-xl border border-[#FFD700] min-h-[150px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <svg className="w-8 h-8 loading-spinner text-[#FFD700]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.2" />
                <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="currentColor" strokeWidth="4" />
              </svg>
              <span className="ml-2">Loki is thinking...</span>
            </div>
          ) : response ? (
            <p>{response}</p>
          ) : (
            <p className="text-gray-400">Awaiting command...</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-[#121212] border border-[#FFD700] text-[#FFD700] px-4 py-2 rounded-xl focus:outline-none"
            placeholder="Speak or type your command..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            className={`bg-[#FFD700] text-black px-4 py-2 rounded-xl hover:bg-[#B8860B] flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            <Send size={18} />
          </button>
          <button
            onClick={handleVoiceInput}
            className={`bg-[#FFD700] text-black px-4 py-2 rounded-xl hover:bg-[#B8860B] flex items-center justify-center ${isListening ? "animate-pulse" : ""} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            <Mic size={18} />
          </button>
        </div>
      </div>

      <footer className="text-center text-sm text-gray-400 mt-10">"Glorious Purpose" - Loki</footer>
    </div>
  );
};

export default LokiVoiceAssistant;