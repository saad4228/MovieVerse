"use client";
import { checkoutOffer } from "./checkout-offers";
import { create } from "zustand";
import { persist } from "zustand/middleware";
type State = {
  city: string;
  recentCities: string[];
  showId: string | null;
  seats: string[];
  cart: Record<string, number>;
  holdExpires: number;
  promoCode: string;
  setPromo: (code: string) => void;
  setCity: (id: string) => void;
  setShow: (id: string) => void;
  setSeats: (ids: string[]) => void;
  setCart: (id: string, n: number) => void;
  setExpiry: (n: number) => void;
  clearBooking: () => void;
};
export const useApp = create<State>()(
  persist(
    (set) => ({
      city: "chennai",
      recentCities: [],
      showId: null,
      seats: [],
      cart: {},
      holdExpires: 0,
      promoCode: "",
      setPromo: (code) => set({promoCode:checkoutOffer(code)?.code ?? ""}),
      setCity: (id) =>
        set((s) => ({
          city: id,
          recentCities: [id, ...s.recentCities.filter((c) => c !== id)].slice(
            0,
            4,
          ),
          showId: null,
          seats: [],
          cart: {},
          holdExpires: 0,
          promoCode: "",
        })),
      setShow: (id) =>
        set((s) =>
          s.showId === id
            ? {}
            : { showId: id, seats: [], cart: {}, holdExpires: 0, promoCode: "" },
        ),
      setSeats: (ids) => set({ seats: ids }),
      setCart: (id, n) =>
        set((s) => ({
          cart: { ...s.cart, [id]: Math.max(0, Math.min(10, n)) },
        })),
      setExpiry: (n) => set({ holdExpires: n }),
      clearBooking: () =>
        set({ showId: null, seats: [], cart: {}, holdExpires: 0, promoCode: "" }),
    }),
    {
      name: "movieverse-v1",
      partialize: (s) => ({
        city: s.city,
        recentCities: s.recentCities,
        showId: s.showId,
        seats: s.seats,
        cart: s.cart,
        holdExpires: s.holdExpires,
        promoCode: s.promoCode,
      }),
    },
  ),
);
