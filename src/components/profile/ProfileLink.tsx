import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ProfileLinkProps {
  /** Username to link to. Required — without it we render children as-is (no link). */
  username?: string | null;
  /** Disable navigation while still rendering children (e.g. when this IS the user's own profile). */
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Stop click propagation — useful when the link sits inside a parent that
   *  has its own click handler (e.g. lobby card → drawer). */
  stopPropagation?: boolean;
  ariaLabel?: string;
}

/**
 * Wraps any clickable element (typically an Avatar) with a link to the user's
 * public profile at /u/:username. Falls back to a non-link span when no
 * username is available so callers don't have to guard.
 */
export function ProfileLink({
  username,
  disabled,
  children,
  className,
  stopPropagation,
  ariaLabel,
}: ProfileLinkProps) {
  if (!username || disabled) {
    return <span className={className}>{children}</span>;
  }

  return (
    <NavLink
      to={`/u/${username}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      aria-label={ariaLabel ?? `Profil von ${username} öffnen`}
      className={cn(
        "cursor-pointer rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        className,
      )}
    >
      {children}
    </NavLink>
  );
}
