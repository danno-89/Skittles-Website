import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import TeamScoreboard from './TeamScoreboard';
import NumpadModal from './NumpadModal';
import initialData from './initialData';
import './StandardMatch.css';

function StandardMatch({ matchData, onBackToMenu }) {
  const [teams, setTeams] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeScore, setActiveScore] = useState({ teamId: null, playerIndex: null, scoreIndex: null });
  const [playerOptions, setPlayerOptions] = useState({ home: [], away: [] });

  useEffect(() => {
    const fetchPlayers = async (teamId, teamType) => {
      try {
        const playersQuery = query(
          collection(db, 'players_public'),
          where('teamId', '==', teamId),
          where('registerExpiry', '>', new Date())
        );
        const querySnapshot = await getDocs(playersQuery);
        const players = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        players.sort((a, b) => a.firstName.localeCompare(b.firstName));
        setPlayerOptions(prev => ({ ...prev, [teamType]: players }));
      } catch (error) {
        console.error(`Error fetching players for team ${teamId}:`, error);
      }
    };

    if (matchData) {
      fetchPlayers(matchData.homeTeamId, 'home');
      fetchPlayers(matchData.awayTeamId, 'away');

      const createPlayers = (teamType) => {
        return Array.from({ length: 6 }, (_, i) => ({
          name: matchData[`${teamType}Player${i + 1}`] || `Player ${i + 1}`,
          scores: Array(5).fill(null),
          total: 0,
        }));
      };

      const newTeams = [
        {
          id: 'home',
          name: matchData.homeTeamName || 'Home Team',
          collapsed: false,
          players: createPlayers('home'),
        },
        {
          id: 'away',
          name: matchData.awayTeamName || 'Away Team',
          collapsed: false,
          players: createPlayers('away'),
        },
      ];
      setTeams(newTeams);
    } else {
      setTeams(initialData);
    }
  }, [matchData]);

  const handleScoreClick = (teamId, playerIndex, scoreIndex) => {
    setActiveScore({ teamId, playerIndex, scoreIndex });
    setModalOpen(true);
  };

  const handleScoreUpdate = (newScore) => {
    const { teamId, playerIndex, scoreIndex } = activeScore;

    const newTeams = JSON.parse(JSON.stringify(teams));
    const teamToUpdate = newTeams.find(t => t.id === teamId);
    const playerToUpdate = teamToUpdate.players[playerIndex];

    const scoreValue = newScore === null ? null : parseInt(newScore, 10);
    playerToUpdate.scores[scoreIndex] = scoreValue;

    playerToUpdate.total = playerToUpdate.scores.reduce((sum, current) => sum + (current || 0), 0);

    setTeams(newTeams);
    setModalOpen(false);
  };

  const handlePlayerNameChange = (teamId, playerIndex, newName) => {
    const newTeams = JSON.parse(JSON.stringify(teams));
    const teamToUpdate = newTeams.find(t => t.id === teamId);
    teamToUpdate.players[playerIndex].name = newName;
    setTeams(newTeams);
  };

  const handleToggleCollapse = (teamId) => {
    const newTeams = teams.map(team => 
      team.id === teamId ? { ...team, collapsed: !team.collapsed } : team
    );
    setTeams(newTeams);
  };

  // Calculate team totals
  const teamTotals = teams.reduce((acc, team) => {
    acc[team.id] = team.players.reduce((sum, player) => sum + player.total, 0);
    return acc;
  }, {});

  return (
    <div className="standard-match-container">
      {modalOpen && (
        <NumpadModal 
          onScoreSelect={handleScoreUpdate}
          onClose={() => setModalOpen(false)}
        />
      )}
      <header className="match-header">
        <h1>Standard Match Scoreboard</h1>
        <button onClick={onBackToMenu} className="back-to-menu-button">Back to Menu</button>
      </header>
      <div className="scoreboards-container">
        {teams.map(team => {
          const opponentId = team.id === 'home' ? 'away' : 'home';
          const opponentScore = teamTotals[opponentId];
          return (
            <TeamScoreboard
              key={team.id}
              team={team}
              teamTotal={teamTotals[team.id]}
              opponentScore={opponentScore}
              playerOptions={playerOptions[team.id]}
              onScoreClick={handleScoreClick}
              onPlayerNameChange={(playerIndex, newName) => handlePlayerNameChange(team.id, playerIndex, newName)}
              onToggleCollapse={() => handleToggleCollapse(team.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default StandardMatch;
