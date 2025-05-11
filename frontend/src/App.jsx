import React from "react";
import "./App.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./MainPage.jsx";
import BalatroClone from "./Pages/ProjectPages/BalatroClone.jsx";
import Bridges from "./Pages/ProjectPages/Bridges.jsx";
import CountryAPI from "./Pages/ProjectPages/CountryAPI.jsx";
import Datespot from "./Pages/ProjectPages/Datespot.jsx";
import DiscordBot from "./Pages/ProjectPages/DiscordBot.jsx";
import ForumPage from "./Pages/ProjectPages/ForumPage.jsx";
import Portfolio from "./Pages/ProjectPages/Portfolio.jsx";
import HousePricePredictor from "./Pages/ProjectPages/HousePricePredictor.jsx";
import Presto from "./Pages/ProjectPages/Presto.jsx";
import QuizPage from "./Pages/ProjectPages/QuizPage.jsx";
import RustSpreadsheet from "./Pages/ProjectPages/RustSpreadsheet.jsx";
import TikTokSpeed from "./Pages/ProjectPages/TikTokSpeed.jsx";
import TributaryAPIPage from "./Pages/ProjectPages/TributaryPage.jsx";
import RedirectToHome from "./Helpers/Redirect.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/projects/balatro" element={<BalatroClone />} />
        <Route path="/projects/bridges" element={<Bridges />} />
        <Route path="/projects/countriesvisited" element={<CountryAPI />} />
        <Route path="/projects/datespot" element={<Datespot />} />
        <Route path="/projects/discordbot" element={<DiscordBot />} />
        <Route path="/projects/forumsite" element={<ForumPage />} />
        <Route path="/projects/gameportfolio" element={<Portfolio />} />
        <Route path="/projects/houseprice" element={<HousePricePredictor />} />
        <Route path="/projects/presto" element={<Presto />} />
        <Route path="/projects/quizwebsite" element={<QuizPage />} />
        <Route path="/projects/rsheet" element={<RustSpreadsheet />} />
        <Route path="/projects/tiktokextension" element={<TikTokSpeed />} />
        <Route path="/projects/tributaryapi" element={<TributaryAPIPage />} />
        <Route path="*" element={<RedirectToHome />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
