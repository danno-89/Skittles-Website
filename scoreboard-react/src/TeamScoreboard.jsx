import React from 'react';
import PlayerRow from './PlayerRow';
import './TeamScoreboard.css';

function TeamScoreboard({
  team,
  teamTotal,
  opponentScore,
  onScoreClick,
  onPlayerNameChange,
  onToggleCollapse,
  playerOptions
}) {
  const isLosing = teamTotal < opponentScore;
  const deficit = opponentScore - teamTotal;

  // Conditionally set the class for the total score circle
  const totalScoreCircleClass = isLosing
    ? 'team-total-score-circle-small'
    : 'team-total-score-circle-large';

  return (
    <div className={`team-scoreboard ${team.collapsed ? 'collapsed' : ''}`}>
      <div className="team-header" onClick={onToggleCollapse}>
        <div className="team-name-container">
          <h2>{team.name}</h2>
          <span className={`collapse-icon ${team.collapsed ? '' : 'expanded'}`}>
            &#x25B2;
          </span>
        </div>
        <div className="team-stats">
          {isLosing && (
            <div className="deficit-circle">-{deficit}</div>
          )}
          <div className={totalScoreCircleClass}>{teamTotal}</div>
        </div>
      </div>
      {!team.collapsed && (
        <div className="scoreboard-content">
          {team.players.map((player, playerIndex) => (
            <PlayerRow
              key={`${team.id}-${playerIndex}`}
              player={player}
              playerOptions={playerOptions}
              isSixthPlayer={playerIndex === 5}
              onScoreClick={(scoreIndex) => onScoreClick(team.id, playerIndex, scoreIndex)}
              onPlayerNameChange={(newName) => onPlayerNameChange(playerIndex, newName)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TeamScoreboard;
