const initialData = [
  {
    id: 'home',
    name: 'Home Team',
    collapsed: false, // Add this line
    players: [
      { id: 1, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
      { id: 2, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
      { id: 3, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
      { id: 4, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
      { id: 5, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
      { id: 6, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
    ],
  },
  {
    id: 'away',
    name: 'Away Team',
    collapsed: false, // Add this line
    players: [
      { id: 1, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
      { id: 2, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
      { id: 3, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
      { id: 4, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
      { id: 5, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
      { id: 6, name: 'Player Name', scores: Array(5).fill(null), total: 0 },
    ],
  },
];

export default initialData;
