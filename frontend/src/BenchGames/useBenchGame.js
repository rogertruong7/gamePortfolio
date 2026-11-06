import { useCallback, useEffect, useRef, useState } from "react";
import { keepsOwnInvite } from "./protocol.js";

function newSessionId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// A game between the two on a bench, from picking one to playing it. session is null with nothing
// going on, or { id, game, host, partner, phase, match, again, note }:
// - phase is picking (choosing a game), inviting (waiting for a yes), invited (asked to play),
//   playing, or over (it ended without a winner, for the reason in note)
// - host is whether this player sent the invite. The host goes first and picks the race's words.
// - match counts rematches, and again says who has asked for the next one
// partner is whoever else is sat on the bench, from room.benchPartner.
export function useBenchGame(roomRef, partner, seated) {
  const [session, setSession] = useState(null);
  const sessionRef = useRef(null);
  const partnerRef = useRef(partner);
  // The game on screen hears its moves here, as { match, listener }. Moves arriving before it's
  // ready wait in the inbox.
  const moveListener = useRef(null);
  const inbox = useRef([]);

  const update = useCallback((next) => {
    sessionRef.current = next;
    if (!next || next.phase !== "playing") inbox.current = [];
    setSession(next);
  }, []);

  const send = useCallback(
    (kind, fields = {}) => {
      const current = sessionRef.current;
      if (!current) return false;
      return (
        roomRef.current?.sendGame({
          to: current.partner.id,
          session: current.id,
          kind,
          match: current.match,
          ...fields,
        }) ?? false
      );
    },
    [roomRef]
  );

  const deliver = useCallback(() => {
    const current = sessionRef.current;
    // A rematch's game takes over from the last one's, and until then its moves wait
    if (!current || moveListener.current?.match !== current.match) return;
    const { listener } = moveListener.current;
    const ready = inbox.current.filter((message) => message.match === current.match);
    // Anything for an earlier match is stale, and later ones wait their turn
    inbox.current = inbox.current.filter((message) => message.match > current.match);
    ready.forEach(listener);
  }, []);

  const startNextMatch = useCallback(
    (current) => {
      update({ ...current, match: current.match + 1, again: { me: false, them: false } });
      deliver();
    },
    [update, deliver]
  );

  const onMessage = useCallback(
    (message) => {
      const current = sessionRef.current;
      const from = partnerRef.current;
      // Only the one sat beside this player can play with them
      if (!from || message.id !== from.id) return;

      if (message.kind === "invite") {
        const busy = current && (current.phase === "playing" || current.phase === "invited");
        if (busy) return;
        if (current?.phase === "inviting") {
          // Both asked at once. One invite is kept and the other is quietly dropped by both.
          if (keepsOwnInvite(roomRef.current?.id ?? "", from.id)) return;
        }
        update({
          id: message.session,
          game: message.game,
          host: false,
          partner: from,
          phase: "invited",
          match: 0,
          again: { me: false, them: false },
          note: "",
        });
        return;
      }

      if (!current || message.session !== current.id) return;

      if (message.kind === "cancel") {
        if (current.phase === "invited") update(null);
      } else if (message.kind === "accept") {
        if (current.phase === "inviting") update({ ...current, phase: "playing" });
      } else if (message.kind === "decline") {
        if (current.phase === "inviting") {
          const note = `${from.name} doesn't want to play right now.`;
          update({ ...current, phase: "over", note });
        }
      } else if (message.kind === "leave") {
        if (current.phase === "playing") {
          update({ ...current, phase: "over", note: `${from.name} left the game.` });
        }
      } else if (message.kind === "again") {
        if (current.phase !== "playing" || message.match !== current.match) return;
        const next = { ...current, again: { ...current.again, them: true } };
        if (next.again.me) startNextMatch(next);
        else update(next);
      } else if (current.phase === "playing" && message.match >= current.match) {
        inbox.current.push(message);
        deliver();
      }
    },
    [roomRef, update, deliver, startNextMatch]
  );

  useEffect(() => {
    partnerRef.current = partner;
  }, [partner]);

  const partnerId = partner?.id ?? null;
  useEffect(() => {
    const room = roomRef.current;
    if (!room || !seated || !partnerId) return undefined;
    return room.listenGames(onMessage);
  }, [roomRef, seated, partnerId, onMessage]);

  // Standing up, or the other one going, ends whatever was going on
  useEffect(() => {
    const current = sessionRef.current;
    if (!current) return;
    if (seated && partnerId === current.partner.id) return;
    if (!seated) {
      if (current.phase === "inviting") send("cancel");
      if (current.phase === "invited") send("decline");
      if (current.phase === "playing") send("leave");
      update(null);
      return;
    }
    if (current.phase === "playing") {
      update({ ...current, phase: "over", note: `${current.partner.name} got up and left.` });
    } else if (current.phase !== "over") {
      update(null);
    }
  }, [seated, partnerId, send, update]);

  const actions = {
    openMenu() {
      if (!partnerRef.current) return;
      update({
        id: "",
        game: null,
        host: true,
        partner: partnerRef.current,
        phase: "picking",
        match: 0,
        again: { me: false, them: false },
        note: "",
      });
    },
    invite(game) {
      const current = sessionRef.current;
      if (!current || current.phase !== "picking") return;
      update({ ...current, id: newSessionId(), game, phase: "inviting" });
      if (!send("invite", { game })) {
        update({ ...sessionRef.current, phase: "over", note: "Couldn't reach them. Try again." });
      }
    },
    accept() {
      const current = sessionRef.current;
      if (current?.phase !== "invited") return;
      send("accept");
      update({ ...current, phase: "playing" });
    },
    // Says no to an invite, takes one back, leaves a game or closes the menu
    close() {
      const current = sessionRef.current;
      if (current?.phase === "inviting") send("cancel");
      if (current?.phase === "invited") send("decline");
      if (current?.phase === "playing") send("leave");
      update(null);
    },
    askAgain() {
      const current = sessionRef.current;
      if (current?.phase !== "playing" || current.again.me) return;
      send("again");
      const next = { ...current, again: { ...current.again, me: true } };
      if (next.again.them) startNextMatch(next);
      else update(next);
    },
  };

  // For the game on screen: sends one of its moves, and hears the other player's
  const sendMove = useCallback((kind, fields) => send(kind, fields), [send]);
  const listenMoves = useCallback(
    (match, listener) => {
      const entry = { match, listener };
      moveListener.current = entry;
      deliver();
      return () => {
        if (moveListener.current === entry) moveListener.current = null;
      };
    },
    [deliver]
  );

  return { session, ...actions, sendMove, listenMoves };
}
