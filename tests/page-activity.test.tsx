import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePageActivity } from "../src/hooks/usePageActivity";

describe("3D page lifecycle", () => {
  it("suspends on focus loss, resumes on focus, and removes its listeners", () => {
    const { result, unmount } = renderHook(usePageActivity);
    expect(result.current).toBe(true);
    act(() => window.dispatchEvent(new Event("blur")));
    expect(result.current).toBe(false);
    act(() => window.dispatchEvent(new Event("focus")));
    expect(result.current).toBe(true);
    const remove = vi.spyOn(window, "removeEventListener");
    unmount();
    expect(remove.mock.calls.map(([name]) => name)).toEqual(expect.arrayContaining(["focus", "blur"]));
    remove.mockRestore();
  });
  it("never resumes a hidden document merely because a focus event fires", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const focused = vi.spyOn(document, "hasFocus").mockReturnValue(true);
    const { result, unmount } = renderHook(usePageActivity);
    expect(result.current).toBe(false);
    act(() => window.dispatchEvent(new Event("focus")));
    expect(result.current).toBe(false);
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current).toBe(true);
    unmount(); hidden.mockRestore(); focused.mockRestore();
  });
});
