/**
 * Copyright component — displays copyright info in footer.
 * Ported from packages/effects/layouts/src/basic/copyright/copyright.vue
 */
interface CopyrightProps {
  companyName?: string;
  companySiteLink?: string;
  date?: string;
  icp?: string;
  icpLink?: string;
}

export function Copyright({
  companyName = '',
  companySiteLink = '',
  date = '2024',
  icp = '',
  icpLink = '',
}: CopyrightProps) {
  return (
    <div className="text-base-content/60 flex items-center justify-center gap-1 text-xs">
      {icp && (
        <a
          href={icpLink || 'javascript:void(0)'}
          className="hover:text-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          {icp}
        </a>
      )}
      <span>Copyright © {date}</span>
      {companyName && (
        <a
          href={companySiteLink || 'javascript:void(0)'}
          className="hover:text-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          {companyName}
        </a>
      )}
    </div>
  );
}
