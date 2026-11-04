import { useEffect, useRef } from "react";
import { Howl, Howler } from "howler";
import { useAudio } from "./AudioContext.jsx";

const BGM_VOLUME = 0.05;
const FOOTSTEP_VOLUME = 1.5;
const FADE_DURATION = 1000;

const AudioManager = ({ currentScene, isMoving }) => {
  const { muted, audioReady } = useAudio();
  const snowyRef = useRef(null);
  const shopRef = useRef(null);
  const footstepsRef = useRef(null);
  const prevSceneRef = useRef(currentScene);
  const initializedRef = useRef(false);
  const fadeEndTimerRef = useRef(null);
  const wasPlayingBeforeHideRef = useRef({ snowy: false, shop: false, footsteps: false });

  useEffect(() => {
    snowyRef.current = new Howl({
      src: ["/audio/snowy.mp3"],
      loop: true,
      volume: BGM_VOLUME,
    });
    shopRef.current = new Howl({
      src: ["/audio/shop.mp3"],
      loop: true,
      volume: BGM_VOLUME,
    });
    footstepsRef.current = new Howl({
      src: ["/audio/footsteps.mp3"],
      loop: true,
      volume: FOOTSTEP_VOLUME,
    });

    return () => {
      clearTimeout(fadeEndTimerRef.current);
      snowyRef.current?.unload();
      shopRef.current?.unload();
      footstepsRef.current?.unload();
    };
  }, []);

  useEffect(() => {
    Howler.mute(muted);
  }, [muted]);

  useEffect(() => {
    if (!audioReady || !snowyRef.current) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      if (Howler.ctx && Howler.ctx.state === "suspended") {
        Howler.ctx.resume();
      }
      if (currentScene === 0) {
        snowyRef.current.volume(BGM_VOLUME);
        snowyRef.current.play();
      } else {
        shopRef.current.volume(BGM_VOLUME);
        shopRef.current.play();
      }
    }
  }, [audioReady, currentScene]);

  useEffect(() => {
    if (!audioReady || !initializedRef.current) return;

    const prevScene = prevSceneRef.current;
    prevSceneRef.current = currentScene;

    if (prevScene === currentScene) return;

    const snowy = snowyRef.current;
    const shop = shopRef.current;
    if (!snowy || !shop) return;

    // A scene change within the fade must cancel the old track's pending pause or
    // stop, or that would silence the track that has just been faded back in.
    if (prevScene === 0 && currentScene !== 0) {
      clearTimeout(fadeEndTimerRef.current);
      snowy.fade(snowy.volume(), 0, FADE_DURATION);
      fadeEndTimerRef.current = setTimeout(() => snowy.pause(), FADE_DURATION);
      // play() on a track that is still fading out would layer a second copy of it.
      shop.stop();
      shop.volume(0);
      shop.seek(0);
      shop.play();
      shop.fade(0, BGM_VOLUME, FADE_DURATION);
    } else if (prevScene !== 0 && currentScene === 0) {
      clearTimeout(fadeEndTimerRef.current);
      shop.fade(shop.volume(), 0, FADE_DURATION);
      fadeEndTimerRef.current = setTimeout(() => shop.stop(), FADE_DURATION);
      if (!snowy.playing()) {
        snowy.volume(0);
        snowy.play();
      }
      snowy.fade(snowy.volume(), BGM_VOLUME, FADE_DURATION);
    }
  }, [currentScene, audioReady]);

  useEffect(() => {
    const footsteps = footstepsRef.current;
    if (!audioReady || !footsteps) return;

    if (isMoving && currentScene === 0) {
      if (!footsteps.playing()) {
        footsteps.play();
      }
    } else {
      footsteps.stop();
    }
  }, [isMoving, currentScene, audioReady]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasPlayingBeforeHideRef.current = {
          snowy: snowyRef.current?.playing() || false,
          shop: shopRef.current?.playing() || false,
          footsteps: footstepsRef.current?.playing() || false,
        };
        snowyRef.current?.pause();
        shopRef.current?.pause();
        footstepsRef.current?.pause();
      } else {
        if (wasPlayingBeforeHideRef.current.snowy) snowyRef.current?.play();
        if (wasPlayingBeforeHideRef.current.shop) shopRef.current?.play();
        if (wasPlayingBeforeHideRef.current.footsteps) footstepsRef.current?.play();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return null;
};

export { AudioManager };
