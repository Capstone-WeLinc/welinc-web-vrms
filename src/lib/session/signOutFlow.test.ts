import { beforeEach, describe, expect, it, vi } from "vitest";

const confirm = vi.fn();
const signOut = vi.fn();
vi.mock("../../components/shared/confirm/confirm", () => ({
  confirm: (o: unknown) => confirm(o),
}));
vi.mock("./session", () => ({ signOut: () => signOut() }));

import { signOutFlow } from "./signOutFlow";

describe("signOutFlow (AC-24)", () => {
  beforeEach(() => {
    confirm.mockReset();
    signOut.mockReset();
  });

  it("signs out at once when no check is asked for", async () => {
    signOut.mockResolvedValue("ok");
    await signOutFlow({ ask: false });
    expect(confirm).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("asks first and stops when the person says no", async () => {
    confirm.mockResolvedValue(false);
    await signOutFlow({ ask: true });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs out after a yes", async () => {
    confirm.mockResolvedValue(true);
    signOut.mockResolvedValue("ok");
    await signOutFlow({ ask: true });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("offers Try again when the logout fails and tries again on yes", async () => {
    signOut.mockResolvedValueOnce("failed").mockResolvedValueOnce("ok");
    confirm.mockResolvedValue(true);
    await signOutFlow({ ask: false });
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Couldn't sign out",
        confirmText: "Try again",
      }),
    );
    expect(signOut).toHaveBeenCalledTimes(2);
  });

  it("stays quiet and stops when the person chooses Stay here after a failure", async () => {
    signOut.mockResolvedValue("failed");
    confirm.mockResolvedValue(false);
    await signOutFlow({ ask: false });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("keeps offering while the failure continues", async () => {
    signOut.mockResolvedValue("failed");
    confirm
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await signOutFlow({ ask: false });
    expect(signOut).toHaveBeenCalledTimes(3);
  });
});
