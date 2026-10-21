import type { ReactNode } from 'react';

function Svg({ size = 24, width = 2, children }: { size?: number; width?: number; children: ReactNode }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

type P = { size?: number };

export const HomeIcon = ({ size }: P) => <Svg size={size}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></Svg>;
export const PlusIcon = ({ size }: P) => <Svg size={size}><path d="M12 5v14M5 12h14" /></Svg>;
export const SearchIcon = ({ size }: P) => <Svg size={size}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Svg>;
export const UserIcon = ({ size }: P) => <Svg size={size}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Svg>;
export const GearIcon = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
);
export const CopyIcon = ({ size }: P) => <Svg size={size}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></Svg>;
export const MessageIcon = ({ size }: P) => <Svg size={size}><path d="M4 5h16v11H9l-5 4z" /></Svg>;
export const CheckIcon = ({ size }: P) => <Svg size={size} width={2.5}><path d="M5 12l5 5 9-10" /></Svg>;
export const CashIcon = ({ size }: P) => <Svg size={size}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></Svg>;
export const AlertIcon = ({ size }: P) => <Svg size={size}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></Svg>;
export const BackIcon = ({ size }: P) => <Svg size={size}><path d="M15 5l-7 7 7 7" /></Svg>;
export const NextIcon = ({ size }: P) => <Svg size={size}><path d="M9 5l7 7-7 7" /></Svg>;
export const CameraIcon = ({ size }: P) => <Svg size={size} width={1.6}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>;
export const DownloadIcon = ({ size }: P) => <Svg size={size}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Svg>;
export const PencilIcon = ({ size }: P) => <Svg size={size}><path d="M4 20h4L19 9l-4-4L4 16z" /></Svg>;
export const CloseIcon = ({ size }: P) => <Svg size={size}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
