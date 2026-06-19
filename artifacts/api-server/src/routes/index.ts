import { Router, type IRouter } from "express";
import healthRouter from "./health";
import simulationsRouter from "./simulations";
import challengesRouter from "./challenges";
import progressRouter from "./progress";
import npcRouter from "./npc";
import darioRouter from "./dario";
import safetyRouter from "./safety";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(simulationsRouter);
router.use(challengesRouter);
router.use(progressRouter);
router.use(npcRouter);
router.use(darioRouter);
router.use("/safety", safetyRouter);
router.use("/admin", uploadRouter);

export default router;
