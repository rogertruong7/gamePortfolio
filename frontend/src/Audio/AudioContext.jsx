import { createContext, useContext, useState, useCallback } from "react";
import { Howler } from "howler";

const AudioContext = createContext(null);

const AudioProvider = ({ children }) => {
  const [muted, setMutedState] = useState(
    () => localStorage.getItem("audioMuted") === "true"
  );
  const [audioReady, setAudioReady] = useState(
    () => localStorage.getItem("visited") === "true"
  );

  const setMuted = useCallback((value) => {
    setMutedState(value);
    localStorage.setItem("audioMuted", String(value));
    Howler.mute(value);
  }, []);

  return (
    <AudioContext.Provider value={{ muted, setMuted, audioReady, setAudioReady }}>
      {children}
    </AudioContext.Provider>
  );
};

const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};

export { AudioProvider, useAudio };
