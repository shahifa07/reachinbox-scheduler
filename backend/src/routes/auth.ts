import { NextFunction, Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "../config";
import { pool } from "../db";
import { ensureSenders } from "../services/senders";

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId || "missing-client-id",
      clientSecret: config.google.clientSecret || "missing-client-secret",
      callbackURL: `${config.backendUrl}/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        await pool.query(
          `insert into users(id, email, name, avatar) values ($1,$2,$3,$4)
           on conflict (id) do update set email = excluded.email, name = excluded.name, avatar = excluded.avatar`,
          [profile.id, profile.emails?.[0]?.value ?? "", profile.displayName, profile.photos?.[0]?.value ?? null],
        );
        await ensureSenders(profile.id);
        done(null, { id: profile.id });
      } catch (e) {
        done(e as Error);
      }
    },
  ),
);

export const authRouter = Router();

authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${config.frontendUrl}/?error=login_failed` }),
  (req, res) => {
    const user = req.user as { id: string };
    const token = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.frontendUrl.startsWith("https"),
      maxAge: 7 * 24 * 3600 * 1000,
    });
    res.redirect(config.frontendUrl);
  },
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = jwt.verify(req.cookies?.token ?? "", config.jwtSecret) as { sub: string };
    res.locals.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Not authenticated" });
  }
}
