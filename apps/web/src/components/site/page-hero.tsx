import type { ReactNode } from "react";

export function PageHero({
  kicker,
  title,
  desc,
  center = false,
  children,
}: {
  kicker: ReactNode;
  title: ReactNode;
  desc?: ReactNode;
  center?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className={center ? "phero c" : "phero"}>
      <span className="kicker">
        <i />
        <span>{kicker}</span>
        {center ? <i /> : null}
      </span>
      <h1>{title}</h1>
      {desc ? <p>{desc}</p> : null}
      {children}
    </header>
  );
}
