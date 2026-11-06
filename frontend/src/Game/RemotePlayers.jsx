import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import PlayerShadow from "./PlayerShadow.jsx";
import { useCharacterModel } from "./look/useCharacterModel.js";
import { EMOTES, applyEmotePose, createEmoteState, findEmoteBones, startEmote, stopEmote } from "./emotes.js";
import { SCOOT_SPEED, applySitPose, findSitBones, seatPoint } from "./sitting.js";
import { seatAlong } from "./benchSeats.js";
import { benches } from "./Static.jsx";
import { WALK_PLAYBACK, createWalkFeel, updateWalkFeel } from "./walkFeel.js";
import { createJumpState, requestJump, updateJump } from "./jumping.js";

// Snapshots arrive several times a second, a little unevenly. Drawing everyone this far in the
// past means there's nearly always a snapshot either side to move smoothly between.
const DELAY_MS = 220;
// A jump this far between snapshots is a reset or a fresh arrival, so it doesn't slide across
const TELEPORT_DISTANCE = 60;
// Matches Character.jsx
const SCALE = 0.08;
const IDLE_ANIMATION_SPEED = 0.06;

const _from = new THREE.Vector3();
const _seat = new THREE.Vector3();
const _to = new THREE.Vector3();

function turnBetween(from, to, t) {
  const turn = THREE.MathUtils.euclideanModulo(to - from + Math.PI, 2 * Math.PI) - Math.PI;
  return from + turn * t;
}

// Where a character was at the moment being drawn, between the two snapshots around it
function sample(snapshots, at) {
  if (snapshots.length === 0) return null;
  let before = snapshots[0];
  let after = snapshots[0];
  for (let i = 0; i < snapshots.length; i += 1) {
    if (snapshots[i].at <= at) before = snapshots[i];
    if (snapshots[i].at >= at) {
      after = snapshots[i];
      break;
    }
    after = snapshots[i];
  }
  const span = after.at - before.at;
  let t = span > 0 ? THREE.MathUtils.clamp((at - before.at) / span, 0, 1) : 1;
  _from.set(before.x, before.y, before.z);
  _to.set(after.x, after.y, after.z);
  if (_from.distanceTo(_to) > TELEPORT_DISTANCE) t = 1;
  return { position: _from.lerp(_to, t), ry: turnBetween(before.ry, after.ry, t), state: after };
}

// Everyone on a bench or heading for one: the others in the lobby, and this player
function allBenchClaims(room, localState) {
  const claims = room.benchClaims();
  const local = localState.current;
  if (local.bench >= 0) claims.push({ id: room.id, bench: local.bench, since: local.benchSince });
  return claims;
}

function RemotePlayer({ id, look, roomRef, lakeRef, localState }) {
  const { model, animations, dress } = useCharacterModel(look);
  const ref = useRef();
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const walkAction = useMemo(
    () => (animations.length > 0 ? mixer.clipAction(animations[0]) : null),
    [mixer, animations]
  );
  const walkFeel = useMemo(
    () => (animations.length > 0 ? createWalkFeel(model, animations[0]) : null),
    [model, animations]
  );
  const sitBones = useMemo(() => findSitBones(model), [model]);
  const emoteBones = useMemo(
    () => findEmoteBones(model, dress.uniforms.uLeftArmInFront),
    [model, dress]
  );
  const emote = useRef(createEmoteState());
  const sit = useRef({ phase: "none", progress: 0 });
  const jump = useRef(createJumpState());
  // How far along its bench this player is drawn, while seated
  const seatedAlong = useRef(null);
  // The jump count last seen, or null until the first snapshot so old jumps aren't replayed
  const jumpsSeen = useRef(null);

  useEffect(() => {
    walkAction?.play();
    return () => mixer.stopAllAction();
  }, [mixer, walkAction]);

  useFrame(({ clock }, delta) => {
    const character = ref.current;
    const peer = roomRef.current?.peers.get(id);
    const now = sample(peer?.snapshots ?? [], performance.now() - DELAY_MS);
    // Nothing to draw until the first snapshot, or while they're off in the upside-down world.
    // While this player is down there, the town they'd be standing in isn't the one on screen.
    character.visible = Boolean(now) && !now.state.away && !lakeRef.current.flipped;
    if (!character.visible) return;

    character.position.copy(now.position);
    character.rotation.y = now.ry;
    const { moving } = now.state;

    // Once seated, where they sit comes from the same rule every player uses (benchSeats.js), not
    // from where their own tab last put them. A tab in the background stops drawing, so it
    // wouldn't scoot over to make room, but everyone else still sees it do so.
    const bench = benches[now.state.bench];
    const along =
      bench && now.state.sit >= 1
        ? seatAlong(
            { id, bench: now.state.bench, since: now.state.since },
            allBenchClaims(roomRef.current, localState)
          )
        : null;
    if (along === null) {
      seatedAlong.current = null;
    } else {
      const from = seatedAlong.current ?? along;
      const step = SCOOT_SPEED * delta;
      seatedAlong.current =
        Math.abs(along - from) <= step ? along : from + Math.sign(along - from) * step;
      seatPoint(bench, seatedAlong.current, _seat);
      character.position.x = _seat.x;
      character.position.z = _seat.z;
    }

    // The hop is played here, on top of where they're standing
    if (jumpsSeen.current !== null && now.state.jumps > jumpsSeen.current) requestJump(jump.current);
    jumpsSeen.current = now.state.jumps;
    updateJump(jump.current, character, delta, now.state.sit === 0);

    const feelWeight = walkFeel ? walkFeel.weight : moving ? 1 : 0;
    mixer.update(delta * THREE.MathUtils.lerp(IDLE_ANIMATION_SPEED, WALK_PLAYBACK, feelWeight));
    if (walkFeel && walkAction) {
      updateWalkFeel(walkFeel, {
        moving,
        delta,
        clipTime: walkAction.time,
        yaw: character.rotation.y,
      });
    }

    sit.current.phase = now.state.sit > 0 ? "seated" : "none";
    sit.current.progress = now.state.sit;
    applySitPose(sit.current, sitBones, clock.elapsedTime);

    const playing = emote.current;
    if (now.state.emote !== (playing.emote?.id ?? null)) {
      const next = EMOTES.find((option) => option.id === now.state.emote);
      if (next) startEmote(playing, next);
      else stopEmote(playing);
    } else if (playing.emote) {
      playing.seconds += delta;
    }
    applyEmotePose(playing, emoteBones);
  });

  return (
    <>
      <primitive ref={ref} object={model} scale={[SCALE, SCALE, SCALE]} visible={false} />
      <PlayerShadow characterRef={ref} lakeRef={lakeRef} look={look} />
    </>
  );
}

// Everyone else in the town
function RemotePlayers({ peers, roomRef, lakeRef, localState }) {
  return peers.map((peer) => (
    <RemotePlayer
      key={peer.id}
      id={peer.id}
      look={peer.look}
      roomRef={roomRef}
      lakeRef={lakeRef}
      localState={localState}
    />
  ));
}

export default RemotePlayers;
