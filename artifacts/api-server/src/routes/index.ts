import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import statesRouter from "./states";
import categoriesRouter from "./categories";
import locationsRouter from "./locations";
import threadsRouter from "./threads";
import feedRouter from "./feed";
import adminRouter from "./admin";
import announcementsRouter from "./announcements";
import votesRouter from "./votes";
import chatRouter from "./chat";
import crewsRouter from "./crews";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(statesRouter);
router.use(categoriesRouter);
router.use(locationsRouter);
router.use(threadsRouter);
router.use(feedRouter);
router.use(adminRouter);
router.use(announcementsRouter);
router.use(votesRouter);
router.use(chatRouter);
router.use(crewsRouter);
router.use(messagesRouter);

export default router;
