import { useCallback, useEffect, useRef, useState } from "react";
import { keepsOwnInvite } from "./protocol.js";
import { newId as newSessionId } from "../Multiplayer/room.js";

// A game between this player and one other in the town, from picking one to playing it. It can
// start from sharing a bench or from the list of who's here. session is null with nothing going
// on, or { id, game, host, partner, phase, match, again, note }:
// - phase is picking (choosing a game), inviting (waiting for a yes), invited (asked to play),
//   playing, or over (it ended without a winner, for the reason in note)
// - host is whether this player sent the invite. The host goes first and picks the race's words.
// - match counts rematches, and again says who has asked for the next one
// players is everyone else in the lobby (room.peers), online is whether this tab has a place in
// it, and active is whether a game can be played right now (in the town, not inside a building).
// How long the other player can be missing from the room before the game gives up on them
const PARTNER_GONE_MS = 6000;

export function useBenchGame(roomRef, players, online, active) {
  const [session, setSession] = useState(null);
  const sessionRef = useRef(null);
  const playersRef = useRef(players);
  const activeRef = useRef(active);
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

  // Lets the other player know this end is done with whatever was going on
  const sendEnd = useCallback(
    (phase) => {
      if (phase === "inviting") send("cancel");
      if (phase === "invited") send("decline");
      if (phase === "playing") send("leave");
    },
    [send]
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

  // Turns down an invite without it ever showing, so whoever sent it isn't left waiting
  const turnDown = useCallback(
    (message) => {
      roomRef.current?.sendGame({ to: message.id, session: message.session, kind: "decline" });
    },
    [roomRef]
  );

  const onMessage = useCallback(
    (message) => {
      const current = sessionRef.current;
      // The one already being played with is still heard if they've dropped off the list for a
      // moment (room.js has already checked they have a place in this lobby)
      const known =
        playersRef.current.find((player) => player.id === message.id) ??
        (current?.partner.id === message.id ? current.partner : null);
      if (!known) return;
      const from = { id: known.id, name: known.name };

      if (message.kind === "invite") {
        if (!activeRef.current) {
          turnDown(message);
          return;
        }
        const withThem = current?.partner.id === from.id;
        if (current?.phase === "inviting" && withThem) {
          // Both asked at once. One invite is kept and the other is quietly dropped by both.
          if (keepsOwnInvite(roomRef.current?.id ?? "", from.id)) return;
        } else if (current && current.phase !== "picking" && current.phase !== "over") {
          // Already asking, being asked or playing, with someone
          turnDown(message);
          return;
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

      if (!current || message.session !== current.id || message.id !== current.partner.id) return;

      if (message.kind === "cancel") {
        if (current.phase === "invited") update(null);
      } else if (message.kind === "accept") {
        if (current.phase === "inviting") update({ ...current, phase: "playing" });
      } else if (message.kind === "decline") {
        if (current.phase === "inviting") {
          const note = `${from.name} can't play right now.`;
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
    [roomRef, update, deliver, startNextMatch, turnDown]
  );

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Listens the whole time this tab is in the town, so an invite is always answered, even if only
  // with a no
  useEffect(() => {
    const room = roomRef.current;
    if (!room || !online) return undefined;
    return room.listenGames(onMessage);
  }, [roomRef, online, onMessage]);

  // Going inside a building ends whatever was going on
  useEffect(() => {
    const current = sessionRef.current;
    if (!current || active) return;
    sendEnd(current.phase);
    update(null);
  }, [active, sendEnd, update]);

  // So does the other one leaving the town. The list of who's here can drop someone for a moment,
  // while their tab is in the background or the lobby reconnects, so they only count as gone once
  // they've been missing for a while.
  const goneTimer = useRef(null);
  useEffect(() => {
    const current = sessionRef.current;
    const isHere = (id) => playersRef.current.some((player) => player.id === id);
    if (!current || current.phase === "over" || isHere(current.partner.id)) {
      clearTimeout(goneTimer.current);
      goneTimer.current = null;
      return;
    }
    if (goneTimer.current) return;
    goneTimer.current = setTimeout(() => {
      goneTimer.current = null;
      const now = sessionRef.current;
      if (!now || now.phase === "over" || isHere(now.partner.id)) return;
      const note = `${now.partner.name} left the town.`;
      if (now.phase === "playing" || now.phase === "inviting") {
        update({ ...now, phase: "over", note });
      } else {
        update(null);
      }
    }, PARTNER_GONE_MS);
  }, [players, session, update]);

  useEffect(() => () => clearTimeout(goneTimer.current), []);

  const actions = {
    // Opens the list of games to ask partner ({ id, name }) to play. Does nothing while already
    // asking, being asked or playing.
    openMenu(partner) {
      const current = sessionRef.current;
      if (!partner || !activeRef.current) return;
      if (current && current.phase !== "picking" && current.phase !== "over") return;
      update({
        id: "",
        game: null,
        host: true,
        partner: { id: partner.id, name: partner.name },
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
      sendEnd(sessionRef.current?.phase);
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

  // For the game on screen: send sends one of its moves, and this hears the other player's
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

  return { session, ...actions, sendMove: send, listenMoves };
}
