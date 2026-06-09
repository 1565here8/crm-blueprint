import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { client } from "../api/client";

type Props = {
  activity?: string;
};

export function PresenceHeartbeat({ activity }: Props) {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const campaign = params.get("utm_campaign") ?? params.get("campaign");
    const page = location.pathname + location.search;

    const resolvedActivity =
      activity ??
      (page.startsWith("/admin")
        ? "Admin panel"
        : page.startsWith("/profile")
          ? "Profile portal"
          : page.startsWith("/legal")
            ? "Legal page"
            : page === "/" || page.startsWith("/?")
            ? "Home page"
            : page.startsWith("/trade")
              ? "Trading terminal"
              : "Trading terminal");

    function beat() {
      void client
        .presenceHeartbeat({
          page,
          activity: resolvedActivity,
          campaign,
          referrer: document.referrer || null,
        })
        .catch(() => {});
    }

    beat();
    const id = setInterval(beat, 20_000);
    return () => clearInterval(id);
  }, [location.pathname, location.search, activity]);

  return null;
}
