/** Immutable data saved when the backend confirms a demo booking. */
export type BookingRecord = {
  id: string;
  status: string;
  created: number;
  token: string;
  seats: string[];
  pricing: {
    total: number;
    tickets: number;
    food: number;
    fee: number;
    tax: number;
    discount: number;
  };
  cart: Record<string, number>;
  snapshot: {
    movie: {
      title: string;
      poster: string;
      backdrop?: string;
      backdropPosition?: string;
      certificate: string;
    };
    venue: { name: string; address: string };
    show: { date: string; time: string; language: string; format: string };
    auditorium: string;
  };
};
