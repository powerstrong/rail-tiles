import { useEffect, useState } from 'react';

/** Chrome / Edge / Samsung Internet hand us this event when the app can be installed. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __installPrompt?: InstallPromptEvent | null;
  }
}

/** Call once at start-up: the browser may offer installation before any screen mounts. */
export function listenForInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__installPrompt = e as InstallPromptEvent;
    window.dispatchEvent(new Event('installready'));
  });
  window.addEventListener('appinstalled', () => {
    window.__installPrompt = null;
    window.dispatchEvent(new Event('installready'));
  });
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

type Help = 'ios' | 'inapp' | 'menu';

function helpKind(): Help {
  const ua = navigator.userAgent;
  if (/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(ua)) return 'inapp';
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios ? 'ios' : 'menu';
}

/** "Install the app" button, shown in the browser only (not once the app runs from the home screen). */
export function InstallButton() {
  const [prompt, setPrompt] = useState(() => window.__installPrompt ?? null);
  const [installed, setInstalled] = useState(isStandalone);
  const [help, setHelp] = useState<Help | null>(null);

  useEffect(() => {
    const update = () => {
      setPrompt(window.__installPrompt ?? null);
      if (window.__installPrompt === null) setInstalled(true);
    };
    window.addEventListener('installready', update);
    return () => window.removeEventListener('installready', update);
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!prompt) {
      setHelp(helpKind());
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    window.__installPrompt = null;
    setPrompt(null);
    if (choice.outcome === 'accepted') setInstalled(true);
  };

  return (
    <>
      <button className="install-btn" onClick={install}>
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
          <path d="M12 7 V14 M8.8 11 L12 14.2 L15.2 11" />
        </svg>
        앱으로 설치하기
      </button>
      {help && (
        <div className="overlay install-overlay" role="dialog" aria-label="앱 설치 방법" onClick={() => setHelp(null)}>
          <div className="result-card install-card" onClick={(e) => e.stopPropagation()}>
            <p className="result-kicker">홈 화면에 기차 아이콘 만들기</p>
            {help === 'ios' && (
              <ol className="install-steps">
                <li>
                  Safari 아래쪽 <b>공유 버튼</b>
                  <svg viewBox="0 0 24 24" className="inline-icon" aria-label="공유">
                    <path d="M12 3 V14 M8 7 L12 3 L16 7 M6 11 V20 H18 V11" />
                  </svg>
                  을 눌러요.
                </li>
                <li>
                  <b>홈 화면에 추가</b>를 골라요.
                </li>
                <li>
                  오른쪽 위 <b>추가</b>를 누르면 끝!
                </li>
              </ol>
            )}
            {help === 'inapp' && (
              <p className="result-sub">
                카카오톡 같은 앱 안에서 열린 화면이라 설치할 수 없어요.
                <br />
                오른쪽 위 메뉴에서 <b>다른 브라우저로 열기</b>(Chrome이나 Safari)를 누른 뒤 다시 눌러 주세요.
              </p>
            )}
            {help === 'menu' && (
              <ol className="install-steps">
                <li>
                  브라우저 오른쪽 위 <b>메뉴(⋮)</b>를 눌러요.
                </li>
                <li>
                  <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 골라요.
                </li>
              </ol>
            )}
            <p className="result-sub install-note">설치하면 앱처럼 바로 열리고, 인터넷이 없어도 할 수 있어요.</p>
            <div className="result-actions">
              <button className="primary" onClick={() => setHelp(null)} autoFocus>
                알았어요
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
