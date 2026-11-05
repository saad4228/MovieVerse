import type { Plugin } from "vite";

/** Compatibility fix for the pinned Vinext beta. Apply to dev and build alike. */
export function vinextNavigation(): Plugin {
  return {
    name: "movieverse-vinext-navigation",
    enforce: "pre",
    transform(code, id) {
      if (!id.replaceAll("\\", "/").split("?")[0].endsWith("/vinext/dist/server/app-browser-entry.js")) return;
      const marker = "const [reactBranch, cacheBranch] = navBody.tee();";
      if (code.split(marker).length !== 2) {
        throw new Error("Review the Vinext navigation compatibility fix after updating Vinext.");
      }
      return {
        code: code.replace(marker, `// The decoder owns this stream from here. Aborting it during a later
                    // navigation can reject React's nested Flight chunks outside navigateRsc's
                    // catch. Keep cancelling requests that have not reached this handoff;
                    // let accepted streams finish, with navId checks rejecting stale commits.
                    if (activeNavigationAbortController === navigationAbortController) activeNavigationAbortController = null;
                    ${marker}`),
        map: null,
      };
    },
  };
}
