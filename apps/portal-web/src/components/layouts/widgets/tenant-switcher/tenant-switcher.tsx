import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AnchoredPortal } from '@zanelab/ui';
import { AppIcon } from '../../../icons/app-icon';
import {
  useSessionStore,
  getCurrentTenant,
  getCurrentOrg,
  isSameOrg,
  isPlatformAdmin,
  isTenantAdmin,
  isBusinessEnd,
} from '../../../../stores/session-store';
import {
  switchTenant,
  switchOrg,
  switchToPlatform,
  switchToTenant,
} from '../../../../utils/session';
import { notify } from '@zanelab/utils';
import i18n from '../../../../locales/i18n';
import type {
  UserTenantPerVO,
  UserOrgVO,
} from '../../../../stores/session-store';

const SWAP_ICON = 'svg:m16 3 4 4-4 4|M20 7H4|m8 21-4-4 4-4|M4 17h16';

export function TenantSwitcher() {
  const { t } = useTranslation();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);

  const closeTimerRef = useRef<number | null>(null);
  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const handleEnter = () => {
    cancelClose();
    setOpen(true);
  };
  const handleLeave = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, 200);
  };

  useEffect(() => cancelClose, []);

  const { tenantList, isPlatform } = useSessionStore();

  if (!tenantList?.length) return null;

  const currentTenant = getCurrentTenant(tenantList);
  const currentOrg = getCurrentOrg(currentTenant);

  const activeOrgIndex =
    currentTenant?.orgList?.findIndex((org) => isSameOrg(currentOrg, org)) ??
    -1;
  const defaultOrgIndex =
    currentTenant?.orgList?.findIndex((org) => org.isDefault) ?? -1;

  const tagText = isPlatformAdmin()
    ? t('session.tagPlatform')
    : isTenantAdmin()
      ? t('session.tagTenant')
      : isBusinessEnd()
        ? t('session.tagOrg')
        : '';
  const tagColor = isPlatformAdmin()
    ? 'bg-primary text-primary-content'
    : isTenantAdmin()
      ? 'bg-secondary text-secondary-content'
      : 'bg-accent text-accent-content';

  const displayName = isPlatformAdmin()
    ? t('session.platformAdminEnd')
    : isTenantAdmin()
      ? (currentTenant?.tenantName ?? '')
      : isBusinessEnd()
        ? (currentOrg?.orgName ?? currentTenant?.tenantName ?? '')
        : '';

  if (!displayName) return null;

  return (
    <>
      <div
        ref={anchorRef}
        className="hover:bg-base-200/60 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}

        onClick={handleEnter}
      >
        {tagText && (
          <span
            className={`flex-center size-5 shrink-0 rounded text-xs font-medium ${tagColor}`}
          >
            {tagText}
          </span>
        )}
        <span
          className="max-w-[120px] truncate font-medium"
          title={displayName}
        >
          {displayName}
        </span>
        <AppIcon
          name={open ? 'chevron-up' : 'chevron-down'}
          className="size-3.5 shrink-0 opacity-60"
        />
      </div>

      <AnchoredPortal
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        offsetY={8}
      >
        <div
          className="border-base-300 bg-base-100 w-100 overflow-hidden rounded-xl border shadow-xl"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-base-content text-sm font-semibold">
                {t('session.tenantInfo')}
              </span>
              <div className="flex items-center gap-3">
                <ActionLink
                  icon={SWAP_ICON}
                  title={t('session.switchTenant')}
                  onClick={() => {
                    setOpen(false);
                    setTenantPickerOpen(true);
                  }}
                >
                  {t('session.switch')}
                </ActionLink>
                {isPlatform && (
                  <ActionLink
                    icon="system"
                    onClick={() => {
                      setOpen(false);
                      switchToPlatform();
                    }}
                  >
                    {t('session.platformAdmin')}
                  </ActionLink>
                )}
              </div>
            </div>

            {currentTenant ? (
              <div className="bg-base-200/60 flex items-center gap-2 rounded-lg border border-transparent px-3 py-2.5">
                <img
                  src="/icons/tenant.svg"
                  alt=""
                  className="size-7 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="truncate text-sm font-medium"
                      title={currentTenant.tenantName}
                    >
                      {currentTenant.tenantName}
                    </span>
                    {currentTenant.isDefault && (
                      <span className="bg-primary/10 text-primary shrink-0 rounded px-1 py-0.5 text-[10px] leading-none">
                        {t('session.default')}
                      </span>
                    )}
                    <CopyIcon
                      text={currentTenant.tenantName}
                      title={t('session.copyTenantName')}
                    />
                  </div>
                  <div className="text-base-content/50 mt-1 flex items-center gap-1 text-xs">
                    <span className="truncate" title={currentTenant.tenantCode}>
                      code: {currentTenant.tenantCode}
                    </span>
                    <CopyIcon
                      text={currentTenant.tenantCode}
                      title={t('session.copyTenantCode')}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-base-300 border-t" />

          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-base-content text-sm font-semibold">
                {t('session.projectSpaces')}
              </span>
              {currentTenant?.orgList?.length ? (
                <ActionLink
                  icon="chevron-right"
                  iconAfter
                  onClick={() => {
                    setOpen(false);
                    setOrgPickerOpen(true);
                  }}
                >
                  {t('session.all')}
                </ActionLink>
              ) : null}
            </div>

            {currentTenant?.orgList?.length ? (
              <div className="grid max-h-64 grid-cols-2 gap-3 overflow-y-auto">
                {currentTenant.orgList.map((org, index) => (
                  <OrgCard
                    key={`${org.orgCode ?? org.orgId ?? 'org'}-${index}`}
                    org={org}
                    index={index}

                    active={index === activeOrgIndex}
                    showDefault={index === defaultOrgIndex}
                    onClick={() => {
                      setOpen(false);
                      if (currentTenant) switchOrg(org, currentTenant);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-base-content/40 py-6 text-center text-xs">
                {t('session.emptyOrg')}
              </div>
            )}
          </div>
        </div>
      </AnchoredPortal>

      <TenantPickerModal
        open={tenantPickerOpen}
        tenants={tenantList}
        currentTenantCode={currentTenant?.tenantCode}
        onSelect={(tenant) => {
          setTenantPickerOpen(false);
          switchTenant(tenant);
        }}
        onAdmin={(tenant) => {
          setTenantPickerOpen(false);
          switchToTenant(tenant);
        }}
        onClose={() => setTenantPickerOpen(false)}
      />

      {currentTenant?.orgList?.length ? (
        <OrgPickerModal
          open={orgPickerOpen}
          orgs={currentTenant.orgList}
          currentOrg={currentOrg}
          onSelect={(org) => {
            setOrgPickerOpen(false);
            if (currentTenant) switchOrg(org, currentTenant);
          }}
          onClose={() => setOrgPickerOpen(false)}
        />
      ) : null}
    </>
  );
}

function TenantPickerModal({
  open,
  tenants,
  currentTenantCode,
  onSelect,
  onAdmin,
  onClose,
}: {
  open: boolean;
  tenants: UserTenantPerVO[];
  currentTenantCode?: string;
  onSelect: (tenant: UserTenantPerVO) => void;
  onAdmin: (tenant: UserTenantPerVO) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!open) setKeyword('');
  }, [open]);

  if (!open) return null;

  const key = keyword.trim();
  const filtered = key
    ? tenants.filter((tenant) => tenant.tenantName.includes(key))
    : tenants;

  return createPortal(
    <div className="modal modal-open modal-middle" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-foreground text-lg font-semibold">
            {t('session.switchTenant')}
          </h3>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            aria-label={t('common.close')}
            onClick={onClose}
          >
            <AppIcon name="close" className="size-4" />
          </button>
        </div>

        <input
          type="text"
          className="input input-bordered input-sm w-full"
          placeholder={t('session.searchTenantPlaceholder')}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <div className="mt-4 max-h-80 overflow-y-auto">
          {filtered.length ? (
            filtered.map((tenant, index) => {
              const active = currentTenantCode === tenant.tenantCode;
              return (
                <div
                  key={`${tenant.tenantCode ?? 'tenant'}-${index}`}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                    active ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'
                  }`}
                  onClick={() => onSelect(tenant)}
                  title={tenant.tenantName}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    {active && (
                      <AppIcon
                        name="check"
                        className="text-primary size-4 shrink-0"
                      />
                    )}
                    <span className="truncate font-medium">
                      {tenant.tenantName}
                    </span>
                    {tenant.isDefault && (
                      <span className="bg-base-300 text-base-content/60 shrink-0 rounded px-1 py-0.5 text-[10px]">
                        {t('session.default')}
                      </span>
                    )}
                  </div>
                  {tenant.isPerm && (
                    <button
                      type="button"
                      className="text-base-content/50 hover:text-primary shrink-0 cursor-pointer text-xs transition-colors"
                      title={t('session.manageTip')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdmin(tenant);
                      }}
                    >
                      {t('session.manage')}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-base-content/50 py-8 text-center text-sm">
              {t('session.noMatchedTenant')}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function OrgPickerModal({
  open,
  orgs,
  currentOrg,
  onSelect,
  onClose,
}: {
  open: boolean;
  orgs: UserOrgVO[];
  currentOrg?: UserOrgVO;
  onSelect: (org: UserOrgVO) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!open) setKeyword('');
  }, [open]);

  if (!open) return null;

  const key = keyword.trim();
  const filtered = key
    ? orgs.filter((o) => o.orgName.includes(key) || o.desc?.includes(key))
    : orgs;

  const activeIndex = filtered.findIndex((o) => isSameOrg(currentOrg, o));
  const defaultIndex = filtered.findIndex((o) => o.isDefault);

  return createPortal(
    <div className="modal modal-open modal-middle" onClick={onClose}>
      <div className="modal-box max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-foreground text-lg font-semibold">
            {t('session.orgListTitle')}
          </h3>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            aria-label={t('common.close')}
            onClick={onClose}
          >
            <AppIcon name="close" className="size-4" />
          </button>
        </div>

        <p className="bg-info/10 text-base-content/70 mb-4 rounded-md px-4 py-3 text-xs leading-5">
          {t('session.orgListTip')}
        </p>

        <input
          type="text"
          className="input input-bordered input-sm w-full"
          placeholder={t('session.orgSearchPlaceholder')}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <div className="mt-4 max-h-80 overflow-y-auto">
          {filtered.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filtered.map((org, index) => (
                <OrgCard
                  key={`${org.orgCode ?? org.orgId ?? 'org'}-${index}`}
                  org={org}
                  index={index}

                  active={index === activeIndex}
                  showDefault={index === defaultIndex}
                  showDesc
                  onClick={() => onSelect(org)}
                />
              ))}
            </div>
          ) : (
            <div className="text-base-content/50 py-8 text-center text-sm">
              {t('session.orgEmpty')}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

async function copyText(text: string): Promise<void> {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  notify.success(i18n.t('session.copySuccess'));
}

function CopyIcon({ text, title }: { text: string; title: string }) {
  return (
    <button
      type="button"
      className="text-base-content/40 hover:text-primary shrink-0 cursor-pointer rounded p-0.5 transition-colors"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        void copyText(text);
      }}
    >
      <AppIcon name="copy" className="size-3" />
    </button>
  );
}

function ActionLink({
  icon,
  iconAfter = false,
  title,
  onClick,
  children,
}: {
  icon?: string;
  iconAfter?: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const glyph = icon ? <AppIcon name={icon} className="size-3" /> : null;
  return (
    <button
      type="button"
      title={title}
      className="text-base-content/50 hover:text-primary flex cursor-pointer items-center gap-0.5 text-xs transition-colors"
      onClick={onClick}
    >
      {!iconAfter && glyph}
      {children}
      {iconAfter && glyph}
    </button>
  );
}

const SPACE_ICONS = [
  '/icons/space1.svg',
  '/icons/space2.svg',
  '/icons/space3.svg',
];

function OrgCard({
  org,
  index,
  active,
  showDefault,
  showDesc = false,
  onClick,
}: {
  org: UserOrgVO;
  index: number;
  active: boolean;
  showDefault: boolean;
  showDesc?: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`relative cursor-pointer rounded-lg border px-3 py-2.5 transition-colors ${
        active
          ? 'border-primary bg-primary/10'
          : 'bg-base-200/60 hover:border-primary border-transparent'
      }`}
      onClick={onClick}
      title={org.orgName}
    >
      {showDefault && (
        <span className="bg-primary text-primary-content absolute top-0 right-0 rounded-tr-lg rounded-bl-lg px-1.5 py-0.5 text-[10px] leading-none">
          {t('session.default')}
        </span>
      )}
      <div className="flex items-center gap-2">
        <img
          src={SPACE_ICONS[index % SPACE_ICONS.length]}
          alt=""
          className="size-7 shrink-0"
        />
        <div className="min-w-0 flex-1 truncate text-sm font-medium">
          {org.orgName}
        </div>
      </div>
      <div className="text-base-content/50 mt-1 truncate text-xs">
        code: {org.orgCode || '-'}
      </div>
      {showDesc && (
        <div className="text-base-content/40 mt-1 truncate text-xs">
          {org.desc || '-'}
        </div>
      )}
    </div>
  );
}
