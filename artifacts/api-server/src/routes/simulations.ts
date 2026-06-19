import { Router, type IRouter } from "express";
import {
  GetSimulationParams,
  GetSimulationResponse,
  ListSimulationsResponseItem,
} from "@workspace/api-zod";
import { SIMULATIONS, getSimulation } from "../lib/simulations";

const router: IRouter = Router();

router.get("/simulations", async (_req, res): Promise<void> => {
  res.json(SIMULATIONS.map((s) => ListSimulationsResponseItem.parse(s)));
});

router.get("/simulations/:slug", async (req, res): Promise<void> => {
  const params = GetSimulationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const sim = getSimulation(params.data.slug);
  if (!sim) {
    res.status(404).json({ error: "Simulation not found" });
    return;
  }
  res.json(GetSimulationResponse.parse(sim));
});

export default router;
