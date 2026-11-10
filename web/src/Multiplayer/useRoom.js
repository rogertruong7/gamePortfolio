import { useCallback, useEffect, useRef, useState } from "react";
import { joinRoom } from "./room.js";

// Joins a lobby of the town once enabled and stays until the page goes. localState is where the character
// writes its own position for the room to send, and roomRef.current.peers is where everyone
// else's arrives.
export function useRoom(look, name, enabled) {
  const localState = useRef({ ready: false });
  const roomRef = useRef(null);
  const lookRef = useRef(look);
  const nameRef = useRef(name);
  const [room, setRoom] = useState({
    status: "connecting",
    lobby: 1,
    count: 0,
    peers: [],
    messages: [],
    name: "",
  });
  // The room leaves on pagehide, so a page brought back from the back/forward cache joins again
  const [visit, setVisit] = useState(0);

  useEffect(() => {
    const onPageShow = (event) => {
      if (event.persisted) setVisit((current) => current + 1);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const handle = joinRoom({
      look: lookRef.current,
      name: nameRef.current,
      localState,
      onChange: setRoom,
    });
    roomRef.current = handle;
    return () => {
      handle.leave();
      roomRef.current = null;
    };
  }, [enabled, visit]);

  useEffect(() => {
    lookRef.current = look;
    roomRef.current?.setLook(look);
  }, [look]);

  useEffect(() => {
    nameRef.current = name;
    roomRef.current?.setName(name);
  }, [name]);

  const say = useCallback((text) => roomRef.current?.say(text) ?? false, []);

  return { ...room, say, localState, roomRef };
}
