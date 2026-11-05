import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import { syncCatalogue } from "../lib/catalogue-sync";

const worker = {
  async scheduled(event:ScheduledController,env:Cloudflare.Env,ctx:ExecutionContext){
    if(!env.DB)throw new Error("Catalogue sync requires the DB binding.");
    // A full import runs once daily; the other trigger refreshes only trending lists.
    ctx.waitUntil(syncCatalogue(env.DB,env,event.cron==="0 3 * * *"?"full":"trending").then(result=>{console.log(JSON.stringify({event:"catalogue-sync",id:result.id,kind:result.kind,failures:result.failures}));}));
  },
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
