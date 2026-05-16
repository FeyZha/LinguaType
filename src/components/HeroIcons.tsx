import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function HeroIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function Bars3Icon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </HeroIcon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="m15.75 19.5-7.5-7.5 7.5-7.5" />
    </HeroIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </HeroIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M12 4.5v15m7.5-7.5h-15" />
    </HeroIcon>
  );
}

export function MagnifyingGlassIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="m21 21-5.2-5.2m2.2-5.3a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
    </HeroIcon>
  );
}

export function EllipsisHorizontalIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </HeroIcon>
  );
}

export function PencilSquareIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="m16.86 4.49 2.65 2.65m-1.5-4.15a2.12 2.12 0 0 1 3 3L8.25 18.75 4.5 19.5l.75-3.75L18.01 2.99Z" />
    </HeroIcon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="m14.74 9-.35 9m-4.78 0L9.26 9m9.97-3.21c.34.05.68.1 1.01.16M19.23 5.79 18.16 19.67A2.25 2.25 0 0 1 15.92 21.75H8.08a2.25 2.25 0 0 1-2.24-2.08L4.77 5.79m14.46 0a48.11 48.11 0 0 0-3.48-.33m-12.02.33c.33-.06.67-.11 1.01-.16m0 0a48.11 48.11 0 0 1 3.48-.33m7.53.16V4.42c0-1.18-.91-2.17-2.09-2.21a51.95 51.95 0 0 0-3.32 0c-1.18.04-2.09 1.03-2.09 2.21v1.04m7.53 0a48.67 48.67 0 0 0-7.56 0" />
    </HeroIcon>
  );
}

export function BookOpenIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M12 6.04c-1.87-1.17-4.19-1.62-6.38-1.22A1.5 1.5 0 0 0 4.5 6.3v12.2c0 .48.44.84.91.74 2.27-.49 4.72-.03 6.59 1.26m0-14.46c1.87-1.17 4.19-1.62 6.38-1.22A1.5 1.5 0 0 1 19.5 6.3v12.2c0 .48-.44.84-.91.74-2.27-.49-4.72-.03-6.59 1.26m0-14.46v14.46" />
    </HeroIcon>
  );
}

export function ChartBarIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M3 13.13h3.75V21H3v-7.88Zm7.13-6h3.75V21h-3.75V7.13Zm7.12-4.13H21V21h-3.75V3Z" />
    </HeroIcon>
  );
}

export function CircleStackIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M20.25 6.75c0 2.07-3.69 3.75-8.25 3.75S3.75 8.82 3.75 6.75 7.44 3 12 3s8.25 1.68 8.25 3.75Z" />
      <path d="M20.25 6.75v5.25c0 2.07-3.69 3.75-8.25 3.75S3.75 14.07 3.75 12V6.75" />
      <path d="M20.25 12v5.25C20.25 19.32 16.56 21 12 21s-8.25-1.68-8.25-3.75V12" />
    </HeroIcon>
  );
}

export function AdjustmentsHorizontalIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M4.5 7.5h15m-15 9h15M8.25 7.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Zm4.5 9a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z" />
    </HeroIcon>
  );
}

export function CommandLineIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="m6.75 7.5 3 3-3 3m4.5 3h6" />
      <path d="M4.5 4.5h15a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6a1.5 1.5 0 0 1 1.5-1.5Z" />
    </HeroIcon>
  );
}

export function Cog6ToothIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M9.59 3.2c.36-1.47 2.46-1.47 2.82 0 .18.74.86 1.25 1.62 1.21 1.52-.08 2.57 1.74 1.74 3.01-.42.64-.3 1.49.29 1.98 1.17.97.12 2.79-1.4 2.68-.76-.06-1.45.44-1.65 1.18-.4 1.46-2.5 1.46-2.9 0-.2-.74-.89-1.24-1.65-1.18-1.52.11-2.57-1.71-1.4-2.68.59-.49.71-1.34.29-1.98-.83-1.27.22-3.09 1.74-3.01.76.04 1.44-.47 1.62-1.21Z" />
      <path d="M12 9.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
    </HeroIcon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M12 3v1.5m0 15V21m9-9h-1.5M4.5 12H3m15.36-6.36-1.06 1.06M6.7 17.3l-1.06 1.06m12.72 0-1.06-1.06M6.7 6.7 5.64 5.64" />
      <path d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" />
    </HeroIcon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
    </HeroIcon>
  );
}

export function ComputerDesktopIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M3.75 5.25h16.5v10.5H3.75V5.25Zm5.25 15h6m-3-4.5v4.5" />
    </HeroIcon>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M9.75 3.75 8.4 7.4 4.75 8.75 8.4 10.1l1.35 3.65 1.35-3.65 3.65-1.35-3.65-1.35-1.35-3.65Zm7.5 6 1.05 2.7 2.7 1.05-2.7 1.05-1.05 2.7-1.05-2.7-2.7-1.05 2.7-1.05 1.05-2.7ZM7.5 15.75l.75 1.95 1.95.75-1.95.75-.75 1.95-.75-1.95-1.95-.75 1.95-.75.75-1.95Z" />
    </HeroIcon>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="m12 3.75 2.6 5.26 5.8.84-4.2 4.1.99 5.77L12 17l-5.19 2.72.99-5.77-4.2-4.1 5.8-.84L12 3.75Z" />
    </HeroIcon>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M12 2.25A9.75 9.75 0 1 0 21.75 12 9.76 9.76 0 0 0 12 2.25Zm4.28 7.03-5.02 7.58a1 1 0 0 1-1.44.2l-3.6-2.53a1 1 0 1 1 1.16-1.64l2.75 1.94 4.5-6.8a1 1 0 1 1 1.63 1.08Z" />
    </HeroIcon>
  );
}

export function ClipboardDocumentIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M9 5.25A2.25 2.25 0 0 1 11.25 3h1.5A2.25 2.25 0 0 1 15 5.25m-6 0h6m-6 0H7.5A2.25 2.25 0 0 0 5.25 7.5v11.25A2.25 2.25 0 0 0 7.5 21h9a2.25 2.25 0 0 0 2.25-2.25V7.5a2.25 2.25 0 0 0-2.25-2.25H15" />
    </HeroIcon>
  );
}

export function QuestionMarkCircleIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path d="M9.88 9.88a3 3 0 1 1 4.24 4.24c-.78.78-1.62 1.13-1.62 2.38M12 19.5h.01" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </HeroIcon>
  );
}
