import { handle } from "hono/vercel";
import app from "../src/api/index";

export const config = {
  runtime: "nodejs20.x",
};

export default handle(app);
