import { enrichMovieMedia } from "./movie-media";
export type Movie = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  genre: string[];
  languages: string[];
  duration: number;
  rating: number;
  votes: string;
  certificate: string;
  poster: string;
  backdrop: string;
  release: string;
  status: "showing" | "upcoming";
  formats: string[];
  cast: string[];
  trailer: string | null;
  accent: string;
  posterSmall?: string;
  youtubeId?: string | null;
  trailerLabel?: string;
  mediaCredit?: string;
  mediaSource?: string;
};
const base = {
  certificate: "UA 16+",
  formats: ["2D", "IMAX", "Dolby Atmos"],
  backdrop: "/assets/movie-backdrop.webp",
  trailer: null,
  release: "2026-10-23",
  status: "showing" as const,
};
const seedMovies: Movie[] = [
  {
    ...base,
    id: "jailer-2",
    title: "Jailer 2",
    tagline: "The legend returns. The rules change.",
    description:
      "A quiet life. An unfinished story. When his past finds him again, a retired jailer returns to confront a world that has forgotten his name. A larger-than-life action thriller made for the big screen.",
    genre: ["Action", "Thriller"],
    languages: ["Tamil", "Telugu", "Hindi", "Kannada"],
    duration: 166,
    rating: 9.1,
    votes: "69.1K",
    poster: "/assets/jailer-2.webp",
    cast: ["Rajinikanth", "Mohanlal", "Nelson Dilipkumar"],
    accent: "#e34d44",
  },
  {
    ...base,
    id: "toxic",
    title: "Toxic",
    tagline: "A fairy tale for grown-ups.",
    description:
      "A dangerous underworld. A man with everything to lose. Enter a shadowy world of power, ambition and impossible loyalties.",
    genre: ["Gangster", "Drama"],
    languages: ["Kannada", "Tamil", "Telugu", "Hindi"],
    duration: 158,
    rating: 8.8,
    votes: "89.1K",
    poster: "/assets/toxic.webp",
    cast: ["Yash", "Geetu Mohandas"],
    accent: "#8d9b97",
  },
  {
    ...base,
    id: "coolie",
    title: "Coolie",
    tagline: "Power is never given. It is taken.",
    description:
      "A gold-smuggling syndicate meets its match when an unlikely hero sets out to settle an old score. An electrifying story of rebellion and redemption.",
    genre: ["Action", "Thriller"],
    languages: ["Tamil", "Telugu", "Hindi"],
    duration: 169,
    rating: 8.4,
    votes: "45.1K",
    poster: "/assets/coolie.webp",
    cast: ["Rajinikanth", "Nagarjuna", "Lokesh Kanagaraj"],
    accent: "#d79b53",
  },
  {
    ...base,
    id: "varanasi",
    title: "Varanasi",
    tagline: "Some journeys are written in the stars.",
    description:
      "Across ancient cities and uncharted worlds, an extraordinary adventure unfolds. A mythological odyssey about destiny, discovery and the universe within us.",
    genre: ["Adventure", "Mythology"],
    languages: ["Telugu", "Hindi", "Tamil"],
    duration: 185,
    rating: 9.6,
    votes: "24.8K",
    poster: "/assets/varanasi.webp",
    cast: ["Mahesh Babu", "Priyanka Chopra", "S. S. Rajamouli"],
    accent: "#91b8e9",
    release: "2027-04-09",
    status: "upcoming",
  },
  {
    ...base,
    id: "leo",
    title: "Leo",
    tagline: "An ordinary man. An extraordinary past.",
    description:
      "A cafe owner in a quiet mountain town becomes the focus of a violent criminal network. His family must discover how far he will go to protect them.",
    genre: ["Action", "Crime"],
    languages: ["Tamil", "Hindi", "Telugu"],
    duration: 164,
    rating: 8.2,
    votes: "112K",
    poster: "/assets/leo.webp",
    cast: ["Vijay", "Trisha", "Lokesh Kanagaraj"],
    accent: "#81aba3",
  },
  {
    ...base,
    id: "vikram",
    title: "Vikram",
    tagline: "Once upon a time, there lived a ghost.",
    description:
      "An investigator follows a trail of mysterious killings into a world of covert identities. Experience the high-stakes thriller back on the big screen.",
    genre: ["Action", "Thriller"],
    languages: ["Tamil", "Telugu", "Hindi"],
    duration: 175,
    rating: 8.7,
    votes: "98.2K",
    poster: "/assets/vikram.webp",
    cast: ["Kamal Haasan", "Vijay Sethupathi", "Fahadh Faasil"],
    accent: "#bb3d3f",
  },
  {
    ...base,
    id: "ramayana",
    title: "Ramayana",
    tagline: "An epic beyond imagination.",
    description:
      "An ancient story of courage, devotion and the triumph of hope. Journey into a spectacular retelling of an enduring epic.",
    genre: ["Adventure", "Mythology"],
    languages: ["Hindi", "Tamil", "Telugu"],
    duration: 180,
    rating: 9.2,
    votes: "32.5K",
    poster: "/assets/ramayana.webp",
    cast: ["Ranbir Kapoor", "Sai Pallavi"],
    accent: "#db995a",
    release: "2026-12-18",
    status: "upcoming",
  },
  {
    ...base,
    id: "war-2",
    title: "War 2",
    tagline: "Two sides. One impossible mission.",
    description:
      "Two elite operatives collide in a globe-spanning mission where nothing is as it seems. A spectacular action experience.",
    genre: ["Action", "Spy"],
    languages: ["Hindi", "Tamil", "Telugu"],
    duration: 154,
    rating: 7.9,
    votes: "126K",
    poster: "/assets/war-2.webp",
    cast: ["Hrithik Roshan", "N. T. Rama Rao Jr."],
    accent: "#83adae",
  },
  {
    ...base,
    id: "sintel",
    title: "Sintel",
    tagline: "A small story. An extraordinary journey.",
    description:
      "A young woman searches for a dragon she once befriended. This openly licensed Blender Foundation film powers the full MovieVerse cinema-screen playback demonstration.",
    genre: ["Animation", "Adventure"],
    languages: ["English"],
    duration: 15,
    rating: 8.5,
    votes: "12.4K",
    poster: "/assets/sintel.webp",
    backdrop: "/assets/sintel-backdrop.webp",
    cast: ["Blender Foundation", "Colin Levy"],
    accent: "#73b1cd",
    trailer: "/assets/sintel-trailer.mp4",
    formats: ["2D", "Dolby Atmos"],
  },
];
export const movies: Movie[] = seedMovies.map(enrichMovieMedia);
export type City = {
  id: string;
  name: string;
  subtitle: string;
  symbol: string;
};
export const cities: City[] = [
  {
    id: "chennai",
    name: "Chennai",
    subtitle: "The heart of Tamil cinema",
    symbol: "temple",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    subtitle: "Where cinema comes alive",
    symbol: "landmark",
  },
  {
    id: "nagpur",
    name: "Nagpur",
    subtitle: "Your next big-screen escape",
    symbol: "building",
  },
  {
    id: "pune",
    name: "Pune",
    subtitle: "Stories for every screen",
    symbol: "building",
  },
  {
    id: "delhi",
    name: "Delhi",
    subtitle: "A capital experience",
    symbol: "landmark",
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    subtitle: "A city of many stories",
    symbol: "building",
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    subtitle: "Made for the movies",
    symbol: "landmark",
  },
  {
    id: "kolkata",
    name: "Kolkata",
    subtitle: "A love for storytelling",
    symbol: "building",
  },
  {
    id: "ahmedabad",
    name: "Ahmedabad",
    subtitle: "A bigger world awaits",
    symbol: "building",
  },
  {
    id: "jaipur",
    name: "Jaipur",
    subtitle: "Stories in the pink city",
    symbol: "landmark",
  },
];
export type Blueprint = {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  rows: number;
  columns: number;
  rowLengths?: number[];
  aisles: number[];
  spacing: number;
  rowSpacing: number;
  slope: number;
  screenWidth: number;
  balcony: boolean;
  style: "classic" | "grand" | "luxury";
  modelUrl?: string;
  seatMap?: Record<string, string>;
  verified: boolean;
};
export const blueprints: Blueprint[] = [
  {
    id: "grand",
    name: "The Grand · Screen 1",
    width: 32,
    depth: 34,
    height: 16,
    rows: 14,
    columns: 24,
    aisles: [6, 18],
    spacing: 1.02,
    rowSpacing: 1.65,
    slope: 0.24,
    screenWidth: 24,
    balcony: true,
    style: "grand",
    verified: false,
  },
  {
    id: "classic",
    name: "The Studio · Screen 2",
    width: 24,
    depth: 26,
    height: 11,
    rows: 10,
    columns: 18,
    rowLengths: [14, 16, 18, 18, 18, 18, 18, 18, 16, 14],
    aisles: [9],
    spacing: 1.02,
    rowSpacing: 1.55,
    slope: 0.18,
    screenWidth: 18,
    balcony: false,
    style: "classic",
    verified: false,
  },
  {
    id: "luxury",
    name: "The Lounge · Screen 3",
    width: 24,
    depth: 23,
    height: 10,
    rows: 7,
    columns: 12,
    aisles: [4, 8],
    spacing: 1.4,
    rowSpacing: 2.1,
    slope: 0.2,
    screenWidth: 17,
    balcony: false,
    style: "luxury",
    verified: false,
  },
];
export type Venue = {
  id: string;
  cityId: string;
  name: string;
  locality: string;
  address: string;
  distance: number;
  amenities: string[];
  formats: string[];
  blueprints: string[];
  movieIds: string[];
  price: number;
  image: string;
  times?: string[];
};
const locations: Record<string, [string, string, string][]> = {
  chennai: [
    ["Palazzo", "Vadapalani", "183, Arcot Road, Vadapalani"],
    ["Marina Screens", "Royapettah", "Whites Road, Royapettah"],
    ["Luxe Cinemas", "Velachery", "Phoenix Marketcity, Velachery"],
  ],
  mumbai: [
    ["Metro Cinema", "Marine Lines", "Mahatma Gandhi Road, Marine Lines"],
    ["Starlight Multiplex", "Andheri West", "New Link Road, Andheri West"],
    ["Bayview Cinemas", "Lower Parel", "Senapati Bapat Marg, Lower Parel"],
  ],
  nagpur: [
    ["Orange City Screens", "Sitabuldi", "Variety Square, Sitabuldi"],
    ["Central Cinema", "Ramdaspeth", "Wardha Road, Ramdaspeth"],
    ["Lakeside Multiplex", "Dharampeth", "North Ambazari Road, Dharampeth"],
  ],
  pune: [
    ["Westend Screens", "Aundh", "Westend Mall, Aundh"],
    ["Citylight Cinema", "Shivajinagar", "University Road, Shivajinagar"],
  ],
  delhi: [
    ["Capitol Screens", "Saket", "District Centre, Saket"],
    ["Regal Cinema", "Connaught Place", "Inner Circle, Connaught Place"],
  ],
  bengaluru: [
    ["Orion Screens", "Rajajinagar", "Dr Rajkumar Road, Rajajinagar"],
    ["Parkside Cinema", "Whitefield", "ITPL Main Road, Whitefield"],
  ],
  hyderabad: [
    ["Prism Cinemas", "Banjara Hills", "Road No. 1, Banjara Hills"],
    ["Deccan Screens", "Gachibowli", "Old Mumbai Highway, Gachibowli"],
  ],
  kolkata: [
    ["Victoria Screens", "Park Street", "Park Street, Kolkata"],
    ["Eastside Cinema", "Salt Lake", "Sector V, Salt Lake"],
  ],
  ahmedabad: [
    ["Riverfront Cinema", "Navrangpura", "CG Road, Navrangpura"],
    ["Skyline Screens", "Vastrapur", "Lake Road, Vastrapur"],
  ],
  jaipur: [
    ["Pink City Screens", "C Scheme", "Bhagwan Das Road, C Scheme"],
    ["Amber Cinema", "Malviya Nagar", "Jawahar Circle, Malviya Nagar"],
  ],
};
export const venues: Venue[] = cities.flatMap((city, ci) =>
  (locations[city.id] || []).map((v, i) => ({
    id: `${city.id}-${i + 1}`,
    cityId: city.id,
    name: v[0],
    locality: v[1],
    address: `${v[2]}, ${city.name}`,
    distance: +(2.1 + i * 2.4 + ci * 0.3).toFixed(1),
    amenities:
      i === 1
        ? ["Parking", "Wheelchair access", "Food court"]
        : ["Parking", "Wheelchair access", "Recliners", "Food court"],
    formats: i === 0 ? ["IMAX", "2D", "Dolby Atmos"] : ["2D", "Dolby Atmos"],
    blueprints:
      i === 0
        ? ["grand", "classic"]
        : i === 1
          ? ["classic"]
          : ["luxury", "grand"],
    movieIds: movies
      .filter(
        (m) =>
          m.status === "showing" &&
          (m.id === "sintel" || (movies.indexOf(m) + ci + i) % 5 !== 4),
      )
      .map((m) => m.id),
    price: 160 + i * 30 + (ci % 3) * 20,
    image: `/assets/cinema-${i % 3}.webp`,
  })),
);
export const categories = [
  {
    id: "classic",
    name: "Classic",
    description: "Front rows · big-screen energy",
    price: 160,
    color: "#528bff",
  },
  {
    id: "prime",
    name: "Prime",
    description: "The sweet spot for sound & picture",
    price: 240,
    color: "#23cba1",
  },
  {
    id: "balcony",
    name: "Balcony",
    description: "Elevated view · centre aligned",
    price: 320,
    color: "#ac88ff",
  },
  {
    id: "recliner",
    name: "Royal Recliner",
    description: "Extra room. A little more luxury.",
    price: 550,
    color: "#f9be3c",
  },
] as const;
export type Seat = {
  id: string;
  row: string;
  number: number;
  x: number;
  y: number;
  z: number;
  category: string;
  accessible: boolean;
  blocked: boolean;
  pair?: string;
};
export function makeSeats(b: Blueprint): Seat[] {
  const result: Seat[] = [];
  for (let r = 0; r < b.rows; r++) {
    const length = b.rowLengths?.[r] ?? b.columns;
    for (let c = 0; c < length; c++) {
      const row = String.fromCharCode(65 + r);
      const offset = (b.columns - length) / 2;
      const col = c + offset;
      const aisle = b.aisles.reduce((n, a) => n + (col >= a ? 1.5 : 0), 0);
      const total = b.aisles.length * 1.5;
      const balcony = b.balcony && r >= b.rows - 3;
      result.push({
        id: `${row}${c + 1}`,
        row,
        number: c + 1,
        x: (col - (b.columns - 1) / 2) * b.spacing + aisle - total / 2,
        y: r * b.slope + (balcony ? 2.3 : 0),
        z: -b.depth / 2 + 7 + r * b.rowSpacing,
        category:
          b.style === "luxury"
            ? "recliner"
            : r >= b.rows - 1
              ? "recliner"
              : balcony
                ? "balcony"
                : r >= b.rows - 2
                  ? "recliner"
                  : r < 3
                    ? "classic"
                    : "prime",
        accessible: r === 0 && (c === 0 || c === length - 1),
        blocked: r === 0 && c === Math.floor(length / 2),
        ...(b.style === "luxury"
          ? { pair: `${row}-${Math.floor(c / 2)}` }
          : {}),
      });
    }
  }
  return result;
}
export type Show = {
  id: string;
  movieId: string;
  venueId: string;
  blueprintId: string;
  date: string;
  time: string;
  format: string;
  language: string;
  price: number;
};
export const localDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export function dates() {
  return Array.from({ length: 7 }, (_, i) =>
    localDate(new Date(Date.now() + i * 86400000)),
  );
}
export function showsFor(
  venue: Venue,
  movieId: string,
  date: string,
  configuredMovies: Movie[] = movies,
): Show[] {
  if (!venue.movieIds.includes(movieId) || !dates().includes(date)) return [];
  const movie = configuredMovies.find((m) => m.id === movieId);
  if (!movie) return [];
  return (venue.times || ["10:30", "14:15", "18:30", "21:45"]).map(
    (time, i) => ({
      id: [venue.id, movieId, date, time.replace(":", "")].join("~"),
      movieId,
      venueId: venue.id,
      blueprintId: venue.blueprints[i % venue.blueprints.length],
      date,
      time,
      format: i === 2 && venue.formats.includes("IMAX") ? "IMAX" : "2D",
      language: movie.languages[0],
      price: venue.price,
    }),
  );
}
export function getShow(
  id: string,
  configuredVenues: Venue[] = venues,
  configuredMovies: Movie[] = movies,
) {
  const [venueId, movieId, date] = id.split("~");
  const v = configuredVenues.find((v) => v.id === venueId);
  return v
    ? showsFor(v, movieId, date, configuredMovies).find(
        (show) => show.id === id,
      )
    : undefined;
}
export function cityMovies(cityId: string) {
  const ids = new Set(
    venues.filter((v) => v.cityId === cityId).flatMap((v) => v.movieIds),
  );
  return movies.filter((m) => ids.has(m.id));
}
export const snacks = [
  {
    id: "popcorn",
    name: "Classic salted popcorn",
    description: "A big tub of the good stuff.",
    category: "Popcorn",
    price: 220,
    image: "/assets/popcorn.webp",
  },
  {
    id: "caramel",
    name: "Caramel crunch",
    description: "Sweet, golden, impossible to share.",
    category: "Popcorn",
    price: 260,
    image: "/assets/popcorn.webp",
  },
  {
    id: "nachos",
    name: "Loaded nachos",
    description: "Crispy corn chips. Warm cheese dip.",
    category: "Nachos",
    price: 240,
    image: "/assets/nachos.webp",
  },
  {
    id: "cola",
    name: "Ice-cold cola",
    description: "500 ml of the perfect movie partner.",
    category: "Beverages",
    price: 150,
    image: "/assets/cola.webp",
  },
  {
    id: "combo",
    name: "The perfect pair",
    description: "Large popcorn + two cold drinks.",
    category: "Combos",
    price: 450,
    image: "/assets/combo.webp",
  },
  {
    id: "brownie",
    name: "Chocolate brownie",
    description: "A rich little plot twist.",
    category: "Desserts",
    price: 170,
    image: "/assets/brownie.webp",
  },
];
