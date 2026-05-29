export interface Movie {
  id: number;
  title: string;
  year: number;
  genre: string;
  rating: number;
  description: string;
  poster: string;
}

const TMDB_BASE = "https://image.tmdb.org/t/p/w500";

export const MOVIES: Movie[] = [
  {
    id: 1,
    title: "The Dark Knight",
    year: 2008,
    genre: "Action / Crime",
    rating: 9.0,
    description: "When the Joker wreaks havoc on Gotham, Batman must confront his greatest psychological and moral test.",
    poster: `${TMDB_BASE}/qJ2tW6WMUDux911r6m7haRef0WH.jpg`,
  },
  {
    id: 2,
    title: "Inception",
    year: 2010,
    genre: "Sci-Fi / Thriller",
    rating: 8.8,
    description: "A thief who steals corporate secrets through dream-sharing technology is given the impossible task of planting an idea.",
    poster: `${TMDB_BASE}/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg`,
  },
  {
    id: 3,
    title: "Interstellar",
    year: 2014,
    genre: "Sci-Fi / Drama",
    rating: 8.7,
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    poster: `${TMDB_BASE}/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg`,
  },
  {
    id: 4,
    title: "The Godfather",
    year: 1972,
    genre: "Crime / Drama",
    rating: 9.2,
    description: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his son.",
    poster: `${TMDB_BASE}/3bhkrj58Vtu7enYsLegHQr3gekL.jpg`,
  },
  {
    id: 5,
    title: "Pulp Fiction",
    year: 1994,
    genre: "Crime / Drama",
    rating: 8.9,
    description: "The lives of two mob hitmen, a boxer, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    poster: `${TMDB_BASE}/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg`,
  },
  {
    id: 6,
    title: "Parasite",
    year: 2019,
    genre: "Thriller / Drama",
    rating: 8.5,
    description: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the poor Kim clan.",
    poster: `${TMDB_BASE}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg`,
  },
  {
    id: 7,
    title: "La La Land",
    year: 2016,
    genre: "Romance / Musical",
    rating: 8.0,
    description: "A jazz musician and an aspiring actress fall in love while pursuing their dreams in Los Angeles.",
    poster: `${TMDB_BASE}/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg`,
  },
  {
    id: 8,
    title: "The Shawshank Redemption",
    year: 1994,
    genre: "Drama",
    rating: 9.3,
    description: "Two imprisoned men bond over years, finding solace and eventual redemption through acts of decency.",
    poster: `${TMDB_BASE}/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg`,
  },
  {
    id: 9,
    title: "Joker",
    year: 2019,
    genre: "Thriller / Drama",
    rating: 8.5,
    description: "A mentally troubled comedian descends into madness and becomes Gotham's most iconic criminal.",
    poster: `${TMDB_BASE}/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg`,
  },
  {
    id: 10,
    title: "Mad Max: Fury Road",
    year: 2015,
    genre: "Action / Sci-Fi",
    rating: 8.1,
    description: "In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler with the help of a loner.",
    poster: `${TMDB_BASE}/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg`,
  },
  {
    id: 11,
    title: "Get Out",
    year: 2017,
    genre: "Horror / Thriller",
    rating: 7.7,
    description: "A young Black man visits his white girlfriend's family estate and uncovers a disturbing secret.",
    poster: `${TMDB_BASE}/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg`,
  },
  {
    id: 12,
    title: "Dune",
    year: 2021,
    genre: "Sci-Fi / Adventure",
    rating: 8.0,
    description: "A noble family becomes embroiled in a war for control over the galaxy's most valuable asset.",
    poster: `${TMDB_BASE}/d5NXSklXo0qyIYkgV61O6I7gMm9.jpg`,
  },
  {
    id: 13,
    title: "Everything Everywhere All at Once",
    year: 2022,
    genre: "Sci-Fi / Comedy",
    rating: 7.8,
    description: "An aging Chinese immigrant is swept up in an insane adventure discovering she alone can save the multiverse.",
    poster: `${TMDB_BASE}/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg`,
  },
  {
    id: 14,
    title: "The Matrix",
    year: 1999,
    genre: "Sci-Fi / Action",
    rating: 8.7,
    description: "A computer hacker learns about the true nature of reality and his role in the war against its controllers.",
    poster: `${TMDB_BASE}/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg`,
  },
  {
    id: 15,
    title: "Whiplash",
    year: 2014,
    genre: "Drama / Music",
    rating: 8.5,
    description: "A promising young drummer enrolls at a cutthroat music conservatory where his professor pushes him beyond limits.",
    poster: `${TMDB_BASE}/7fn624j5lj3xTme2SgiLCeuedmO.jpg`,
  },
  {
    id: 16,
    title: "Spider-Man: Into the Spider-Verse",
    year: 2018,
    genre: "Animation / Action",
    rating: 8.4,
    description: "Teen Miles Morales becomes Spider-Man and joins other Spider-People to stop a threat across multiverse dimensions.",
    poster: `${TMDB_BASE}/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg`,
  },
  {
    id: 17,
    title: "The Grand Budapest Hotel",
    year: 2014,
    genre: "Comedy / Drama",
    rating: 8.1,
    description: "A concierge and his lobby boy become embroiled in the theft of a priceless Renaissance painting.",
    poster: `${TMDB_BASE}/nX5XotM9yprCKarRH4fzOq1VM1J.jpg`,
  },
  {
    id: 18,
    title: "Coco",
    year: 2017,
    genre: "Animation / Family",
    rating: 8.4,
    description: "A young boy who dreams of becoming a musician is transported to the Land of the Dead.",
    poster: `${TMDB_BASE}/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg`,
  },
  {
    id: 19,
    title: "Avengers: Endgame",
    year: 2019,
    genre: "Action / Adventure",
    rating: 8.4,
    description: "The Avengers assemble for a final stand against Thanos, who has decimated half of the universe.",
    poster: `${TMDB_BASE}/or06FN3Dka5tukK1e9sl16pB3iy.jpg`,
  },
  {
    id: 20,
    title: "Black Panther",
    year: 2018,
    genre: "Action / Sci-Fi",
    rating: 7.3,
    description: "T'Challa returns home as king of Wakanda but faces challenges from factions within his own country.",
    poster: `${TMDB_BASE}/uxzzxijgPIY7slzFvMotPv8wjKA.jpg`,
  },
];

export function getMoviesForRoom(roomCode: string): Movie[] {
  const seed = roomCode
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shuffled = [...MOVIES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1)) % (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const PARTNER_NAMES = ["Alex", "Jamie", "Sam", "Jordan", "Casey", "Riley", "Morgan", "Taylor"];

export function getPartnerName(roomCode: string): string {
  const index =
    roomCode
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % PARTNER_NAMES.length;
  return PARTNER_NAMES[index];
}
