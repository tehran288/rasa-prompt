import type { ReactNode } from "react";

export function SectionHead({
  kicker,
  title,
  desc,
  center = false,
  as: As = "h2",
  id,
}: {
  kicker: string;
  title: ReactNode;
  desc?: ReactNode;
  center?: boolean;
  as?: "h1" | "h2";
  id?: string;
}) {
  return (
    <div className={center ? "sh c" : "sh"} data-reveal="">
      <span className="kicker">
        <i />
        <span>{kicker}</span>
        {center ? <i /> : null}
      </span>
      <As id={id}>{title}</As>
      {desc ? <p>{desc}</p> : null}
    </div>
  );
}
