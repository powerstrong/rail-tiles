export function VersionLabel() {
  return <small className="version-label" aria-label={`현재 버전 ${__APP_VERSION__}`}>{__APP_VERSION__}</small>;
}
