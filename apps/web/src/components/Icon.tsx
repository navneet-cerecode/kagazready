import type { ReactElement, SVGProps } from 'react';

/**
 * A tiny authored icon set, one stroke weight throughout. Drawn rather than borrowed so the marks
 * on the sheet share a hand with everything else.
 */
export type IconName =
  | 'plus'
  | 'check'
  | 'mark'
  | 'missing'
  | 'trash'
  | 'chevron'
  | 'close'
  | 'arrow'
  | 'photo'
  | 'refresh';

const PATHS: Record<IconName, ReactElement> = {
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  check: <path d="M5 12.5l4.2 4.2L19 7.5" />,
  // A proofreader's caret-and-bar: the mark that says "look here".
  mark: (
    <>
      <path d="M12 4v11" />
      <path d="M12 19.5v.5" />
      <path d="M4 20h16" />
    </>
  ),
  missing: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6.5 7l.8 12h9.4l.8-12" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  chevron: <path d="M8 10l4 4 4-4" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: (
    <>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  photo: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="M3.5 15l4.5-4.5 4 4 3-3 5.5 5.5" />
      <circle cx="16" cy="9.5" r="1.25" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
