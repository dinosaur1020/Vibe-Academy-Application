import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthDemo } from '../AuthDemo';
afterEach(() => vi.useRealTimers());
async function time(ms: number) {
  for (let i = 0; i < ms; i += 100)
    await act(async () => {
      vi.advanceTimersByTime(Math.min(100, ms - i));
    });
}
describe('互動元件', () => {
  it('由實際按鈕完成首次登入與再次登入', async () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    render(<AuthDemo />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(2300);
    expect(screen.getByRole('button', { name: '繼續' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '繼續' }));
    await time(13000);
    expect(screen.getByText(/Welcome, Dino/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '登出，再試一次' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(2300);
    fireEvent.click(screen.getByRole('button', { name: '使用這個帳號' }));
    await time(13000);
    expect(screen.getByText('找到既有會員 user 42')).toBeInTheDocument();
    expect(screen.queryByText('建立會員 user 42')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重設示範' }));
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeEnabled();
    expect(screen.queryByText('找到既有會員 user 42')).not.toBeInTheDocument();
  });
  it('在資料檢查時鎖住操作，關閉後不自動播放', async () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    render(<AuthDemo />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(300);
    fireEvent.click(screen.getByRole('button', { name: '檢查 Backend 狀態' }));
    expect(screen.getAllByText('尚未收到')).toHaveLength(2);
    await time(6000);
    expect(
      screen.queryByRole('button', { name: '繼續' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '關閉資料檢查' }));
    expect(screen.getByRole('button', { name: '繼續播放' })).toBeEnabled();
    await time(3000);
    expect(
      screen.queryByRole('button', { name: '繼續' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '繼續播放' }));
    await time(2300);
    expect(screen.getByRole('button', { name: '繼續' })).toBeEnabled();
  });
  it('檢查資料時仍可直接按播放繼續，不必先關面板', async () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    render(<AuthDemo />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(300);
    fireEvent.click(screen.getByRole('button', { name: '檢查 Backend 狀態' }));
    const play = screen.getByRole('button', { name: '繼續播放' });
    expect(play).toBeEnabled();
    fireEvent.click(play);
    await time(100);
    expect(
      screen.queryByRole('button', { name: '關閉資料檢查' }),
    ).not.toBeInTheDocument();
    await time(2500);
    expect(screen.getByRole('button', { name: '繼續' })).toBeEnabled();
  });
  it('背景分頁暫停，返回後須主動續行', async () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    render(<AuthDemo />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(200);
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    fireEvent(document, new Event('visibilitychange'));
    await time(5000);
    expect(screen.getByRole('button', { name: '繼續播放' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: '繼續' }),
    ).not.toBeInTheDocument();
  });
});
