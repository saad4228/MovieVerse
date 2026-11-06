import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Movie } from "../lib/catalog";
import { createVideoResource } from "../lib/video/resource";

const mocks = vi.hoisted(() => ({ create: vi.fn(), claim: vi.fn() }));
vi.mock("../lib/video/preparation", () => ({ createMovieVideo: mocks.create, claimPreparedVideo: mocks.claim }));
const movie = { id: "fixture", title: "Fixture" } as Movie;
function media(log: string[]) {
  return {
    loop: false,
    setAttribute: vi.fn(),
    pause: () => log.push("pause"),
    removeAttribute: (name: string) => log.push(`detach:${name}`),
    load: () => log.push("load"),
    remove: () => log.push("remove"),
  } as unknown as HTMLVideoElement;
}
beforeEach(() => { mocks.create.mockReset(); mocks.claim.mockReset(); });
describe("browser video resource ownership", () => {
  it("does not allocate media during rendering or for an embedded-only source", () => {
    const resource = createVideoResource(movie, false, false);
    expect(resource.getSnapshot()).toBeNull();
    expect(resource.getServerSnapshot()).toBeNull();
    resource.subscribe(vi.fn())();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("destroys the source owner before detaching media, exactly once", () => {
    const order: string[] = [], video = media(order);
    mocks.create.mockReturnValue(video);
    const resource = createVideoResource(movie, true, true);
    const notify = vi.fn(), release = resource.subscribe(notify);
    expect(resource.getSnapshot()).toBe(video);
    expect(notify).toHaveBeenCalledOnce();
    resource.attachSourceCleanup(video, () => order.push("destroy-hls-and-listeners"));
    release(); release();
    expect(order).toEqual(["destroy-hls-and-listeners", "pause", "detach:src", "load", "remove"]);
    expect(resource.getSnapshot()).toBeNull();
  });
  it("releases media even if a provider's destroy method throws", () => {
    const order: string[] = [], video = media(order);
    mocks.create.mockReturnValue(video);
    const resource = createVideoResource(movie, false, true), release = resource.subscribe(vi.fn());
    resource.attachSourceCleanup(video, () => { throw new Error("provider teardown failed"); });
    expect(release).toThrow("provider teardown failed");
    expect(order).toEqual(["pause", "detach:src", "load", "remove"]);
    expect(resource.getSnapshot()).toBeNull();
  });
  it("claims the gesture-prepared element without creating a duplicate player", () => {
    const prepared = media([]);
    mocks.claim.mockReturnValue(prepared);
    const resource = createVideoResource(movie, true, true), release = resource.subscribe(vi.fn());
    expect(resource.getSnapshot()).toBe(prepared);
    expect(prepared.loop).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
    release();
  });
});
