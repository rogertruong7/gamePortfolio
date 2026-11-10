import { useEffect } from "react";
import styled from "styled-components";
import Modal, { ink, inkSoft, pixel } from "../UserInterface/Modal.jsx";
import ChromeFrame, { chromeButton } from "../UserInterface/ChromeFrame.jsx";
import { isModalOpen } from "../Helpers/modal.js";
import { GAMES, gameName } from "./protocol.js";
import ConnectFour from "./ConnectFour.jsx";
import RockPaperScissors from "./RockPaperScissors.jsx";
import TypeRace from "./TypeRace.jsx";
import WordHunt from "./WordHunt.jsx";
import Anagrams from "./Anagrams.jsx";
import SeaBattle from "./SeaBattle.jsx";
import DotsAndBoxes from "./DotsAndBoxes.jsx";
import FiveInARow from "./FiveInARow.jsx";
import Checkers from "./Checkers.jsx";
import Pool from "./Pool.jsx";
import CupToss from "./CupToss.jsx";
import MiniGolf from "./MiniGolf.jsx";
import Darts from "./Darts.jsx";
import Hoops from "./Hoops.jsx";
import Archery from "./Archery.jsx";

const SCREENS = {
  connect4: ConnectFour,
  rps: RockPaperScissors,
  typing: TypeRace,
  wordhunt: WordHunt,
  anagrams: Anagrams,
  seabattle: SeaBattle,
  dots: DotsAndBoxes,
  gomoku: FiveInARow,
  checkers: Checkers,
  pool: Pool,
  cuptoss: CupToss,
  minigolf: MiniGolf,
  darts: Darts,
  hoops: Hoops,
  archery: Archery,
};

// Two people in the town can play a game together. One picks it, the other says yes, and it opens
// for both of them. games is from useBenchGame. partner is whoever else is sat on this player's
// bench, who gets a button to play with them, and asking anyone else starts from the player list.
const BenchGames = ({ games, partner, seated }) => {
  const { session } = games;

  if (!session) {
    return seated && partner ? <PlayButton onPress={() => games.openMenu(partner)} /> : null;
  }

  const name = session.partner.name;
  const key = `${session.phase}-${session.id}`;

  if (session.phase === "picking") {
    return (
      <Modal
        key={key}
        title="Play a game"
        tagline={`With ${name}.`}
        actionLabel="Never mind"
        onClose={games.close}
        closeOnBackdrop
        wide
      >
        <Options>
          {GAMES.map((game) => (
            <Option key={game.id} type="button" onClick={() => games.invite(game.id)}>
              <OptionName>{game.name}</OptionName>
              <OptionBlurb>{game.blurb}</OptionBlurb>
              <ChromeFrame spikes={false} />
            </Option>
          ))}
        </Options>
      </Modal>
    );
  }

  if (session.phase === "inviting") {
    return (
      <Modal
        key={key}
        title={gameName(session.game)}
        tagline={`Waiting for ${name} to say yes…`}
        actionLabel="Cancel"
        onClose={games.close}
      />
    );
  }

  if (session.phase === "invited") {
    return (
      <Modal
        key={key}
        title={gameName(session.game)}
        tagline={`${name} wants to play ${gameName(session.game)} with you.`}
        actionLabel="Play"
        onClose={games.accept}
        onCancel={games.close}
        secondaryAction={{ label: "No thanks", onClick: games.close }}
      />
    );
  }

  if (session.phase === "over") {
    return (
      <Modal
        key={key}
        title={session.game ? gameName(session.game) : "Play a game"}
        tagline={session.note}
        actionLabel="OK"
        onClose={games.close}
      />
    );
  }

  const Screen = SCREENS[session.game];
  return (
    <Modal
      key={key}
      title={gameName(session.game)}
      tagline={`You vs ${name}`}
      taglineOnPhones={false}
      actionLabel="Leave game"
      onClose={games.close}
    >
      <Screen
        key={session.match}
        host={session.host}
        partnerName={name}
        match={session.match}
        again={session.again}
        sendMove={games.sendMove}
        listenMoves={games.listenMoves}
        onAgain={games.askAgain}
      />
    </Modal>
  );
};

// Sits just above the "Stand up" button. G opens it too.
const PlayButton = ({ onPress }) => {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== "g" || event.repeat || isModalOpen()) return;
      // Ctrl+G and the like are the browser's
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      onPress();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onPress]);

  return (
    <PlayGamesButton id="play_games_button" type="button" onClick={onPress}>
      Play games (G)
      <ChromeFrame />
    </PlayGamesButton>
  );
};

const PlayGamesButton = styled.button`
  ${chromeButton}
  position: absolute;
  bottom: 110px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 102;
  padding: 12px 24px;
  font-size: 18px;
  font-weight: bold;
  white-space: nowrap;
  cursor: pointer;
`;

// Two across where there's room, as there are a good few games to pick from
const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
`;

const Option = styled.button`
  ${chromeButton}
  position: relative;
  display: block;
  width: 100%;
  padding: 12px 18px;
  text-align: left;
  color: ${ink};
  cursor: pointer;
`;

const OptionName = styled.span`
  display: block;
  font: 600 21px / 1.2 ${pixel};
`;

const OptionBlurb = styled.span`
  display: block;
  margin-top: 4px;
  color: ${inkSoft};
  font-size: 14px;
  font-family: "Zen Kaku Gothic New", system-ui, sans-serif;
`;

export default BenchGames;
