import type { User } from "../../types";

export function Avatar({ user, size = 36 }: { user: Pick<User, "name" | "avatar">; size?: number }) {
  const style = { width: size, height: size };
  return user.avatar ? (
    <img src={user.avatar} alt="" style={style} className="shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <div style={style} className="flex shrink-0 items-center justify-center rounded-full bg-pine-soft text-sm font-semibold text-pine-dark">
      {user.name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
