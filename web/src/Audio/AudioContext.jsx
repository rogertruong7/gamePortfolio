import { createContext, useContext, useState, useCallback } from "react";
import { Howler } from "howler";
import { readStore, writeStore } from "../Helpers/storage.js";

const AudioContext = createContext(null);

const AudioProvider = ({ children }) => {
  const [muted, setMutedState] = useState(
    () => readStore("audioMuted") === "true"
  );
  const [audioReady, setAudioReady] = useState(false);

  const setMuted = useCallback((value) => {
    setMutedState(value);
    writeStore("audioMuted", String(value));
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
