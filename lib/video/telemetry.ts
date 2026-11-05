let serial = 0;
const identities = new WeakMap<HTMLVideoElement, number>();

/** Clock/decoder telemetry runs independently of R3F. No URLs, React updates,
 * pixel readbacks or per-frame DOM writes. Useful when a frame looks frozen. */
export function observeNativePlayback(video: HTMLVideoElement, surface: HTMLCanvasElement) {
  if (!identities.has(video)) identities.set(video, ++serial);
  let frames = 0, mediaTime = 0, handle = 0, active = true;
  let lastTime = performance.now(), lastFrames = 0;
  const presented: VideoFrameRequestCallback = (_now, metadata) => {
    if (!active) return;
    frames++; mediaTime = metadata.mediaTime;
    handle = video.requestVideoFrameCallback(presented);
  };
  if (video.requestVideoFrameCallback) handle = video.requestVideoFrameCallback(presented);
  const sample = () => {
    const now = performance.now(), quality = video.getVideoPlaybackQuality?.();
    const ranges = Array.from({length:video.buffered.length},(_,i)=>[video.buffered.start(i),video.buffered.end(i)]);
    surface.dataset.videoTime = video.currentTime.toFixed(3);
    surface.dataset.mediaTelemetry = JSON.stringify({
      provider:"hosted", instance:identities.get(video), time:video.currentTime, presentedFrames:frames,
      presentedTime:mediaTime, presentedFps:Math.round((frames-lastFrames)*1000/(now-lastTime)*10)/10,
      totalFrames:quality?.totalVideoFrames, droppedFrames:quality?.droppedVideoFrames,
      readyState:video.readyState, networkState:video.networkState, buffered:ranges,
      paused:video.paused, ended:video.ended,
    });
    lastTime=now; lastFrames=frames;
  };
  sample(); const interval=setInterval(sample,500);
  return ()=>{active=false;clearInterval(interval);if(handle)video.cancelVideoFrameCallback(handle);};
}
