import React from "react";
import "./App.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./MainPage.jsx";
import TributaryAPIPage from "./Pages/ProjectPages/TributaryPage.jsx";
import QuizPage from "./Pages/ProjectPages/QuizPage.jsx";
import Presto from "./Pages/ProjectPages/Presto.jsx";
import TikTokSpeed from "./Pages/ProjectPages/TikTokSpeed.jsx";
import ForumPage from "./Pages/ProjectPages/ForumPage.jsx";
import DiscordBot from "./Pages/ProjectPages/DiscordBot.jsx";
import Portfolio from "./Pages/ProjectPages/Portfolio.jsx";
import RedirectToHome from "./Helpers/Redirect.jsx";


const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/projects/tributary" element={<TributaryAPIPage />} />
        <Route path="/projects/quizwebsite" element={<QuizPage />} />
        <Route path="/projects/presto" element={<Presto />} />
        <Route path="/projects/tiktokextension" element={<TikTokSpeed />} />
        <Route path="/projects/forumsite" element={<ForumPage />} />
        <Route path="/projects/discordbot" element={<DiscordBot />} />
        <Route path="/projects/portfolio" element={<Portfolio />} />
        <Route path="*" element={<RedirectToHome />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
