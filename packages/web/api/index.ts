import { handle } from "hono/vercel";
import app from "../src/api/index";

export default handle(app);
