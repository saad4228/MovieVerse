import { api } from "./client";
import { showsFor, type Movie, type Venue, type Show, type Blueprint, type Seat } from "./catalog";
import type { Inventory } from "./booking";
export type InventorySnapshot = {show:Show;blueprint:Blueprint;seats:Seat[];inventory:Inventory};
export interface ShowtimeProvider { list(venue:Venue,movieId:string,date:string,movies?:Movie[]):Show[] }
export const demoShowtimeProvider:ShowtimeProvider = {list:showsFor};
export interface SeatInventoryProvider { get(showId:string):Promise<InventorySnapshot> }
export const seatInventoryProvider:SeatInventoryProvider = {get:show=>api<InventorySnapshot>(`inventory?show=${encodeURIComponent(show)}`)};
export interface BookingProvider { hold(showId:string,seats:string[]):Promise<{expires:number}>; checkout(body:unknown):Promise<any> }
export const bookingProvider:BookingProvider = {hold:(showId,seats)=>api("hold",{showId,seats}),checkout:body=>api("checkout",body)};
export type AvailabilitySummary = {available:number|null;total:number|null;status:"available"|"limited"|"sold-out"|"unknown";checked:string};
