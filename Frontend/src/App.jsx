import React, { useState, useEffect, useRef } from "react";
import { Mic, Send } from "lucide-react";
import lokiPhoto from "/image/Loki.jpg";

const LokiVoiceAssistant = () => {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [response, setResponse] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const videoRef = useRef(null);

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

  const handleVoiceInput = () => {
    recognitionRef.current && recognitionRef.current.start();
  };

  const speakResponse = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    
    // Set up event handlers for the speech synthesis
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
      }
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
    
    synth.speak(utterance);
  };

  const handleSend = (userInput = input) => {
    if (!userInput.trim()) return;
    const newResponse = `Loki says: "${userInput}"`;
    setResponse(newResponse);
    speakResponse(newResponse);
    setInput("");
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat text-[#A3FF12] font-loki px-4 py-8 animate-background-glow"
      style={{
        backgroundImage: `url(${lokiPhoto})`,
        backgroundBlendMode: "overlay",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
      }}
    >
      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px #A3FF12, 0 0 20px #A3FF12; }
          50% { box-shadow: 0 0 20px #00ff00, 0 0 40px #00ff00; }
        }
        .animate-background-glow {
          animation: glow 3s ease-in-out infinite;
        }
      `}</style>

      <h1 className="text-4xl font-bold text-center mb-6">Loki Voice Assistant</h1>

      <div className="flex justify-center mb-6">
        {isSpeaking ? (
          <video 
            ref={videoRef}
            className="w-48 h-48 rounded-full object-cover border-2 border-[#A3FF12] shadow-lg"
            src="/videos/lok1.mp4"
            muted={false}
            loop
          />
        ) : (
          <img
            src={lokiPhoto}
            alt="Loki"
            className="w-48 h-48 rounded-full object-cover border-2 border-[#A3FF12] shadow-lg"
          />
        )}
      </div>

      <div className="max-w-2xl mx-auto bg-[#101010] border border-[#A3FF12] shadow-lg rounded-2xl p-6 space-y-4">
        <div className="bg-[#1b1b1b] p-4 rounded-xl border border-[#A3FF12] min-h-[150px]">
          {response ? <p>{response}</p> : <p className="text-gray-400">Awaiting command...</p>}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-[#121212] border border-[#A3FF12] text-[#A3FF12] px-4 py-2 rounded-xl focus:outline-none"
            placeholder="Speak or type your command..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            onClick={() => handleSend()}
            className="bg-[#A3FF12] text-black px-4 py-2 rounded-xl hover:bg-lime-400 flex items-center justify-center"
          >
            <Send size={18} />
          </button>
          <button
            onClick={handleVoiceInput}
            className={`bg-[#A3FF12] text-black px-4 py-2 rounded-xl hover:bg-lime-400 flex items-center justify-center ${isListening ? "animate-pulse" : ""}`}
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