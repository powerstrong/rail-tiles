import { useState } from 'react';
import { type Progress, exportCode, mergeProgress, needsNewerBrowser, readCode, totalStars } from '../storage';

interface Props {
  progress: Progress;
  onLoad: (next: Progress) => void;
  onBack: () => void;
}

/** "기록 지키기": a save code to keep somewhere safe, and loading one back (keeps the better stars). */
export function SaveScreen({ progress, onLoad, onBack }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const make = async () => {
    try {
      setCode(await exportCode(progress));
      setNote(null);
    } catch {
      setCode(null);
      setNote('코드를 만들지 못했어요. 잠시 뒤에 다시 눌러 주세요.');
    }
  };
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setNote('복사했어요! 카톡 나에게 보내기나 메모에 붙여 넣어 두세요.');
    } catch {
      setNote('복사가 안 되면 코드를 길게 눌러 전체 선택해 복사해 주세요.');
    }
  };
  const share = async () => {
    if (!code) return;
    try {
      await navigator.share({ title: 'Rail Tiles 기록', text: code });
    } catch {
      // Cancelled, or sharing is not available: copying still works.
    }
  };
  const load = async () => {
    const loaded = await readCode(paste);
    if (!loaded) {
      setResult({
        ok: false,
        text: needsNewerBrowser(paste)
          ? '이 브라우저는 이 코드를 열 수 없어요. 브라우저를 최신으로 업데이트하거나 다른 브라우저(Chrome, Safari)에서 불러와 주세요.'
          : '저장 코드가 아니거나 일부가 빠졌어요. 코드를 처음부터 끝까지 붙여 넣어 주세요.',
      });
      return;
    }
    const before = totalStars(progress);
    const next = mergeProgress(progress, loaded);
    onLoad(next);
    setPaste('');
    setResult({ ok: true, text: `불러왔어요! 별 ${before}개 → ${totalStars(next)}개 (더 좋은 기록만 남겨요)` });
  };

  return (
    <main className="select save-screen">
      <header className="select-head">
        <button className="icon-btn" onClick={onBack} aria-label="처음 화면으로">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <h1>기록 지키기</h1>
        <span className="select-progress">★ {totalStars(progress)}</span>
      </header>

      <section className="save-card">
        <h2>💾 저장 코드 만들기</h2>
        <p>
          기록은 이 폰의 브라우저에만 저장돼요. 브라우저 기록을 지우거나 폰을 바꾸면 사라질 수 있으니, 가끔 저장 코드를 만들어
          보관해 두세요.
        </p>
        <button className="primary" onClick={make}>
          저장 코드 만들기
        </button>
        {code && (
          <>
            <textarea className="save-code" readOnly value={code} onFocus={(e) => e.currentTarget.select()} rows={4} aria-label="저장 코드" />
            <div className="save-actions">
              <button className="secondary" onClick={copy}>
                복사하기
              </button>
              {typeof navigator.share === 'function' && (
                <button className="secondary" onClick={share}>
                  보내기(카톡 등)
                </button>
              )}
            </div>
            {note && <p className="save-note">{note}</p>}
          </>
        )}
        {!code && note && <p className="save-note bad">{note}</p>}
      </section>

      <section className="save-card">
        <h2>📥 코드로 불러오기</h2>
        <p>보관해 둔 저장 코드를 붙여 넣으면 기록이 돌아와요. 지금 기록과 합쳐서 더 좋은 별만 남겨요.</p>
        <textarea className="save-code" value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder="RT1.로 시작하는 코드를 붙여 넣어 주세요" aria-label="불러올 저장 코드" />
        <button className="primary" onClick={load} disabled={!paste.trim()}>
          불러오기
        </button>
        {result && <p className={`save-note ${result.ok ? '' : 'bad'}`}>{result.text}</p>}
      </section>
    </main>
  );
}
